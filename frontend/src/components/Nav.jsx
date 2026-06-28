import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BG = '#0D1B2A';

// SVG icons para nav items principales
const IconCompetencias = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
    <path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 5v14"/><path d="M16 5v14"/>
  </svg>
);
const IconActividades = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// SVG icons para los tabs de competencia
const TAB_ICONS = {
  ranking:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  podio:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/><path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 5v14"/><path d="M16 5v14"/></svg>,
  calendar:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  evolucion: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  carrera:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  deportes:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  records:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  comparar:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  insights:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

const COMP_TABS = [
  { id: 'ranking',   label: 'Ranking' },
  { id: 'podio',     label: 'Podio' },
  { id: 'calendar',  label: 'Calendario' },
  { id: 'evolucion', label: 'Evolución' },
  { id: 'carrera',   label: 'Carrera' },
  { id: 'deportes',  label: 'Deportes' },
  { id: 'records',   label: 'Récords' },
  { id: 'comparar',  label: 'Comparar' },
  { id: 'insights',  label: 'Insights' },
];

export default function Nav({ onNewActivity, showTabs, tab, onTab }) {
  const { user, logout }      = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const location  = useLocation();
  const navigate  = useNavigate();

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function handleOutside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      {/* Cubre el status bar del sistema con el mismo color de fondo */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'env(safe-area-inset-top)', background:BG, zIndex:51 }} />

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: BG,
        borderBottom: '1px solid #243D57',
        marginTop: 'env(safe-area-inset-top)',
      }}>
        <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, letterSpacing:'0.06em', textTransform:'uppercase', color:'#38BDF8' }}>
          Nanão Cup
        </span>

        {/* Hamburger — solo 3 rayas, sin animación a X */}
        <button
          onClick={() => setDrawerOpen(o => !o)}
          aria-label="Menú"
          style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:5, width:36, height:36, padding:6, borderRadius:8, background:'transparent', border:'none', cursor:'pointer' }}>
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
        </button>
      </header>

      {/* ── OVERLAY ──────────────────────────────────────────────────── */}
      <div onClick={() => setDrawerOpen(false)} style={{
        position:'fixed', inset:0, zIndex:49,
        background:'rgba(5,12,20,0.55)',
        backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)',
        opacity: drawerOpen ? 1 : 0,
        pointerEvents: drawerOpen ? 'all' : 'none',
        transition:'opacity 0.22s',
      }} />

      {/* ── DRAWER ───────────────────────────────────────────────────── */}
      {/*
        El drawer se oculta moviéndolo hacia arriba fuera de la pantalla.
        Usamos clip en el header para que no se filtre visualmente.
        Cuando está cerrado: opacity 0 + pointer-events none + translateY que
        lo manda lejos hacia arriba (valor fijo grande, independiente de su altura).
      */}
      <div ref={drawerRef} style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0, right: 0, zIndex: 50,
        background: '#0D1B2A',
        borderBottom: drawerOpen ? '1px solid #243D57' : 'none',
        boxShadow: drawerOpen ? '0 8px 32px rgba(0,0,0,0.6)' : 'none',
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
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px 12px', borderBottom:'1px solid #1A2E45' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(56,189,248,0.12)', border:'1px solid rgba(56,189,248,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'#38BDF8', flexShrink:0 }}>
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em', color:'#E8F0FE', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:11, color:'#7A9BBF' }}>{user?.email}</div>
          </div>
        </div>

        {/* ── Navegación principal ── */}
        <div style={{ padding:'6px 0 0' }}>
          <div style={{ padding:'5px 20px 3px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#4A6A8A' }}>
            Navegación
          </div>
          <NavLink to="/" end
            onClick={() => setDrawerOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12, padding:'11px 20px',
              fontSize:14, fontWeight:600, textDecoration:'none',
              color: isActive ? '#38BDF8' : '#E8F0FE',
              background: isActive ? 'rgba(56,189,248,0.07)' : 'transparent',
              borderLeft: `3px solid ${isActive ? '#38BDF8' : 'transparent'}`,
            })}>
            <span style={{ color:'inherit', flexShrink:0 }}><IconCompetencias /></span>
            Competencias
          </NavLink>
          <NavLink to="/actividades"
            onClick={() => setDrawerOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:12, padding:'11px 20px',
              fontSize:14, fontWeight:600, textDecoration:'none',
              color: isActive ? '#38BDF8' : '#E8F0FE',
              background: isActive ? 'rgba(56,189,248,0.07)' : 'transparent',
              borderLeft: `3px solid ${isActive ? '#38BDF8' : 'transparent'}`,
            })}>
            <span style={{ color:'inherit', flexShrink:0 }}><IconActividades /></span>
            Mis actividades
          </NavLink>
        </div>

        {/* ── Secciones de competencia (solo si hay una activa) ── */}
        {showTabs && (
          <div style={{ padding:'6px 0 0', borderTop:'1px solid #1A2E45', marginTop:4 }}>
            <div style={{ padding:'5px 20px 3px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#4A6A8A' }}>
              Vista
            </div>
            {COMP_TABS.map(t => (
              <button key={t.id}
                onClick={() => { onTab(t.id); setDrawerOpen(false); navigate('/'); }}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'11px 20px',
                  width:'100%', fontSize:14, fontWeight:600, textAlign:'left',
                  border:'none', cursor:'pointer',
                  color: tab===t.id ? '#38BDF8' : '#E8F0FE',
                  background: tab===t.id ? 'rgba(56,189,248,0.07)' : 'transparent',
                  borderLeft: `3px solid ${tab===t.id ? '#38BDF8' : 'transparent'}`,
                }}>
                <span style={{ color:'inherit', flexShrink:0 }}>{TAB_ICONS[t.id]}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Acciones ── */}
        <div style={{ borderTop:'1px solid #1A2E45', marginTop:4, padding:'6px 0 0' }}>
          <button onClick={() => { setDrawerOpen(false); onNewActivity(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'#38BDF8', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderLeft:'3px solid transparent' }}>
            <IconPlus />
            Registrar actividad
          </button>
          <button onClick={() => { setDrawerOpen(false); logout(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'#7A9BBF', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderLeft:'3px solid transparent' }}>
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
