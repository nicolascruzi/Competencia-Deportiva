const express    = require('express');
const multer     = require('multer');
const cloudinary = require('../lib/cloudinary');
const pool       = require('../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { Readable } = require('stream');

const router  = express.Router();
// Almacena en memoria (buffer), límite 10 MB por foto
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

// POST /fotos/actividad/:id — sube o reemplaza foto de una actividad
router.post('/actividad/:id', authMiddleware, upload.single('foto'), async (req, res) => {
  const actId   = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto' });

  try {
    const { rows: [act] } = await pool.query('SELECT * FROM actividades WHERE id=$1', [actId]);
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });
    if (!isAdmin && act.user_id !== req.user.id)
      return res.status(403).json({ error: 'No tenés permiso para editar esta actividad' });

    // Si ya tenía foto, borrarla de Cloudinary
    if (act.foto_public_id) {
      await cloudinary.uploader.destroy(act.foto_public_id).catch(() => {});
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:          'nanao-cup/actividades',
      public_id:       `actividad-${actId}-${Date.now()}`,
      transformation:  [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
    });

    await pool.query(
      'UPDATE actividades SET foto_url=$1, foto_public_id=$2, updated_at=NOW() WHERE id=$3',
      [result.secure_url, result.public_id, actId]
    );

    res.json({ foto_url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// DELETE /fotos/actividad/:id — borra la foto de una actividad
router.delete('/actividad/:id', authMiddleware, async (req, res) => {
  const actId   = parseInt(req.params.id);
  const isAdmin = req.user.role === 'admin';

  try {
    const { rows: [act] } = await pool.query('SELECT * FROM actividades WHERE id=$1', [actId]);
    if (!act) return res.status(404).json({ error: 'Actividad no encontrada' });
    if (!isAdmin && act.user_id !== req.user.id)
      return res.status(403).json({ error: 'No tenés permiso' });

    if (act.foto_public_id) {
      await cloudinary.uploader.destroy(act.foto_public_id).catch(() => {});
    }

    await pool.query(
      'UPDATE actividades SET foto_url=NULL, foto_public_id=NULL, updated_at=NOW() WHERE id=$1',
      [actId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

module.exports = router;
