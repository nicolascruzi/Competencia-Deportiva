// Fecha "de hoy" en hora de Chile (America/Santiago), no en UTC del servidor — todas las fechas de
// la app (competencias, semanas, actividades) son columnas DATE sin hora, pensadas como días de
// calendario locales. Usar la fecha UTC del servidor corta el día antes de tiempo para cualquier
// usuario en una zona horaria detrás de UTC (ej. a las 21:00 en Chile ya es "mañana" en UTC).
function hoyChile() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

module.exports = { hoyChile };
