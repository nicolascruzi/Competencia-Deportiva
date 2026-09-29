const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { getPuntosPorPersona } = require('../lib/competenciaScoring');

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

// Calcula las semanas (bloques de 7 días exactos) entre fecha_inicio y fecha_fin (inclusive).
// Devuelve [{ numero_semana, fecha_inicio, fecha_fin }], la última puede ser más corta que 7 días.
function calcularSemanas(fechaInicio, fechaFin) {
  const semanas = [];
  const start = new Date(fechaInicio + 'T00:00:00Z');
  const end   = new Date(fechaFin    + 'T00:00:00Z');
  let cursor = new Date(start);
  let numero = 1;
  while (cursor <= end) {
    const semanaFin = new Date(cursor);
    semanaFin.setUTCDate(semanaFin.getUTCDate() + 6);
    if (semanaFin > end) semanaFin.setTime(end.getTime());
    semanas.push({
      numero_semana: numero,
      fecha_inicio: cursor.toISOString().slice(0, 10),
      fecha_fin: semanaFin.toISOString().slice(0, 10),
    });
    cursor = new Date(semanaFin);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    numero++;
  }
  return semanas;
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
  const {
    nombre, ponderadores,
    fecha_inicio, fecha_fin, bonus_companeros_pts,
    equipos_nombres, semanas,
  } = req.body;
  // ponderadores: [{ deporte_nombre, ponderador }]
  // semanas (opcional): [{ numero_semana, challenge_texto?, challenge_puntos?, deporte_semana_nombre?, deporte_semana_ponderador_extra? }]
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  if ((fecha_inicio && !fecha_fin) || (!fecha_inicio && fecha_fin))
    return res.status(400).json({ error: 'Definí fecha de inicio y fin, o ninguna de las dos' });
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio)
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pin = await generarPin();

    const { rows: [comp] } = await client.query(
      `INSERT INTO competencias (nombre, pin, creador_id, fecha_inicio, fecha_fin, bonus_companeros_pts)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [nombre.trim(), pin, req.user.id, fecha_inicio || null, fecha_fin || null, parseFloat(bonus_companeros_pts) || 0]
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

    // Equipos (solo nombres — la asignación de participantes se hace después, cuando haya gente unida)
    if (Array.isArray(equipos_nombres)) {
      for (const nombreEquipo of equipos_nombres) {
        if (!nombreEquipo?.trim()) continue;
        await client.query(
          `INSERT INTO equipos (competencia_id, nombre) VALUES ($1,$2) ON CONFLICT (competencia_id, nombre) DO NOTHING`,
          [comp.id, nombreEquipo.trim()]
        );
      }
    }

    // Semanas: se calculan automáticamente a partir del rango de fechas; se completan con
    // lo que el frontend haya mandado (challenge/deporte de la semana), el resto queda en NULL.
    if (fecha_inicio && fecha_fin) {
      const semanasCalculadas = calcularSemanas(fecha_inicio, fecha_fin);
      const semanasInput = new Map((Array.isArray(semanas) ? semanas : []).map(s => [s.numero_semana, s]));
      for (const s of semanasCalculadas) {
        const input = semanasInput.get(s.numero_semana) || {};
        await client.query(
          `INSERT INTO competencia_semanas
             (competencia_id, numero_semana, fecha_inicio, fecha_fin,
              challenge_texto, challenge_puntos, deporte_semana_nombre, deporte_semana_ponderador_extra)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            comp.id, s.numero_semana, s.fecha_inicio, s.fecha_fin,
            input.challenge_texto || null,
            input.challenge_puntos != null ? parseFloat(input.challenge_puntos) : null,
            input.deporte_semana_nombre || null,
            input.deporte_semana_ponderador_extra != null ? parseFloat(input.deporte_semana_ponderador_extra) : null,
          ]
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
      'SELECT equipo_id FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [comp] } = await pool.query(
      `SELECT c.id, c.nombre, c.pin, c.creador_id, c.created_at, c.bonus_companeros_pts,
              TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(c.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              u.nombre AS creador_nombre
       FROM competencias c JOIN users u ON u.id=c.creador_id WHERE c.id=$1`,
      [id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });

    const { rows: deportes } = await pool.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1 ORDER BY deporte_nombre',
      [id]
    );

    const { rows: participantesRaw } = await pool.query(
      `SELECT u.id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, cp.equipo_id
       FROM competencia_participantes cp JOIN users u ON u.id=cp.user_id WHERE cp.competencia_id=$1`,
      [id]
    );
    const participantes = participantesRaw.map(({ equipo_id, ...rest }) => rest);

    const { rows: equiposRaw } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE competencia_id=$1 ORDER BY id',
      [id]
    );
    const equipos = equiposRaw.map(e => ({
      ...e,
      miembros: participantesRaw.filter(p => p.equipo_id === e.id).map(({ equipo_id, ...rest }) => rest),
    }));

    const { rows: semanas } = await pool.query(
      `SELECT id, competencia_id, numero_semana,
              TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              challenge_texto, challenge_puntos, deporte_semana_nombre, deporte_semana_ponderador_extra
       FROM competencia_semanas WHERE competencia_id=$1 ORDER BY numero_semana`,
      [id]
    );

    const hoy = new Date().toISOString().slice(0, 10);
    const semanaActual = semanas.find(s => s.fecha_inicio <= hoy && hoy <= s.fecha_fin);
    let miChallengeCompletado = false;
    if (semanaActual) {
      const { rows: [cc] } = await pool.query(
        'SELECT 1 FROM challenge_completados WHERE semana_id=$1 AND user_id=$2',
        [semanaActual.id, req.user.id]
      );
      miChallengeCompletado = !!cc;
    }

    res.json({
      ...comp, deportes, participantes, equipos, semanas,
      mi_equipo_id: part.equipo_id,
      semana_actual_id: semanaActual?.id ?? null,
      mi_challenge_completado: miChallengeCompletado,
    });
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

