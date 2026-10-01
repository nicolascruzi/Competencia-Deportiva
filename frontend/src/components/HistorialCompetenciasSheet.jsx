import { useEffect, useRef, useState } from 'react';
import { getCompetenciasGrupo, cerrarCompetenciaGrupo } from '../api/grupos';
import { getRankingComp } from '../api/competencias';
import NuevaCompetenciaSheet from './NuevaCompetenciaSheet';

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function RankingCongelado({ competencia, onBack }) {
  const [ranking, setRanking] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    getRankingComp(competencia.id)
      .then(rows => { if (!cancelado) setRanking(Array.isArray(rows) ? rows : []); })
      .catch(err => { if (!cancelado) setError(err.message); });
    return () => { cancelado = true; };
  }, [competencia.id]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <button onClick={onBack}
        style={{ display:'flex', alignItems:'center', gap:6, alignSelf:'flex-start', padding:'6px 4px', background:'transparent', border:'none', cursor:'pointer', color:'var(--t-muted)', fontSize:13, WebkitTapHighlightColor:'transparent' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        Volver al historial
      </button>
      <div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
          {competencia.nombre}
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>
          {competencia.estado === 'finalizada' ? 'Ranking final' : 'Ranking actual'}
          {competencia.fecha_inicio && ` · ${fmtFecha(competencia.fecha_inicio)} al ${fmtFecha(competencia.fecha_fin)}`}
        </div>
      </div>

      {error && <div style={{ fontSize:13, color:'#F87171' }}>{error}</div>}

      {ranking === null && !error ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'30px 0', color:'var(--t-muted)', fontSize:13, gap:8 }}>
          <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          Cargando…
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {ranking.map((p, i) => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--t-surface2)', border:'1px solid var(--t-dim)' }}>
              <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:'var(--t-muted)', width:18, textAlign:'center', flexShrink:0 }}>
                {i + 1}
              </span>
              <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {p.nombre_display}
              </span>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:15, color:'var(--t-accent)', flexShrink:0 }}>
                {Math.round(p.puntos)} <span style={{ fontSize:10, color:'var(--t-muted)', fontWeight:600 }}>pts</span>
              </span>
            </div>
          ))}
          {ranking.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t-muted)', fontSize:13 }}>Sin datos todavía.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistorialCompetenciasSheet({ grupoId, isAdmin, onClose, onCompetenciaActualCambio }) {
  const [competencias, setCompetencias] = useState(null);
  const [error, setError] = useState('');
  const [verRanking, setVerRanking] = useState(null); // competencia seleccionada, o null
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const startY = useRef(null);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  function reload() {
    return getCompetenciasGrupo(grupoId)
      .then(setCompetencias)
      .catch(err => setError(err.message));
  }

  useEffect(() => { reload(); }, [grupoId]);

  const enCurso = competencias?.find(c => c.estado === 'en_curso') ?? null;

  async function handleCerrar() {
    if (!enCurso || !confirm(`¿Cerrar "${enCurso.nombre}"? El ranking quedará congelado como histórico.`)) return;
    setCerrando(true); setError('');
    try {
      await cerrarCompetenciaGrupo(grupoId, enCurso.id);
      await reload();
      onCompetenciaActualCambio?.(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrando(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'85dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ display:'flex', justifyContent:'center', padding:'14px 0 10px', flexShrink:0, cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
            Historial
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'14px 18px' }}>
          {error && <div style={{ fontSize:13, color:'#F87171' }}>{error}</div>}

          {verRanking ? (
            <RankingCongelado competencia={verRanking} onBack={() => setVerRanking(null)} />
          ) : competencias === null ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'30px 0', color:'var(--t-muted)', fontSize:13, gap:8 }}>
              <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              Cargando…
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {isAdmin && (
                enCurso ? (
                  <button onClick={handleCerrar} disabled={cerrando}
                    style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', cursor: cerrando ? 'default' : 'pointer', opacity: cerrando ? 0.6 : 1, marginBottom:4 }}>
                    {cerrando ? 'Cerrando…' : `Cerrar "${enCurso.nombre}"`}
                  </button>
                ) : (
                  <button onClick={() => setNuevaOpen(true)}
                    style={{ width:'100%', padding:'12px', borderRadius:12, border:'1.5px solid rgba(var(--t-accent-r),0.35)', background:'rgba(var(--t-accent-r),0.08)', color:'var(--t-accent)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer', marginBottom:4 }}>
                    + Crear nueva competencia
                  </button>
                )
              )}
              {competencias.map(c => (
                <button key={c.id} onClick={() => setVerRanking(c)}
                  style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 14px', borderRadius:12, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {c.nombre}
                    </div>
                    <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>
                      {c.fecha_inicio ? `${fmtFecha(c.fecha_inicio)} al ${fmtFecha(c.fecha_fin)}` : 'Sin fechas configuradas'}
                    </div>
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'3px 8px', borderRadius:20, flexShrink:0,
                    color: c.estado === 'en_curso' ? 'var(--t-accent)' : 'var(--t-muted)',
                    background: c.estado === 'en_curso' ? 'rgba(var(--t-accent-r),0.12)' : 'var(--t-dim)',
                  }}>
                    {c.estado === 'en_curso' ? 'En curso' : 'Finalizada'}
                  </span>
                  <span style={{ color:'var(--t-muted)', flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </span>
                </button>
              ))}
              {competencias.length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t-muted)', fontSize:13 }}>Todavía no hay competencias en este grupo.</div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {nuevaOpen && (
        <NuevaCompetenciaSheet
          grupoId={grupoId}
          onClose={() => setNuevaOpen(false)}
          onCreated={competencia => {
            reload();
            onCompetenciaActualCambio?.(competencia);
          }}
        />
      )}
    </>
  );
}
