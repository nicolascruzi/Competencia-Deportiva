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

-- Renombres de deportes ya existentes al nombre/grafía oficial de la tabla de ponderadores (mismo
-- deporte). Las actividades ya registradas guardan su propio deporte_nombre como texto congelado,
-- así que no se ven afectadas por estos renombres del catálogo.
UPDATE deportes SET nombre = 'Saltar la cuerda' WHERE nombre = 'Cuerda';
UPDATE deportes SET nombre = 'Box / Kickboxing' WHERE nombre = 'Box';
UPDATE deportes SET nombre = 'Básquetbol'       WHERE nombre = 'Basquetbol';
UPDATE deportes SET nombre = 'Trail running'    WHERE nombre = 'Trail Running';

-- Deportes con ponderadores oficiales
INSERT INTO deportes (nombre, icono, ponderador_default) VALUES
  ('Box / Kickboxing',       '🥊', 1.50),
  ('Natación',                '🏊', 1.50),
  ('Hyrox',                   '🏆', 1.50),
  ('Saltar la cuerda',        '🪢', 1.40),
  ('Básquetbol',              '🏀', 1.30),
  ('Crossfit',                '🏋️', 1.30),
  ('HIIT',                    '🔥', 1.30),
  ('Fútbol',                  '⚽', 1.30),
  ('Trail running',           '⛰️', 1.30),
  ('Bicicleta mountain bike', '🚵', 1.20),
  ('Funcional',               '💪', 1.20),
  ('Spinning',                '🚴', 1.20),
  ('Trote',                   '🏃', 1.20),
  ('Bicicleta Rodillo',       '🚲', 1.10),
  ('Escalada',                '🧗', 1.10),
  ('Hockey',                  '🏑', 1.10),
  ('Tenis',                   '🎾', 1.10),
  ('Bicicleta Ruta',          '🚴‍♂️', 1.00),
  ('Elíptica',                '🏃‍♀️', 1.00),
  ('Ballet',                  '🩰', 1.00),
  ('Gimnasio',                '🏋️‍♂️', 0.90),
  ('Pilates',                 '🧘', 1.00),
  ('Padel',                   '🏓', 0.80),
  ('Vóleibol',                '🏐', 0.80),
  ('Trekking',                '🥾', 0.70),
  ('Kine',                    '🩺', 0.60),
  ('Yoga',                    '🧘‍♀️', 0.60),
  ('Surf',                    '🏄', 0.50),
  ('Traslado bicicleta',      '🚲', 0.50),
  ('Buceo',                   '🤿', 0.40),
  ('Golf',                    '⛳', 0.40),
  ('Caminata deportiva',      '🚶‍♂️', 0.40),
  ('Ski/Snowboard',           '⛷️', 0.30),
  ('Traslado caminata',       '🚶', 0.30),
  ('Rodeo',                   '🤠', 1.40),
  ('Ebike',                   '⚡', 0.90),
  ('Topeada',                 '🐂', 0.40),
  ('Ski acuático',            '🎿', 1.50),
  ('Gimnasia artística',      '🤸', 0.80),
  ('Atletismo',               '🏅', 0.90)
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

