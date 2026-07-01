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
const adminRoutes        = require('./routes/admin');

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
app.use('/admin',        adminRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch {
    res.status(500).json({ status: 'error', db: 'desconectada' });
  }
});

// ─── DEBUG ────────────────────────────────────────────────
// GET /debug/user/:userId/activities — returns all actividades for a given user
app.get('/debug/user/:userId/activities', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: 'userId debe ser un número entero válido' });
  }
  try {
    const result = await pool.query(
      `SELECT
         a.id, a.user_id, u.nombre AS user_nombre,
         a.deporte_nombre, a.minutos, a.ponderador, a.puntos,
         TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
         a.notas, a.foto_url, a.created_at
       FROM actividades a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
       ORDER BY a.fecha DESC, a.created_at DESC`,
      [userId]
    );
    res.json({ userId, count: result.rows.length, activities: result.rows });
  } catch (err) {
    console.error('[DEBUG] Error al obtener actividades:', err);
    res.status(500).json({ error: 'Error al obtener actividades del usuario' });
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
});
