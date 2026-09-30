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
              c.bonus_1_companero_pts, c.bonus_2_companeros_pts, c.bonus_3mas_companeros_pts,
              TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(c.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              (c.fecha_inicio IS NULL OR c.fecha_fin IS NULL OR CURRENT_DATE BETWEEN c.fecha_inicio AND c.fecha_fin) AS en_curso,
              u.nombre AS creador_nombre,
              cp.equipo_id AS mi_equipo_id,
              (SELECT COUNT(*) FROM competencia_participantes cp2 WHERE cp2.competencia_id = c.id) AS participantes
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
    fecha_inicio, fecha_fin,
    bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts,
    equipos_nombres, semanas, challenges,
  } = req.body;
  // ponderadores: [{ deporte_nombre, ponderador }]
  // semanas (opcional): [{ numero_semana, deporte_semana_nombre?, deporte_semana_ponderador_extra? }]
  // challenges (opcional): [{ texto, puntos, numero_semana? }] — numero_semana solo tiene efecto si hay fecha_inicio/fecha_fin
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
      `INSERT INTO competencias (nombre, pin, creador_id, fecha_inicio, fecha_fin, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nombre.trim(), pin, req.user.id, fecha_inicio || null, fecha_fin || null,
        parseFloat(bonus_1_companero_pts) || 0, parseFloat(bonus_2_companeros_pts) || 0, parseFloat(bonus_3mas_companeros_pts) || 0]
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
    // lo que el frontend haya mandado (deporte de la semana), el resto queda en NULL.
    const semanaIdPorNumero = new Map();
    if (fecha_inicio && fecha_fin) {
      const semanasCalculadas = calcularSemanas(fecha_inicio, fecha_fin);
      const semanasInput = new Map((Array.isArray(semanas) ? semanas : []).map(s => [s.numero_semana, s]));
      for (const s of semanasCalculadas) {
        const input = semanasInput.get(s.numero_semana) || {};
        const { rows: [semanaRow] } = await client.query(
          `INSERT INTO competencia_semanas
             (competencia_id, numero_semana, fecha_inicio, fecha_fin,
              deporte_semana_nombre, deporte_semana_ponderador_extra)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [
            comp.id, s.numero_semana, s.fecha_inicio, s.fecha_fin,
            input.deporte_semana_nombre || null,
            input.deporte_semana_ponderador_extra != null ? parseFloat(input.deporte_semana_ponderador_extra) : null,
          ]
        );
        semanaIdPorNumero.set(s.numero_semana, semanaRow.id);
      }
    }

    // Challenges: entidad propia de la competencia, opcionalmente asociados a una semana si hay fechas.
    if (Array.isArray(challenges)) {
      for (const c of challenges) {
        if (!c.texto?.trim()) continue;
        const semanaId = c.numero_semana != null ? (semanaIdPorNumero.get(parseInt(c.numero_semana)) ?? null) : null;
        await client.query(
          `INSERT INTO challenges (competencia_id, semana_id, texto, puntos) VALUES ($1,$2,$3,$4)`,
          [comp.id, semanaId, c.texto.trim(), parseFloat(c.puntos) || 0]
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
      `SELECT c.id, c.nombre, c.pin, c.creador_id, c.created_at,
              c.bonus_1_companero_pts, c.bonus_2_companeros_pts, c.bonus_3mas_companeros_pts,
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
              deporte_semana_nombre, deporte_semana_ponderador_extra
       FROM competencia_semanas WHERE competencia_id=$1 ORDER BY numero_semana`,
      [id]
    );

    const hoy = new Date().toISOString().slice(0, 10);
    const semanaActual = semanas.find(s => s.fecha_inicio <= hoy && hoy <= s.fecha_fin);

    const { rows: challenges } = await pool.query(
      `SELECT ch.id, ch.competencia_id, ch.semana_id, ch.texto, ch.puntos,
              EXISTS(SELECT 1 FROM challenge_completados cc WHERE cc.challenge_id=ch.id AND cc.user_id=$2) AS completado
       FROM challenges ch WHERE ch.competencia_id=$1 ORDER BY ch.created_at`,
      [id, req.user.id]
    );

    res.json({
      ...comp, deportes, participantes, equipos, semanas, challenges,
      mi_equipo_id: part.equipo_id,
      semana_actual_id: semanaActual?.id ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener competencia' });
  }
});

// PUT /competencias/:id/configuracion — editar fechas y bonus por compañía (solo creador)
router.put('/:id/configuracion', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts } = req.body;

  try {
    const { rows: [comp] } = await pool.query(
      `SELECT id, creador_id, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencias WHERE id=$1`,
      [id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede editar la configuración' });

    const { rows: [{ count: numSemanas }] } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM competencia_semanas WHERE competencia_id=$1',
      [id]
    );
    const tieneSemanas = numSemanas > 0;

    const nuevaFechaInicio = fecha_inicio !== undefined ? (fecha_inicio || null) : comp.fecha_inicio;
    const nuevaFechaFin    = fecha_fin    !== undefined ? (fecha_fin    || null) : comp.fecha_fin;

    if ((nuevaFechaInicio && !nuevaFechaFin) || (!nuevaFechaInicio && nuevaFechaFin))
      return res.status(400).json({ error: 'Definí fecha de inicio y fin, o ninguna de las dos' });
    if (nuevaFechaInicio && nuevaFechaFin && nuevaFechaFin < nuevaFechaInicio)
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });

    if (tieneSemanas) {
      if (fecha_inicio !== undefined && fecha_inicio !== comp.fecha_inicio)
        return res.status(400).json({ error: 'No se puede cambiar la fecha de inicio de una competencia que ya tiene semanas generadas' });
      if (fecha_fin !== undefined && comp.fecha_fin && fecha_fin < comp.fecha_fin)
        return res.status(400).json({ error: 'No se puede acortar la fecha de fin por debajo de las semanas ya generadas' });
    }

    const sets = [];
    const params = [];
    if (fecha_inicio !== undefined) { params.push(nuevaFechaInicio); sets.push(`fecha_inicio=$${params.length}`); }
    if (fecha_fin !== undefined)    { params.push(nuevaFechaFin);    sets.push(`fecha_fin=$${params.length}`); }
    if (bonus_1_companero_pts !== undefined)     { params.push(parseFloat(bonus_1_companero_pts) || 0);     sets.push(`bonus_1_companero_pts=$${params.length}`); }
    if (bonus_2_companeros_pts !== undefined)    { params.push(parseFloat(bonus_2_companeros_pts) || 0);    sets.push(`bonus_2_companeros_pts=$${params.length}`); }
    if (bonus_3mas_companeros_pts !== undefined) { params.push(parseFloat(bonus_3mas_companeros_pts) || 0); sets.push(`bonus_3mas_companeros_pts=$${params.length}`); }

    if (sets.length) {
      params.push(id);
      await pool.query(`UPDATE competencias SET ${sets.join(', ')} WHERE id=$${params.length}`, params);
    }

    // Si quedó un rango de fechas válido, generar las semanas que falten (no duplica las existentes).
    if (nuevaFechaInicio && nuevaFechaFin) {
      const semanasCalculadas = calcularSemanas(nuevaFechaInicio, nuevaFechaFin);
      for (const s of semanasCalculadas) {
        await pool.query(
          `INSERT INTO competencia_semanas (competencia_id, numero_semana, fecha_inicio, fecha_fin)
           VALUES ($1,$2,$3,$4) ON CONFLICT (competencia_id, numero_semana) DO NOTHING`,
          [id, s.numero_semana, s.fecha_inicio, s.fecha_fin]
        );
      }
    }

    const { rows: [actualizada] } = await pool.query(
      `SELECT id, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts,
              TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencias WHERE id=$1`,
      [id]
    );
    const { rows: semanas } = await pool.query(
      `SELECT id, competencia_id, numero_semana,
              TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              deporte_semana_nombre, deporte_semana_ponderador_extra
       FROM competencia_semanas WHERE competencia_id=$1 ORDER BY numero_semana`,
      [id]
    );

    res.json({ ...actualizada, semanas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la configuración' });
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

// PUT /competencias/:id/semanas — editar deporte de la semana (solo creador)
router.put('/:id/semanas', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { semanas } = req.body; // [{ id, deporte_semana_nombre, deporte_semana_ponderador_extra }]

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede editar las semanas' });

    if (!Array.isArray(semanas)) return res.status(400).json({ error: 'semanas debe ser un array' });

    for (const s of semanas) {
      if (s.id == null) continue;
      await pool.query(
        `UPDATE competencia_semanas
         SET deporte_semana_nombre=$1, deporte_semana_ponderador_extra=$2, updated_at=NOW()
         WHERE id=$3 AND competencia_id=$4`,
        [
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

// ── CHALLENGES ───────────────────────────────────────────────────────────────

// POST /competencias/:id/challenges — agregar un challenge nuevo (solo creador), en cualquier momento
router.post('/:id/challenges', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { texto, puntos, numero_semana } = req.body;

  if (!texto?.trim()) return res.status(400).json({ error: 'El texto del challenge es obligatorio' });

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede agregar challenges' });

    let semanaId = null;
    if (numero_semana != null) {
      const { rows: [semana] } = await pool.query(
        'SELECT id FROM competencia_semanas WHERE competencia_id=$1 AND numero_semana=$2',
        [id, parseInt(numero_semana)]
      );
      semanaId = semana?.id ?? null;
    }

    const { rows: [challenge] } = await pool.query(
      `INSERT INTO challenges (competencia_id, semana_id, texto, puntos) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, semanaId, texto.trim(), parseFloat(puntos) || 0]
    );

    res.status(201).json({ ...challenge, completado: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar el challenge' });
  }
});

// PUT /competencias/:id/challenges/:challengeId — editar un challenge (solo creador)
router.put('/:id/challenges/:challengeId', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
  const { texto, puntos, numero_semana } = req.body;

  if (!texto?.trim()) return res.status(400).json({ error: 'El texto del challenge es obligatorio' });

  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede editar challenges' });

    let semanaId = null;
    if (numero_semana != null) {
      const { rows: [semana] } = await pool.query(
        'SELECT id FROM competencia_semanas WHERE competencia_id=$1 AND numero_semana=$2',
        [id, parseInt(numero_semana)]
      );
      semanaId = semana?.id ?? null;
    }

    const { rows: [challenge] } = await pool.query(
      `UPDATE challenges SET texto=$1, puntos=$2, semana_id=$3, updated_at=NOW()
       WHERE id=$4 AND competencia_id=$5 RETURNING *`,
      [texto.trim(), parseFloat(puntos) || 0, semanaId, challengeId, id]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge no encontrado' });

    res.json(challenge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar el challenge' });
  }
});

// DELETE /competencias/:id/challenges/:challengeId — eliminar un challenge (solo creador)
router.delete('/:id/challenges/:challengeId', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
  try {
    const { rows: [comp] } = await pool.query('SELECT creador_id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (comp.creador_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede eliminar challenges' });

    await pool.query('DELETE FROM challenges WHERE id=$1 AND competencia_id=$2', [challengeId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el challenge' });
  }
});

// POST /competencias/:id/challenges/:challengeId/completar — marcar un challenge como completado
router.post('/:id/challenges/:challengeId/completar', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;

  try {
    const { rows: [part] } = await pool.query(
      'SELECT 1 FROM competencia_participantes WHERE competencia_id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [challenge] } = await pool.query(
      `SELECT ch.id, TO_CHAR(s.fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(s.fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM challenges ch LEFT JOIN competencia_semanas s ON s.id = ch.semana_id
       WHERE ch.id=$1 AND ch.competencia_id=$2`,
      [challengeId, id]
    );
    if (!challenge) return res.status(404).json({ error: 'Challenge no encontrado' });

    // Si el challenge está atado a una semana, solo se puede completar dentro de su rango.
    // Si no tiene semana asociada (challenge libre), está siempre disponible.
    if (challenge.fecha_inicio && challenge.fecha_fin) {
      const hoy = new Date().toISOString().slice(0, 10);
      if (hoy < challenge.fecha_inicio || hoy > challenge.fecha_fin)
        return res.status(400).json({ error: 'Este challenge no está disponible esta semana' });
    }

    const { rows } = await pool.query(
      `INSERT INTO challenge_completados (challenge_id, user_id) VALUES ($1,$2)
       ON CONFLICT (challenge_id, user_id) DO NOTHING RETURNING *`,
      [challengeId, req.user.id]
    );

    if (!rows.length) return res.json({ ya_completado: true });
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al completar el challenge' });
  }
});

// GET /competencias/:id/challenges/:challengeId/completados — quién completó este challenge
router.get('/:id/challenges/:challengeId/completados', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
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
       JOIN challenges ch ON ch.id = cc.challenge_id
       WHERE cc.challenge_id=$1 AND ch.competencia_id=$2
       ORDER BY cc.completed_at ASC`,
      [challengeId, id]
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
       WHERE EXISTS (SELECT 1 FROM actividad_competencias ac WHERE ac.actividad_id = a.id AND ac.competencia_id = $1)
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
// competencia); ahora solo las vinculadas a esta competencia vía actividad_competencias (una actividad puede
// estar vinculada a varias competencias en curso a la vez).
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
       WHERE EXISTS (SELECT 1 FROM actividad_competencias ac WHERE ac.actividad_id = a.id AND ac.competencia_id = $1) ${mesFilter}
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
