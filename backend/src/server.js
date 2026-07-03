require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db/pool');

const authRoutes         = require('./routes/auth');
const actividadesRoutes  = require('./routes/actividades');
const rankingRoutes      = require('./routes/ranking');
const competenciasRoutes = require('./routes/competencias');
const fotosRoutes        = require('./routes/fotos');
const perfilRoutes       = require('./routes/perfil');
const comentariosRoutes  = require('./routes/comentarios');
const likesRoutes        = require('./routes/likes');
const adminRoutes            = require('./routes/admin');
const notificacionesRoutes   = require('./routes/notificaciones');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── RUTAS ────────────────────────────────────────────────
app.use('/auth',        authRoutes);
app.use('/actividades', actividadesRoutes);
app.use('/ranking',     rankingRoutes);
app.use('/competencias', competenciasRoutes);
app.use('/fotos',        fotosRoutes);
app.use('/perfil',       perfilRoutes);
app.use('/comentarios',  comentariosRoutes);
app.use('/likes',        likesRoutes);
app.use('/admin',           adminRoutes);
app.use('/notificaciones',  notificacionesRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch {
    res.status(500).json({ status: 'error', db: 'desconectada' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── ARRANQUE ─────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
  // Crear tabla notificaciones si no existe (migración incremental)
  try {
    await pool.query(`
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
    `);
    console.log('✓ Tabla notificaciones lista');
  } catch (err) {
    console.error('Error creando tabla notificaciones:', err.message);
  }
});
