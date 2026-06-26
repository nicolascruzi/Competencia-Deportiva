import { useEffect, useState } from 'react';
import { getRanking, getMeses } from '../api/ranking';

const COLORS = ['#38BDF8','#34D399','#F59E0B','#F87171','#A78BFA','#FB923C','#2DD4BF','#E879F9','#86EFAC','#FDE68A'];
const MEDALS = ['🥇','🥈','🥉'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function personColor(nombre, nombres) {
  const idx = [...nombres].sort().indexOf(nombre);
  return COLORS[idx % COLORS.length];
}

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [meses, setMeses]     = useState([]);
  const [mes, setMes]         = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeses().then(m => {
      setMeses(m);
      if (m.length) setMes(m[0]);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getRanking(mes)
      .then(setRanking)
      .finally(() => setLoading(false));
  }, [mes]);

  const nombres    = ranking.map(r => r.nombre);
  const maxPts     = ranking[0]?.puntos || 1;
  const mesLabel   = mes ? MONTHS_ES[parseInt(mes.split('-')[1]) - 1] + ' ' + mes.split('-')[0] : 'Acumulado total';

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#38BDF8' }}>Tabla de posiciones</div>
        <div className="font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(28px,6vw,40px)', lineHeight: 1 }}>
          {mesLabel}
        </div>
      </div>

      {/* Selector de mes */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setMes('')}
          className="px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all"
          style={{ background: mes === '' ? 'rgba(56,189,248,0.12)' : 'transparent', borderColor: mes === '' ? 'rgba(56,189,248,0.4)' : '#243D57', color: mes === '' ? '#38BDF8' : '#7A9BBF' }}>
          Acumulado
        </button>
        {meses.map(m => {
          const [y, mo] = m.split('-');
          const label = MONTHS_ES[parseInt(mo) - 1].slice(0, 3) + ' ' + y;
          return (
            <button key={m} onClick={() => setMes(m)}
              className="px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all"
              style={{ background: mes === m ? 'rgba(56,189,248,0.12)' : 'transparent', borderColor: mes === m ? 'rgba(56,189,248,0.4)' : '#243D57', color: mes === m ? '#38BDF8' : '#7A9BBF' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm" style={{ color: '#7A9BBF' }}>
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
          Cargando…
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#7A9BBF' }}>
          <div className="text-4xl mb-3">🏁</div>
          <div className="font-bold text-lg uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>Sin registros</div>
          <div className="text-sm mt-1">Cargá actividades para ver el ranking.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {ranking.map((p, i) => {
            const color = personColor(p.nombre, nombres);
            const pct   = Math.round((p.puntos / maxPts) * 100);
            return (
              <div key={p.id} className="rounded-xl border p-4 flex items-center gap-4"
                   style={{ background: i === 0 ? 'rgba(56,189,248,0.04)' : '#132236', borderColor: i === 0 ? 'rgba(56,189,248,0.3)' : '#243D57' }}>

                {/* Posición */}
                <div className="font-bold text-3xl w-8 text-center shrink-0"
                     style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#7A9BBF', opacity: 0.5 }}>
                  {i + 1}
                </div>

                {/* Medalla */}
                {i < 3 && <div className="text-xl shrink-0">{MEDALS[i]}</div>}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg uppercase truncate"
                       style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>
                    {p.nombre}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.actividades} actividades · {Math.round(p.minutos).toLocaleString('es')} min
                  </div>
                  {/* Barra */}
                  <div className="h-1 rounded-full mt-2" style={{ background: '#243D57' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: color }} />
                  </div>
                </div>

                {/* Puntos */}
                <div className="text-right shrink-0">
                  <div className="font-bold text-xl" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
                    {Math.round(p.puntos).toLocaleString('es')}
                  </div>
                  <div className="text-xs" style={{ color: '#7A9BBF' }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
