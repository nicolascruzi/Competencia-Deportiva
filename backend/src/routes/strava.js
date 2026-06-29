const express = require('express');
const fetch   = require('node-fetch');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { getConfigs }     = require('../lib/config');

const router = express.Router();

// Lee credenciales de DB (con fallback a .env)
async function getCreds() {
  return getConfigs([
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
    'STRAVA_WEBHOOK_TOKEN',
    'BACKEND_URL',
    'FRONTEND_URL',
  ]);
}

// ─── Mapeo de tipos de deporte Strava → nombre en la app ────────────────────
const STRAVA_TYPE_MAP = {
  'Run':               'Trote',
  'TrailRun':          'Trail Running',
  'Walk':              'Trekking',
  'Hike':              'Trekking',
  'Ride':              'Bicicleta Ruta',
  'MountainBikeRide':  'Bicicleta MTB',
  'VirtualRide':       'Bicicleta Rodillo',
  'Swim':              'Natación',
  'Workout':           'Funcional',
  'WeightTraining':    'Gimnasio',
  'Crossfit':          'Crossfit',
  'Surfing':           'Surf',
  'RockClimbing':      'Escalada',
  'Boxing':            'Box',
  'Tennis':            'Tenis',
  'Padel':             'Padel',
  'Golf':              'Golf',
  'Soccer':            'Fútbol',
};

function stravaTypeToDeporte(stravaType) {
  return STRAVA_TYPE_MAP[stravaType] || 'Funcional';
}

// ─── Refrescar token si venció ────────────────────────────────────────────────
async function refreshTokenIfNeeded(user) {
  const nowSec = Math.floor(Date.now() / 1000);
  if (user.strava_token_expires_at > nowSec + 60) {
    return user.strava_access_token;
  }

  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = await getCreds();
  const resp = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: user.strava_refresh_token,
    }),
  });

  if (!resp.ok) throw new Error('No se pudo refrescar el token de Strava');
  const data = await resp.json();

  await pool.query(
    `UPDATE users
     SET strava_access_token = $1, strava_refresh_token = $2, strava_token_expires_at = $3
     WHERE id = $4`,
    [data.access_token, data.refresh_token, data.expires_at, user.id]
  );

  return data.access_token;
}

// ─── Importar una actividad de Strava para un usuario ────────────────────────
async function importStravaActivity(stravaActivityId, userId) {
  // Verificar que no esté importada ya
  const existing = await pool.query(
    'SELECT actividad_id FROM strava_actividades WHERE strava_activity_id = $1',
    [stravaActivityId]
  );
  if (existing.rows.length) return { skipped: true };

  // Obtener token del usuario
  const userResult = await pool.query(
    'SELECT id, strava_access_token, strava_refresh_token, strava_token_expires_at FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user?.strava_access_token) return { skipped: true };

  const token = await refreshTokenIfNeeded(user);

  // Obtener detalle de la actividad desde Strava
  const actResp = await fetch(`https://www.strava.com/api/v3/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!actResp.ok) throw new Error('Error al obtener actividad de Strava');
  const act = await actResp.json();

  // Solo importar si tiene duración
  const minutos = Math.round((act.moving_time || act.elapsed_time || 0) / 60);
  if (minutos < 1) return { skipped: true };

  const deporteNombre = stravaTypeToDeporte(act.sport_type || act.type);
  const fecha = (act.start_date_local || act.start_date || '').slice(0, 10);
  if (!fecha) return { skipped: true };

  // Obtener ponderador por defecto del deporte
  const depResult = await pool.query(
    'SELECT ponderador_default FROM deportes WHERE nombre = $1',
    [deporteNombre]
  );
  const ponderador = parseFloat(depResult.rows[0]?.ponderador_default ?? 1.0);

  // Crear la actividad en la app
  const notas = act.name && act.name !== deporteNombre ? act.name : null;
  const actResult = await pool.query(
    `INSERT INTO actividades (user_id, deporte_nombre, minutos, ponderador, fecha, notas)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, deporteNombre, minutos, ponderador, fecha, notas]
  );
  const actividadId = actResult.rows[0].id;

  // Registrar para no importar dos veces
  await pool.query(
    'INSERT INTO strava_actividades (strava_activity_id, actividad_id, user_id) VALUES ($1, $2, $3)',
    [stravaActivityId, actividadId, userId]
  );

  return { actividadId, deporteNombre, minutos, fecha };
}

// ─── GET /strava/status — estado de conexión del usuario actual ───────────────
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT strava_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const connected = !!result.rows[0]?.strava_id;
    res.json({ connected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar estado Strava' });
  }
});

