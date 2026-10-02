// Uso único: remapea las filas de competencia_semanas (generadas con el algoritmo viejo, bloques de
// 7 días exactos desde fecha_inicio) al nuevo algoritmo de semanas de CALENDARIO (lunes-domingo).
//
// Para cada competencia con semanas existentes, calcula la nueva grilla calendario y reasigna cada
// fila vieja (conservando su id, para no romper challenges.semana_id ni
// votos_deporte_semana.competencia_semana_id) al bloque nuevo con mayor solapamiento de días. Si dos
// filas viejas caen en el mismo bloque nuevo, se fusionan: se conserva la que tiene
// deporte_semana_nombre (o la de menor id si ninguna lo tiene), se reasignan los challenges/votos de
// la descartada a la conservada, y se borra la descartada. Los bloques nuevos sin ninguna fila vieja
// mapeada se insertan vacíos.
//
// Local:      node scripts/migrar-semanas-a-calendario.js
// Producción: railway ssh --service Competencia-Deportiva -- node scripts/migrar-semanas-a-calendario.js
require('dotenv').config();
const pool = require('../src/db/pool');
const { calcularSemanas } = require('../src/routes/competencias');

function overlapDias(aInicio, aFin, bInicio, bFin) {
  const start = aInicio > bInicio ? aInicio : bInicio;
  const end   = aFin    < bFin    ? aFin    : bFin;
  if (start > end) return 0;
  const ms = new Date(end + 'T00:00:00Z') - new Date(start + 'T00:00:00Z');
  return Math.round(ms / 86400000) + 1;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: competencias } = await client.query(
      `SELECT id, nombre, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin
       FROM competencias WHERE fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL ORDER BY id`
    );

    for (const comp of competencias) {
      const { rows: viejas } = await client.query(
        `SELECT id, numero_semana, TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS fecha_inicio,
                TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fecha_fin, deporte_semana_nombre, deporte_semana_ponderador_extra
         FROM competencia_semanas WHERE competencia_id=$1 ORDER BY fecha_inicio`,
        [comp.id]
      );
      if (viejas.length === 0) continue;

      const nuevas = calcularSemanas(comp.fecha_inicio, comp.fecha_fin);

      // Matching greedy global 1 a 1 (bloque nuevo <-> fila vieja): se listan todos los pares con
      // solapamiento > 0, se ordenan de mayor a menor overlap, y se van asignando mientras ambos
      // lados sigan libres. Así ninguna fila vieja puede terminar "ganada" por dos bloques distintos
      // (lo que dejaría al bloque perdedor sin fila y sin insertarse vacío).
      const pares = [];
      nuevas.forEach((n, i) => {
        viejas.forEach(v => {
          const ov = overlapDias(n.fecha_inicio, n.fecha_fin, v.fecha_inicio, v.fecha_fin);
          if (ov > 0) pares.push({ i, v, ov });
        });
      });
      pares.sort((a, b) => b.ov - a.ov);

      const asignadaA = new Map(); // indice de nuevas -> fila vieja elegida
      const usadas = new Set();    // ids de filas viejas ya asignadas a algún bloque
      const bloquesUsados = new Set();
      for (const { i, v } of pares) {
        if (bloquesUsados.has(i) || usadas.has(v.id)) continue;
        asignadaA.set(i, v);
        usadas.add(v.id);
        bloquesUsados.add(i);
      }

      let fusionadas = 0, nuevasVacias = 0, huerfanas = 0;

      for (let i = 0; i < nuevas.length; i++) {
        const n = nuevas[i];
        const elegida = asignadaA.get(i);

        if (!elegida) {
          await client.query(
            `INSERT INTO competencia_semanas (competencia_id, numero_semana, fecha_inicio, fecha_fin)
             VALUES ($1,$2,$3,$4)`,
            [comp.id, n.numero_semana, n.fecha_inicio, n.fecha_fin]
          );
          nuevasVacias++;
          continue;
        }

        await client.query(
          `UPDATE competencia_semanas SET numero_semana=$1, fecha_inicio=$2, fecha_fin=$3, updated_at=NOW() WHERE id=$4`,
          [n.numero_semana, n.fecha_inicio, n.fecha_fin, elegida.id]
        );
      }

      // Filas viejas que no fueron elegidas por ningún bloque nuevo (hubo más filas viejas que bloques
      // nuevos, p.ej. porque el algoritmo viejo generó más semanas para el mismo rango) -> fusionar
      // dentro de la fila que sí se conservó para el bloque con el que más se solapan, reasignando su
      // contenido antes de borrarlas.
      for (const v of viejas) {
        if (usadas.has(v.id)) continue;

        let mejorIdx = -1, mejorOverlap = 0;
        nuevas.forEach((n, i) => {
          if (!asignadaA.has(i)) return; // solo bloques que ya tienen una fila destino
          const ov = overlapDias(n.fecha_inicio, n.fecha_fin, v.fecha_inicio, v.fecha_fin);
          if (ov > mejorOverlap) { mejorOverlap = ov; mejorIdx = i; }
        });
        const destino = mejorIdx >= 0 ? asignadaA.get(mejorIdx) : null;
        if (!destino) { huerfanas++; continue; }

        // Si la huérfana tiene deporte configurado y la destino no, pasárselo.
        const { rows: [destinoRow] } = await client.query(
          'SELECT deporte_semana_nombre FROM competencia_semanas WHERE id=$1', [destino.id]
        );
        if (v.deporte_semana_nombre && !destinoRow.deporte_semana_nombre) {
          await client.query(
            `UPDATE competencia_semanas SET deporte_semana_nombre=$1, deporte_semana_ponderador_extra=$2, updated_at=NOW() WHERE id=$3`,
            [v.deporte_semana_nombre, v.deporte_semana_ponderador_extra, destino.id]
          );
        }
        await client.query('UPDATE challenges SET semana_id=$1 WHERE semana_id=$2', [destino.id, v.id]);
        await client.query(
          `INSERT INTO votos_deporte_semana (competencia_semana_id, user_id, deporte_id)
           SELECT $1, user_id, deporte_id FROM votos_deporte_semana WHERE competencia_semana_id=$2
           ON CONFLICT (competencia_semana_id, user_id) DO NOTHING`,
          [destino.id, v.id]
        );
        await client.query('DELETE FROM competencia_semanas WHERE id=$1', [v.id]);
        fusionadas++;
      }

      console.log(
        `#${comp.id} "${comp.nombre}": ${viejas.length} semana(s) vieja(s) -> ${nuevas.length} bloque(s) calendario `
        + `(${fusionadas} fusionada(s), ${nuevasVacias} nueva(s) vacía(s), ${huerfanas} huérfana(s) sin destino)`
      );
    }

    await client.query('COMMIT');
    console.log('OK — migración de semanas a calendario completada.');
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
