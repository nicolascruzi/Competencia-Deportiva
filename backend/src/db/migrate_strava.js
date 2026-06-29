require('dotenv').config();
const pool = require('./pool');

const SQL = `
-- Columnas Strava en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_id             BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_access_token   TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_refresh_token  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS strava_token_expires_at BIGINT;

-- Índice para lookup por strava_id en el webhook
CREATE INDEX IF NOT EXISTS idx_users_strava_id ON users(strava_id);

-- Tabla para evitar importar la misma actividad de Strava dos veces
CREATE TABLE IF NOT EXISTS strava_actividades (
  strava_activity_id BIGINT PRIMARY KEY,
  actividad_id       INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  imported_at        TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  console.log('Ejecutando migración Strava...');
  try {
    await pool.query(SQL);
    console.log('✓ Migración Strava completada');
  } catch (err) {
    console.error('✗ Error en migración Strava:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
