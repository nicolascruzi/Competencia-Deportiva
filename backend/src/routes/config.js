const express = require('express');
const pool    = require('../db/pool');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, adminOnly);

const ALLOWED_KEYS = [
  'STRAVA_CLIENT_ID',
  'STRAVA_CLIENT_SECRET',
  'STRAVA_WEBHOOK_TOKEN',
  'BACKEND_URL',
  'FRONTEND_URL',
];

// GET /config — devuelve la configuración actual (sin mostrar secrets completos)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value FROM app_config WHERE key = ANY($1)',
      [ALLOWED_KEYS]
    );
    const config = {};
    ALLOWED_KEYS.forEach(k => { config[k] = null; });
    result.rows.forEach(r => { config[r.key] = r.value; });
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /config — guarda una o varias claves
router.put('/', async (req, res) => {
  const updates = req.body; // { STRAVA_CLIENT_ID: '...', ... }

  const invalid = Object.keys(updates).filter(k => !ALLOWED_KEYS.includes(k));
  if (invalid.length) {
    return res.status(400).json({ error: `Claves no permitidas: ${invalid.join(', ')}` });
  }

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        await pool.query('DELETE FROM app_config WHERE key = $1', [key]);
      } else {
        await pool.query(
          `INSERT INTO app_config (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, value]
        );
      }
    }
    res.json({ message: 'Configuración guardada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

module.exports = router;
