const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /notificaciones — notificaciones del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.tipo, n.leida, n.created_at,
              n.actividad_id,
              a.deporte_nombre,
              COALESCE(u.apodo, u.nombre) AS actor_nombre,
              u.foto_perfil_url AS actor_foto
       FROM notificaciones n
       JOIN actividades a ON a.id = n.actividad_id
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

// PATCH /notificaciones/read — marcar todas como leídas
router.patch('/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE user_id = $1 AND leida = false',
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

// PATCH /notificaciones/:id/read — marcar una como leída
router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

module.exports = router;
