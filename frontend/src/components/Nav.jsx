import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCompetencias } from '../api/competencias';
import UnirseCompetenciaModal from './UnirseCompetenciaModal';

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

export default function Nav({ onNewActivity, competenciaActiva, onSelectCompetencia, onCreateCompetencia, forceOpenSelector }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [selectorOpen, setSelectorOpen]       = useState(false);
  const [unirseOpen, setUnirseOpen]           = useState(false);
  const [competencias, setCompetencias]       = useState([]);
  const [loadingComps, setLoadingComps]       = useState(false);
  const drawerRef   = useRef(null);
  const selectorRef = useRef(null);
  const longPressTimer = useRef(null);
  const didLongPress   = useRef(false);

  // Cierra drawer al click exterior
  useEffect(() => {
    if (!drawerOpen) return;
    function h(e) { if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false); }
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [drawerOpen]);

  // forceOpenSelector desde SinCompetencia
  useEffect(() => {
    if (forceOpenSelector) openSelector();
  }, [forceOpenSelector]);

  // Cierra selector al click exterior
  useEffect(() => {
    if (!selectorOpen) return;
    function h(e) { if (selectorRef.current && !selectorRef.current.contains(e.target)) setSelectorOpen(false); }
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [selectorOpen]);

  useEffect(() => {
    document.body.style.overflow = (drawerOpen || selectorOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen, selectorOpen]);

  function openSelector() {
    setLoadingComps(true);
    setSelectorOpen(true);
    getCompetencias()
      .then(setCompetencias)
      .finally(() => setLoadingComps(false));
  }

  // Long press handlers
  function onTitlePressStart(e) {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      openSelector();
    }, 450);
  }
  function onTitlePressEnd(e) {
    clearTimeout(longPressTimer.current);
  }
  function onTitleClick() {
    // solo abre si no fue long press
    if (!didLongPress.current) openSelector();
  }

  const titleText = competenciaActiva ? competenciaActiva.nombre : 'Nanão Cup';

  return (
    <>
      {/* Cubre el status bar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'env(safe-area-inset-top)', background:'var(--t-nav-bg)', zIndex:51 }} />

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'var(--t-nav-bg)',
        borderBottom: '1px solid var(--t-nav-border)',
        marginTop: 'env(safe-area-inset-top)',
      }}>
        {/* Título — long press abre el selector */}
        <button
          onMouseDown={onTitlePressStart}
          onMouseUp={onTitlePressEnd}
          onMouseLeave={onTitlePressEnd}
          onTouchStart={onTitlePressStart}
          onTouchEnd={onTitlePressEnd}
          onClick={onTitleClick}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', cursor:'pointer', padding:'4px 0', WebkitTapHighlightColor:'transparent', maxWidth:'calc(100% - 56px)', minWidth:0 }}>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--t-accent)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {titleText}
          </span>
          <span style={{ color:'var(--t-muted)', flexShrink:0, marginTop:1 }}><IconChevron /></span>
        </button>

        {/* Hamburguesa */}
        <button onClick={() => setDrawerOpen(o => !o)} aria-label="Menú"
          style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:5, width:36, height:36, padding:6, borderRadius:8, background:'transparent', border:'none', cursor:'pointer', flexShrink:0 }}>
          <span style={{ display:'block', height:2, background:'var(--t-text)', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'var(--t-text)', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'var(--t-text)', borderRadius:2 }} />
        </button>
      </header>

      {/* ── OVERLAY compartido ── */}
      <div onClick={() => { setDrawerOpen(false); setSelectorOpen(false); }} style={{
        position:'fixed', inset:0, zIndex:49,
        background:'rgba(0,0,0,0.35)',
        backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)',
        opacity: (drawerOpen || selectorOpen) ? 1 : 0,
        pointerEvents: (drawerOpen || selectorOpen) ? 'all' : 'none',
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
        maxHeight: '60dvh',
        overflowY: 'auto',
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

          {/* Separador + acciones */}
          <div style={{ borderTop:'1px solid var(--t-dim)', margin:'6px 0 0', padding:'6px 0' }}>
            <button
              onClick={() => { setSelectorOpen(false); onCreateCompetencia(); }}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ width:20, height:20, borderRadius:6, background:'rgba(var(--t-accent-r),0.12)', border:'1px solid rgba(var(--t-accent-r),0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-accent)', flexShrink:0 }}>
                <IconPlus />
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--t-accent)' }}>Nueva competencia</span>
            </button>
            <button
              onClick={() => { setSelectorOpen(false); setUnirseOpen(true); }}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <span style={{ width:20, height:20, borderRadius:6, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-muted)', flexShrink:0, fontSize:11, fontWeight:700 }}>
                #
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--t-muted)' }}>Unirse con PIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL UNIRSE ── */}
      <UnirseCompetenciaModal
        open={unirseOpen}
        onClose={() => setUnirseOpen(false)}
        onJoined={comp => { setUnirseOpen(false); onSelectCompetencia(comp); }}
      />

      {/* ── DRAWER (menú hamburguesa) ── */}
      <div ref={drawerRef} style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0, right: 0, zIndex: 50,
        background: 'var(--t-nav-bg)',
        borderBottom: drawerOpen ? '1px solid var(--t-nav-border)' : 'none',
        boxShadow: drawerOpen ? '0 8px 32px rgba(0,0,0,0.25)' : 'none',
        opacity: drawerOpen ? 1 : 0,
        pointerEvents: drawerOpen ? 'all' : 'none',
        transform: drawerOpen ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.22s, transform 0.22s cubic-bezier(0.22,1,0.36,1)',
        paddingBottom: 8,
        maxHeight: 'calc(100dvh - env(safe-area-inset-top) - 52px)',
        overflowY: 'auto',
        visibility: drawerOpen ? 'visible' : 'hidden',
      }}>
        {/* Usuario */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px 12px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'1px solid rgba(var(--t-accent-r),0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'var(--t-accent)', flexShrink:0 }}>
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:11, color:'var(--t-muted)' }}>{user?.email}</div>
          </div>
        </div>
        {/* Acciones */}
        <div style={{ padding:'6px 0' }}>
          <button onClick={() => { setDrawerOpen(false); onNewActivity(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'var(--t-accent)', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
            <IconPlus />
            Registrar actividad
          </button>
          <button onClick={() => { setDrawerOpen(false); logout(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'var(--t-muted)', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
