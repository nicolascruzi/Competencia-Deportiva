const pool = require('../db/pool');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function actualizarDeporteCatalogo(id, body) {
  const { nombre, icono, ponderador_default } = body;
  const nombreLimpio = nombre?.trim();
  if (!nombreLimpio) throw httpError(400, 'El nombre es obligatorio');

  const iconoFinal = icono?.trim() || '🏅';
  const ponderador = parseFloat(ponderador_default) || 1.0;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [actual] } = await client.query(
      'SELECT id, nombre FROM deportes WHERE id=$1 FOR UPDATE',
      [id]
    );
    if (!actual) throw httpError(404, 'Deporte no encontrado');

    const { rows: [duplicado] } = await client.query(
      'SELECT id FROM deportes WHERE LOWER(nombre) = LOWER($1) AND id != $2',
      [nombreLimpio, id]
    );
    if (duplicado) throw httpError(400, 'Ya existe otro deporte con ese nombre');

    if (actual.nombre !== nombreLimpio) {
      await client.query(
        `INSERT INTO competencia_deportes (competencia_id, deporte_nombre, ponderador)
         SELECT competencia_id, $2, ponderador
         FROM competencia_deportes
         WHERE deporte_nombre = $1
         ON CONFLICT (competencia_id, deporte_nombre)
         DO UPDATE SET ponderador = EXCLUDED.ponderador`,
        [actual.nombre, nombreLimpio]
      );
      await client.query('DELETE FROM competencia_deportes WHERE deporte_nombre=$1', [actual.nombre]);
      await client.query(
        `UPDATE competencia_semanas
         SET deporte_semana_nombre = CASE WHEN deporte_semana_nombre = $1 THEN $2 ELSE deporte_semana_nombre END,
             deporte_semana_nombre_2 = CASE WHEN deporte_semana_nombre_2 = $1 THEN $2 ELSE deporte_semana_nombre_2 END,
             updated_at = NOW()
         WHERE deporte_semana_nombre = $1 OR deporte_semana_nombre_2 = $1`,
        [actual.nombre, nombreLimpio]
      );
      await client.query(
        'UPDATE actividades SET deporte_nombre=$2 WHERE deporte_id=$3 OR deporte_nombre=$1',
        [actual.nombre, nombreLimpio, actual.id]
      );
    }

    const { rows: [updated] } = await client.query(
      `UPDATE deportes
       SET nombre=$1, icono=$2, ponderador_default=$3
       WHERE id=$4
       RETURNING *`,
      [nombreLimpio, iconoFinal, ponderador, id]
    );

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function eliminarDeporteCatalogo(id) {
  const { rows } = await pool.query('DELETE FROM deportes WHERE id = $1 RETURNING id', [id]);
  if (!rows.length) throw httpError(404, 'Deporte no encontrado');
  return { ok: true };
}

module.exports = { actualizarDeporteCatalogo, eliminarDeporteCatalogo };
