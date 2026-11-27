// Formatea un número para mostrar, con separador de miles en español (1232 -> "1.232").
export function fmtNum(n) {
  return Math.round(n).toLocaleString('es');
}
