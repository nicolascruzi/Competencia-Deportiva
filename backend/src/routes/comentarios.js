const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /comentarios/:actividadId — lista de comentarios de una actividad
router.get('/:actividadId', async (req, res) => {
  const { actividadId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.contenido, c.created_at,
              u.id AS user_id, u.nombre, u.foto_perfil_url
       FROM comentarios c
       JOIN users u ON u.id = c.user_id
       WHERE c.actividad_id = $1
       ORDER BY c.created_at ASC`,
      [actividadId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// POST /comentarios/:actividadId — crear comentario
router.post('/:actividadId', async (req, res) => {
  const { actividadId } = req.params;
  const { contenido } = req.body;

  if (!contenido?.trim())
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });

  try {
    const { rows: [comentario] } = await pool.query(
      `INSERT INTO comentarios (actividad_id, user_id, contenido)
       VALUES ($1, $2, $3)
       RETURNING id, contenido, created_at`,
      [actividadId, req.user.id, contenido.trim()]
    );

    const { rows: [user] } = await pool.query(
      'SELECT id AS user_id, nombre, foto_perfil_url FROM users WHERE id = $1',
      [req.user.id]
    );

    res.status(201).json({ ...comentario, ...user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el comentario' });
  }
});

// DELETE /comentarios/:id — eliminar (solo el autor)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [c] } = await pool.query(
      'SELECT user_id FROM comentarios WHERE id = $1',
      [id]
    );
    if (!c) return res.status(404).json({ error: 'Comentario no encontrado' });
    if (c.user_id !== req.user.id)
      return res.status(403).json({ error: 'No podés eliminar este comentario' });

    await pool.query('DELETE FROM comentarios WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
});

module.exports = router;
