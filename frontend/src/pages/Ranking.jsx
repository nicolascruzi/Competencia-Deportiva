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
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              whiteSpace: 'nowrap', flexShrink: 0, border: '1.5px solid', cursor: 'pointer',
              transition: 'all .15s',
              background:  mes === val ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
              borderColor: mes === val ? 'var(--t-accent)' : 'var(--t-dim)',
              color:       mes === val ? 'var(--t-accent)' : 'var(--t-muted)',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{ padding:'14px 16px 24px', display:'flex', flexDirection:'column', gap:8 }}>
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
            const medal = ['🥇','🥈','🥉'][i] ?? null;
            return (
              <div key={p.id} style={{
                background: isTop ? 'rgba(var(--t-accent-r),0.06)' : 'var(--t-surface)',
                border: '1px solid',
                borderColor: isTop ? 'rgba(var(--t-accent-r),0.35)' : 'var(--t-dim)',
                borderRadius: 12,
                padding: '10px 12px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {isTop && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--t-accent)', opacity:0.65 }} />}

                {/* Fila principal */}
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {/* Posición */}
                  <div style={{ width:22, textAlign:'center', flexShrink:0 }}>
                    {medal
                      ? <span style={{ fontSize:16, lineHeight:1 }}>{medal}</span>
                      : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, lineHeight:1, color:'var(--t-dim2)', fontVariantNumeric:'tabular-nums' }}>{i + 1}</span>
                    }
                  </div>

                  {/* Avatar */}
                  <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:'rgba(var(--t-accent-r),0.1)', border:'1.5px solid rgba(var(--t-accent-r),0.2)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                    {p.foto_perfil_url
                      ? <img src={p.foto_perfil_url} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:'var(--t-accent)' }}>{p.nombre?.charAt(0).toUpperCase()}</span>
                    }
                  </div>

                  {/* Info central */}
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Nombre */}
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)', lineHeight:1.1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {p.nombre}
                    </div>
                    {/* Stats en línea */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3 }}>
                      <span style={{ fontSize:10, color:'var(--t-muted)', fontVariantNumeric:'tabular-nums' }}>
                        {p.actividades} ses
                      </span>
                      <span style={{ fontSize:10, color:'var(--t-dim2)' }}>·</span>
                      <span style={{ fontSize:10, color:'var(--t-muted)', fontVariantNumeric:'tabular-nums' }}>
                        {Math.round(p.minutos).toLocaleString('es')} min
                      </span>
                    </div>
                    {/* Barra de progreso */}
                    <div style={{ height:2, background:'var(--t-dim)', borderRadius:2, marginTop:6, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity: isTop ? 0.8 : 0.45, transition:'width 0.4s ease' }} />
                    </div>
                  </div>

                  {/* Puntos */}
                  <div style={{ textAlign:'right', flexShrink:0, paddingLeft:6 }}>
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, lineHeight:1, color: isTop ? 'var(--t-accent)' : 'var(--t-text)', fontVariantNumeric:'tabular-nums' }}>
                      {Math.round(p.puntos).toLocaleString('es')}
                    </div>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginTop:2, textAlign:'right' }}>
                      pts
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
