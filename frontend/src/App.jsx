import { useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import CompetenciaDetalle from './pages/CompetenciaDetalle';
import MisActividades from './pages/MisActividades';
import FeedGrupal from './pages/FeedGrupal';
import MiPerfil from './pages/MiPerfil';
import Calendario from './pages/Calendario';
import Nav from './components/Nav';
import BottomTabBar from './components/BottomTabBar';
import ActivityModal from './components/ActivityModal';
import CrearCompetenciaModal from './components/CrearCompetenciaModal';
import { getCompetencia } from './api/competencias';

// tabs: 'ranking' | 'calendario' | 'actividades' | 'feed' | 'perfil'

function SinCompetencia({ onOpen }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 32px', textAlign:'center', gap:16 }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--t-dim2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
        <path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 5v14"/><path d="M16 5v14"/>
      </svg>
      <div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1, marginBottom:8 }}>
          Ninguna competencia activa
        </div>
        <div style={{ fontSize:14, color:'var(--t-muted)', lineHeight:1.6 }}>
          Mantenés presionado el nombre en la parte superior para seleccionar o crear una.
        </div>
      </div>
      <button onClick={onOpen}
        style={{ marginTop:4, padding:'10px 24px', borderRadius:12, border:'1.5px solid var(--t-accent)', background:'transparent', color:'var(--t-accent)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
        Elegir competencia
      </button>
    </div>
  );
}

const TAB_ORDER = ['ranking', 'calendario', 'feed', 'actividades', 'perfil'];

function AppShell() {
  const { user, loading } = useAuth();
  const [actModalOpen, setActModalOpen]       = useState(false);
  const [crearOpen, setCrearOpen]             = useState(false);
  const [refreshKey, setRefreshKey]           = useState(0);
  const [competenciaActiva, setCompetenciaActiva] = useState(null);
  const [mainTab, setMainTab]                 = useState('ranking');
  const [compTab, setCompTab]                 = useState('ranking');
  const [forceOpenSelector, setForceOpenSelector] = useState(0);
  // swipe state
  const swipeStartX  = useRef(null);
  const swipeStartY  = useRef(null);
  const swipeLocked  = useRef(null); // 'h' | 'v' | null
  const [dragOffset, setDragOffset] = useState(0); // px de arrastre live
  const [animating,  setAnimating]  = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, background:'var(--t-ground)' }}>
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="28" cy="28" r="27" stroke="var(--t-accent)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
          <path d="M31 14l-10 16h9l-5 12 12-18h-9l3-10z" fill="var(--t-accent)"/>
        </svg>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:28, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', lineHeight:1 }}>
          PURA RACHA
        </div>
        <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Login />;

  async function handleSelectCompetencia(c) {
    // Carga el detalle completo (incluye `deportes`) para que ActivityModal
    // pueda leer los ponderadores de la competencia
    setCompetenciaActiva(c); // optimista, sin deportes todavía
    setCompTab('ranking');
    try {
      const detalle = await getCompetencia(c.id);
      setCompetenciaActiva(detalle);
    } catch { /* si falla, queda sin deportes — ponderador libre */ }
  }

  function handleMainTab(id) {
    setAnimating(true);
    setMainTab(id);
    setTimeout(() => setAnimating(false), 320);
  }

  function onSwipeTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    swipeLocked.current = null;
    setDragOffset(0);
  }

  function onSwipeTouchMove(e) {
    if (swipeStartX.current === null) return;
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;

    // Detecta la dirección dominante en los primeros 8px
    if (!swipeLocked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      swipeLocked.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (swipeLocked.current !== 'h') return;

    // Atenúa en los bordes (primer y último tab)
    const idx = TAB_ORDER.indexOf(mainTab);
    const atLeft  = idx === 0;
    const atRight = idx === TAB_ORDER.length - 1;
    let offset = dx;
    if ((dx > 0 && atLeft) || (dx < 0 && atRight)) offset = dx * 0.2; // resistencia

    e.preventDefault(); // evita scroll vertical mientras arrastra horizontal
    setDragOffset(offset);
  }

  function onSwipeTouchEnd(e) {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    swipeStartY.current = null;

    if (swipeLocked.current !== 'h') { setDragOffset(0); swipeLocked.current = null; return; }
    swipeLocked.current = null;

    const idx = TAB_ORDER.indexOf(mainTab);
    const threshold = window.innerWidth * 0.28; // 28% del ancho
    if (dx < -threshold && idx < TAB_ORDER.length - 1) {
      handleMainTab(TAB_ORDER[idx + 1]);
    } else if (dx > threshold && idx > 0) {
      handleMainTab(TAB_ORDER[idx - 1]);
    }
    setDragOffset(0);
  }

  function handleCreated() {
    setRefreshKey(k => k + 1);
    setCrearOpen(false);
    setUnirseOpen(false);
  }

  function handleCreateCompetencia() {
    setCrearOpen(true);
  }

  const tabContent = {
    ranking: competenciaActiva
      ? <CompetenciaDetalle
          key={competenciaActiva.id + compTab}
          competencia={competenciaActiva}
          tab={compTab}
          onTab={setCompTab}
          onBack={() => setCompetenciaActiva(null)}
          onNewActivity={() => setActModalOpen(true)}
        />
      : <SinCompetencia onOpen={() => setForceOpenSelector(n => n + 1)} />,
    calendario:  <Calendario   key={refreshKey} competenciaActiva={competenciaActiva} />,
    feed:        <FeedGrupal   key={competenciaActiva?.id} competencia={competenciaActiva} />,
    actividades: <MisActividades key={refreshKey} onNewActivity={() => setActModalOpen(true)} />,
    perfil:      <MiPerfil     key={refreshKey} />,
  };

  const activeIdx = TAB_ORDER.indexOf(mainTab);

  return (
    <>
      <Nav
        onNewActivity={() => setActModalOpen(true)}
        competenciaActiva={competenciaActiva}
        onSelectCompetencia={handleSelectCompetencia}
        onCreateCompetencia={handleCreateCompetencia}
        forceOpenSelector={forceOpenSelector}
      />

      {/* Viewport: oculta todo lo que sale de la ventana */}
      <div style={{ overflow:'hidden', position:'relative',
                    paddingTop:'calc(env(safe-area-inset-top) + 52px)',
                    paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>

        {/* Strip horizontal: todas las tabs una al lado de la otra */}
        <div
          onTouchStart={onSwipeTouchStart}
          onTouchMove={onSwipeTouchMove}
          onTouchEnd={onSwipeTouchEnd}
          style={{
            display: 'flex',
            width: `${TAB_ORDER.length * 100}%`,
            transform: `translateX(calc(${-activeIdx * (100 / TAB_ORDER.length)}% + ${dragOffset}px))`,
            transition: dragOffset === 0 ? 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
            willChange: 'transform',
          }}>
          {TAB_ORDER.map(id => (
            <div key={id} style={{ width: `${100 / TAB_ORDER.length}%`, flexShrink: 0, minWidth: 0 }}>
              {tabContent[id]}
            </div>
          ))}
        </div>
      </div>

      <BottomTabBar activeTab={mainTab} onTab={handleMainTab} />

      <ActivityModal
        open={actModalOpen}
        onClose={() => setActModalOpen(false)}
        onCreated={() => setRefreshKey(k => k + 1)}
        competenciaActiva={competenciaActiva}
      />
      <CrearCompetenciaModal
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreated={comp => { handleCreated(); setCompetenciaActiva(comp); }}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
