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
app.listen(PORT, () => {
  console.log(`✓ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  POST /auth/register`);
  console.log(`  POST /auth/login`);
  console.log(`  GET  /actividades`);
  console.log(`  POST /actividades`);
  console.log(`  GET  /ranking`);
  console.log(`  GET  /health`);
});
