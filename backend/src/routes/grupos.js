const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { esAdminDeGrupo, esParticipanteDeGrupo } = require('../lib/permisos');
const { calcularSemanas } = require('./competencias');

const router = express.Router();

// Genera un PIN de 6 dígitos único
async function generarPin() {
  for (let i = 0; i < 20; i++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { rows } = await pool.query('SELECT 1 FROM grupos WHERE pin=$1', [pin]);
    if (!rows.length) return pin;
  }
  throw new Error('No se pudo generar un PIN único');
}

async function creaCompetenciaEnTransaccion(client, grupoId, body) {
  const {
    nombre, ponderadores,
    fecha_inicio, fecha_fin,
    bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts,
    semanas, challenges,
  } = body;

  const { rows: [comp] } = await client.query(
    `INSERT INTO competencias (grupo_id, nombre, fecha_inicio, fecha_fin, bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [grupoId, nombre.trim(), fecha_inicio || null, fecha_fin || null,
      parseFloat(bonus_1_companero_pts) || 0, parseFloat(bonus_2_companeros_pts) || 0, parseFloat(bonus_3mas_companeros_pts) || 0]
  );

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

  // Semanas: se calculan automáticamente a partir del rango de fechas; se completan con
  // lo que el frontend haya mandado (deporte de la semana 1), el resto queda en NULL.
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

  return comp;
}

// GET /grupos — mis grupos, con sus competencias en_curso y las últimas finalizadas embebidas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows: grupos } = await pool.query(
      `SELECT g.id, g.nombre, g.pin, g.creador_id, g.created_at,
              (SELECT COUNT(*) FROM grupo_participantes gp2 WHERE gp2.grupo_id = g.id) AS participantes,
              EXISTS(SELECT 1 FROM grupo_admins ga WHERE ga.grupo_id = g.id AND ga.user_id = $1) AS soy_admin
       FROM grupos g
       JOIN grupo_participantes gp ON gp.grupo_id = g.id AND gp.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    const { rows: competenciasEnCurso } = await pool.query(
      `SELECT c.* FROM competencias c WHERE c.grupo_id = ANY($1::int[]) AND c.estado = 'en_curso' ORDER BY c.created_at DESC`,
      [grupos.map(g => g.id)]
    );
    const enCursoPorGrupo = new Map();
    for (const c of competenciasEnCurso) {
      if (!enCursoPorGrupo.has(c.grupo_id)) enCursoPorGrupo.set(c.grupo_id, []);
      enCursoPorGrupo.get(c.grupo_id).push(c);
    }

    // Últimas 5 finalizadas por grupo (para mostrar un resumen corto en el selector sin traer todo el historial).
    const { rows: finalizadasRecientes } = await pool.query(
      `SELECT * FROM (
         SELECT c.*, ROW_NUMBER() OVER (PARTITION BY c.grupo_id ORDER BY c.created_at DESC) AS rn
         FROM competencias c WHERE c.grupo_id = ANY($1::int[]) AND c.estado = 'finalizada'
       ) t WHERE rn <= 5 ORDER BY grupo_id, created_at DESC`,
      [grupos.map(g => g.id)]
    );
    const finalizadasPorGrupo = new Map();
    for (const c of finalizadasRecientes) {
      if (!finalizadasPorGrupo.has(c.grupo_id)) finalizadasPorGrupo.set(c.grupo_id, []);
      finalizadasPorGrupo.get(c.grupo_id).push(c);
    }
    const { rows: totalFinalizadas } = await pool.query(
      `SELECT grupo_id, COUNT(*)::int AS total FROM competencias WHERE grupo_id = ANY($1::int[]) AND estado = 'finalizada' GROUP BY grupo_id`,
      [grupos.map(g => g.id)]
    );
    const totalFinalizadasPorGrupo = new Map(totalFinalizadas.map(r => [r.grupo_id, r.total]));

    res.json(grupos.map(g => ({
      ...g,
      competencias_en_curso: enCursoPorGrupo.get(g.id) ?? [],
      competencias_finalizadas_recientes: finalizadasPorGrupo.get(g.id) ?? [],
      total_competencias_finalizadas: totalFinalizadasPorGrupo.get(g.id) ?? 0,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar grupos' });
  }
});

// POST /grupos — crear grupo + su primera competencia
router.post('/', authMiddleware, async (req, res) => {
  const { nombre, fecha_inicio, fecha_fin } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  if ((fecha_inicio && !fecha_fin) || (!fecha_inicio && fecha_fin))
    return res.status(400).json({ error: 'Definí fecha de inicio y fin, o ninguna de las dos' });
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio)
    return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const pin = await generarPin();
    const { rows: [grupo] } = await client.query(
      `INSERT INTO grupos (nombre, pin, creador_id) VALUES ($1,$2,$3) RETURNING *`,
      [nombre.trim(), pin, req.user.id]
    );

    await client.query(
      `INSERT INTO grupo_participantes (grupo_id, user_id) VALUES ($1,$2)`,
      [grupo.id, req.user.id]
    );
    await client.query(
      `INSERT INTO grupo_admins (grupo_id, user_id) VALUES ($1,$2)`,
      [grupo.id, req.user.id]
    );

    // Equipos (solo nombres — la asignación de participantes se hace después, cuando haya gente unida)
    const { equipos_nombres } = req.body;
    if (Array.isArray(equipos_nombres)) {
      for (const nombreEquipo of equipos_nombres) {
        if (!nombreEquipo?.trim()) continue;
        await client.query(
          `INSERT INTO equipos (grupo_id, nombre) VALUES ($1,$2) ON CONFLICT (grupo_id, nombre) DO NOTHING`,
          [grupo.id, nombreEquipo.trim()]
        );
      }
    }

    const competencia = await creaCompetenciaEnTransaccion(client, grupo.id, req.body);

    await client.query('COMMIT');
    res.status(201).json({ ...grupo, competencias_en_curso: [competencia] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear grupo' });
  } finally {
    client.release();
  }
});

// POST /grupos/join — unirse a un grupo por PIN
router.post('/join', authMiddleware, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN requerido' });

  try {
    const { rows: [grupo] } = await pool.query('SELECT * FROM grupos WHERE pin=$1', [String(pin).trim()]);
    if (!grupo) return res.status(404).json({ error: 'PIN inválido, grupo no encontrado' });

    await pool.query(
      `INSERT INTO grupo_participantes (grupo_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [grupo.id, req.user.id]
    );

    res.json({ grupo_id: grupo.id, nombre: grupo.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al unirse al grupo' });
  }
});

// GET /grupos/:id — detalle del grupo
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const part = await esParticipanteDeGrupo(id, req.user.id);
    if (!part) return res.status(403).json({ error: 'No eres participante de este grupo' });

    const { rows: [grupo] } = await pool.query('SELECT * FROM grupos WHERE id=$1', [id]);
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });

    const { rows: participantesRaw } = await pool.query(
      `SELECT u.id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, gp.equipo_id,
              EXISTS(SELECT 1 FROM grupo_admins ga WHERE ga.grupo_id=$1 AND ga.user_id=u.id) AS es_admin
       FROM grupo_participantes gp JOIN users u ON u.id=gp.user_id WHERE gp.grupo_id=$1`,
      [id]
    );

    const { rows: equipos } = await pool.query(
      'SELECT id, nombre, color FROM equipos WHERE grupo_id=$1 ORDER BY id',
      [id]
    );

    const { rows: competenciasEnCurso } = await pool.query(
      `SELECT id, nombre, fecha_inicio, fecha_fin FROM competencias WHERE grupo_id=$1 AND estado='en_curso' ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      ...grupo,
      participantes: participantesRaw,
      equipos,
      mi_equipo_id: part.equipo_id,
      soy_admin: await esAdminDeGrupo(id, req.user.id),
      competencias_en_curso: competenciasEnCurso,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el grupo' });
  }
});

// GET /grupos/:id/competencias — historial completo (pasadas + actual)
router.get('/:id/competencias', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await esParticipanteDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de este grupo' });

    const { rows } = await pool.query(
      `SELECT id, nombre, estado,
              TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin,
              created_at
       FROM competencias WHERE grupo_id=$1 ORDER BY created_at DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el historial de competencias' });
  }
});

// POST /grupos/:id/competencias — crear la siguiente competencia del grupo (admin)
router.post('/:id/competencias', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

  if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede crear una competencia' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const competencia = await creaCompetenciaEnTransaccion(client, id, req.body);
    await client.query('COMMIT');
    res.status(201).json(competencia);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear la competencia' });
  } finally {
    client.release();
  }
});

// POST /grupos/:id/competencias/:compId/cerrar — cierra una competencia en curso puntual (admin)
router.post('/:id/competencias/:compId/cerrar', authMiddleware, async (req, res) => {
  const { id, compId } = req.params;
  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede cerrar la competencia' });

    const { rows: [comp] } = await pool.query(
      `UPDATE competencias SET estado='finalizada' WHERE id=$1 AND grupo_id=$2 AND estado='en_curso' RETURNING *`,
      [compId, id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada o ya estaba cerrada' });

    res.json(comp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar la competencia' });
  }
});

// DELETE /grupos/:id/competencias/:compId — borra una competencia puntual (admin). El grupo y sus
// otras competencias no se ven afectados; las semanas/challenges/ponderadores/vínculos de actividad
// de ESTA competencia se borran en cascada (ON DELETE CASCADE), las actividades en sí no se tocan.
router.delete('/:id/competencias/:compId', authMiddleware, async (req, res) => {
  const { id, compId } = req.params;
  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede borrar una competencia' });

    const { rows: [comp] } = await pool.query(
      `DELETE FROM competencias WHERE id=$1 AND grupo_id=$2 RETURNING id, nombre`,
      [compId, id]
    );
    if (!comp) return res.status(404).json({ error: 'Competencia no encontrada' });

    res.json({ ok: true, id: comp.id, nombre: comp.nombre });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al borrar la competencia' });
  }
});

// ── EQUIPOS (del grupo) ──────────────────────────────────────────────────────

// GET /grupos/:id/equipos — lista equipos con sus miembros
router.get('/:id/equipos', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await esParticipanteDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'No eres participante de este grupo' });

    const { rows: equipos } = await pool.query('SELECT id, nombre, color FROM equipos WHERE grupo_id=$1 ORDER BY id', [id]);
    const { rows: miembros } = await pool.query(
      `SELECT u.id, u.nombre, COALESCE(u.apodo, u.nombre) AS nombre_display, u.foto_perfil_url, gp.equipo_id
       FROM grupo_participantes gp JOIN users u ON u.id=gp.user_id WHERE gp.grupo_id=$1`,
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

// PUT /grupos/:id/equipos — reemplaza el set de equipos (admin)
router.put('/:id/equipos', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { equipos } = req.body; // [{ id?, nombre, color? }]

  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede modificar equipos' });
    if (!Array.isArray(equipos)) return res.status(400).json({ error: 'equipos debe ser un array' });

    const idsEnviados = equipos.filter(e => e.id != null).map(e => parseInt(e.id));

    if (idsEnviados.length) {
      await pool.query(`DELETE FROM equipos WHERE grupo_id=$1 AND id != ALL($2::int[])`, [id, idsEnviados]);
    } else {
      await pool.query('DELETE FROM equipos WHERE grupo_id=$1', [id]);
    }

    for (const e of equipos) {
      if (!e.nombre?.trim()) continue;
      if (e.id != null) {
        await pool.query('UPDATE equipos SET nombre=$1, color=$2 WHERE id=$3 AND grupo_id=$4', [e.nombre.trim(), e.color || null, parseInt(e.id), id]);
      } else {
        await pool.query('INSERT INTO equipos (grupo_id, nombre, color) VALUES ($1,$2,$3)', [id, e.nombre.trim(), e.color || null]);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Nombre de equipo duplicado' });
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar equipos' });
  }
});

// PUT /grupos/:id/equipos/asignaciones — asigna participantes a equipos (admin)
router.put('/:id/equipos/asignaciones', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { asignaciones } = req.body; // [{ user_id, equipo_id }] — equipo_id puede ser null

  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede asignar equipos' });
    if (!Array.isArray(asignaciones)) return res.status(400).json({ error: 'asignaciones debe ser un array' });

    for (const { user_id, equipo_id } of asignaciones) {
      if (user_id == null) continue;
      const part = await esParticipanteDeGrupo(id, user_id);
      if (!part) continue; // ignora usuarios que no son participantes
      if (equipo_id != null) {
        const { rows: [eq] } = await pool.query('SELECT 1 FROM equipos WHERE id=$1 AND grupo_id=$2', [equipo_id, id]);
        if (!eq) continue; // ignora equipo que no pertenece a este grupo
      }
      await pool.query('UPDATE grupo_participantes SET equipo_id=$1 WHERE grupo_id=$2 AND user_id=$3', [equipo_id ?? null, id, user_id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar equipos' });
  }
});

// ── ADMINS ───────────────────────────────────────────────────────────────────

// POST /grupos/:id/admins — promover a un participante a admin (cualquier admin puede)
router.post('/:id/admins', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id es obligatorio' });

  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede promover a otro admin' });

    const part = await esParticipanteDeGrupo(id, user_id);
    if (!part) return res.status(400).json({ error: 'Ese usuario no es participante de este grupo' });

    await pool.query(
      `INSERT INTO grupo_admins (grupo_id, user_id, promovido_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [id, user_id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al promover admin' });
  }
});

// DELETE /grupos/:id/admins/:userId — quitar admin a alguien (cualquier admin puede)
router.delete('/:id/admins/:userId', authMiddleware, async (req, res) => {
  const { id, userId } = req.params;
  try {
    if (!(await esAdminDeGrupo(id, req.user.id))) return res.status(403).json({ error: 'Solo un admin puede quitar a otro admin' });

    await pool.query('DELETE FROM grupo_admins WHERE grupo_id=$1 AND user_id=$2', [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al quitar admin' });
  }
});

module.exports = router;
