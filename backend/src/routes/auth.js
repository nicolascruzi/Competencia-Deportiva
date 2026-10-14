const express = require('express');
const crypto  = require('crypto');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { enviarPasswordTemporal } = require('../lib/mailer');

const router = express.Router();
const SALT_ROUNDS = 12;

const USER_FIELDS = `id, email, nombre, apellido, apodo,
  COALESCE(apodo, nombre) AS nombre_display,
  role, created_at, foto_perfil_url, peso_kg, estatura_cm, fecha_nacimiento, sexo`;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre_display || user.nombre, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, nombre, apellido, password } = req.body;

  if (!email || !nombre || !password)
    return res.status(400).json({ error: 'email, nombre y password son requeridos' });

  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length)
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, nombre, apellido, password_hash) VALUES ($1, $2, $3, $4)
       RETURNING ${USER_FIELDS}`,
      [email.toLowerCase(), nombre.trim(), apellido?.trim() || null, hash]
    );

    const user = result.rows[0];
    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'email y password son requeridos' });

  try {
    const result = await pool.query(
      `SELECT ${USER_FIELDS}, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (!result.rows.length)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    delete user.password_hash;
    res.json({ token: makeToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

function generarPasswordTemporal() {
  // 8 caracteres alfanuméricos, sin ambiguos (0/O, 1/l/I) para que se puedan transcribir a mano.
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
}

// POST /auth/forgot-password — genera una contraseña temporal, la guarda hasheada y la manda por mail.
// Responde siempre 200 con el mismo mensaje genérico exista o no la cuenta, para no filtrar qué
// emails están registrados.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email es requerido' });

  const mensaje = { message: 'Si el email está registrado, vas a recibir una contraseña temporal.' };

  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.json(mensaje);

    const user = rows[0];
    const passwordTemporal = generarPasswordTemporal();

    // Se manda el mail ANTES de tocar la contraseña: si el envío falla (ej. timeout de SMTP), la
    // contraseña actual del usuario queda intacta en vez de quedar cambiada a un valor que nunca le llegó.
    await enviarPasswordTemporal(user.email, passwordTemporal);

    const hash = await bcrypt.hash(passwordTemporal, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

    res.json(mensaje);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /auth/change-password — cambiar la contraseña estando logueado (ej. tras entrar con la temporal).
router.put('/change-password', authMiddleware, async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;
  if (!passwordActual || !passwordNueva)
    return res.status(400).json({ error: 'passwordActual y passwordNueva son requeridos' });
  if (passwordNueva.length < 6)
    return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 6 caracteres' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(passwordActual, rows[0].password_hash);
    if (!match) return res.status(401).json({ error: 'La contraseña actual no es correcta' });

    const hash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /auth/me — verificar token y devolver datos del usuario
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${USER_FIELDS} FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
