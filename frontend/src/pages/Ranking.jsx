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
    getRanking(mes).then(setRanking).finally(() => setLoading(false));
  }, [mes]);

  const nombres  = ranking.map(r => r.nombre);
  const maxPts   = ranking[0]?.puntos || 1;
  const mesLabel = mes
    ? MONTHS_ES[parseInt(mes.split('-')[1]) - 1] + ' ' + mes.split('-')[0]
    : 'Acumulado total';

  return (
    <div className="flex flex-col min-h-0">
      {/* Header sticky */}
      <div className="sticky z-10 px-4 pt-5 pb-3" style={{ top: '52px', background: 'var(--t-ground)' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--t-accent)' }}>
          Tabla de posiciones
        </div>
        <div className="font-bold uppercase leading-none mb-4"
             style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(26px,7vw,38px)', color: 'var(--t-text)' }}>
          {mesLabel}
        </div>

        {/* Selector de mes — scroll horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[{ val: '', label: 'Acumulado' }, ...meses.map(m => {
            const [y, mo] = m.split('-');
            return { val: m, label: MONTHS_ES[parseInt(mo) - 1].slice(0, 3) + ' ' + y };
          })].map(({ val, label }) => (
            <button key={val} onClick={() => setMes(val)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all shrink-0"
              style={{
                background:   mes === val ? 'rgba(var(--t-accent-r),0.15)' : 'transparent',
                borderColor:  mes === val ? 'var(--t-accent)' : 'var(--t-dim)',
                color:        mes === val ? 'var(--t-accent)' : 'var(--t-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color: 'var(--t-muted)' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--t-dim)', borderTopColor: 'var(--t-accent)' }} />
            Cargando…
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-24" style={{ color: 'var(--t-muted)' }}>
            <div className="text-5xl mb-4">🏁</div>
            <div className="font-bold text-xl uppercase mb-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--t-text)' }}>
              Sin registros
            </div>
            <div className="text-sm">Cargá actividades para ver el ranking.</div>
          </div>
        ) : (
          ranking.map((p, i) => {
            const color = personColor(p.nombre, nombres);
            const pct   = Math.round((p.puntos / maxPts) * 100);
            const isTop = i === 0;
            return (
              <div key={p.id}
                className="rounded-2xl border p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
                style={{
                  background:   isTop ? 'rgba(var(--t-accent-r),0.05)' : 'var(--t-surface)',
                  borderColor:  isTop ? 'rgba(var(--t-accent-r),0.35)' : 'var(--t-dim)',
                }}>

                {/* Posición */}
                <div className="font-bold text-4xl w-9 text-center shrink-0 leading-none"
                     style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--t-muted)', opacity: 0.35 }}>
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {i < 3 && <span className="text-lg leading-none">{MEDALS[i]}</span>}
                    <div className="font-bold text-xl uppercase truncate leading-tight"
                         style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>
                      {p.nombre}
                    </div>
                  </div>
                  <div className="text-xs mb-2" style={{ color: 'var(--t-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {p.actividades} act · {Math.round(p.minutos).toLocaleString('es')} min
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--t-dim)' }}>
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
                  </div>
                </div>

                {/* Puntos */}
                <div className="text-right shrink-0 pl-2">
                  <div className="font-bold leading-none" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--t-accent)', fontSize: '22px' }}>
                    {Math.round(p.puntos).toLocaleString('es')}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--t-muted)' }}>pts</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
