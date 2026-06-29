const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

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
  const { deporte_nombre, minutos, ponderador, fecha, notas, user_id } = req.body;
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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear actividad' });
  }
});

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

    const { deporte_nombre, minutos, ponderador, fecha, notas } = req.body;
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
