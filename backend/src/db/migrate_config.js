require('dotenv').config();
const pool = require('./pool');

const SQL = `
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function migrate() {
  console.log('Ejecutando migración app_config...');
  try {
    await pool.query(SQL);
    console.log('✓ Migración app_config completada');
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
