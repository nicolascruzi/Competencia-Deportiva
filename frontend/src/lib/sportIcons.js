import { getDeportes } from '../api/actividades';

// Mapa de respaldo, usado solo mientras se cargan los deportes reales (o si uno no tiene ícono
// configurado) — el ícono con autoridad es el guardado en la tabla `deportes` (columna `icono`),
// editable desde AdminCompetenciaSheets.jsx.
export const SPORT_ICONS = {
  'Bicicleta MTB':'🚵','Bicicleta Rodillo':'🚴','Bicicleta Ruta':'🚴','Box':'🥊',
  'Buceo':'🤿','Crossfit':'🏋️','Cuerda':'🪢','Escalada':'🧗','Funcional':'💪',
  'Fútbol':'⚽','Gimnasio':'🏋️','Golf':'⛳','Natación':'🏊','Padel':'🏓',
  'Spinning':'🚴','Surf':'🏄','Tenis':'🎾','Trail Running':'🏃','Trekking':'🥾','Trote':'🏃',
};

let iconosReales = {};
let cargaIniciada = false;

function cargarIconosReales() {
  if (cargaIniciada) return;
  cargaIniciada = true;
  getDeportes().then(rows => {
    const mapa = {};
    (Array.isArray(rows) ? rows : []).forEach(d => { if (d?.nombre && d.icono) mapa[d.nombre] = d.icono; });
    iconosReales = mapa;
  }).catch(() => {});
}
cargarIconosReales();

export const sportIcon = s => iconosReales[s] || SPORT_ICONS[s] || '🏅';