// ─── Middleware especial para /connect: acepta token por query param ──────────
const jwt = require('jsonwebtoken');
function authFromQuery(req, res, next) {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ─── GET /strava/connect — iniciar OAuth con Strava ──────────────────────────
// El token JWT del usuario viaja como ?token= porque es una redirección del navegador
router.get('/connect', authFromQuery, async (req, res) => {
  const { STRAVA_CLIENT_ID, BACKEND_URL } = await getCreds();
  if (!STRAVA_CLIENT_ID) {
    return res.status(503).send('Strava no está configurado. Pedile al admin que configure las credenciales.');
  }

  const scope = 'read,activity:read_all';
  const redirectUri = `${BACKEND_URL || 'http://localhost:3000'}/strava/callback`;
  const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64url');

  const url = new URL('https://www.strava.com/oauth/authorize');
  url.searchParams.set('client_id',       STRAVA_CLIENT_ID);
  url.searchParams.set('redirect_uri',    redirectUri);
  url.searchParams.set('response_type',   'code');
  url.searchParams.set('approval_prompt', 'auto');
  url.searchParams.set('scope',           scope);
  url.searchParams.set('state',           state);

  res.redirect(url.toString());
});

// ─── GET /strava/callback — Strava redirige aquí tras autorizar ───────────────
router.get('/callback', async (req, res) => {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, FRONTEND_URL } = await getCreds();
  const frontendUrl = FRONTEND_URL || 'http://localhost:5173';

  const { code, state, error } = req.query;

  if (error || !code) {
    return res.redirect(`${frontendUrl}?strava=denied`);
  }

  let userId;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
    userId = decoded.userId;
  } catch {
    return res.redirect(`${frontendUrl}?strava=error`);
  }

  try {
    // Intercambiar código por tokens
    const tokenResp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      console.error('Strava token error:', await tokenResp.text());
      return res.redirect(`${frontendUrl}?strava=error`);
    }

    const tokenData = await tokenResp.json();
    const { access_token, refresh_token, expires_at, athlete } = tokenData;

    // Guardar tokens en el usuario
    await pool.query(
      `UPDATE users
       SET strava_id = $1, strava_access_token = $2,
           strava_refresh_token = $3, strava_token_expires_at = $4
       WHERE id = $5`,
      [athlete.id, access_token, refresh_token, expires_at, userId]
    );

    // Importar actividades recientes (últimas 30)
    const actsResp = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=30&page=1',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (actsResp.ok) {
      const recentActs = await actsResp.json();
      for (const act of recentActs) {
        try {
          await importStravaActivity(act.id, userId);
        } catch (e) {
          console.error('Error importando actividad Strava:', e.message);
        }
      }
    }

    res.redirect(`${frontendUrl}?strava=connected`);
  } catch (err) {
    console.error('Strava callback error:', err);
    res.redirect(`${frontendUrl}?strava=error`);
  }
});

// ─── DELETE /strava/disconnect — desconectar Strava ──────────────────────────
router.delete('/disconnect', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE users
       SET strava_id = NULL, strava_access_token = NULL,
           strava_refresh_token = NULL, strava_token_expires_at = NULL
       WHERE id = $1`,
      [req.user.id]
    );
    res.json({ message: 'Cuenta de Strava desconectada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al desconectar Strava' });
  }
});

// ─── GET /strava/webhook — verificación de suscripción (Strava challenge) ────
router.get('/webhook', async (req, res) => {
  const { STRAVA_WEBHOOK_TOKEN } = await getCreds();
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === STRAVA_WEBHOOK_TOKEN) {
    res.json({ 'hub.challenge': challenge });
  } else {
    res.status(403).json({ error: 'Token de verificación inválido' });
  }
});

// ─── POST /strava/webhook — recibir eventos nuevos de Strava ─────────────────
router.post('/webhook', async (req, res) => {
  // Strava espera 200 inmediato
  res.sendStatus(200);

  const { object_type, aspect_type, object_id, owner_id } = req.body;

  // Solo nos interesan actividades creadas
  if (object_type !== 'activity' || aspect_type !== 'create') return;

  try {
    // Buscar al usuario por strava_id
    const userResult = await pool.query(
      'SELECT id FROM users WHERE strava_id = $1',
      [owner_id]
    );
    if (!userResult.rows.length) return;

    const userId = userResult.rows[0].id;
    const result = await importStravaActivity(object_id, userId);
    if (!result.skipped) {
      console.log(`✓ Strava: importada actividad ${object_id} (${result.deporteNombre}, ${result.minutos}min) para user ${userId}`);
    }
  } catch (err) {
    console.error('Error procesando webhook Strava:', err.message);
  }
});

// ─── POST /strava/sync — sincronización manual desde el perfil ───────────────
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, strava_access_token, strava_refresh_token, strava_token_expires_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user?.strava_access_token) {
      return res.status(400).json({ error: 'No tenés Strava conectado' });
    }

    const token = await refreshTokenIfNeeded(user);

    const actsResp = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=50&page=1',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!actsResp.ok) return res.status(502).json({ error: 'Error al obtener actividades de Strava' });

    const stravaActs = await actsResp.json();
    let imported = 0;
    let skipped  = 0;

    for (const act of stravaActs) {
      try {
        const result = await importStravaActivity(act.id, req.user.id);
        result.skipped ? skipped++ : imported++;
      } catch (e) {
        console.error('Error importando:', e.message);
      }
    }

    res.json({ imported, skipped, total: stravaActs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al sincronizar con Strava' });
  }
});

module.exports = router;
