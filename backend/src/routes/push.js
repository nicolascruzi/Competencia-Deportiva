const express   = require('express');
const webpush   = require('web-push');
const pool      = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// GET /push/vapid-public-key — clave pública para el frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// POST /push/subscribe — guardar suscripción del dispositivo
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return res.status(400).json({ error: 'Suscripción inválida' });

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [req.user.id, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar suscripción' });
  }
});

// DELETE /push/subscribe — eliminar suscripción (usuario desactiva notifs)
router.delete('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body;
  try {
    await pool.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar suscripción' });
  }
});

// Función interna: enviar push a un user_id
async function sendPushToUser(userId, payload) {
  try {
    const { rows } = await pool.query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    const sends = rows.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        // 410 Gone = suscripción expirada, limpiar
        if (err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(() => {});
        }
      }
    });
    await Promise.allSettled(sends);
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

module.exports = { router, sendPushToUser };