// ── EQUIPOS ────────────────────────────────────────────────────────────────

// GET /competencias/:id/equipos — lista equipos con sus miembros
router.get('/:id/equipos', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: equipos } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE competencia_id=$1 ORDER BY id',
      [id]
    );
    const { rows: miembros } = await pool.query(
      `SELECT u.id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, cp.equipo_id
       FROM competencia_participantes cp JOIN users u ON u.id=cp.user_id WHERE cp.competencia_id=$1`,
      [id]
    );

    res.json(equipos.map(e => ({
      ...e,
      miembros: miembros.filter(m => m.equipo_id === e.id).map(({ equipo_id, ...rest }) => rest),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
});

// PUT /competencias/:id/equipos — reemplaza el set de equipos (solo creador)
router.put('/:id/equipos', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { equipos } = req.body; // [{ id?, nombre, color? }]

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede modificar equipos' });

    if (!Array.isArray(equipos)) return res.status(400).json({ error: 'equipos debe ser un array' });

    const idsEnviados = equipos.filter(e => e.id != null).map(e => parseInt(e.id));

    // Borra los equipos existentes que no vinieron en la lista (sus miembros quedan sin equipo por ON DELETE SET NULL)
    if (idsEnviados.length) {
      await pool.query(
        `DELETE FROM equipos WHERE competencia_id=$1 AND id != ALL($2::int[])`,
        [id, idsEnviados]
      );
    } else {
      await pool.query('DELETE FROM equipos WHERE competencia_id=$1', [id]);
    }

    for (const e of equipos) {
      if (!e.nombre?.trim()) continue;
      if (e.id != null) {
        await pool.query(
          'UPDATE equipos SET nombre=$1, color=$2 WHERE id=$3 AND competencia_id=$4',
          [e.nombre.trim(), e.color || null, parseInt(e.id), id]
        );
      } else {
        await pool.query(
          'INSERT INTO equipos (competencia_id, nombre, color) VALUES ($1,$2,$3)',
          [id, e.nombre.trim(), e.color || null]
        );
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Nombre de equipo duplicado' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar equipos' });
  }
});

