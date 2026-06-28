const express    = require('express');
const multer     = require('multer');
const cloudinary = require('../lib/cloudinary');
const pool       = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { Readable } = require('stream');

const router = express.Router();
// Almacena en memoria (buffer), límite 8 MB por foto
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Sube buffer a Cloudinary usando un stream
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

// PUT /perfil — actualiza datos del perfil
router.put('/', authMiddleware, async (req, res) => {
  const { peso_kg, estatura_cm, fecha_nacimiento, sexo } = req.body;

  const campos = [];
  const valores = [];
  let idx = 1;

  if (peso_kg !== undefined)        { campos.push(`peso_kg = $${idx++}`);        valores.push(peso_kg); }
  if (estatura_cm !== undefined)    { campos.push(`estatura_cm = $${idx++}`);    valores.push(estatura_cm); }
  if (fecha_nacimiento !== undefined){ campos.push(`fecha_nacimiento = $${idx++}`); valores.push(fecha_nacimiento); }
  if (sexo !== undefined)           { campos.push(`sexo = $${idx++}`);           valores.push(sexo); }

  if (campos.length === 0)
    return res.status(400).json({ error: 'No se recibió ningún campo para actualizar' });

  valores.push(req.user.id);

  try {
    const { rows: [user] } = await pool.query(
      `UPDATE users SET ${campos.join(', ')} WHERE id = $${idx}
       RETURNING id, email, nombre, role, created_at, foto_perfil_url, peso_kg, estatura_cm, fecha_nacimiento, sexo`,
      valores
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// POST /perfil/foto — sube o reemplaza foto de perfil
router.post('/foto', authMiddleware, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' });

  try {
    // Obtener foto anterior del usuario
    const { rows: [user] } = await pool.query(
      'SELECT foto_perfil_public_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Borrar foto anterior de Cloudinary si existía
    if (user.foto_perfil_public_id) {
      await cloudinary.uploader.destroy(user.foto_perfil_public_id).catch(() => {});
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:         'nanao-cup/perfiles',
      public_id:      `perfil-${req.user.id}-${Date.now()}`,
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good', fetch_format: 'auto' }],
    });

    await pool.query(
      'UPDATE users SET foto_perfil_url = $1, foto_perfil_public_id = $2 WHERE id = $3',
      [result.secure_url, result.public_id, req.user.id]
    );

    res.json({ foto_perfil_url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la foto de perfil' });
  }
});

// DELETE /perfil/foto — borra la foto de perfil
router.delete('/foto', authMiddleware, async (req, res) => {
  try {
    const { rows: [user] } = await pool.query(
      'SELECT foto_perfil_public_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.foto_perfil_public_id) {
      await cloudinary.uploader.destroy(user.foto_perfil_public_id).catch(() => {});
    }

    await pool.query(
      'UPDATE users SET foto_perfil_url = NULL, foto_perfil_public_id = NULL WHERE id = $1',
      [req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la foto de perfil' });
  }
});

module.exports = router;
