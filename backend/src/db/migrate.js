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

-- Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL DEFAULT 'comentario',
  actividad_id INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  actor_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leida        BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user ON notificaciones(user_id, leida);

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

-- ── EQUIPOS, CHALLENGES SEMANALES, DEPORTE DE LA SEMANA, BONUS COMPAÑÍA ────────

-- Fechas de vigencia + bonus por actividad en compañía
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS fecha_fin    DATE;
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS bonus_companeros_pts NUMERIC(6,2) NOT NULL DEFAULT 0;

-- competencia_id opcional en actividades — NULL = actividad personal, no cuenta para ningún ranking de competencia
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS competencia_id INTEGER REFERENCES competencias(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_actividades_competencia ON actividades(competencia_id);

-- Equipos de una competencia
CREATE TABLE IF NOT EXISTS equipos (
  id             SERIAL PRIMARY KEY,
  competencia_id INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  color          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (competencia_id, nombre)
);
CREATE INDEX IF NOT EXISTS idx_equipos_competencia ON equipos(competencia_id);

-- Asignación de cada participante a un equipo (nullable = sin asignar)
ALTER TABLE competencia_participantes ADD COLUMN IF NOT EXISTS equipo_id INTEGER REFERENCES equipos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_comp_participantes_equipo ON competencia_participantes(equipo_id);

-- Semanas de una competencia: bloques de 7 días exactos desde fecha_inicio (última puede ser corta)
CREATE TABLE IF NOT EXISTS competencia_semanas (
  id                    SERIAL PRIMARY KEY,
  competencia_id        INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  numero_semana         INTEGER NOT NULL,
  fecha_inicio          DATE NOT NULL,
  fecha_fin             DATE NOT NULL,
  challenge_texto       TEXT,
  challenge_puntos      NUMERIC(6,2),
  deporte_semana_nombre TEXT,
  deporte_semana_ponderador_extra NUMERIC(4,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (competencia_id, numero_semana)
);
CREATE INDEX IF NOT EXISTS idx_comp_semanas_competencia ON competencia_semanas(competencia_id);

-- Un registro por persona por semana (challenge completado, sin deporte/minutos asociado)
CREATE TABLE IF NOT EXISTS challenge_completados (
  id           SERIAL PRIMARY KEY,
  semana_id    INTEGER NOT NULL REFERENCES competencia_semanas(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (semana_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_completados_user ON challenge_completados(user_id);

-- Compañeros marcados en una actividad (informativo — el bonus lo recibe solo el dueño de la actividad)
CREATE TABLE IF NOT EXISTS actividad_companeros (
  actividad_id INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (actividad_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_actividad_companeros_user ON actividad_companeros(user_id);

-- Muchos-a-muchos: una actividad puede contar para varias competencias en curso a la vez
CREATE TABLE IF NOT EXISTS actividad_competencias (
  actividad_id   INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  competencia_id INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (actividad_id, competencia_id)
);
CREATE INDEX IF NOT EXISTS idx_actividad_competencias_competencia ON actividad_competencias(competencia_id);

-- Challenges: entidad propia de la competencia (ya no columnas escalares en competencia_semanas),
-- para poder tener varios por semana y agregar nuevos en cualquier momento. semana_id nullable:
-- NULL = challenge "libre", siempre vigente (usado por competencias sin rango de fechas configurado).
CREATE TABLE IF NOT EXISTS challenges (
  id             SERIAL PRIMARY KEY,
  competencia_id INTEGER NOT NULL REFERENCES competencias(id) ON DELETE CASCADE,
  semana_id      INTEGER REFERENCES competencia_semanas(id) ON DELETE SET NULL,
  texto          TEXT NOT NULL,
  puntos         NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_competencia ON challenges(competencia_id);
CREATE INDEX IF NOT EXISTS idx_challenges_semana ON challenges(semana_id);

-- challenge_completados pasa a apuntar a challenges en vez de a competencia_semanas directamente.
ALTER TABLE challenge_completados ADD COLUMN IF NOT EXISTS challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE;

-- Migra los datos viejos (challenge_texto/challenge_puntos en competencia_semanas, challenge_completados.semana_id)
-- a la tabla challenges nueva. Solo corre si las columnas viejas siguen existiendo (una sola vez, luego se dropean).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='competencia_semanas' AND column_name='challenge_texto') THEN
    INSERT INTO challenges (competencia_id, semana_id, texto, puntos, created_at, updated_at)
    SELECT s.competencia_id, s.id, s.challenge_texto, s.challenge_puntos, s.created_at, s.updated_at
    FROM competencia_semanas s
    WHERE s.challenge_texto IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM challenges c WHERE c.semana_id = s.id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='challenge_completados' AND column_name='semana_id') THEN
    UPDATE challenge_completados cc
    SET challenge_id = ch.id
    FROM challenges ch
    WHERE cc.challenge_id IS NULL AND ch.semana_id = cc.semana_id;
  END IF;
END $$;

ALTER TABLE competencia_semanas DROP COLUMN IF EXISTS challenge_texto;
ALTER TABLE competencia_semanas DROP COLUMN IF EXISTS challenge_puntos;
ALTER TABLE challenge_completados DROP COLUMN IF EXISTS semana_id;
ALTER TABLE challenge_completados ALTER COLUMN challenge_id SET NOT NULL;
DROP INDEX IF EXISTS challenge_completados_semana_id_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS challenge_completados_challenge_id_user_id_key ON challenge_completados(challenge_id, user_id);

-- Bonus por compañía pasa de un monto único a 3 tramos independientes por cantidad de compañeros.
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS bonus_1_companero_pts     NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS bonus_2_companeros_pts    NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS bonus_3mas_companeros_pts NUMERIC(6,2) NOT NULL DEFAULT 0;

-- Migra el valor único viejo a los 3 tramos nuevos (mismo monto en los tres, punto de partida razonable
-- para que el admin los ajuste después). Solo corre si la columna vieja sigue existiendo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='competencias' AND column_name='bonus_companeros_pts') THEN
    UPDATE competencias
    SET bonus_1_companero_pts = bonus_companeros_pts,
        bonus_2_companeros_pts = bonus_companeros_pts,
        bonus_3mas_companeros_pts = bonus_companeros_pts
    WHERE bonus_companeros_pts > 0;
  END IF;
END $$;

ALTER TABLE competencias DROP COLUMN IF EXISTS bonus_companeros_pts;

-- La actividad ya no tagea personas específicas, solo guarda cuántos compañeros participaron (0-3, 3 = "3 o más").
ALTER TABLE actividades ADD COLUMN IF NOT EXISTS cantidad_companeros SMALLINT NOT NULL DEFAULT 0;

-- Migra actividad_companeros (conteo de tags por actividad, tope en 3) antes de eliminar la tabla.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='actividad_companeros') THEN
    UPDATE actividades a
    SET cantidad_companeros = LEAST(sub.cnt, 3)
    FROM (SELECT actividad_id, COUNT(*) AS cnt FROM actividad_companeros GROUP BY actividad_id) sub
    WHERE a.id = sub.actividad_id AND a.cantidad_companeros = 0;
  END IF;
END $$;

DROP TABLE IF EXISTS actividad_companeros;

-- Extra de ponderador (aditivo sobre el ponderador_default del deporte) cuando un deporte
-- gana la votación semanal o es fijado a mano en la semana 1.
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS bonus_deporte_semana_extra NUMERIC(4,2) NOT NULL DEFAULT 0.3;

-- Votos de los participantes por el deporte de una semana futura (semana 2+; la semana 1 la fija el admin a mano).
-- Un voto por persona por semana (se puede cambiar, vía upsert).
CREATE TABLE IF NOT EXISTS votos_deporte_semana (
  id                      SERIAL PRIMARY KEY,
  competencia_semana_id   INTEGER NOT NULL REFERENCES competencia_semanas(id) ON DELETE CASCADE,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deporte_id              INTEGER NOT NULL REFERENCES deportes(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (competencia_semana_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_votos_semana ON votos_deporte_semana(competencia_semana_id);
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
