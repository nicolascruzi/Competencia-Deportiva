const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /ranking — ranking de todos los usuarios
// Query params: ?mes=2025-06  (sin mes = acumulado total)
router.get('/', async (req, res) => {
  const { mes } = req.query;

  const params     = [];
  const conditions = [];

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    params.push(mes);
    conditions.push(`TO_CHAR(a.fecha, 'YYYY-MM') = $${params.length}`);
  }

  const where = conditions.length ? 'AND ' + conditions.join(' AND ') : '';

  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.nombre,
        COUNT(a.id)::int              AS actividades,
        COALESCE(SUM(a.minutos), 0)   AS minutos,
        COALESCE(SUM(a.puntos),  0)   AS puntos,
        MAX(a.fecha)                  AS ultima_fecha
      FROM users u
      LEFT JOIN actividades a ON a.user_id = u.id ${where}
      GROUP BY u.id, u.nombre
      HAVING COALESCE(SUM(a.puntos), 0) > 0
      ORDER BY puntos DESC
    `, params);

    const rows = result.rows.map((r, i) => ({
      rank:         i + 1,
      id:           r.id,
      nombre:       r.nombre,
      actividades:  r.actividades,
      minutos:      Math.round(parseFloat(r.minutos)),
      puntos:       Math.round(parseFloat(r.puntos) * 100) / 100,
      ultima_fecha: r.ultima_fecha,
    }));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular ranking' });
  }
});

// GET /ranking/meses — lista de meses con actividad
router.get('/meses', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT TO_CHAR(fecha, 'YYYY-MM') AS mes
      FROM actividades
      ORDER BY mes DESC
    `);
    res.json(result.rows.map(r => r.mes));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener meses' });
  }
});

// GET /ranking/usuario/:id — detalle de un usuario específico
router.get('/usuario/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { mes } = req.query;

  const params     = [userId];
  const conditions = ['a.user_id = $1'];

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    params.push(mes);
    conditions.push(`TO_CHAR(a.fecha, 'YYYY-MM') = $${params.length}`);
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  try {
    const [userRes, actRes, sportRes] = await Promise.all([
      pool.query('SELECT id, nombre, email, role, created_at FROM users WHERE id = $1', [userId]),
      pool.query(`
        SELECT id, deporte_nombre, minutos, ponderador, puntos, fecha, notas
        FROM actividades ${where}
        ORDER BY fecha DESC
      `, params),
      pool.query(`
        SELECT deporte_nombre,
          COUNT(*)::int         AS sesiones,
          SUM(minutos)::numeric AS minutos,
          SUM(puntos)::numeric  AS puntos
        FROM actividades ${where}
        GROUP BY deporte_nombre
        ORDER BY puntos DESC
      `, params),
    ]);

    if (!userRes.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      usuario:     userRes.rows[0],
      actividades: actRes.rows,
      por_deporte: sportRes.rows,
      totales: {
        puntos:      actRes.rows.reduce((s, r) => s + parseFloat(r.puntos), 0),
        minutos:     actRes.rows.reduce((s, r) => s + parseFloat(r.minutos), 0),
        actividades: actRes.rows.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener detalle del usuario' });
  }
});

module.exports = router;
