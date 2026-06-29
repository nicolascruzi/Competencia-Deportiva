const pool = require('../db/pool');

// Obtener un valor de configuración (primero DB, fallback a .env)
async function getConfig(key) {
  try {
    const result = await pool.query('SELECT value FROM app_config WHERE key = $1', [key]);
    if (result.rows.length) return result.rows[0].value;
  } catch { /* DB no disponible, usar .env */ }
  return process.env[key] ?? null;
}

// Obtener múltiples claves a la vez → { key: value, ... }
async function getConfigs(keys) {
  try {
    const result = await pool.query(
      'SELECT key, value FROM app_config WHERE key = ANY($1)',
      [keys]
    );
    const map = {};
    result.rows.forEach(r => { map[r.key] = r.value; });
    // Fallback a .env para las que no estén en DB
    keys.forEach(k => { if (!map[k]) map[k] = process.env[k] ?? null; });
    return map;
  } catch {
    const map = {};
    keys.forEach(k => { map[k] = process.env[k] ?? null; });
    return map;
  }
}

module.exports = { getConfig, getConfigs };
