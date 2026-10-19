const express   = require('express');
const webpush   = require('web-push');
const pool      = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Configurar VAPID solo si las variables están disponibles
// (evita crash al arrancar si no están seteadas en el entorno)
function getWebPush() {
  const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_EMAIL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return webpush;
}

// GET /push/vapid-public-key — clave pública para el frontend
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push no configurado en el servidor' });
  res.json({ key });
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

// Categoría de notificación → columna de preferencia en users que la controla. 'actividad' es la
// única del grupo "actividad nueva"; comentario/mención/like son todas "interacciones sobre lo mío".
const COLUMNA_PREFERENCIA = {
  actividad:  'notif_actividad_nueva',
  comentario: 'notif_interacciones',
  mencion:    'notif_interacciones',
  like:       'notif_interacciones',
};

// Función interna: enviar push a un user_id. `categoria` es opcional — si se pasa (uno de
// COLUMNA_PREFERENCIA) y el usuario tiene esa categoría apagada, no se manda nada.
async function sendPushToUser(userId, payload, categoria) {
  const wp = getWebPush();
  if (!wp) return; // VAPID no configurado, ignorar silenciosamente
  try {
    const columna = categoria && COLUMNA_PREFERENCIA[categoria];
    if (columna) {
      const { rows: [pref] } = await pool.query(`SELECT ${columna} AS activo FROM users WHERE id = $1`, [userId]);
      if (pref && pref.activo === false) return;
    }

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
        await wp.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
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