// PUT /competencias/:id/equipos/asignaciones — asigna participantes a equipos (solo creador)
router.put('/:id/equipos/asignaciones', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { asignaciones } = req.body; // [{ user_id, equipo_id }] — equipo_id puede ser null

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede asignar equipos' });

    if (!Array.isArray(asignaciones)) return res.status(400).json({ error: 'asignaciones debe ser un array' });

    for (const { user_id, equipo_id } of asignaciones) {
      if (user_id == null) continue;
      const { rows: [part] } = await pool.query(
        'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
        [id, user_id]
      );
      if (!part) continue; // ignora usuarios que no son participantes
      if (equipo_id != null) {
        const { rows: [eq] } = await pool.query('SELECT 1 FROM equipos WHERE id=$1 AND competencia_id=$2', [equipo_id, id]);
        if (!eq) continue; // ignora equipo que no pertenece a esta competencia
      }
      await pool.query(
        'UPDATE competencia_participantes SET equipo_id=$1 WHERE competencia_id=$2 AND user_id=$3',
        [equipo_id ?? null, id, user_id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar equipos' });
  }
});

// ── SEMANAS: CHALLENGES Y DEPORTE DE LA SEMANA ──────────────────────────────

// PUT /competencias/:id/semanas — editar challenges/deporte de la semana (solo creador)
router.put('/:id/semanas', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { semanas } = req.body; // [{ id, challenge_texto, challenge_puntos, deporte_semana_nombre, deporte_semana_ponderador_extra }]

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede editar las semanas' });

    if (!Array.isArray(semanas)) return res.status(400).json({ error: 'semanas debe ser un array' });

    for (const s of semanas) {
      if (s.id == null) continue;
      await pool.query(
        `UPDATE competencia_semanas
         SET challenge_texto=$1, challenge_puntos=$2, deporte_semana_nombre=$3, deporte_semana_ponderador_extra=$4, updated_at=NOW()
         WHERE id=$5 AND competencia_id=$6`,
        [
          s.challenge_texto || null,
          s.challenge_puntos != null && s.challenge_puntos !== '' ? parseFloat(s.challenge_puntos) : null,
          s.deporte_semana_nombre || null,
          s.deporte_semana_ponderador_extra != null && s.deporte_semana_ponderador_extra !== '' ? parseFloat(s.deporte_semana_ponderador_extra) : null,
          parseInt(s.id), id,
        ]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar semanas' });
  }
});

// POST /competencias/:id/semanas/:semanaId/completar — marcar el challenge de esta semana como completado
router.post('/:id/semanas/:semanaId/completar', authMiddleware, async (req, res) => {
  const { id, semanaId } = req.params;

  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [semana] } = await pool.query(
      `SELECT id, challenge_texto, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencia_semanas WHERE id=$1 AND competencia_id=$2`,
      [semanaId, id]
    );
    if (!semana) return res.status(404).json({ error: 'Semana no encontrada' });
    if (!semana.challenge_texto) return res.status(400).json({ error: 'Esta semana no tiene un challenge definido' });

    const hoy = new Date().toISOString().slice(0, 10);
    if (hoy < semana.fecha_inicio || hoy > semana.fecha_fin)
      return res.status(400).json({ error: 'Este challenge no está disponible esta semana' });

    const { rows } = await pool.query(
      `INSERT INTO challenge_completados (semana_id, user_id) VALUES ($1,$2)
       ON CONFLICT (semana_id, user_id) DO NOTHING RETURNING *`,
      [semanaId, req.user.id]
    );

    if (!rows.length) return res.json({ ya_completado: true });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al completar el challenge' });
  }
});

// GET /competencias/:id/semanas/:semanaId/completados — quién completó el challenge de esa semana
router.get('/:id/semanas/:semanaId/completados', authMiddleware, async (req, res) => {
  const { id, semanaId } = req.params;
  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, cc.completed_at
       FROM challenge_completados cc
       JOIN users u ON u.id = cc.user_id
       JOIN competencia_semanas s ON s.id = cc.semana_id
       WHERE cc.semana_id=$1 AND s.competencia_id=$2
       ORDER BY cc.completed_at ASC`,
      [semanaId, id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener completados' });
  }
});

// GET /competencias/:id/ranking — ranking individual de la competencia
// Solo cuentan actividades con competencia_id = esta competencia (no todas las del usuario).
router.get('/:id/ranking', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional

  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: participantes } = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.apodo, COALESCE(u.apodo, u.nombre) AS nombre_display,
              u.foto_perfil_url, cp.equipo_id
       FROM competencia_participantes cp JOIN users u ON u.id = cp.user_id
       WHERE cp.competencia_id = $1`,
      [id]
    );

    const puntosMap = await getPuntosPorPersona(parseInt(id), mes || null);

    const rows = participantes.map(p => {
      const calc = puntosMap.get(p.id) ?? { actividades: 0, minutos: 0, puntos: 0 };
      return { ...p, actividades: calc.actividades, minutos: calc.minutos, puntos: calc.puntos };
    }).sort((a, b) => b.puntos - a.puntos || b.minutos - a.minutos);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular ranking' });
  }
});

