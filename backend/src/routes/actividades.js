const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { comparteGrupoCon } = require('../lib/permisos');
const { sendPushToUser } = require('./push');

const router = express.Router();
router.use(authMiddleware);

// Vincula una actividad a la competencia en_curso de cada grupo al que pertenece el usuario, siempre
// que la fecha de la actividad caiga dentro del rango fecha_inicio..fecha_fin de esa competencia (si
// la competencia no tiene fechas definidas, se vincula igual, sin restricción). El bonus por compañía
// ya no depende de esta vinculación con detalle de personas — vive directo en
// actividades.cantidad_companeros.
async function vincularCompetencias(actividadId, userId) {
  const { rows: participaciones } = await pool.query(
    `SELECT c.id AS competencia_id
     FROM actividades a
     JOIN grupo_participantes gp ON gp.user_id = a.user_id
     JOIN competencias c ON c.grupo_id = gp.grupo_id AND c.estado = 'en_curso'
     WHERE a.id = $1 AND gp.user_id = $2
       AND (c.fecha_inicio IS NULL OR c.fecha_fin IS NULL OR a.fecha BETWEEN c.fecha_inicio AND c.fecha_fin)`,
    [actividadId, userId]
  );

  if (!participaciones.length) return;

  const values = participaciones.map((_, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO actividad_competencias (actividad_id, competencia_id) VALUES ${values} ON CONFLICT DO NOTHING`,
    [actividadId, ...participaciones.map(p => p.competencia_id)]
  );
}

// Normaliza la cantidad de compañeros a un entero entre 0 y 3 (3 = "3 o más").
function normalizarCantidadCompaneros(value) {
  const n = parseInt(value);
  if (!Number.isInteger(n) || n < 0) return 0;
  return Math.min(n, 3);
}

// Calcula el ponderador real de un deporte para un usuario en una fecha dada — NUNCA se confía en el
// ponderador que manda el cliente (un usuario podría mandar cualquier valor por la API directamente,
// inflando sus puntos). Prioridad: el ponderador configurado en alguna competencia en_curso del
// usuario cuyo rango de fechas incluya `fecha` (mismo criterio que vincularCompetencias); si el
// deporte no está configurado en ninguna, el ponderador_default del catálogo de deportes; si el
// deporte ni siquiera existe en el catálogo, 1.
async function calcularPonderador(deporteNombre, userId, fecha) {
  const { rows: [compConfig] } = await pool.query(
    `SELECT cd.ponderador
     FROM competencia_deportes cd
     JOIN competencias c ON c.id = cd.competencia_id AND c.estado = 'en_curso'
     JOIN grupo_participantes gp ON gp.grupo_id = c.grupo_id AND gp.user_id = $2
     WHERE cd.deporte_nombre = $1
       AND (c.fecha_inicio IS NULL OR c.fecha_fin IS NULL OR $3::date BETWEEN c.fecha_inicio AND c.fecha_fin)
     LIMIT 1`,
    [deporteNombre, userId, fecha]
  );
  if (compConfig) return parseFloat(compConfig.ponderador);

  const { rows: [deporte] } = await pool.query(
    'SELECT ponderador_default FROM deportes WHERE nombre = $1', [deporteNombre]
  );
  return deporte ? parseFloat(deporte.ponderador_default) : 1;
}

// Delta aditivo del deporte-de-la-semana aplicable a una actividad ya vinculada a sus competencias
// (ej. "+0.2" = 20% extra sobre el ponderador base), igual criterio que GET /competencias/:id/actividades.
async function calcularExtraSemana(actividadId, deporteNombre, fecha) {
  const { rows: [r] } = await pool.query(
    `SELECT COALESCE(MAX(s.deporte_semana_ponderador_extra), 0) AS extra
     FROM actividad_competencias ac
     JOIN competencia_semanas s ON s.competencia_id = ac.competencia_id
     WHERE ac.actividad_id = $1
       AND (s.deporte_semana_nombre = $2 OR s.deporte_semana_nombre_2 = $2)
       AND $3::date BETWEEN s.fecha_inicio AND s.fecha_fin`,
    [actividadId, deporteNombre, fecha]
  );
  return parseFloat(r.extra);
}

// GET /actividades — lista actividades (historial completo, sin filtro de competencia/fechas)
// Admin ve todas; usuario normal ve las suyas, o las de un compañero de algún grupo en común
// (para ver su perfil/calendario completo, no solo lo vinculado a una competencia puntual).
// Query params: ?mes=2025-06  ?user_id=3
router.get('/', async (req, res) => {
  const { mes, user_id } = req.query;
  const isAdmin = req.user.role === 'admin';

  const conditions = [];
  const params     = [];

  // Filtro de usuario
  if (!isAdmin && user_id && parseInt(user_id) !== req.user.id) {
    if (!(await comparteGrupoCon(req.user.id, parseInt(user_id))))
      return res.status(403).json({ error: 'No compartes ningún grupo con ese usuario' });
    params.push(parseInt(user_id));
    conditions.push(`a.user_id = $${params.length}`);
  } else if (!isAdmin) {
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
        a.deporte_nombre, a.minutos, a.ponderador AS ponderador_original,
        TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
        a.notas, a.foto_url, a.created_at,
        COALESCE((
          SELECT MAX(s.deporte_semana_ponderador_extra)
          FROM actividad_competencias ac
          JOIN competencia_semanas s ON s.competencia_id = ac.competencia_id
          WHERE ac.actividad_id = a.id
            AND (s.deporte_semana_nombre = a.deporte_nombre OR s.deporte_semana_nombre_2 = a.deporte_nombre)
            AND a.fecha BETWEEN s.fecha_inicio AND s.fecha_fin
        ), 0) AS extra_semana
      FROM actividades a
      JOIN users u ON u.id = a.user_id
      ${where}
      ORDER BY a.fecha DESC, a.created_at DESC
    `, params);

    // deporte_semana_ponderador_extra es un delta aditivo (ej. "+0.2" = 20% extra), igual que en
    // GET /competencias/:id/actividades — nunca se guardó en la columna generada actividades.puntos.
    const actividades = result.rows.map(({ ponderador_original, extra_semana, ...r }) => {
      const factor = 1 + parseFloat(extra_semana);
      const ponderador = parseFloat(ponderador_original) * factor;
      return { ...r, ponderador, puntos: parseFloat(r.minutos) * ponderador };
    });

    res.json(actividades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

// POST /actividades — crear actividad
router.post('/', async (req, res) => {
  const { deporte_nombre, minutos, fecha, notas, user_id, cantidad_companeros } = req.body;
  const isAdmin = req.user.role === 'admin';

  // Admin puede cargar en nombre de otro usuario
  const targetUserId = (isAdmin && user_id) ? parseInt(user_id) : req.user.id;

  if (!deporte_nombre || !minutos || !fecha)
    return res.status(400).json({ error: 'deporte_nombre, minutos y fecha son requeridos' });

  if (minutos <= 0)
    return res.status(400).json({ error: 'Los minutos deben ser mayor a 0' });

  try {
    const deporte = await pool.query(
      'SELECT id FROM deportes WHERE nombre = $1', [deporte_nombre]
    );
    const deporteId = deporte.rows[0]?.id || null;

    // El ponderador siempre se calcula server-side — nunca se confía en lo que manda el cliente.
    const ponderador = await calcularPonderador(deporte_nombre.trim(), targetUserId, fecha);

    const result = await pool.query(`
      INSERT INTO actividades (user_id, deporte_id, deporte_nombre, minutos, ponderador, fecha, notas, cantidad_companeros)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, deporte_nombre, minutos, ponderador, puntos, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, notas, foto_url, created_at, cantidad_companeros
    `, [targetUserId, deporteId, deporte_nombre.trim(), parseFloat(minutos), ponderador, fecha, notas || null, normalizarCantidadCompaneros(cantidad_companeros)]);

    const act = result.rows[0];

    await vincularCompetencias(act.id, targetUserId);

    // La columna ponderador/puntos guardada es el valor "base" sin el extra de deporte-de-la-semana
    // (deporte_semana_ponderador_extra es un delta aditivo que puede cambiar con el tiempo, así que
    // nunca se persiste en la actividad) — se recalcula igual que en GET /actividades antes de responder.
    const factor = 1 + await calcularExtraSemana(act.id, act.deporte_nombre, act.fecha);
    const actConExtra = { ...act, ponderador: parseFloat(act.ponderador) * factor, puntos: parseFloat(act.minutos) * parseFloat(act.ponderador) * factor };

    res.status(201).json(actConExtra);

    // Notificar a todos los compañeros de competencia (en background)
    notifyCompaneros(targetUserId, actConExtra, req.user.nombre).catch(() => {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
});

async function notifyCompaneros(actorId, actividad, actorNombre) {
  // Buscar todos los compañeros en grupos donde el actor participa
  const { rows: companeros } = await pool.query(
    `SELECT DISTINCT gp2.user_id
     FROM grupo_participantes gp1
     JOIN grupo_participantes gp2 ON gp2.grupo_id = gp1.grupo_id
     WHERE gp1.user_id = $1 AND gp2.user_id != $1`,
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
      return res.status(403).json({ error: 'No tienes permiso para editar esta actividad' });

    const { deporte_nombre, minutos, fecha, notas, cantidad_companeros } = req.body;
    const newDeporte    = deporte_nombre ?? act.deporte_nombre;
    const newMinutos    = minutos        != null ? parseFloat(minutos)    : parseFloat(act.minutos);
    const newFecha      = fecha          ?? act.fecha;
    const newNotas      = notas          !== undefined ? notas : act.notas;
    const newCantidadCompaneros = cantidad_companeros !== undefined ? normalizarCantidadCompaneros(cantidad_companeros) : act.cantidad_companeros;

    const deporte = await pool.query('SELECT id FROM deportes WHERE nombre = $1', [newDeporte]);
    const deporteId = deporte.rows[0]?.id || null;

    // El ponderador siempre se recalcula server-side (deporte y/o fecha pueden haber cambiado) —
    // nunca se confía en lo que manda el cliente.
    const newPonderador = await calcularPonderador(newDeporte, act.user_id, newFecha);

    const result = await pool.query(`
      UPDATE actividades
      SET deporte_id = $1, deporte_nombre = $2, minutos = $3, ponderador = $4,
          fecha = $5, notas = $6, cantidad_companeros = $7, updated_at = NOW()
      WHERE id = $8
      RETURNING id, user_id, deporte_nombre, minutos, ponderador, puntos, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, notas, updated_at, cantidad_companeros
    `, [deporteId, newDeporte, newMinutos, newPonderador, newFecha, newNotas, newCantidadCompaneros, id]);

    await pool.query('DELETE FROM actividad_competencias WHERE actividad_id = $1', [id]);
    await vincularCompetencias(id, act.user_id);

    const updated = result.rows[0];
    const factor = 1 + await calcularExtraSemana(updated.id, updated.deporte_nombre, updated.fecha);
    res.json({ ...updated, ponderador: parseFloat(updated.ponderador) * factor, puntos: parseFloat(updated.minutos) * parseFloat(updated.ponderador) * factor });
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
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta actividad' });

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
