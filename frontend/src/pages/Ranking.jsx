import { useEffect, useState } from 'react';
import { getRanking } from '../api/ranking';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Ranking() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11; -1 = Acumulado
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  // month === -1 significa "Acumulado" (un paso a la derecha del mes actual)
  const isAcumulado = month === -1;
  const mesVal = isAcumulado ? '' : `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    getRanking(mesVal).then(setRanking).finally(() => setLoading(false));
  }, [mesVal]);

  const maxPts = ranking[0]?.puntos || 1;

  function prev() {
    // Desde Acumulado → vuelve al mes actual
    if (isAcumulado) { setYear(now.getFullYear()); setMonth(now.getMonth()); return; }
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    // Un paso más allá del mes actual → Acumulado
    if (year === now.getFullYear() && month === now.getMonth()) { setMonth(-1); return; }
    if (isAcumulado) return; // tope derecho
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const canNext = !isAcumulado;
  const label   = isAcumulado ? 'Acumulado' : MONTHS_ES[month];
  const sublabel = isAcumulado ? 'todos los tiempos' : String(year);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
      {/* Header sticky */}
      <div style={{ position:'sticky', top:'52px', zIndex:10, background:'var(--t-ground)', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', padding:'16px 20px 0' }}>
          Tabla de posiciones
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px 14px' }}>
          <button onClick={prev}
            style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
              {label}
            </div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>{sublabel}</div>
          </div>
          <button onClick={next} disabled={!canNext}
            style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color: canNext ? 'var(--t-muted)' : 'var(--t-dim)', cursor: canNext ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
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
