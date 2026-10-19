const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { sendPushToUser } = require('./push');

const router = express.Router();
router.use(authMiddleware);

// Notifica al dueño de la actividad cuando alguien le da like (si no es el mismo que da el like).
async function notificarLike(actividadId, actorId) {
  try {
    const { rows: [actividad] } = await pool.query(
      'SELECT user_id, deporte_nombre FROM actividades WHERE id = $1',
      [actividadId]
    );
    if (!actividad || actividad.user_id === actorId) return;

    const { rows: [actor] } = await pool.query(
      'SELECT COALESCE(apodo, nombre) AS nombre_display FROM users WHERE id = $1',
      [actorId]
    );

    await pool.query(
      `INSERT INTO notificaciones (user_id, tipo, actividad_id, actor_id)
       VALUES ($1, 'like', $2, $3)`,
      [actividad.user_id, actividadId, actorId]
    ).catch(err => console.error('Error al crear notificación de like:', err));

    sendPushToUser(actividad.user_id, {
      title: `❤️ ${actor.nombre_display} le dio like a tu actividad`,
      body:  `${actividad.deporte_nombre}`,
      data:  { actividad_id: Number(actividadId), tipo: 'like' },
    }, 'like');
  } catch (err) {
    console.error('Error al notificar like:', err);
  }
}

// GET /likes/:actividadId — conteo + si el usuario actual dio like
router.get('/:actividadId', async (req, res) => {
  const { actividadId } = req.params;
  try {
    const { rows: [row] } = await pool.query(
      `SELECT
         COUNT(*) AS total,
         BOOL_OR(user_id = $2) AS liked
       FROM likes
       WHERE actividad_id = $1`,
      [actividadId, req.user.id]
    );
    res.json({ total: parseInt(row.total), liked: row.liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener likes' });
  }
});

// GET /likes/:actividadId/usuarios — lista de quién dio like, más reciente primero
router.get('/:actividadId/usuarios', async (req, res) => {
  const { actividadId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url
       FROM likes l JOIN users u ON u.id = l.user_id
       WHERE l.actividad_id = $1
       ORDER BY l.created_at DESC`,
      [actividadId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener quién dio like' });
  }
});

// POST /likes/:actividadId — toggle like
router.post('/:actividadId', async (req, res) => {
  const { actividadId } = req.params;
  try {
    const { rows: [existing] } = await pool.query(
      'SELECT 1 FROM likes WHERE actividad_id = $1 AND user_id = $2',
      [actividadId, req.user.id]
    );
    if (existing) {
      await pool.query(
        'DELETE FROM likes WHERE actividad_id = $1 AND user_id = $2',
        [actividadId, req.user.id]
      );
    } else {
      await pool.query(
        'INSERT INTO likes (actividad_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [actividadId, req.user.id]
      );
      notificarLike(actividadId, req.user.id);
    }
    const { rows: [row] } = await pool.query(
      `SELECT COUNT(*) AS total, BOOL_OR(user_id = $2) AS liked
       FROM likes WHERE actividad_id = $1`,
      [actividadId, req.user.id]
    );
    res.json({ total: parseInt(row.total), liked: row.liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar like' });
  }
});

// PUT /likes/:actividadId — dar like sin alternar (para el doble tap en la foto, estilo Instagram:
// nunca quita el like si ya existía, a diferencia del toggle de POST que usa el botón de corazón).
router.put('/:actividadId', async (req, res) => {
  const { actividadId } = req.params;
  try {
    const { rows: [inserted] } = await pool.query(
      'INSERT INTO likes (actividad_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING 1',
      [actividadId, req.user.id]
    );
    if (inserted) notificarLike(actividadId, req.user.id);
    const { rows: [row] } = await pool.query(
      `SELECT COUNT(*) AS total, BOOL_OR(user_id = $2) AS liked
       FROM likes WHERE actividad_id = $1`,
      [actividadId, req.user.id]
    );
    res.json({ total: parseInt(row.total), liked: row.liked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al dar like' });
  }
});

module.exports = router;
