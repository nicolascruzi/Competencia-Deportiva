require('dotenv').config();
const pool = require('./pool');

const SQL = `
-- Usuarios
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        TEXT UNIQUE NOT NULL,
  nombre       TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Deportes con su ponderador por defecto
CREATE TABLE IF NOT EXISTS deportes (
  id                SERIAL PRIMARY KEY,
  nombre            TEXT UNIQUE NOT NULL,
  icono             TEXT NOT NULL DEFAULT '🏅',
  ponderador_default NUMERIC(4,2) NOT NULL DEFAULT 1.0
);

-- Actividades registradas
CREATE TABLE IF NOT EXISTS actividades (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deporte_id   INTEGER REFERENCES deportes(id) ON DELETE SET NULL,
  deporte_nombre TEXT NOT NULL,
  minutos      NUMERIC(7,2) NOT NULL,
  ponderador   NUMERIC(4,2) NOT NULL,
  puntos       NUMERIC(10,2) GENERATED ALWAYS AS (minutos * ponderador) STORED,
  fecha        DATE NOT NULL,
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries de ranking
CREATE INDEX IF NOT EXISTS idx_actividades_user_id ON actividades(user_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha   ON actividades(fecha);

-- Deportes iniciales (los mismos del CSV actual)
INSERT INTO deportes (nombre, icono, ponderador_default) VALUES
  ('Bicicleta MTB',    '🚵', 1.5),
  ('Bicicleta Rodillo','🚴', 1.2),
  ('Bicicleta Ruta',   '🚴', 1.4),
  ('Box',              '🥊', 1.6),
  ('Buceo',            '🤿', 1.3),
  ('Crossfit',         '🏋️', 1.8),
  ('Cuerda',           '🪢', 1.4),
  ('Escalada',         '🧗', 1.5),
  ('Funcional',        '💪', 1.3),
  ('Fútbol',           '⚽', 1.4),
  ('Gimnasio',         '🏋️', 1.2),
  ('Golf',             '⛳', 1.0),
  ('Natación',         '🏊', 1.6),
  ('Padel',            '🏓', 1.3),
  ('Spinning',         '🚴', 1.3),
  ('Surf',             '🏄', 1.4),
  ('Tenis',            '🎾', 1.3),
  ('Trail Running',    '🏃', 1.7),
  ('Trekking',         '🥾', 1.3),
  ('Trote',            '🏃', 1.4)
ON CONFLICT (nombre) DO NOTHING;
`;

async function migrate() {
  console.log('Ejecutando migraciones...');
  try {
    await pool.query(SQL);
    console.log('✓ Migraciones completadas');
  } catch (err) {
    console.error('✗ Error en migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
