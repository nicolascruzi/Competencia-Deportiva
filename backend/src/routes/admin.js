const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { actualizarDeporteCatalogo, eliminarDeporteCatalogo } = require('../lib/deportesCatalogo');
const { generarPasswordTemporal } = require('../lib/password');

const SALT_ROUNDS = 12;

const router = express.Router();
router.use(authMiddleware, adminOnly);

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, COALESCE(u.apodo, u.nombre) AS nombre_display,
             u.nombre, u.apodo, u.role, u.created_at,
             COUNT(DISTINCT a.id) AS actividades,
             COUNT(DISTINCT gp.grupo_id) AS grupos
      FROM users u
      LEFT JOIN actividades a ON a.user_id = u.id
      LEFT JOIN grupo_participantes gp ON gp.user_id = u.id
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

// POST /admin/users/:id/reset-password — genera una contraseña temporal y la devuelve en la
// respuesta para que el admin se la pase a la persona a mano (WhatsApp, etc). No se manda por mail:
// Railway bloquea SMTP saliente en el plan actual, así que el envío de mail no es viable.
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const passwordTemporal = generarPasswordTemporal();
    const hash = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);
    const { rows } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id',
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ passwordTemporal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── GRUPOS ───────────────────────────────────────────────────────────────────

router.get('/grupos', async (req, res) => {
  try {
    // Grupos con conteo de participantes y sus competencias en_curso (puede haber varias)
    const { rows: grupos } = await pool.query(`
      SELECT g.id, g.nombre, g.pin, g.created_at,
             COALESCE(u.apodo, u.nombre) AS creador_display,
             (SELECT COUNT(DISTINCT gp.user_id) FROM grupo_participantes gp WHERE gp.grupo_id = g.id) AS participantes,
             (SELECT COUNT(*) FROM competencias c WHERE c.grupo_id = g.id AND c.estado = 'en_curso') AS competencias_en_curso
      FROM grupos g
      JOIN users u ON u.id = g.creador_id
      ORDER BY g.created_at DESC
    `);

    // Participantes de todos los grupos en una sola query
    const { rows: parts } = await pool.query(`
      SELECT gp.grupo_id,
             u.id, COALESCE(u.apodo, u.nombre) AS nombre_display,
             u.foto_perfil_url,
             COUNT(a.id) AS actividades,
             COALESCE(SUM(a.minutos), 0) AS minutos
      FROM grupo_participantes gp
      JOIN users u ON u.id = gp.user_id
      LEFT JOIN actividades a ON a.user_id = u.id
      GROUP BY gp.grupo_id, u.id
      ORDER BY minutos DESC
    `);

    // Agrupar participantes por grupo
    const partsByGrupo = {};
    parts.forEach(p => {
      if (!partsByGrupo[p.grupo_id]) partsByGrupo[p.grupo_id] = [];
      partsByGrupo[p.grupo_id].push(p);
    });

    res.json(grupos.map(g => ({ ...g, jugadores: partsByGrupo[g.id] || [] })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/grupos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM grupos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── ACTIVIDADES ──────────────────────────────────────────────────────────────

// Una actividad puede estar vinculada a varias competencias a la vez, cada una con su propio
// ponderador configurado para ese deporte (competencia_deportes) — la columna actividades.ponderador
// guardada es solo un valor "base" (catálogo o el de una competencia elegida sin orden garantizado
// cuando hay varias en curso), así que para esta vista se recalculan los puntos reales de cada
// competencia vinculada, en vez de confiar en ese único valor.
router.get('/actividades', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.fecha, a.deporte_nombre, a.minutos, a.ponderador AS ponderador_base,
             COALESCE(u.apodo, u.nombre) AS nombre_display, u.nombre, u.id AS user_id,
             a.created_at
      FROM actividades a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 500
    `);

    const { rows: vinculos } = await pool.query(`
      SELECT ac.actividad_id, c.id AS competencia_id, c.nombre AS competencia_nombre,
             COALESCE(cd.ponderador, d.ponderador_default) AS ponderador,
             COALESCE((
               SELECT MAX(s.deporte_semana_ponderador_extra)
               FROM competencia_semanas s
               WHERE s.competencia_id = c.id
                 AND (s.deporte_semana_nombre = a.deporte_nombre OR s.deporte_semana_nombre_2 = a.deporte_nombre)
                 AND a.fecha BETWEEN s.fecha_inicio AND s.fecha_fin
             ), 0) AS extra_semana
      FROM actividad_competencias ac
      JOIN competencias c ON c.id = ac.competencia_id
      JOIN actividades a ON a.id = ac.actividad_id
      LEFT JOIN competencia_deportes cd ON cd.competencia_id = c.id AND cd.deporte_nombre = a.deporte_nombre
      LEFT JOIN deportes d ON d.nombre = a.deporte_nombre
      WHERE ac.actividad_id = ANY($1)
    `, [rows.map(r => r.id)]);

    const vinculosPorActividad = {};
    vinculos.forEach(v => {
      if (!vinculosPorActividad[v.actividad_id]) vinculosPorActividad[v.actividad_id] = [];
      const factor = 1 + parseFloat(v.extra_semana);
      const ponderador = parseFloat(v.ponderador) * factor;
      vinculosPorActividad[v.actividad_id].push({
        competencia_id: v.competencia_id,
        competencia_nombre: v.competencia_nombre,
        ponderador,
      });
    });

    const actividades = rows.map(r => ({
      ...r,
      competencias: vinculosPorActividad[r.id] || [],
    }));

    res.json(actividades);
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
  try {
    const updated = await actualizarDeporteCatalogo(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

router.delete('/deportes/:id', async (req, res) => {
  try {
    res.json(await eliminarDeporteCatalogo(req.params.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [users, grupos, acts, deps] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM grupos'),
      pool.query('SELECT COUNT(*), SUM(minutos) FROM actividades'),
      pool.query('SELECT COUNT(*) FROM deportes'),
    ]);
    res.json({
      usuarios:     parseInt(users.rows[0].count),
      grupos:       parseInt(grupos.rows[0].count),
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
