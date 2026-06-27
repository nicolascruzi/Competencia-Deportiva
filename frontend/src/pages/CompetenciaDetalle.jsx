import { useEffect, useState } from 'react';
import { getRankingComp, getMesesComp } from '../api/competencias';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#38BDF8','#34D399','#F59E0B','#F87171','#A78BFA','#FB923C','#2DD4BF','#E879F9','#86EFAC','#FDE68A'];
const MEDALS = ['🥇','🥈','🥉'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function personColor(nombre, nombres) {
  const idx = [...nombres].sort().indexOf(nombre);
  return COLORS[idx % COLORS.length];
}

export default function CompetenciaDetalle({ competencia, onBack, onNewActivity }) {
  const { user } = useAuth();
  const [ranking, setRanking] = useState([]);
  const [meses, setMeses]     = useState([]);
  const [mes, setMes]         = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMesesComp(competencia.id).then(m => {
      setMeses(m);
      if (m.length) setMes(m[0]);
    });
  }, [competencia.id]);

  useEffect(() => {
    setLoading(true);
    getRankingComp(competencia.id, mes).then(setRanking).finally(() => setLoading(false));
  }, [competencia.id, mes]);

  const nombres = ranking.map(r => r.nombre);
  const maxPts  = ranking[0]?.puntos || 1;
  const mesLabel = mes
    ? MONTHS_ES[parseInt(mes.split('-')[1]) - 1] + ' ' + mes.split('-')[0]
    : 'Acumulado total';

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="sticky z-10 px-4 pt-4 pb-3" style={{ top: '52px', background: '#0D1B2A' }}>
        {/* Back */}
        <button onClick={onBack} className="flex items-center gap-1 text-xs mb-3" style={{ color: '#7A9BBF' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Mis competencias
        </button>

        <div className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#38BDF8' }}>
          Ranking
        </div>
        <div className="font-bold uppercase leading-none mb-3"
             style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(22px,6vw,34px)' }}>
          {competencia.nombre}
        </div>

        {/* Selector de mes */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[{ val: '', label: 'Acumulado' }, ...meses.map(m => {
            const [y, mo] = m.split('-');
            return { val: m, label: MONTHS_ES[parseInt(mo) - 1].slice(0, 3) + ' ' + y };
          })].map(({ val, label }) => (
            <button key={val} onClick={() => setMes(val)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0"
              style={{
                background:  mes === val ? 'rgba(56,189,248,0.15)' : 'transparent',
                borderColor: mes === val ? '#38BDF8' : '#243D57',
                color:       mes === val ? '#38BDF8' : '#7A9BBF',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color: '#7A9BBF' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
            Cargando…
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#7A9BBF' }}>
            <div className="text-5xl mb-4">🏁</div>
            <div className="font-bold text-xl uppercase mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
              Sin registros
            </div>
            <div className="text-sm mb-6">Cargá actividades para ver el ranking.</div>
            <button onClick={onNewActivity}
              className="px-6 py-3 rounded-2xl font-bold text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A' }}>
              + Nueva actividad
            </button>
          </div>
        ) : (
          ranking.map((p, i) => {
            const color = personColor(p.nombre, nombres);
            const pct   = Math.round((p.puntos / maxPts) * 100);
            const isTop = i === 0;
            const isMe  = p.id === user?.id;
            return (
              <div key={p.id}
                className="rounded-2xl border p-4 flex items-center gap-3"
                style={{
                  background:  isTop ? 'rgba(56,189,248,0.05)' : isMe ? 'rgba(255,255,255,0.02)' : '#132236',
                  borderColor: isTop ? 'rgba(56,189,248,0.35)' : isMe ? 'rgba(255,255,255,0.1)' : '#243D57',
                }}>
                <div className="font-bold text-4xl w-9 text-center shrink-0 leading-none"
                     style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#7A9BBF', opacity: 0.35 }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {i < 3 && <span className="text-lg leading-none">{MEDALS[i]}</span>}
                    <div className="font-bold text-xl uppercase truncate leading-tight"
                         style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>
                      {p.nombre}{isMe ? ' (yo)' : ''}
                    </div>
                  </div>
                  <div className="text-xs mb-2" style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.actividades} act · {Math.round(p.minutos).toLocaleString('es')} min
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#243D57' }}>
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <div className="font-bold leading-none" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontSize: '22px' }}>
                    {Math.round(p.puntos).toLocaleString('es')}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#7A9BBF' }}>pts</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
