const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

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

module.exports = router;
