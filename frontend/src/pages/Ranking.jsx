import { useEffect, useState } from 'react';
import { getRanking, getMeses } from '../api/ranking';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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

  const maxPts   = ranking[0]?.puntos || 1;
  const mesLabel = mes
    ? MONTHS_ES[parseInt(mes.split('-')[1]) - 1] + ' ' + mes.split('-')[0]
    : 'Acumulado total';

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
      {/* Header sticky */}
      <div style={{ position:'sticky', top:'52px', zIndex:10, background:'var(--t-ground)', padding:'20px 18px 14px', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:4 }}>
          Tabla de posiciones
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(26px,7vw,34px)', textTransform:'uppercase', lineHeight:1, color:'var(--t-text)', marginBottom:14 }}>
          {mesLabel}
        </div>

        {/* Selector de mes */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none', paddingBottom:2 }}>
          {[{ val: '', label: 'Acumulado' }, ...meses.map(m => {
            const [y, mo] = m.split('-');
            return { val: m, label: MONTHS_ES[parseInt(mo) - 1].slice(0, 3) + ' ' + y };
          })].map(({ val, label }) => (
            <button key={val} onClick={() => setMes(val)} style={{
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              border: '1.5px solid',
              cursor: 'pointer',
              transition: 'all .15s',
              background:   mes === val ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
              borderColor:  mes === val ? 'var(--t-accent)' : 'var(--t-dim)',
              color:        mes === val ? 'var(--t-accent)' : 'var(--t-muted)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex:1 }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'80px 20px', color:'var(--t-muted)', fontSize:14 }}>
            <div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            Cargando…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--t-muted)' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', marginBottom:6 }}>Sin registros</div>
            <div style={{ fontSize:14 }}>Cargá actividades para ver el ranking.</div>
          </div>
        ) : (
          ranking.map((p, i) => {
            const pct   = Math.round((p.puntos / maxPts) * 100);
            const isTop = i === 0;
            return (
              <div key={p.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 18px',
                borderBottom: '1px solid var(--t-dim)',
                cursor: 'default',
              }}>
                {/* Posición */}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 900,
                  fontSize: 30,
                  lineHeight: 1,
                  width: 28,
                  textAlign: 'right',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                  color: isTop ? 'var(--t-accent)' : 'var(--t-dim2)',
                }}>
                  {i + 1}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:19, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {p.nombre}
                  </div>
                  <div style={{ height:3, background:'var(--t-dim)', borderRadius:2, marginTop:7, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.55 }} />
                  </div>
                  <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:4, fontVariantNumeric:'tabular-nums', letterSpacing:'0.02em' }}>
                    {p.actividades} ses · {Math.round(p.minutos).toLocaleString('es')} min
                  </div>
                </div>

                {/* Puntos */}
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:24, lineHeight:1, color:'var(--t-text)', fontVariantNumeric:'tabular-nums' }}>
                    {Math.round(p.puntos).toLocaleString('es')}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginTop:2 }}>pts</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
