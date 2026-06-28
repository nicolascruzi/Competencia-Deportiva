import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    to: '/',
    exact: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
        <path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 5v14"/><path d="M16 5v14"/>
      </svg>
    ),
    label: 'Competencias',
    emoji: '🏆',
  },
  {
    to: '/actividades',
    exact: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    label: 'Mis actividades',
    emoji: '📋',
  },
];

export default function Nav({ onNewActivity }) {
  const { user, logout }    = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const location  = useLocation();

  // Cierra el drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Cierra el drawer al tocar fuera
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

  // Bloquea el scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <>
      {/* ── TOP HEADER ─────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
        background: 'rgba(13,27,42,0.97)',
        borderBottom: '1px solid #243D57',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display:'contents' }}>
          {/* Brand */}
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, letterSpacing:'0.06em', textTransform:'uppercase', color:'#38BDF8', flexShrink:0 }}>
            Nanão Cup 🏆
          </span>

          {/* Botón hamburger */}
          <button
            onClick={() => setDrawerOpen(o => !o)}
            aria-label="Menú"
            style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:5, width:36, height:36, padding:6, borderRadius:8, background:'transparent', border:'none', cursor:'pointer', flexShrink:0, transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#243D57'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <span style={{ display:'block', height:2, background: drawerOpen ? '#38BDF8' : '#E8F0FE', borderRadius:2, transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)', transformOrigin:'center', transform: drawerOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
            <span style={{ display:'block', height:2, background: drawerOpen ? '#38BDF8' : '#E8F0FE', borderRadius:2, transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)', opacity: drawerOpen ? 0 : 1, transform: drawerOpen ? 'scaleX(0)' : 'none' }} />
            <span style={{ display:'block', height:2, background: drawerOpen ? '#38BDF8' : '#E8F0FE', borderRadius:2, transition:'all 0.25s cubic-bezier(0.22,1,0.36,1)', transformOrigin:'center', transform: drawerOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
          </button>
        </div>
      </header>

      {/* ── DRAWER OVERLAY ─────────────────────────────────────────── */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(5,12,20,0.5)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'all' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* ── DRAWER PANEL ───────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 50,
          background: 'rgba(13,27,42,0.98)',
          borderBottom: '1px solid #243D57',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
          transform: drawerOpen ? 'translateY(0)' : 'translateY(-110%)',
          transition: 'transform 0.28s cubic-bezier(0.22,1,0.36,1)',
          paddingTop: 8,
          paddingBottom: 12,
        }}>

        {/* Usuario */}
        <div style={{ padding:'10px 20px 14px', borderBottom:'1px solid #243D57', marginBottom:6, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(56,189,248,0.15)', border:'1px solid rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, color:'#38BDF8', flexShrink:0 }}>
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.04em', color:'#E8F0FE', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:11, color:'#7A9BBF', marginTop:1 }}>{user?.email}</div>
          </div>
        </div>

        {/* Links de navegación */}
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 20px',
              fontSize: 15, fontWeight: 600,
              color: isActive ? '#38BDF8' : '#E8F0FE',
              background: isActive ? 'rgba(56,189,248,0.07)' : 'transparent',
              borderLeft: `3px solid ${isActive ? '#38BDF8' : 'transparent'}`,
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}>
            <span style={{ fontSize: 20, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.emoji}</span>
            {item.label}
          </NavLink>
        ))}

        {/* Divider */}
        <div style={{ height:1, background:'#243D57', margin:'6px 20px' }} />

        {/* Registrar actividad */}
        <button
          onClick={() => { setDrawerOpen(false); onNewActivity(); }}
          style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px', width:'100%', fontSize:15, fontWeight:600, color:'#38BDF8', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:20, width:24, textAlign:'center', flexShrink:0 }}>➕</span>
          Registrar actividad
        </button>

        {/* Divider */}
        <div style={{ height:1, background:'#243D57', margin:'6px 20px' }} />

        {/* Cerrar sesión */}
        <button
          onClick={() => { setDrawerOpen(false); logout(); }}
          style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 20px', width:'100%', fontSize:15, fontWeight:600, color:'#7A9BBF', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:20, width:24, textAlign:'center', flexShrink:0 }}>🚪</span>
          Cerrar sesión
        </button>
      </div>

      {/* ── BOTTOM TAB BAR ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 48,
        display: 'flex', alignItems: 'stretch',
        background: 'rgba(13,27,42,0.97)',
        borderTop: '1px solid #243D57',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map((item, idx) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, paddingTop: 10, paddingBottom: 10,
              fontSize: 10, fontWeight: 600,
              color: isActive ? '#38BDF8' : '#7A9BBF',
              textDecoration: 'none',
              transition: 'color 0.15s',
              // Espacio para el botón central
              ...(idx === 0 ? { marginRight: 8 } : { marginLeft: 8 }),
            })}>
            {({ isActive }) => (
              <>
                <span style={{ color: isActive ? '#38BDF8' : '#7A9BBF', transition:'color 0.15s' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Botón + central */}
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', top:0, display:'flex', alignItems:'center', justifyContent:'center', height:'100%', pointerEvents:'none' }}>
          <button
            onClick={onNewActivity}
            style={{ width:56, height:56, borderRadius:'50%', background:'#38BDF8', color:'#0D1B2A', fontSize:26, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'none', cursor:'pointer', marginTop:-20, boxShadow:'0 4px 20px rgba(56,189,248,0.45)', transition:'transform 0.15s, box-shadow 0.15s', pointerEvents:'all', WebkitTapHighlightColor:'transparent' }}
            onTouchStart={e => { e.currentTarget.style.transform='scale(0.93)'; e.currentTarget.style.boxShadow='0 2px 10px rgba(56,189,248,0.3)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(56,189,248,0.45)'; }}>
            +
          </button>
        </div>
      </nav>

      {/* Spacer para que el contenido no quede tapado por la tab bar */}
      <div style={{ height:'calc(68px + env(safe-area-inset-bottom))', flexShrink:0, pointerEvents:'none' }} />
    </>
  );
}
