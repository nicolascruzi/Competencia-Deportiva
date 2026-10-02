// Uso único: corrige actividad_competencias para reflejar la misma condición de fecha que ahora
// aplica vincularCompetencias (backend/src/routes/actividades.js) — una actividad se vincula a una
// competencia en_curso de un grupo del que el usuario es participante solo si su fecha cae dentro de
// fecha_inicio..fecha_fin de esa competencia (si la competencia no tiene fechas, no hay restricción).
//
// Esto corrige un puñado de actividades que quedaron mal vinculadas (o sin vincular) durante una
// ventana de deploy del 2026-10-01, cuando el modelo de Grupos todavía no estaba completamente activo.
//
// Agrega los vínculos faltantes (actividad dentro de rango, sin vínculo) y quita los vínculos de más
// (vínculo existente cuya actividad cae fuera del rango de fechas de la competencia).
//
// Local:      node scripts/corregir-vinculos-actividad-competencia.js
// Producción: railway ssh --service Competencia-Deportiva -- node scripts/corregir-vinculos-actividad-competencia.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: faltantes } = await client.query(`
      WITH deberia AS (
        SELECT a.id AS actividad_id, c.id AS competencia_id
        FROM actividades a
        JOIN grupo_participantes gp ON gp.user_id = a.user_id
        JOIN competencias c ON c.grupo_id = gp.grupo_id AND c.estado = 'en_curso'
        WHERE c.fecha_inicio IS NULL OR c.fecha_fin IS NULL
           OR a.fecha BETWEEN c.fecha_inicio AND c.fecha_fin
      )
      SELECT d.actividad_id, d.competencia_id
      FROM deberia d
      LEFT JOIN actividad_competencias ac
        ON ac.actividad_id = d.actividad_id AND ac.competencia_id = d.competencia_id
      WHERE ac.competencia_id IS NULL
    `);

    for (const f of faltantes) {
      await client.query(
        `INSERT INTO actividad_competencias (actividad_id, competencia_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [f.actividad_id, f.competencia_id]
      );
    }
    console.log(`Vínculos agregados: ${faltantes.length}`);
    for (const f of faltantes) console.log(`  + actividad ${f.actividad_id} <-> competencia ${f.competencia_id}`);

    const { rows: deMas } = await client.query(`
      SELECT ac.actividad_id, ac.competencia_id
      FROM actividad_competencias ac
      JOIN actividades a ON a.id = ac.actividad_id
      JOIN competencias c ON c.id = ac.competencia_id
      WHERE c.fecha_inicio IS NOT NULL AND c.fecha_fin IS NOT NULL
        AND NOT (a.fecha BETWEEN c.fecha_inicio AND c.fecha_fin)
    `);

    for (const d of deMas) {
      await client.query(
        `DELETE FROM actividad_competencias WHERE actividad_id=$1 AND competencia_id=$2`,
        [d.actividad_id, d.competencia_id]
      );
    }
    console.log(`Vínculos quitados: ${deMas.length}`);
    for (const d of deMas) console.log(`  - actividad ${d.actividad_id} <-> competencia ${d.competencia_id}`);

    await client.query('COMMIT');
    console.log('OK — corrección de vínculos completada.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error, se hizo rollback:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
