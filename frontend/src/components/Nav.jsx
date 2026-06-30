import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getCompetencias } from '../api/competencias';

const PALETTE_ORDER = ['tierra', 'ciruela', 'noche'];

const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IconChevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconPalette = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

export default function Nav({ onNewActivity, competenciaActiva, onSelectCompetencia, onCreateCompetencia, forceOpenSelector, isAdmin, onAdminPonderadores }) {
  const { themeId, setTheme, palettes } = useTheme();
  const [selectorOpen, setSelectorOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [paletteOpen, setPaletteOpen]     = useState(false);
  const [competencias, setCompetencias]   = useState([]);
  const [loadingComps, setLoadingComps]   = useState(false);

  const selectorRef = useRef(null);
  const settingsRef = useRef(null);
  const longPressTimer = useRef(null);
  const didLongPress   = useRef(false);

  // Cierra selector al click exterior
  useEffect(() => {
    if (!selectorOpen) return;
    function h(e) { if (selectorRef.current && !selectorRef.current.contains(e.target)) setSelectorOpen(false); }
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [selectorOpen]);

  // Cierra settings al click exterior
  useEffect(() => {
    if (!settingsOpen) return;
    function h(e) { if (settingsRef.current && !settingsRef.current.contains(e.target)) { setSettingsOpen(false); setPaletteOpen(false); } }
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [settingsOpen]);

  useEffect(() => {
    document.body.style.overflow = (selectorOpen || settingsOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectorOpen, settingsOpen]);

  // forceOpenSelector desde SinCompetencia
  useEffect(() => {
    if (forceOpenSelector) openSelector();
  }, [forceOpenSelector]);

  function openSelector() {
    setLoadingComps(true);
    setSelectorOpen(true);
    getCompetencias()
      .then(setCompetencias)
      .finally(() => setLoadingComps(false));
  }

  function onTitlePressStart() {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openSelector();
    }, 450);
  }
  function onTitlePressEnd() { clearTimeout(longPressTimer.current); }
  function onTitleClick()    { if (!didLongPress.current) openSelector(); }

  const anyOpen = selectorOpen || settingsOpen;

  return (
    <>
      {/* Status bar cover */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'env(safe-area-inset-top)', background:'var(--t-nav-bg)', zIndex:51 }} />

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 52,
        display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center',
        padding: '0 10px',
        background: 'var(--t-nav-bg)',
        borderBottom: '1px solid var(--t-nav-border)',
        marginTop: 'env(safe-area-inset-top)',
      }}>
        {/* Izquierda: botón + */}
        <button onClick={onNewActivity} aria-label="Registrar actividad"
          style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'var(--t-accent)', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
          <IconPlus />
        </button>

        {/* Centro: título */}
        <button
          onMouseDown={onTitlePressStart}
          onMouseUp={onTitlePressEnd}
          onMouseLeave={onTitlePressEnd}
          onTouchStart={onTitlePressStart}
          onTouchEnd={onTitlePressEnd}
          onClick={onTitleClick}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, background:'transparent', border:'none', cursor:'pointer', padding:'4px 0', WebkitTapHighlightColor:'transparent', minWidth:0 }}>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--t-accent)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'calc(100vw - 120px)' }}>
            Pura Racha
          </span>
          <span style={{ color:'var(--t-muted)', flexShrink:0, marginTop:1 }}><IconChevron /></span>
        </button>

        {/* Derecha: botón ajustes */}
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <button onClick={() => { setSettingsOpen(o => !o); setPaletteOpen(false); }} aria-label="Configuración"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'#f97316', cursor:'pointer', WebkitTapHighlightColor:'transparent', transition:'color 0.15s' }}>
            <IconSettings />
          </button>
        </div>
      </header>

      {/* ── OVERLAY compartido ── */}
      <div onClick={() => { setSelectorOpen(false); setSettingsOpen(false); setPaletteOpen(false); }} style={{
        position:'fixed', inset:0, zIndex:49,
        background:'rgba(0,0,0,0.35)',
        backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)',
        opacity: anyOpen ? 1 : 0,
        pointerEvents: anyOpen ? 'all' : 'none',
        transition:'opacity 0.22s',
      }} />

      {/* ── SELECTOR DE COMPETENCIA ── */}
      <div ref={selectorRef} style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0, right: 0, zIndex: 50,
        background: 'var(--t-nav-bg)',
        borderBottom: selectorOpen ? '1px solid var(--t-nav-border)' : 'none',
        boxShadow: selectorOpen ? '0 8px 32px rgba(0,0,0,0.2)' : 'none',
        opacity: selectorOpen ? 1 : 0,
        pointerEvents: selectorOpen ? 'all' : 'none',
        transform: selectorOpen ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity 0.2s, transform 0.2s cubic-bezier(0.22,1,0.36,1)',
        maxHeight: '60dvh', overflowY: 'auto',
        visibility: selectorOpen ? 'visible' : 'hidden',
      }}>
        <div style={{ padding:'10px 0 6px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-muted)', padding:'0 18px 8px' }}>
            Mis competencias
          </div>

          {loadingComps ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', gap:8, color:'var(--t-muted)', fontSize:13 }}>
              <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              Cargando…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : competencias.length === 0 ? (
            <div style={{ padding:'14px 18px', fontSize:13, color:'var(--t-muted)' }}>
              No tenés competencias todavía.
            </div>
          ) : (
            competencias.map(c => {
              const isActive = competenciaActiva?.id === c.id;
              return (
                <button key={c.id}
                  onClick={() => { onSelectCompetencia(c); setSelectorOpen(false); }}
                  style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'11px 18px', background: isActive ? 'rgba(var(--t-accent-r),0.07)' : 'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.03em', color: isActive ? 'var(--t-accent)' : 'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.nombre}
                    </div>
                    <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:1 }}>
                      {c.participantes} participante{c.participantes !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {isActive && <span style={{ color:'var(--t-accent)', flexShrink:0 }}><IconCheck /></span>}
                </button>
              );
            })
          )}

          <div style={{ borderTop:'1px solid var(--t-dim)', margin:'6px 0 0', padding:'6px 0' }}>
            <button
              onClick={() => { setSelectorOpen(false); onCreateCompetencia(); }}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ width:20, height:20, borderRadius:6, background:'rgba(var(--t-accent-r),0.12)', border:'1px solid rgba(var(--t-accent-r),0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-accent)', flexShrink:0 }}>
                <IconPlus />
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--t-accent)' }}>Crear / Unirse</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DROPDOWN CONFIGURACIONES ── */}
      <div ref={settingsRef} style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        right: 0, zIndex: 50,
        width: 240,
        background: 'var(--t-nav-bg)',
        border: settingsOpen ? '1px solid var(--t-nav-border)' : 'none',
        borderTop: 'none',
        borderRadius: '0 0 0 14px',
        boxShadow: settingsOpen ? '0 8px 32px rgba(0,0,0,0.2)' : 'none',
        opacity: settingsOpen ? 1 : 0,
        pointerEvents: settingsOpen ? 'all' : 'none',
        transform: settingsOpen ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.18s, transform 0.18s cubic-bezier(0.22,1,0.36,1)',
        visibility: settingsOpen ? 'visible' : 'hidden',
        overflow: 'hidden',
      }}>
        {/* Título del dropdown */}
        <div style={{ padding:'12px 16px 8px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-muted)' }}>
            Configuraciones
          </div>
        </div>

        {/* Vista: lista de opciones */}
        <div style={{
          display: 'grid',
          gridTemplateRows: paletteOpen ? '0fr' : '1fr',
          transition: 'grid-template-rows 0.2s ease',
          overflow: 'hidden',
        }}>
          <div style={{ overflow:'hidden' }}>
            <button
              onClick={() => setPaletteOpen(true)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ color:'var(--t-accent)', flexShrink:0 }}><IconPalette /></span>
              <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--t-text)' }}>Paleta de colores</span>
              <span style={{ color:'var(--t-muted)' }}><IconChevronRight /></span>
            </button>
            {competenciaActiva && (
              <button
                onClick={() => { setSettingsOpen(false); onAdminPonderadores?.(); }}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'transparent', border:'none', borderTop:'1px solid var(--t-dim)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
                <span style={{ color:'var(--t-muted)', flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                  </svg>
                </span>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--t-text)' }}>Ponderadores</span>
                <span style={{ fontSize:10, color:'var(--t-muted)', fontWeight:600 }}>{isAdmin ? competenciaActiva.nombre : 'Solo lectura'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Vista: selector de paleta */}
        <div style={{
          display: 'grid',
          gridTemplateRows: paletteOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
          overflow: 'hidden',
        }}>
          <div style={{ overflow:'hidden' }}>
            {/* Volver */}
            <button
              onClick={() => setPaletteOpen(false)}
              style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 16px', background:'transparent', border:'none', borderBottom:'1px solid var(--t-dim)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ color:'var(--t-muted)' }}><IconBack /></span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--t-muted)' }}>Paleta de colores</span>
            </button>

            {/* Opciones de paleta */}
            {PALETTE_ORDER.map(id => {
              const p = palettes[id];
              const isActive = themeId === id;
              return (
                <button key={id} onClick={() => setTheme(id)}
                  style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 16px', background: isActive ? 'rgba(var(--t-accent-r),0.07)' : 'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
                  {/* Muestras */}
                  <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                    {p.preview.slice(0, 4).map((hex, i) => (
                      <div key={i} style={{ width:10, height:10, borderRadius:3, background:hex, border: (hex === '#FFFFFF' || hex.toLowerCase() === '#fafaf8' || hex.toLowerCase() === '#f5f2ed' || hex.toLowerCase() === '#fdf9fb') ? '1px solid #ccc' : 'none' }} />
                    ))}
                    <div style={{ width:14, height:10, borderRadius:4, background:p.preview[5] || p.preview[4], flexShrink:0 }} />
                  </div>
                  <span style={{ flex:1, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.03em', color: isActive ? 'var(--t-accent)' : 'var(--t-text)' }}>
                    {p.nombre}
                  </span>
                  {isActive && <span style={{ color:'var(--t-accent)', flexShrink:0 }}><IconCheck /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </>
  );
}
