const crypto = require('crypto');

// 8 caracteres alfanuméricos, sin ambiguos (0/O, 1/l/I) para que se puedan transcribir a mano.
function generarPasswordTemporal() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
}

module.exports = { generarPasswordTemporal };
