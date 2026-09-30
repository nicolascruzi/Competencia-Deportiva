const pool = require('../db/pool');

// CTEs compartidos para calcular puntos por persona dentro de una competencia:
// - acts_calc: puntos por actividad = minutos * ponderador_deporte_competencia * ponderador_extra_semana_si_aplica
//   Solo considera actividades vinculadas a la competencia vía actividad_competencias (una actividad puede
//   estar vinculada a varias competencias en curso a la vez — cambio de comportamiento respecto al ranking
//   histórico, que sumaba todas las actividades del usuario sin filtrar).
// - bonus_companeros: puntos fijos por actividad con al menos un compañero marcado (una vez por actividad).
// - challenge_pts: puntos fijos por cada challenge semanal completado (no filtra por mes: un challenge
//   completado cuenta para el total general, no solo para el mes en que se completó).
//
// $1 = competencia_id (usado en todos los CTEs). El filtro de mes solo aplica a acts_calc (mesFilter/mesParam).
function buildScoringCtes(mesFilter = '') {
  return `
  comp_pond AS (
    SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id = $1
  ),
  semanas AS (
    SELECT numero_semana, fecha_inicio, fecha_fin, deporte_semana_nombre, deporte_semana_ponderador_extra
    FROM competencia_semanas WHERE competencia_id = $1
  ),
  acts_calc AS (
    SELECT
      a.user_id,
      a.minutos * COALESCE(
        (SELECT ponderador FROM comp_pond WHERE deporte_nombre = a.deporte_nombre),
        a.ponderador
      ) * COALESCE(
        (SELECT s.deporte_semana_ponderador_extra FROM semanas s
         WHERE a.fecha BETWEEN s.fecha_inicio AND s.fecha_fin
           AND s.deporte_semana_nombre = a.deporte_nombre),
        1
      ) AS puntos_actividad,
      a.minutos AS minutos,
      a.id AS actividad_id
    FROM actividades a
    WHERE EXISTS (SELECT 1 FROM actividad_competencias ac2 WHERE ac2.actividad_id = a.id AND ac2.competencia_id = $1) ${mesFilter}
  ),
  bonus_companeros AS (
    SELECT a.user_id, COUNT(DISTINCT a.id)::numeric * c.bonus_companeros_pts AS pts_bonus
    FROM actividades a
    JOIN actividad_companeros ac ON ac.actividad_id = a.id
    JOIN competencias c ON c.id = $1
    WHERE EXISTS (SELECT 1 FROM actividad_competencias ac2 WHERE ac2.actividad_id = a.id AND ac2.competencia_id = $1) ${mesFilter}
    GROUP BY a.user_id, c.bonus_companeros_pts
  ),
  challenge_pts AS (
    SELECT cc.user_id, SUM(s.challenge_puntos) AS pts_challenge
    FROM challenge_completados cc
    JOIN competencia_semanas s ON s.id = cc.semana_id
    WHERE s.competencia_id = $1
    GROUP BY cc.user_id
  )
`;
}

// Devuelve Map<user_id, {actividades, minutos, puntos}> con el total (actividades + bonus + challenge)
// mesFilter/mesParam opcionales para acotar por mes (YYYY-MM), igual que el resto de la app.
async function getPuntosPorPersona(competenciaId, mes = null) {
  const mesFilter = mes ? `AND TO_CHAR(a.fecha, 'YYYY-MM') = $2` : '';
  const params = mes ? [competenciaId, mes] : [competenciaId];
  const ctes = buildScoringCtes(mesFilter);

  const { rows } = await pool.query(
    `WITH ${ctes}
     SELECT
       ac.user_id,
       COUNT(ac.actividad_id)::int AS actividades,
       COALESCE(SUM(ac.minutos), 0) AS minutos,
       COALESCE(SUM(ac.puntos_actividad), 0) AS puntos_actividades
     FROM acts_calc ac
     GROUP BY ac.user_id`,
    params
  );
  const { rows: bonusRows } = await pool.query(
    `WITH ${ctes} SELECT user_id, pts_bonus FROM bonus_companeros`,
    params
  );
  const { rows: challengeRows } = await pool.query(
    `WITH ${ctes} SELECT user_id, pts_challenge FROM challenge_pts`,
    // challenge_pts no usa mesFilter (no depende de acts_calc), pero comparte los mismos params posicionales
    params
  );

  const map = new Map();
  for (const r of rows) {
    map.set(r.user_id, { actividades: r.actividades, minutos: parseFloat(r.minutos), puntos: parseFloat(r.puntos_actividades) });
  }
  for (const r of bonusRows) {
    const cur = map.get(r.user_id) ?? { actividades: 0, minutos: 0, puntos: 0 };
    cur.puntos += parseFloat(r.pts_bonus);
    map.set(r.user_id, cur);
  }
  for (const r of challengeRows) {
    const cur = map.get(r.user_id) ?? { actividades: 0, minutos: 0, puntos: 0 };
    cur.puntos += parseFloat(r.pts_challenge);
    map.set(r.user_id, cur);
  }
  return map;
}

module.exports = { getPuntosPorPersona };
