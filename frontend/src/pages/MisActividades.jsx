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
    try { setActividades(await getActividades()); }
    finally { setLoading(false); }
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

  // Totales del mes actual
  const now = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actsMes   = actividades.filter(a => a.fecha.slice(0,7) === mesActual);
  const ptosMes   = actsMes.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const minsMes   = actsMes.reduce((s, a) => s + parseFloat(a.minutos), 0);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: '#0D1B2A' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#38BDF8' }}>
          Historial
        </div>
        <div className="font-bold uppercase leading-none"
             style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(26px,7vw,38px)' }}>
          Mis actividades
        </div>

        {/* Stats del mes */}
        {actsMes.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Este mes', value: actsMes.length, unit: 'act.' },
              { label: 'Minutos', value: Math.round(minsMes).toLocaleString('es'), unit: 'min' },
              { label: 'Puntos', value: Math.round(ptosMes).toLocaleString('es'), unit: 'pts', accent: true },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: '#132236', border: '1px solid #243D57' }}>
                <div className="font-bold text-xl leading-tight"
                     style={{ fontFamily: "'JetBrains Mono', monospace", color: accent ? '#38BDF8' : '#E8F0FE' }}>
                  {value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9BBF' }}>{unit}</div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9BBF', fontSize: '10px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color: '#7A9BBF' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
            Cargando…
          </div>
        ) : actividades.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#7A9BBF' }}>
            <div className="text-5xl mb-4">🏅</div>
            <div className="font-bold text-xl uppercase mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
              Sin actividades
            </div>
            <div className="text-sm mb-6">Registrá tu primera actividad.</div>
            <button onClick={onNewActivity}
              className="px-6 py-3 rounded-2xl font-bold text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A' }}>
              + Nueva actividad
            </button>
          </div>
        ) : (
          sortedDates.map(fecha => {
            const acts  = groupedByDate[fecha];
            const date  = new Date(fecha + 'T12:00:00');
            const label = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
            const totalPts = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

            return (
              <div key={fecha}>
                {/* Cabecera del día */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider"
                       style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#38BDF8', fontFamily: "'JetBrains Mono', monospace" }}>
                    {Math.round(totalPts)} pts
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {acts.map(a => (
                    <div key={a.id} className="rounded-2xl border px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                         style={{ background: '#132236', borderColor: '#243D57' }}>
                      <span className="text-3xl shrink-0">{icon(a.deporte_nombre)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base">{a.deporte_nombre}</div>
                        {a.notas && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: '#7A9BBF' }}>{a.notas}</div>
                        )}
                        <div className="text-xs mt-1" style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                          {Math.round(parseFloat(a.minutos))} min
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-lg leading-tight"
                             style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
                          {Math.round(parseFloat(a.puntos))}
                        </div>
                        <div className="text-xs" style={{ color: '#7A9BBF' }}>pts</div>
                      </div>
                      <button onClick={() => handleDelete(a.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
                        style={{ color: '#7A9BBF', background: 'transparent' }}
                        onTouchStart={e => e.currentTarget.style.color = '#F87171'}
                        onTouchEnd={e => e.currentTarget.style.color = '#7A9BBF'}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
