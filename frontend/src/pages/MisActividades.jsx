import { useEffect, useState } from 'react';
import { getActividades, deleteActividad } from '../api/actividades';

const SPORT_ICONS = {
  'Bicicleta MTB':'🚵','Bicicleta Rodillo':'🚴','Bicicleta Ruta':'🚴','Box':'🥊',
  'Buceo':'🤿','Crossfit':'🏋️','Cuerda':'🪢','Escalada':'🧗','Funcional':'💪',
  'Fútbol':'⚽','Gimnasio':'🏋️','Golf':'⛳','Natación':'🏊','Padel':'🏓',
  'Spinning':'🚴','Surf':'🏄','Tenis':'🎾','Trail Running':'🏃','Trekking':'🥾','Trote':'🏃',
};
const icon = s => SPORT_ICONS[s] || '🏅';

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading]         = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await getActividades();
      setActividades(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await deleteActividad(id);
    load();
  }

  const groupedByDate = actividades.reduce((acc, a) => {
    const fecha = a.fecha.slice(0, 10);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#38BDF8' }}>Historial</div>
          <div className="font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(28px,6vw,40px)', lineHeight: 1 }}>
            Mis actividades
          </div>
        </div>
        <button onClick={onNewActivity}
          className="px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wide"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A' }}>
          + Nueva
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm" style={{ color: '#7A9BBF' }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
          Cargando…
        </div>
      ) : actividades.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#7A9BBF' }}>
          <div className="text-4xl mb-3">🏅</div>
          <div className="font-bold text-lg uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>Sin actividades</div>
          <div className="text-sm mt-1">Registrá tu primera actividad.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedDates.map(fecha => {
            const acts  = groupedByDate[fecha];
            const date  = new Date(fecha + 'T12:00:00');
            const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
            return (
              <div key={fecha}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2"
                     style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </div>
                <div className="flex flex-col gap-2">
                  {acts.map(a => (
                    <div key={a.id} className="rounded-xl border px-4 py-3 flex items-center gap-3"
                         style={{ background: '#132236', borderColor: '#243D57' }}>
                      <span className="text-2xl shrink-0">{icon(a.deporte_nombre)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{a.deporte_nombre}</div>
                        {a.notas && <div className="text-xs mt-0.5 truncate" style={{ color: '#7A9BBF' }}>{a.notas}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-base" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
                          {Math.round(parseFloat(a.puntos))} pts
                        </div>
                        <div className="text-xs" style={{ color: '#7A9BBF' }}>{Math.round(parseFloat(a.minutos))} min</div>
                      </div>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-xs px-2 py-1 rounded-lg transition-all ml-1"
                        style={{ color: '#7A9BBF' }}
                        onMouseEnter={e => e.target.style.color = '#F87171'}
                        onMouseLeave={e => e.target.style.color = '#7A9BBF'}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
