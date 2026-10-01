const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { getPuntosPorPersona } = require('../lib/competenciaScoring');
const { esAdminDeCompetencia, esParticipanteDeCompetencia } = require('../lib/permisos');

const router = express.Router();

// Calcula las semanas (bloques de 7 días exactos) entre fecha_inicio y fecha_fin (inclusive).
// Devuelve [{ numero_semana, fecha_inicio, fecha_fin }], la última puede ser más corta que 7 días.
// (Usada también por grupos.js al crear una competencia nueva.)
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

// GET /competencias/:id — detalle de una competencia
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const part = await esParticipanteDeCompetencia(id, req.user.id);
    if (!part) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [comp] } = await pool.query(
      `SELECT c.id, c.nombre, c.grupo_id, c.estado, c.created_at,
              c.bonus_1_companero_pts, c.bonus_2_companeros_pts, c.bonus_3mas_companeros_pts, c.bonus_deporte_semana_extra,
              TO_CHAR(c.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(c.fecha_fin, 'YYYY-MM-DD') AS fecha_fin
       FROM competencias c WHERE c.id=$1`,
      [id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });

    const { rows: deportes } = await pool.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1 ORDER BY deporte_nombre',
      [id]
    );

    const { rows: participantesRaw } = await pool.query(
      `SELECT u.id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, gp.equipo_id
       FROM competencias c
       JOIN grupo_participantes gp ON gp.grupo_id = c.grupo_id
       JOIN users u ON u.id = gp.user_id
       WHERE c.id=$1`,
      [id]
    );
    const participantes = participantesRaw.map(({ equipo_id, ...rest }) => rest);

    const { rows: equiposRaw } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE grupo_id=$1 ORDER BY id',
      [comp.grupo_id]
    );
    const equipos = equiposRaw.map(e => ({
      ...e,
      miembros: participantesRaw.filter(p => p.equipo_id === e.id).map(({ equipo_id, ...rest }) => rest),
    }));

    let { rows: semanas } = await pool.query(
      `SELECT id, competencia_id, numero_semana,
              TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              deporte_semana_nombre, deporte_semana_ponderador_extra
       FROM competencia_semanas WHERE competencia_id=$1 ORDER BY numero_semana`,
      [id]
    );

    const hoy = new Date().toISOString().slice(0, 10);

    // Resuelve la votación de cualquier semana (2+) cuya semana previa ya terminó y que aún no tiene
    // deporte asignado — se calcula on-read, sin cron. La semana 1 nunca se resuelve por votación.
    let huboResolucion = false;
    for (let i = 1; i < semanas.length; i++) {
      const s = semanas[i];
      const anterior = semanas[i - 1];
      if (s.deporte_semana_nombre || hoy <= anterior.fecha_fin) continue;

      const { rows: [ganador] } = await pool.query(
        `SELECT d.id, d.nombre, d.ponderador_default, COUNT(*) AS votos
         FROM votos_deporte_semana v
         JOIN deportes d ON d.id = v.deporte_id
         WHERE v.competencia_semana_id = $1
         GROUP BY d.id, d.nombre, d.ponderador_default
         ORDER BY COUNT(*) DESC, RANDOM() LIMIT 1`,
        [s.id]
      );
      if (!ganador) continue;

      const ponderadorExtra = parseFloat(ganador.ponderador_default) + parseFloat(comp.bonus_deporte_semana_extra);
      await pool.query(
        `UPDATE competencia_semanas SET deporte_semana_nombre=$1, deporte_semana_ponderador_extra=$2, updated_at=NOW() WHERE id=$3`,
        [ganador.nombre, ponderadorExtra, s.id]
      );
      huboResolucion = true;
    }

    if (huboResolucion) {
      ({ rows: semanas } = await pool.query(
        `SELECT id, competencia_id, numero_semana,
                TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
                deporte_semana_nombre, deporte_semana_ponderador_extra
         FROM competencia_semanas WHERE competencia_id=$1 ORDER BY numero_semana`,
        [id]
      ));
    }

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