-- Equipos de un grupo (competencia_id es el nombre histórico de la columna; se migra a grupo_id
-- más abajo, junto con el resto del modelo Grupos→Competencias).
CREATE TABLE IF NOT EXISTS equipos (
  id             SERIAL PRIMARY KEY,
  competencia_id INTEGER REFERENCES competencias(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  color          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipos' AND column_name='competencia_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_equipos_competencia ON equipos(competencia_id)';
  END IF;
END $$;

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

-- ── GRUPOS: competencias pasa a ser hija de un grupo con participantes/equipos/PIN compartidos ──

-- Grupo de competidores: unión permanente. El PIN, los participantes y los equipos viven acá;
-- cada competencia dentro del grupo solo aporta fechas/bonus/ranking de una temporada.
CREATE TABLE IF NOT EXISTS grupos (
  id         SERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  pin        CHAR(6) UNIQUE NOT NULL,
  creador_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes de un grupo (reemplaza competencia_participantes). equipo_id vive acá porque
-- el equipo es del grupo, no de una competencia puntual.
CREATE TABLE IF NOT EXISTS grupo_participantes (
  grupo_id  INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipo_id INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (grupo_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_grupo_participantes_user   ON grupo_participantes(user_id);
CREATE INDEX IF NOT EXISTS idx_grupo_participantes_equipo ON grupo_participantes(equipo_id);

-- Admins de un grupo (puede haber varios; cualquier admin puede nombrar a otro). La FK compuesta
-- a grupo_participantes garantiza que nadie puede ser admin sin antes ser participante del grupo.
CREATE TABLE IF NOT EXISTS grupo_admins (
  grupo_id     INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  promovido_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (grupo_id, user_id)
);

-- equipos pasa de colgar de competencia_id a colgar de grupo_id (el equipo es permanente, no por temporada).
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos(id) ON DELETE CASCADE;

-- competencias pasa a ser hija de un grupo, con un estado explícito en vez de inferir "vigente" por fechas.
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos(id) ON DELETE CASCADE;
ALTER TABLE competencias ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'en_curso';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competencias_estado_check') THEN
    ALTER TABLE competencias ADD CONSTRAINT competencias_estado_check CHECK (estado IN ('en_curso', 'finalizada'));
  END IF;
END $$;

-- Migración de datos: cada competencia existente (con PIN propio hoy) se convierte en un grupo,
-- usando el MISMO id (grupos.id = competencias.id) para no necesitar tabla de mapeo. Solo corre
-- si competencias.pin todavía existe (una sola vez).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='competencias' AND column_name='pin') THEN
    INSERT INTO grupos (id, nombre, pin, creador_id, created_at)
    SELECT c.id, c.nombre, c.pin, c.creador_id, c.created_at
    FROM competencias c
    WHERE NOT EXISTS (SELECT 1 FROM grupos g WHERE g.id = c.id);

    PERFORM setval(pg_get_serial_sequence('grupos', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM grupos), 1));
  END IF;
END $$;

-- Cada competencia apunta a su grupo recién creado (mismo id) y hereda un estado inicial según
-- la misma heurística que ya usaba el código para "competencia en curso" (sin fechas, o fecha_fin
-- no pasada todavía, cuenta como en_curso; si ya terminó, queda finalizada).
UPDATE competencias
SET grupo_id = id,
    estado = CASE WHEN fecha_fin IS NOT NULL AND fecha_fin < CURRENT_DATE THEN 'finalizada' ELSE 'en_curso' END
WHERE grupo_id IS NULL;

-- Salvaguarda defensiva antes de crear el índice único: no debería haber nunca dos competencias
-- en_curso del mismo grupo en este punto (hoy es 1:1 competencia-grupo), pero si la hubiera, mejor
-- frenar acá con un error claro que fallar a mitad de la creación del índice único.
DO $$
DECLARE dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT grupo_id FROM competencias WHERE estado = 'en_curso' GROUP BY grupo_id HAVING COUNT(*) > 1
  ) t;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Hay % grupo(s) con más de una competencia en_curso antes de crear el índice único', dup_count;
  END IF;
END $$;

-- La base de datos (no la lógica de aplicación) garantiza que un grupo tenga a lo sumo una
-- competencia en_curso a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_competencias_una_en_curso_por_grupo
  ON competencias(grupo_id) WHERE estado = 'en_curso';

-- Migra participantes+equipo de competencia_participantes a grupo_participantes (mismo id competencia=grupo).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='competencia_participantes') THEN
    INSERT INTO grupo_participantes (grupo_id, user_id, equipo_id, joined_at)
    SELECT cp.competencia_id, cp.user_id, cp.equipo_id, cp.joined_at
    FROM competencia_participantes cp
    ON CONFLICT (grupo_id, user_id) DO NOTHING;
  END IF;
END $$;

-- Migra equipos.competencia_id -> equipos.grupo_id (mismo id, los equipos no se remapean).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipos' AND column_name='competencia_id') THEN
    UPDATE equipos SET grupo_id = competencia_id WHERE grupo_id IS NULL;
  END IF;
END $$;

-- El creador original de cada competencia queda como primer admin de su grupo nuevo.
INSERT INTO grupo_admins (grupo_id, user_id)
SELECT g.id, g.creador_id FROM grupos g
ON CONFLICT (grupo_id, user_id) DO NOTHING;

-- Endurecer constraints ahora que los datos ya migraron.
ALTER TABLE competencias ALTER COLUMN grupo_id SET NOT NULL;
ALTER TABLE equipos ALTER COLUMN grupo_id SET NOT NULL;

ALTER TABLE equipos DROP CONSTRAINT IF EXISTS equipos_competencia_id_nombre_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipos_grupo_id_nombre_key') THEN
    ALTER TABLE equipos ADD CONSTRAINT equipos_grupo_id_nombre_key UNIQUE (grupo_id, nombre);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_equipos_grupo ON equipos(grupo_id);

-- grupo_admins solo puede tener como admin a alguien que ya es participante del grupo.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupo_admins_participante_fkey') THEN
    ALTER TABLE grupo_admins ADD CONSTRAINT grupo_admins_participante_fkey
      FOREIGN KEY (grupo_id, user_id) REFERENCES grupo_participantes(grupo_id, user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- grupo_participantes.equipo_id ahora sí puede referenciar equipos (creada después para evitar
-- el ciclo de dependencia equipos->grupos->grupo_participantes->equipos durante la creación inicial).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'grupo_participantes_equipo_id_fkey') THEN
    ALTER TABLE grupo_participantes ADD CONSTRAINT grupo_participantes_equipo_id_fkey
      FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Columnas/tablas viejas, ya no necesarias: el PIN y el creador viven en grupos; equipos ya no
-- cuelga de competencia_id; competencia_participantes fue reemplazada por grupo_participantes.
ALTER TABLE equipos DROP COLUMN IF EXISTS competencia_id;
ALTER TABLE competencias DROP COLUMN IF EXISTS pin;
ALTER TABLE competencias DROP COLUMN IF EXISTS creador_id;
DROP TABLE IF EXISTS competencia_participantes;

-- Columna vestigial: nunca se lee ni se escribe en el backend (el vínculo real es actividad_competencias).
ALTER TABLE actividades DROP COLUMN IF EXISTS competencia_id;

-- Un grupo ya puede tener varias competencias en_curso a la vez (el admin ya no tiene que cerrar
-- la actual para abrir una nueva); se saca la restricción de "una sola por grupo" a nivel de BD.
DROP INDEX IF EXISTS idx_competencias_una_en_curso_por_grupo;

-- Las fechas de una competencia ahora se pueden editar libremente en cualquier momento, incluso
-- con semanas ya generadas. La identidad de una semana pasa de "su número de orden" (que cambiaría
-- de posición si se mueve fecha_inicio) a "su fecha_inicio real" — así una semana que ya tenía
-- deporte-de-la-semana/challenges/votos configurados los conserva mientras sus días no cambien,
-- sin importar si ahora le toca ser la semana 2 en vez de la 1. Las semanas en sí pasan a ser
-- bloques de CALENDARIO (lunes-domingo, ver calcularSemanas en competencias.js), no bloques
-- relativos a fecha_inicio — así su fecha_inicio real nunca se corre de posición al cambiar
-- fecha_inicio de la competencia, y esta garantía de conservación es efectiva en la práctica.
ALTER TABLE competencia_semanas DROP CONSTRAINT IF EXISTS competencia_semanas_competencia_id_numero_semana_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competencia_semanas_competencia_id_fecha_inicio_key') THEN
    ALTER TABLE competencia_semanas ADD CONSTRAINT competencia_semanas_competencia_id_fecha_inicio_key UNIQUE (competencia_id, fecha_inicio);
  END IF;
END $$;

-- Un challenge pasa a tener su propio rango de fechas en vez de depender de "a qué semana
-- pertenece" (semana_id, vía numero_semana, era un contrato frágil: el número de orden de una
-- semana puede correrse si se editan las fechas de la competencia, y el backend fallaba en
-- silencio guardando semana_id=null cuando el número ya no matcheaba ninguna fila real). Un
-- challenge sin fechas (ambas NULL) queda "siempre vigente", igual que antes con semana_id NULL.
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS fecha_inicio DATE;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- Hereda fecha_inicio/fecha_fin de la semana que tenía asignada (si tenía) para los challenges
-- creados antes de este cambio; se corre una sola vez por challenge (no pisa si ya tiene fechas).
UPDATE challenges c
SET fecha_inicio = cs.fecha_inicio, fecha_fin = cs.fecha_fin
FROM competencia_semanas cs
WHERE c.semana_id = cs.id AND c.fecha_inicio IS NULL AND c.fecha_fin IS NULL;

