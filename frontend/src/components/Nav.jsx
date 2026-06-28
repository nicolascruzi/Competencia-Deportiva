import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BG = '#0D1B2A';

const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconPlus = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);

export default function Nav({ onNewActivity }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

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
      {/* Cubre el status bar del sistema */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'env(safe-area-inset-top)', background:BG, zIndex:51 }} />

      {/* ── HEADER ── */}
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

        {/* Hamburger */}
        <button
          onClick={() => setDrawerOpen(o => !o)}
          aria-label="Menú"
          style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:5, width:36, height:36, padding:6, borderRadius:8, background:'transparent', border:'none', cursor:'pointer' }}>
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
          <span style={{ display:'block', height:2, background:'#E8F0FE', borderRadius:2 }} />
        </button>
      </header>

      {/* ── OVERLAY ── */}
      <div onClick={() => setDrawerOpen(false)} style={{
        position:'fixed', inset:0, zIndex:49,
        background:'rgba(5,12,20,0.55)',
        backdropFilter:'blur(2px)', WebkitBackdropFilter:'blur(2px)',
        opacity: drawerOpen ? 1 : 0,
        pointerEvents: drawerOpen ? 'all' : 'none',
        transition:'opacity 0.22s',
      }} />

      {/* ── DRAWER ── */}
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

        {/* Acciones */}
        <div style={{ padding:'6px 0' }}>
          <button onClick={() => { setDrawerOpen(false); onNewActivity(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'#38BDF8', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
            <IconPlus />
            Registrar actividad
          </button>
          <button onClick={() => { setDrawerOpen(false); logout(); }}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', width:'100%', fontSize:14, fontWeight:600, color:'#7A9BBF', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
            <IconLogout />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
