// Uso único: backfillea datos de competencias creadas ANTES del feature de equipos/challenges.
// - Fuerza fecha_inicio/fecha_fin en competencias que las tengan NULL, para que vuelvan a leerse "en curso".
// - Vincula actividades viejas (sin ninguna fila en actividad_competencias) a todas las competencias
//   en las que su dueño participaba, para que su ranking/feed vuelvan a mostrarlas.
//
// Local:      node scripts/backfill-equipos-competencias.js
// Producción: railway run node scripts/backfill-equipos-competencias.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: sinFechas } = await client.query(
      `SELECT id, nombre FROM competencias WHERE fecha_inicio IS NULL OR fecha_fin IS NULL`
    );
    console.log(`Competencias sin fecha (antes): ${sinFechas.length}`);
    sinFechas.forEach(c => console.log(`  - #${c.id} ${c.nombre}`));

    const { rowCount: fechasActualizadas } = await client.query(
      `UPDATE competencias
       SET fecha_inicio = CURRENT_DATE - INTERVAL '1 year',
           fecha_fin     = CURRENT_DATE + INTERVAL '1 year'
       WHERE fecha_inicio IS NULL OR fecha_fin IS NULL`
    );
    console.log(`✓ Fechas backfilleadas en ${fechasActualizadas} competencias`);

    const { rows: [{ count: sinVincularAntes }] } = await client.query(
      `SELECT COUNT(*)::int AS count FROM actividades a
       WHERE NOT EXISTS (SELECT 1 FROM actividad_competencias ac WHERE ac.actividad_id = a.id)`
    );
    console.log(`Actividades sin ninguna competencia vinculada (antes): ${sinVincularAntes}`);

    const { rowCount: vinculosInsertados } = await client.query(
      `INSERT INTO actividad_competencias (actividad_id, competencia_id)
       SELECT a.id, cp.competencia_id
       FROM actividades a
       JOIN competencia_participantes cp ON cp.user_id = a.user_id
       WHERE NOT EXISTS (SELECT 1 FROM actividad_competencias ac WHERE ac.actividad_id = a.id)
       ON CONFLICT DO NOTHING`
    );
    console.log(`✓ Insertadas ${vinculosInsertados} filas en actividad_competencias`);

    const { rows: [{ count: sinVincularDespues }] } = await client.query(
      `SELECT COUNT(*)::int AS count FROM actividades a
       WHERE NOT EXISTS (SELECT 1 FROM actividad_competencias ac WHERE ac.actividad_id = a.id)`
    );
    console.log(`Actividades que quedaron sin ninguna competencia (usuarios sin competencias — esperado): ${sinVincularDespues}`);

    await client.query('COMMIT');
    console.log('✓ Backfill completado');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error en backfill, se hizo rollback:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
