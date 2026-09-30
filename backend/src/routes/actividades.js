const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendPushToUser } = require('./push');

const router = express.Router();
router.use(authMiddleware);

// "En curso" = sin fechas definidas (competencias viejas, tratadas como siempre vigentes) o CURRENT_DATE dentro del rango.
const COMPETENCIA_EN_CURSO_SQL = `(c.fecha_inicio IS NULL OR c.fecha_fin IS NULL OR CURRENT_DATE BETWEEN c.fecha_inicio AND c.fecha_fin)`;

// Vincula una actividad a todas las competencias en curso del usuario y, dentro de cada una,
// resuelve el bonus de compañía si el compañero marcado también participa en esa competencia
// (ya no depende de compartir equipo — cualquier participante de la competencia es válido).
// companerosIds: array plano de user_id marcados como "hecho en compañía" (mismo picker para todas las competencias).
async function vincularCompetencias(actividadId, userId, companerosIds) {
  const { rows: participaciones } = await pool.query(
    `SELECT cp.competencia_id
     FROM competencia_participantes cp
     JOIN competencias c ON c.id = cp.competencia_id
     WHERE cp.user_id = $1 AND ${COMPETENCIA_EN_CURSO_SQL}`,
    [userId]
  );

  if (!participaciones.length) return;

  const values = participaciones.map((_, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO actividad_competencias (actividad_id, competencia_id) VALUES ${values} ON CONFLICT DO NOTHING`,
    [actividadId, ...participaciones.map(p => p.competencia_id)]
  );

  if (!Array.isArray(companerosIds) || !companerosIds.length) return;
  const ids = companerosIds.map(id => parseInt(id)).filter(id => Number.isInteger(id) && id !== userId);
  if (!ids.length) return;

  for (const { competencia_id } of participaciones) {
    const { rows: validos } = await pool.query(
      `SELECT user_id FROM competencia_participantes
       WHERE competencia_id = $1 AND user_id = ANY($2::int[])`,
      [competencia_id, ids]
    );
    if (!validos.length) continue;
    const compValues = validos.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO actividad_companeros (actividad_id, user_id) VALUES ${compValues} ON CONFLICT DO NOTHING`,
      [actividadId, ...validos.map(v => v.user_id)]
    );
  }
}

