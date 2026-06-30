const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, adminOnly);

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, COALESCE(u.apodo, u.nombre) AS nombre_display,
             u.nombre, u.apodo, u.role, u.created_at,
             COUNT(DISTINCT a.id) AS actividades,
             COUNT(DISTINCT cp.competencia_id) AS competencias
      FROM users u
      LEFT JOIN actividades a ON a.user_id = u.id
      LEFT JOIN competencia_participantes cp ON cp.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.put('/users/:id', async (req, res) => {
  const { nombre, apodo, role } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET
        nombre = COALESCE($1, nombre),
        apodo  = COALESCE($2, apodo),
        role   = COALESCE($3, role)
       WHERE id = $4
       RETURNING id, email, nombre, apodo, role`,
      [nombre || null, apodo || null, role || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── COMPETENCIAS ─────────────────────────────────────────────────────────────

router.get('/competencias', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.nombre, c.pin, c.created_at,
             u.nombre AS creador_nombre, COALESCE(u.apodo, u.nombre) AS creador_display,
             COUNT(DISTINCT cp.user_id) AS participantes,
             COUNT(DISTINCT a.id) AS actividades
      FROM competencias c
      JOIN users u ON u.id = c.creador_id
      LEFT JOIN competencia_participantes cp ON cp.competencia_id = c.id
      LEFT JOIN actividades a ON a.competencia_id = c.id
      GROUP BY c.id, u.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/competencias/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM competencias WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── ACTIVIDADES ──────────────────────────────────────────────────────────────

router.get('/actividades', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.fecha, a.deporte_nombre, a.minutos, a.ponderador, a.puntos,
             COALESCE(u.apodo, u.nombre) AS nombre_display, u.nombre, u.id AS user_id,
             a.created_at
      FROM actividades a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/actividades/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM actividades WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── DEPORTES ─────────────────────────────────────────────────────────────────

router.get('/deportes', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.id, d.nombre, d.icono, d.ponderador_default,
             COUNT(a.id) AS usos
      FROM deportes d
      LEFT JOIN actividades a ON a.deporte_nombre = d.nombre
      GROUP BY d.id
      ORDER BY usos DESC, d.nombre
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.put('/deportes/:id', async (req, res) => {
  const { nombre, icono, ponderador_default } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE deportes SET
        nombre = COALESCE($1, nombre),
        icono  = COALESCE($2, icono),
        ponderador_default = COALESCE($3, ponderador_default)
       WHERE id = $4
       RETURNING *`,
      [nombre || null, icono || null, ponderador_default ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Deporte no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/deportes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deportes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [users, comps, acts, deps] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM competencias'),
      pool.query('SELECT COUNT(*), SUM(minutos) FROM actividades'),
      pool.query('SELECT COUNT(*) FROM deportes'),
    ]);
    res.json({
      usuarios:     parseInt(users.rows[0].count),
      competencias: parseInt(comps.rows[0].count),
      actividades:  parseInt(acts.rows[0].count),
      minutos:      Math.round(parseFloat(acts.rows[0].sum || 0)),
      deportes:     parseInt(deps.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