// GET /competencias/:id/ranking-equipos — ranking de equipos (suma de puntos de sus miembros)
router.get('/:id/ranking-equipos', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional

  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: equipos } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE competencia_id=$1',
      [id]
    );
    const { rows: participantes } = await pool.query(
      'SELECT user_id, equipo_id FROM competencia_participantes WHERE competencia_id=$1 AND equipo_id IS NOT NULL',
      [id]
    );

    const puntosMap = await getPuntosPorPersona(parseInt(id), mes || null);

    const rows = equipos.map(e => {
      const miembros = participantes.filter(p => p.equipo_id === e.id);
      const puntos = miembros.reduce((s, m) => s + (puntosMap.get(m.user_id)?.puntos ?? 0), 0);
      return { ...e, puntos, integrantes: miembros.length };
    }).sort((a, b) => b.puntos - a.puntos);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular ranking de equipos' });
  }
});

// GET /competencias/:id/meses — meses con actividad en la competencia
router.get('/:id/meses', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT TO_CHAR(a.fecha,'YYYY-MM') AS mes
       FROM actividades a
       WHERE a.competencia_id = $1
       ORDER BY mes DESC`,
      [id]
    );
    res.json(rows.map(r => r.mes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener meses' });
  }
});

// GET /competencias/:id/actividades — actividades registradas EN esta competencia (para gráficos/feed)
// Cambio de comportamiento: antes traía TODAS las actividades de cualquier participante (sin filtrar por
// competencia_id); ahora solo las que fueron registradas explícitamente con esta competencia activa.
router.get('/:id/actividades', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional
  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    // Ponderadores y deporte-de-la-semana de la competencia
    const { rows: ponders } = await pool.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1',
      [id]
    );
    const pondMap = {};
    ponders.forEach(p => { pondMap[p.deporte_nombre] = parseFloat(p.ponderador); });

    const { rows: semanas } = await pool.query(
      `SELECT TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin,
              deporte_semana_nombre, deporte_semana_ponderador_extra
       FROM competencia_semanas WHERE competencia_id=$1 AND deporte_semana_nombre IS NOT NULL`,
      [id]
    );

    const mesFilter = mes ? `AND TO_CHAR(a.fecha,'YYYY-MM') = $2` : '';
    const params = mes ? [id, mes] : [id];

    const { rows } = await pool.query(
      `SELECT a.id, u.id AS user_id, u.nombre, u.apellido, u.apodo,
              COALESCE(u.apodo, u.nombre) AS nombre_display,
              u.foto_perfil_url, a.deporte_nombre, a.minutos,
              a.ponderador AS ponderador_original,
              TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
              a.notas, a.foto_url, a.created_at
       FROM actividades a
       JOIN users u ON u.id = a.user_id
       WHERE a.competencia_id = $1 ${mesFilter}
       ORDER BY a.fecha ASC, a.created_at ASC`,
      params
    );

    // Aplicar ponderador de la competencia + multiplicador extra de deporte-de-la-semana si corresponde
    const actividades = rows.map(r => {
      const pondBase = pondMap[r.deporte_nombre] ?? parseFloat(r.ponderador_original);
      const semanaExtra = semanas.find(s =>
        s.deporte_semana_nombre === r.deporte_nombre && r.fecha >= s.fecha_inicio && r.fecha <= s.fecha_fin
      );
      const extra = semanaExtra ? parseFloat(semanaExtra.deporte_semana_ponderador_extra) : 1;
      return { ...r, ponderador: pondBase * extra, puntos: parseFloat(r.minutos) * pondBase * extra };
    });

    res.json(actividades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener actividades' });
  }
});

module.exports = router;