// PUT /competencias/:id/configuracion — editar fechas y bonus (admin del grupo)
router.put('/:id/configuracion', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { fecha_inicio, fecha_fin, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts, bonus_deporte_semana_extra } = req.body;

  try {
    const { rows: [comp] } = await pool.query(
      `SELECT id, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencias WHERE id=$1`,
      [id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede editar la configuración' });

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
    if (bonus_deporte_semana_extra !== undefined) { params.push(parseFloat(bonus_deporte_semana_extra) || 0); sets.push(`bonus_deporte_semana_extra=$${params.length}`); }

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
      `SELECT id, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts, bonus_deporte_semana_extra,
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

// PUT /competencias/:id/deportes — actualizar ponderadores (admin del grupo)
router.put('/:id/deportes', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { ponderadores } = req.body;

  try {
    const { rows: [comp] } = await pool.query('SELECT id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede modificar ponderadores' });

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

// ── SEMANAS: CHALLENGES Y DEPORTE DE LA SEMANA ──────────────────────────────

// PUT /competencias/:id/semanas — editar deporte de la semana 1 (admin del grupo)
router.put('/:id/semanas', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { semanas } = req.body; // [{ id, deporte_semana_nombre, deporte_semana_ponderador_extra }]

  try {
    const { rows: [comp] } = await pool.query('SELECT id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede editar las semanas' });

    if (!Array.isArray(semanas)) return res.status(400).json({ error: 'semanas debe ser un array' });

    for (const s of semanas) {
      if (s.id == null) continue;
      // Solo la semana 1 se fija a mano — de la 2 en adelante el deporte se decide por votación.
      const { rows: [semana] } = await pool.query(
        'SELECT numero_semana FROM competencia_semanas WHERE id=$1 AND competencia_id=$2',
        [parseInt(s.id), id]
      );
      if (!semana || semana.numero_semana !== 1) continue;
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

// GET /competencias/:id/semanas/:semanaId/votacion — estado de la votación del deporte de una semana
router.get('/:id/semanas/:semanaId/votacion', authMiddleware, async (req, res) => {
  const { id, semanaId } = req.params;
  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [semana] } = await pool.query(
      `SELECT id, numero_semana, deporte_semana_nombre,
              TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencia_semanas WHERE id=$1 AND competencia_id=$2`,
      [semanaId, id]
    );
    if (!semana) return res.status(404).json({ error: 'Semana no encontrada' });
    if (semana.numero_semana === 1) return res.status(400).json({ error: 'La semana 1 la define el creador, no se vota' });

    const { rows: [anterior] } = await pool.query(
      `SELECT TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencia_semanas WHERE competencia_id=$1 AND numero_semana=$2`,
      [id, semana.numero_semana - 1]
    );
    const hoy = new Date().toISOString().slice(0, 10);
    const cerrada = !!semana.deporte_semana_nombre || (anterior && hoy > anterior.fecha_fin);

    const { rows: usados } = await pool.query(
      `SELECT DISTINCT deporte_semana_nombre AS nombre FROM competencia_semanas
       WHERE competencia_id=$1 AND id != $2 AND deporte_semana_nombre IS NOT NULL`,
      [id, semanaId]
    );
    const nombresUsados = new Set(usados.map(u => u.nombre));

    const { rows: deportesRaw } = await pool.query(
      `SELECT d.id, d.nombre, d.icono,
              (SELECT COUNT(*) FROM votos_deporte_semana v WHERE v.competencia_semana_id=$1 AND v.deporte_id=d.id)::int AS votos
       FROM deportes d ORDER BY d.nombre`,
      [semanaId]
    );
    let deportes = deportesRaw.map(d => ({ ...d, ya_usado: nombresUsados.has(d.nombre) }));
    // Si ya se usaron todos, se reabre el catálogo completo (ningún deporte queda marcado como usado).
    if (deportes.every(d => d.ya_usado)) deportes = deportes.map(d => ({ ...d, ya_usado: false }));

    const { rows: [miVoto] } = await pool.query(
      'SELECT deporte_id FROM votos_deporte_semana WHERE competencia_semana_id=$1 AND user_id=$2',
      [semanaId, req.user.id]
    );

    let ganadorDeporteId = null;
    if (semana.deporte_semana_nombre) {
      ganadorDeporteId = deportesRaw.find(d => d.nombre === semana.deporte_semana_nombre)?.id ?? null;
    }

    res.json({
      deportes,
      mi_voto_deporte_id: miVoto?.deporte_id ?? null,
      cerrada,
      ganador_deporte_id: ganadorDeporteId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la votación' });
  }
});

// POST /competencias/:id/semanas/:semanaId/votar — votar (o cambiar voto) por el deporte de una semana futura
router.post('/:id/semanas/:semanaId/votar', authMiddleware, async (req, res) => {
  const { id, semanaId } = req.params;
  const { deporte_id } = req.body;

  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });
    if (!deporte_id) return res.status(400).json({ error: 'deporte_id es obligatorio' });

    const { rows: [semana] } = await pool.query(
      `SELECT id, numero_semana, deporte_semana_nombre,
              TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencia_semanas WHERE id=$1 AND competencia_id=$2`,
      [semanaId, id]
    );
    if (!semana) return res.status(404).json({ error: 'Semana no encontrada' });
    if (semana.numero_semana === 1) return res.status(400).json({ error: 'La semana 1 la define el creador, no se vota' });
    if (semana.deporte_semana_nombre) return res.status(400).json({ error: 'La votación de esta semana ya cerró' });

    const { rows: [anterior] } = await pool.query(
      `SELECT TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencia_semanas WHERE competencia_id=$1 AND numero_semana=$2`,
      [id, semana.numero_semana - 1]
    );
    const hoy = new Date().toISOString().slice(0, 10);
    if (anterior && hoy > anterior.fecha_fin) return res.status(400).json({ error: 'La votación de esta semana ya cerró' });

    const { rows: [deporte] } = await pool.query('SELECT id FROM deportes WHERE id=$1', [deporte_id]);
    if (!deporte) return res.status(404).json({ error: 'Deporte no encontrado' });

    await pool.query(
      `INSERT INTO votos_deporte_semana (competencia_semana_id, user_id, deporte_id)
       VALUES ($1,$2,$3)
       ON CONFLICT (competencia_semana_id, user_id) DO UPDATE SET deporte_id=$3, created_at=NOW()`,
      [semanaId, req.user.id, deporte_id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al votar' });
  }
});

// ── CHALLENGES ───────────────────────────────────────────────────────────────

// POST /competencias/:id/challenges — agregar un challenge nuevo (admin del grupo), en cualquier momento
router.post('/:id/challenges', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { texto, puntos, numero_semana } = req.body;

  if (!texto?.trim()) return res.status(400).json({ error: 'El texto del challenge es obligatorio' });

  try {
    const { rows: [comp] } = await pool.query('SELECT id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede agregar challenges' });

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

// PUT /competencias/:id/challenges/:challengeId — editar un challenge (admin del grupo)
router.put('/:id/challenges/:challengeId', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
  const { texto, puntos, numero_semana } = req.body;

  if (!texto?.trim()) return res.status(400).json({ error: 'El texto del challenge es obligatorio' });

  try {
    const { rows: [comp] } = await pool.query('SELECT id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede editar challenges' });

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

// DELETE /competencias/:id/challenges/:challengeId — eliminar un challenge (admin del grupo)
router.delete('/:id/challenges/:challengeId', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
  try {
    const { rows: [comp] } = await pool.query('SELECT id FROM competencias WHERE id=$1', [id]);
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });
    if (!(await esAdminDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede eliminar challenges' });

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
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

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

// DELETE /competencias/:id/challenges/:challengeId/completar — desmarcar un challenge (deshacer)
router.delete('/:id/challenges/:challengeId/completar', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;

  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    await pool.query(
      `DELETE FROM challenge_completados WHERE challenge_id=$1 AND user_id=$2`,
      [challengeId, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desmarcar el challenge' });
  }
});

// GET /competencias/:id/challenges/:challengeId/completados — quién completó este challenge
router.get('/:id/challenges/:challengeId/completados', authMiddleware, async (req, res) => {
  const { id, challengeId } = req.params;
  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

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
// Solo cuentan actividades vinculadas a esta competencia (no todas las del usuario).
router.get('/:id/ranking', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional

  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: participantes } = await pool.query(
      `SELECT u.id, u.nombre, u.apellido, u.apodo, COALESCE(u.apodo, u.nombre) AS nombre_display,
              u.foto_perfil_url, gp.equipo_id
       FROM competencias c
       JOIN grupo_participantes gp ON gp.grupo_id = c.grupo_id
       JOIN users u ON u.id = gp.user_id
       WHERE c.id = $1`,
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
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

    const { rows: [comp] } = await pool.query('SELECT grupo_id FROM competencias WHERE id=$1', [id]);

    const { rows: equipos } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE grupo_id=$1',
      [comp.grupo_id]
    );
    const { rows: participantes } = await pool.query(
      'SELECT user_id, equipo_id FROM grupo_participantes WHERE grupo_id=$1 AND equipo_id IS NOT NULL',
      [comp.grupo_id]
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
router.get('/:id/actividades', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { mes } = req.query; // YYYY-MM opcional
  try {
    if (!(await esParticipanteDeCompetencia(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de esta competencia' });

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
module.exports.calcularSemanas = calcularSemanas;
