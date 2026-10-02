const pool = require('../db/pool');

async function esAdminDeCompetencia(competenciaId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM competencias c
     JOIN grupo_admins ga ON ga.grupo_id = c.grupo_id AND ga.user_id = $2
     WHERE c.id = $1`,
    [competenciaId, userId]
  );
  return rows.length > 0;
}

async function esAdminDeGrupo(grupoId, userId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM grupo_admins WHERE grupo_id=$1 AND user_id=$2',
    [grupoId, userId]
  );
  return rows.length > 0;
}

// Devuelve { equipo_id } si userId participa de la competencia (vía el grupo dueño), o null si no.
async function esParticipanteDeCompetencia(competenciaId, userId) {
  const { rows } = await pool.query(
    `SELECT gp.equipo_id FROM competencias c
     JOIN grupo_participantes gp ON gp.grupo_id = c.grupo_id AND gp.user_id = $2
     WHERE c.id = $1`,
    [competenciaId, userId]
  );
  return rows[0] ?? null;
}

// Devuelve { equipo_id } si userId participa del grupo, o null si no.
async function esParticipanteDeGrupo(grupoId, userId) {
  const { rows } = await pool.query(
    'SELECT equipo_id FROM grupo_participantes WHERE grupo_id=$1 AND user_id=$2',
    [grupoId, userId]
  );
  return rows[0] ?? null;
}

// Devuelve true si userIdA y userIdB comparten al menos un grupo (para ver el perfil/historial de
// un compañero sin ser admin de nada en particular).
async function comparteGrupoCon(userIdA, userIdB) {
  const { rows } = await pool.query(
    `SELECT 1 FROM grupo_participantes gp1
     JOIN grupo_participantes gp2 ON gp2.grupo_id = gp1.grupo_id
     WHERE gp1.user_id = $1 AND gp2.user_id = $2`,
    [userIdA, userIdB]
  );
  return rows.length > 0;
}

module.exports = { esAdminDeCompetencia, esAdminDeGrupo, esParticipanteDeCompetencia, esParticipanteDeGrupo, comparteGrupoCon };
