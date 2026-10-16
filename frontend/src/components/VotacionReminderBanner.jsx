import { useEffect, useState } from 'react';
import { getVotacionSemana } from '../api/competencias';

// Recordatorio sobrio de que falta votar el deporte de la semana siguiente — vive en el home
// (Ranking) para que se vea sin tener que navegar al calendario. Desaparece solo cuando ya se votó
// en las dos categorías ("tranquilo" y "extremo") de la próxima semana a definir.
export default function VotacionReminderBanner({ competencia, onOpenCalendario }) {
  const [estado, setEstado] = useState(null); // { semanaId } | 'nada-que-votar' | null (cargando/sin datos)

  const semanas = competencia?.semanas;
  // La próxima semana a votar: la de menor numero_semana (>1) a la que todavía le falte alguna
  // categoría por definir — misma noción de "semana editable" que usa SemanaPanel.
  const semanaAVotar = Array.isArray(semanas)
    ? [...semanas]
        .filter(s => s.numero_semana > 1 && (!s.deporte_semana_nombre || !s.deporte_semana_nombre_2))
        .sort((a, b) => a.numero_semana - b.numero_semana)[0]
    : null;

  useEffect(() => {
    let cancelado = false;
    if (!semanaAVotar) { setEstado('nada-que-votar'); return; }

    const faltaTranquilo = !semanaAVotar.deporte_semana_nombre;
    const faltaExtremo   = !semanaAVotar.deporte_semana_nombre_2;

    Promise.all([
      faltaTranquilo ? getVotacionSemana(competencia.id, semanaAVotar.id, 'tranquilo') : null,
      faltaExtremo   ? getVotacionSemana(competencia.id, semanaAVotar.id, 'extremo')   : null,
    ]).then(([tranquilo, extremo]) => {
      if (cancelado) return;
      const pendienteTranquilo = faltaTranquilo && tranquilo?.mi_voto_deporte_id == null;
      const pendienteExtremo   = faltaExtremo   && extremo?.mi_voto_deporte_id == null;
      setEstado(pendienteTranquilo || pendienteExtremo ? { semanaId: semanaAVotar.id } : 'nada-que-votar');
    }).catch(() => { if (!cancelado) setEstado('nada-que-votar'); });

    return () => { cancelado = true; };
  }, [competencia?.id, semanaAVotar?.id, semanaAVotar?.deporte_semana_nombre, semanaAVotar?.deporte_semana_nombre_2]);

  if (!estado || estado === 'nada-que-votar') return null;

  return (
    <button onClick={onOpenCalendario}
      style={{
        display:'flex', alignItems:'center', gap:8, width:'100%', textAlign:'left',
        padding:'9px 14px', borderRadius:10, margin:'0 0 10px',
        border:'1px solid var(--t-dim)', background:'var(--t-surface2)',
        cursor:'pointer', WebkitTapHighlightColor:'transparent',
      }}>
      <span style={{ fontSize:13, flexShrink:0 }}>🗳️</span>
      <span style={{ flex:1, fontSize:12.5, color:'var(--t-muted)', lineHeight:1.3 }}>
        Falta tu voto para el deporte de la próxima semana
      </span>
      <span style={{ fontSize:12, color:'var(--t-accent)', fontWeight:600, flexShrink:0 }}>Votar ›</span>
    </button>
  );
}
