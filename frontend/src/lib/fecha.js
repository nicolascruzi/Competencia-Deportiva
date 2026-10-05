// Fecha "de hoy" en la zona horaria local del dispositivo, en formato YYYY-MM-DD.
// new Date().toISOString() siempre da la fecha en UTC, que no es la de hoy para cualquier usuario
// en una zona horaria detrás de UTC durante la tarde/noche (ej. en Chile a las 21:00 ya es "mañana"
// en UTC) — usar eso corta el día antes de tiempo y bloquea fechas que el usuario ve como "hoy".
export function hoyLocal() {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
