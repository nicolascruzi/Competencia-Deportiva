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

-- ── COMPETENCIAS ─────────────────────────────────────────────────────────────

-- Competencias
CREATE TABLE IF NOT EXISTS competencias (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  pin         CHAR(6) UNIQUE NOT NULL,
  creador_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de cada competencia (creador incluido automáticamente)
CREATE TABLE IF NOT EXISTS competencia_participantes (
  competencia_id INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (competencia_id, user_id)
);

-- Ponderadores por deporte de cada competencia
CREATE TABLE IF NOT EXISTS competencia_deportes (
  competencia_id INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  deporte_nombre TEXT NOT NULL,
  ponderador     NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (competencia_id, deporte_nombre)
);

CREATE INDEX IF NOT EXISTS idx_comp_participantes_user ON competencia_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_comp_deportes_comp      ON competencia_deportes(competencia_id);

-- Fotos de actividades
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS foto_public_id TEXT;

-- Perfil de usuario
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_perfil_url      TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_perfil_public_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS peso_kg              NUMERIC(5,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estatura_cm          INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fecha_nacimiento     DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sexo                 TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apellido             TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apodo                TEXT;

-- Comentarios en actividades
CREATE TABLE IF NOT EXISTS comentarios (
  id           SERIAL PRIMARY KEY,
  actividad_id INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contenido    TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comentarios_actividad ON comentarios(actividad_id);

-- Likes en actividades
CREATE TABLE IF NOT EXISTS likes (
  actividad_id INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (actividad_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_actividad ON likes(actividad_id);

-- Deportes con ponderadores oficiales
INSERT INTO deportes (nombre, icono, ponderador_default) VALUES
  ('Natación',           '🏊', 1.50),
  ('Box',                '🥊', 1.50),
  ('Trote',              '🏃', 1.40),
  ('Fútbol',             '⚽', 1.40),
  ('Basquetbol',         '🏀', 1.30),
  ('Crossfit',           '🏋️', 1.20),
  ('Spinning',           '🚴', 1.20),
  ('Trail Running',      '🏃', 1.40),
  ('Cuerda',             '🪢', 1.20),
  ('Tenis',              '🎾', 1.10),
  ('Bicicleta Rodillo',  '🚴', 1.10),
  ('Escalada',           '🧗', 1.10),
  ('Funcional',          '💪', 1.10),
  ('Bicicleta Ruta',     '🚴', 1.10),
  ('Gimnasio',           '🏋️', 1.00),
  ('Elíptica',           '🏃', 1.00),
  ('Padel',              '🏓', 0.70),
  ('Trekking',           '🥾', 0.70),
  ('Surf',               '🏄', 0.70),
  ('Golf',               '⛳', 0.40),
  ('Rodeo',              '🤠', 1.40),
  ('Ski/Snowboard',      '⛷️', 0.30),
  ('Bicicleta MTB',      '🚵', 1.20),
  ('Ebike',              '⚡', 0.90),
  ('Kine',               '🩺', 0.80),
  ('Topeada',            '🐂', 0.40),
  ('Buceo',              '🤿', 0.60),
  ('Ski acuático',       '🎿', 1.50),
  ('Gimnasia artística', '🤸', 0.80),
  ('Atletismo',          '🏅', 0.90),
  ('Pilates',            '🧘', 1.00),
  ('Caminata',           '🚶', 0.60)
ON CONFLICT (nombre) DO UPDATE SET
  ponderador_default = EXCLUDED.ponderador_default,
  icono = EXCLUDED.icono;
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
