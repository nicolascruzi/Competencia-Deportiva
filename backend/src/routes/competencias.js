const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Genera un PIN de 6 dígitos único
async function generarPin() {
  for (let i = 0; i < 20; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { rows } = await pool.query('SELECT 1 FROM competencias WHERE pin=$1', [pin]);
    if (!rows.length) return pin;
  }
  throw new Error('No se pudo generar un PIN único');
}

// GET /competencias — mis competencias (donde soy participante)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.nombre, c.pin, c.creador_id, c.created_at,
              u.nombre AS creador_nombre,
              (SELECT COUNT(*) FROM competencia_participantes cp WHERE cp.competencia_id = c.id) AS participantes
       FROM competencias c
       JOIN competencia_participantes cp ON cp.competencia_id = c.id AND cp.user_id = $1
       JOIN users u ON u.id = c.creador_id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar competencias' });
  }
});

// POST /competencias — crear competencia
router.post('/', authMiddleware, async (req, res) => {
  const { nombre, ponderadores } = req.body;
  // ponderadores: [{ deporte_nombre, ponderador }]
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pin = await generarPin();

    const { rows: [comp] } = await client.query(
      `INSERT INTO competencias (nombre, pin, creador_id) VALUES ($1,$2,$3) RETURNING *`,
      [nombre.trim(), pin, req.user.id]
    );

    // Creador es participante automáticamente
    await client.query(
      `INSERT INTO competencia_participantes (competencia_id, user_id) VALUES ($1,$2)`,
      [comp.id, req.user.id]
    );

    // Ponderadores por deporte
    if (Array.isArray(ponderadores) && ponderadores.length) {
      for (const { deporte_nombre, ponderador } of ponderadores) {
        if (!deporte_nombre || ponderador == null) continue;
        await client.query(
          `INSERT INTO competencia_deportes (competencia_id, deporte_nombre, ponderador)
           VALUES ($1,$2,$3) ON CONFLICT (competencia_id, deporte_nombre) DO UPDATE SET ponderador=EXCLUDED.ponderador`,
          [comp.id, deporte_nombre, ponderador]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ ...comp, pin });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear competencia' });
  } finally {
    client.release();
  }
});

// POST /competencias/join — unirse por PIN
router.post('/join', authMiddleware, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN requerido' });

  try {
    const { rows: [comp] } = await pool.query(
      'SELECT * FROM competencias WHERE pin=$1', [String(pin).trim()]
    );
    if (!comp) return res.status(404).json({ error: 'PIN inválido, competencia no encontrada' });

    await pool.query(
      `INSERT INTO competencia_participantes (competencia_id, user_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [comp.id, req.user.id]
    );

    res.json({ competencia_id: comp.id, nombre: comp.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al unirse a competencia' });
  }
});

// GET /competencias/:id — detalle de una competencia
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    // Verificar que el usuario es participante
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [comp] } = await pool.query(
      `SELECT c.*, u.nombre AS creador_nombre FROM competencias c JOIN users u ON u.id=c.creador_id WHERE c.id=$1`,
      [id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });

    const { rows: deportes } = await pool.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1 ORDER BY deporte_nombre',
      [id]
    );

    const { rows: participantes } = await pool.query(
      `SELECT u.id, u.nombre FROM competencia_participantes cp JOIN users u ON u.id=cp.user_id WHERE cp.competencia_id=$1`,
      [id]
    );

    res.json({ ...comp, deportes, participantes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener competencia' });
  }
});

// PUT /competencias/:id/deportes — actualizar ponderadores (solo creador)
router.put('/:id/deportes', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { ponderadores } = req.body;

  try {
    const { rows: [comp] } = await pool.query('SELECT * FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede modificar ponderadores' });

    for (const { deporte_nombre, ponderador } of ponderadores) {
      await pool.query(
        `INSERT INTO competencia_deportes (competencia_id, deporte_nombre, ponderador)
         VALUES ($1,$2,$3) ON CONFLICT (competencia_id, deporte_nombre) DO UPDATE SET ponderador=EXCLUDED.ponderador`,
        [id, deporte_nombre, ponderador]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar ponderadores' });
  }
});

// GET /competencias/:id/ranking — ranking de la competencia con ponderadores propios
router.get('/:id/ranking', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional

  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    // Ponderadores de la competencia; si un deporte no tiene, usa el ponderador original de la actividad
    const mesFilter = mes ? `AND DATE_TRUNC('month', a.fecha) = DATE_TRUNC('month', $3::date)` : '';
    const params = mes ? [id, id, mes + '-01'] : [id, id];

    const { rows } = await pool.query(
      `WITH comp_pond AS (
         SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1
       ),
       participantes AS (
         SELECT user_id FROM competencia_participantes WHERE competencia_id=$2
       )
       SELECT
         u.id,
         u.nombre,
         COUNT(a.id)::int                                                          AS actividades,
         COALESCE(SUM(a.minutos), 0)                                               AS minutos,
         COALESCE(SUM(
           a.minutos * COALESCE(
             (SELECT ponderador FROM comp_pond WHERE deporte_nombre = a.deporte_nombre),
             a.ponderador
           )
         ), 0)                                                                      AS puntos
       FROM users u
       JOIN participantes p ON p.user_id = u.id
       LEFT JOIN actividades a ON a.user_id = u.id ${mesFilter}
       GROUP BY u.id, u.nombre
       ORDER BY puntos DESC, minutos DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular ranking' });
  }
});

// GET /competencias/:id/meses — meses con actividad en la competencia
router.get('/:id/meses', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT TO_CHAR(a.fecha,'YYYY-MM') AS mes
       FROM actividades a
       JOIN competencia_participantes cp ON cp.user_id=a.user_id AND cp.competencia_id=$1
       ORDER BY mes DESC`,
      [id]
    );
    res.json(rows.map(r => r.mes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener meses' });
  }
});

// GET /competencias/:id/actividades — todas las actividades de participantes (para gráficos)
router.get('/:id/actividades', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional
  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    // Ponderadores de la competencia
    const { rows: ponders } = await pool.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1',
      [id]
    );
    const pondMap = {};
    ponders.forEach(p => { pondMap[p.deporte_nombre] = parseFloat(p.ponderador); });

    const mesFilter = mes ? `WHERE TO_CHAR(a.fecha,'YYYY-MM') = $2` : '';
    const params = mes ? [id, mes] : [id];

    const { rows } = await pool.query(
      `SELECT a.id, u.id AS user_id, u.nombre, a.deporte_nombre, a.minutos,
              a.ponderador AS ponderador_original,
              TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
              a.notas, a.foto_url, a.created_at
       FROM actividades a
       JOIN competencia_participantes cp ON cp.user_id=a.user_id AND cp.competencia_id=$1
       JOIN users u ON u.id=a.user_id
       ${mesFilter}
       ORDER BY a.fecha ASC, a.created_at ASC`,
      params
    );

    // Aplicar ponderadores de la competencia al calcular puntos
    const actividades = rows.map(r => ({
      ...r,
      ponderador: pondMap[r.deporte_nombre] ?? parseFloat(r.ponderador_original),
      puntos: parseFloat(r.minutos) * (pondMap[r.deporte_nombre] ?? parseFloat(r.ponderador_original)),
    }));

    res.json(actividades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router;