-- Segundo deporte de la semana: ahora cada semana tiene dos ganadores en paralelo, uno por
-- categoría — "deporte_semana_nombre" queda para la categoría tranquila (ponderador <= 1) y
-- "deporte_semana_nombre_2" para la extrema (ponderador > 1). Ambas comparten el mismo
-- deporte_semana_ponderador_extra: el bonus es el mismo sin importar cuál de los dos se practicó.
-- La categoría se deriva en el momento (del ponderador vigente en competencia_deportes/deportes),
-- no se guarda como columna — así nunca queda desincronizada si el ponderador cambia después.
ALTER TABLE competencia_semanas ADD COLUMN IF NOT EXISTS deporte_semana_nombre_2 TEXT;

-- Categoría del voto: antes había un solo voto por persona por semana; ahora hay dos categorías
-- de votación independientes ("tranquilo" / "extremo"), cada una con su propio ganador. Se migra
-- el voto existente (si lo hay) a la categoría que le corresponda según el ponderador del deporte
-- votado en ese momento, para no perder votos ya emitidos.
ALTER TABLE votos_deporte_semana ADD COLUMN IF NOT EXISTS categoria TEXT;
UPDATE votos_deporte_semana v
SET categoria = CASE
  WHEN COALESCE(
    (SELECT cd.ponderador FROM competencia_deportes cd
     JOIN competencia_semanas cs ON cs.competencia_id = cd.competencia_id
     JOIN deportes d2 ON d2.id = v.deporte_id
     WHERE cs.id = v.competencia_semana_id AND cd.deporte_nombre = d2.nombre),
    (SELECT d.ponderador_default FROM deportes d WHERE d.id = v.deporte_id)
  ) > 1 THEN 'extremo'
  ELSE 'tranquilo'
END
WHERE v.categoria IS NULL;
ALTER TABLE votos_deporte_semana ALTER COLUMN categoria SET NOT NULL;

-- El UNIQUE viejo (un voto por persona por semana) se reemplaza por uno por persona-semana-categoría.
ALTER TABLE votos_deporte_semana DROP CONSTRAINT IF EXISTS votos_deporte_semana_competencia_semana_id_user_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'votos_deporte_semana_semana_user_categoria_key') THEN
    ALTER TABLE votos_deporte_semana ADD CONSTRAINT votos_deporte_semana_semana_user_categoria_key UNIQUE (competencia_semana_id, user_id, categoria);
  END IF;
END $$;
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
