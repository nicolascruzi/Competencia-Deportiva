// Uso único: divide la competencia #3 ("Nanão Cup", grupo #3) en 4 competencias por período,
// reasignando las actividades existentes por fecha. La competencia original #3 queda como la
// competencia de Junio+Julio (se renombra y se le acortan las fechas); se crean 3 competencias
// nuevas (Agosto, Septiembre, Octubre) con la misma configuración de ponderadores/bonus.
//
// Local:      node scripts/split-nanaocop-por-mes.js
// Producción: railway ssh --service Competencia-Deportiva -- node scripts/split-nanaocop-por-mes.js
require('dotenv').config();
const pool = require('../src/db/pool');

const GRUPO_ID = 3;
const COMPETENCIA_ORIGINAL_ID = 3;
const ADMIN_USER_ID = 1; // creador/admin del grupo, dueño de los inserts de ponderadores

const PERIODOS = [
  { nombre: 'Junio - Julio 2026', fecha_inicio: '2026-06-01', fecha_fin: '2026-07-31', esOriginal: true },
  { nombre: 'Agosto 2026',        fecha_inicio: '2026-08-01', fecha_fin: '2026-08-31' },
  { nombre: 'Septiembre 2026',    fecha_inicio: '2026-09-01', fecha_fin: '2026-09-30', recibeChallenge: true },
  { nombre: 'Octubre 2026',       fecha_inicio: '2026-10-01', fecha_fin: '2027-09-30', esEnCurso: true },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [original] } = await client.query('SELECT * FROM competencias WHERE id=$1', [COMPETENCIA_ORIGINAL_ID]);
    if (!original || original.grupo_id !== GRUPO_ID) throw new Error('La competencia original no coincide con lo esperado, abortando.');

    const { rows: ponderadores } = await client.query(
      'SELECT deporte_nombre, ponderador FROM competencia_deportes WHERE competencia_id=$1',
      [COMPETENCIA_ORIGINAL_ID]
    );
    const { rows: challengesSinSemana } = await client.query(
      'SELECT id, texto, puntos FROM challenges WHERE competencia_id=$1 AND semana_id IS NULL',
      [COMPETENCIA_ORIGINAL_ID]
    );

    console.log(`Original: #${original.id} "${original.nombre}" — ${ponderadores.length} ponderadores, ${challengesSinSemana.length} challenge(s) libre(s)`);

    // Las 57 semanas viejas de la #3 (numero_semana 1..57, fechas de septiembre en adelante) se
    // borran ANTES de generar las semanas nuevas del período Junio-Julio que reutiliza este mismo
    // id — si no, el ON CONFLICT (competencia_id, numero_semana) de la generación de abajo pisaría
    // silenciosamente contra esos números viejos y las semanas 1..9 de Junio-Julio no se crearían.
    // Los challenges con semana_id apuntando a esas semanas quedan con semana_id NULL (ON DELETE SET NULL).
    await client.query('DELETE FROM competencia_semanas WHERE competencia_id=$1', [COMPETENCIA_ORIGINAL_ID]);

    // id de competencia por período (la de "esOriginal" reutiliza el id existente #3)
    const idPorPeriodo = {};

    for (const periodo of PERIODOS) {
      let compId;
      if (periodo.esOriginal) {
        await client.query(
          `UPDATE competencias SET nombre=$1, fecha_inicio=$2, fecha_fin=$3, estado='finalizada' WHERE id=$4`,
          [periodo.nombre, periodo.fecha_inicio, periodo.fecha_fin, COMPETENCIA_ORIGINAL_ID]
        );
        compId = COMPETENCIA_ORIGINAL_ID;
        console.log(`✓ #${compId} renombrada a "${periodo.nombre}" (${periodo.fecha_inicio} → ${periodo.fecha_fin}), finalizada`);
      } else {
        const { rows: [nueva] } = await client.query(
          `INSERT INTO competencias (grupo_id, nombre, fecha_inicio, fecha_fin, estado,
             bonus_1_companero_pts, bonus_2_companeros_pts, bonus_3mas_companeros_pts, bonus_deporte_semana_extra)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            GRUPO_ID, periodo.nombre, periodo.fecha_inicio, periodo.fecha_fin,
            periodo.esEnCurso ? 'en_curso' : 'finalizada',
            original.bonus_1_companero_pts, original.bonus_2_companeros_pts,
            original.bonus_3mas_companeros_pts, original.bonus_deporte_semana_extra,
          ]
        );
        compId = nueva.id;
        console.log(`✓ #${compId} creada "${periodo.nombre}" (${periodo.fecha_inicio} → ${periodo.fecha_fin}), ${periodo.esEnCurso ? 'en_curso' : 'finalizada'}`);

        for (const p of ponderadores) {
          await client.query(
            `INSERT INTO competencia_deportes (competencia_id, deporte_nombre, ponderador) VALUES ($1,$2,$3)`,
            [compId, p.deporte_nombre, p.ponderador]
          );
        }
      }
      idPorPeriodo[periodo.nombre] = compId;

      // Generar semanas del período (bloques de 7 días exactos, mismo patrón que calcularSemanas en competencias.js)
      let cursor = new Date(periodo.fecha_inicio + 'T00:00:00Z');
      const end = new Date(periodo.fecha_fin + 'T00:00:00Z');
      let numero = 1;
      while (cursor <= end) {
        const semanaFin = new Date(cursor);
        semanaFin.setUTCDate(semanaFin.getUTCDate() + 6);
        if (semanaFin > end) semanaFin.setTime(end.getTime());
        await client.query(
          `INSERT INTO competencia_semanas (competencia_id, numero_semana, fecha_inicio, fecha_fin)
           VALUES ($1,$2,$3,$4) ON CONFLICT (competencia_id, numero_semana) DO NOTHING`,
          [compId, numero, cursor.toISOString().slice(0, 10), semanaFin.toISOString().slice(0, 10)]
        );
        cursor = new Date(semanaFin);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        numero++;
      }

      if (periodo.recibeChallenge) {
        for (const ch of challengesSinSemana) {
          await client.query(`UPDATE challenges SET competencia_id=$1 WHERE id=$2`, [compId, ch.id]);
          console.log(`✓ Challenge #${ch.id} "${ch.texto}" movido a "${periodo.nombre}" (#${compId})`);
        }
      }
    }

    // Reasignar actividades por fecha: borrar los vínculos actuales a la competencia original y
    // re-vincular cada actividad a la competencia del período que corresponda a su fecha.
    const { rows: actividades } = await client.query(
      `SELECT a.id, a.fecha FROM actividades a
       JOIN actividad_competencias ac ON ac.actividad_id=a.id
       WHERE ac.competencia_id=$1`,
      [COMPETENCIA_ORIGINAL_ID]
    );
    console.log(`Reasignando ${actividades.length} actividades...`);

    await client.query(`DELETE FROM actividad_competencias WHERE competencia_id=$1`, [COMPETENCIA_ORIGINAL_ID]);

    const conteoPorPeriodo = {};
    for (const act of actividades) {
      const fecha = act.fecha.toISOString().slice(0, 10);
      const periodo = PERIODOS.find(p => fecha >= p.fecha_inicio && fecha <= p.fecha_fin);
      if (!periodo) {
        console.warn(`⚠ Actividad #${act.id} (fecha ${fecha}) no cae en ningún período, se omite`);
        continue;
      }
      const compId = idPorPeriodo[periodo.nombre];
      await client.query(
        `INSERT INTO actividad_competencias (actividad_id, competencia_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [act.id, compId]
      );
      conteoPorPeriodo[periodo.nombre] = (conteoPorPeriodo[periodo.nombre] || 0) + 1;
    }
    console.log('Actividades por período:', JSON.stringify(conteoPorPeriodo, null, 2));

    await client.query('COMMIT');
    console.log('✓ Migración completada');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Error, se hizo rollback:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
