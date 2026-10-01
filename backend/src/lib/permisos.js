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

module.exports = { esAdminDeCompetencia, esAdminDeGrupo, esParticipanteDeCompetencia, esParticipanteDeGrupo };