// GET /actividades — lista actividades
// Admin ve todas; usuario normal ve solo las suyas
// Query params: ?mes=2025-06  ?user_id=3
router.get('/', async (req, res) => {
  const { mes, user_id } = req.query;
  const isAdmin = req.user.role === 'admin';

  const conditions = [];
  const params     = [];

  // Filtro de usuario
  if (!isAdmin) {
    params.push(req.user.id);
    conditions.push(`a.user_id = $${params.length}`);
  } else if (user_id) {
    params.push(parseInt(user_id));
    conditions.push(`a.user_id = $${params.length}`);
  }

  // Filtro de mes (YYYY-MM)
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    params.push(mes);
    conditions.push(`TO_CHAR(a.fecha, 'YYYY-MM') = $${params.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(`
      SELECT
        a.id, a.user_id, u.nombre AS user_nombre,
        u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url,
        a.deporte_nombre, a.minutos, a.ponderador, a.puntos,
        TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
        a.notas, a.foto_url, a.created_at
      FROM actividades a
      JOIN users u ON u.id = a.user_id
      ${where}
      ORDER BY a.fecha DESC, a.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

// POST /actividades — crear actividad
router.post('/', async (req, res) => {
  const { deporte_nombre, minutos, ponderador, fecha, notas, user_id, companeros_ids } = req.body;
  const isAdmin = req.user.role === 'admin';

  // Admin puede cargar en nombre de otro usuario
  const targetUserId = (isAdmin && user_id) ? parseInt(user_id) : req.user.id;

  if (!deporte_nombre || !minutos || !ponderador || !fecha)
    return res.status(400).json({ error: 'deporte_nombre, minutos, ponderador y fecha son requeridos' });

  if (minutos <= 0)
    return res.status(400).json({ error: 'Los minutos deben ser mayor a 0' });

  try {
    const deporte = await pool.query(
      'SELECT id FROM deportes WHERE nombre = $1', [deporte_nombre]
    );
    const deporteId = deporte.rows[0]?.id || null;

    const result = await pool.query(`
      INSERT INTO actividades (user_id, deporte_id, deporte_nombre, minutos, ponderador, fecha, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, deporte_nombre, minutos, ponderador, puntos, fecha, notas, foto_url, created_at
    `, [targetUserId, deporteId, deporte_nombre.trim(), parseFloat(minutos), parseFloat(ponderador), fecha, notas || null]);

    const act = result.rows[0];

    await vincularCompetencias(act.id, targetUserId, companeros_ids);

    res.status(201).json(act);

    // Notificar a todos los compañeros de competencia (en background)
    notifyCompaneros(targetUserId, act, req.user.nombre).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
});

async function notifyCompaneros(actorId, actividad, actorNombre) {
  // Buscar todos los compañeros en competencias donde el actor participa
  const { rows: companeros } = await pool.query(
    `SELECT DISTINCT cp2.user_id
     FROM competencia_participantes cp1
     JOIN competencia_participantes cp2 ON cp2.competencia_id = cp1.competencia_id
     WHERE cp1.user_id = $1 AND cp2.user_id != $1`,
    [actorId]
  );
  const pts = Math.round(parseFloat(actividad.minutos) * parseFloat(actividad.ponderador));
  const payload = {
    title: `🏅 ${actorNombre} subió una actividad`,
    body:  `${actividad.deporte_nombre} · ${Math.round(actividad.minutos)} min · ${pts} pts`,
    data:  { actividad_id: actividad.id, tipo: 'actividad' },
  };
  await Promise.allSettled(companeros.map(c => sendPushToUser(c.user_id, payload)));
}

// PUT /actividades/:id — editar actividad (dueño o admin)
router.put('/:id', async (req, res) => {
  const id      = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  try {
    const existing = await pool.query('SELECT * FROM actividades WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Actividad no encontrada' });

    const act = existing.rows[0];
    if (!isAdmin && act.user_id !== req.user.id)
      return res.status(403).json({ error: 'No tenés permiso para editar esta actividad' });

    const { deporte_nombre, minutos, ponderador, fecha, notas, companeros_ids } = req.body;
    const newDeporte    = deporte_nombre ?? act.deporte_nombre;
    const newMinutos    = minutos        != null ? parseFloat(minutos)    : parseFloat(act.minutos);
    const newPonderador = ponderador     != null ? parseFloat(ponderador) : parseFloat(act.ponderador);
    const newFecha      = fecha          ?? act.fecha;
    const newNotas      = notas          !== undefined ? notas : act.notas;

    const deporte = await pool.query('SELECT id FROM deportes WHERE nombre = $1', [newDeporte]);
    const deporteId = deporte.rows[0]?.id || null;

    const result = await pool.query(`
      UPDATE actividades
      SET deporte_id = $1, deporte_nombre = $2, minutos = $3, ponderador = $4,
          fecha = $5, notas = $6, updated_at = NOW()
      WHERE id = $7
      RETURNING id, user_id, deporte_nombre, minutos, ponderador, puntos, fecha, notas, updated_at
    `, [deporteId, newDeporte, newMinutos, newPonderador, newFecha, newNotas, id]);

    let companerosFinal = companeros_ids;
    if (companerosFinal === undefined) {
      const { rows } = await pool.query('SELECT user_id FROM actividad_companeros WHERE actividad_id = $1', [id]);
      companerosFinal = rows.map(r => r.user_id);
    }
    await pool.query('DELETE FROM actividad_companeros WHERE actividad_id = $1', [id]);
    await pool.query('DELETE FROM actividad_competencias WHERE actividad_id = $1', [id]);
    await vincularCompetencias(id, act.user_id, companerosFinal);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar actividad' });
  }
});

// DELETE /actividades/:id — eliminar (dueño o admin)
router.delete('/:id', async (req, res) => {
  const id      = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  try {
    const existing = await pool.query('SELECT user_id FROM actividades WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Actividad no encontrada' });

    if (!isAdmin && existing.rows[0].user_id !== req.user.id)
      return res.status(403).json({ error: 'No tenés permiso para eliminar esta actividad' });

    await pool.query('DELETE FROM actividades WHERE id = $1', [id]);
    res.json({ message: 'Actividad eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar actividad' });
  }
});

// GET /actividades/deportes — lista de deportes disponibles
router.get('/deportes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deportes ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener deportes' });
  }
});

// POST /actividades/deportes — crear deporte custom
router.post('/deportes', async (req, res) => {
  const { nombre, icono, ponderador_default } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const icono_final = (icono?.trim()) || '🏅';
  const pond = parseFloat(ponderador_default) || 1.0;
  try {
    const result = await pool.query(
      `INSERT INTO deportes (nombre, icono, ponderador_default)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre) DO UPDATE SET icono = EXCLUDED.icono, ponderador_default = EXCLUDED.ponderador_default
       RETURNING *`,
      [nombre.trim(), icono_final, pond]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear deporte' });
  }
});

module.exports = router;
