import { useCallback, useEffect, useRef, useState, Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import Login from './pages/Login';
import CompetenciaDetalle from './pages/CompetenciaDetalle';
import MisActividades from './pages/MisActividades';
import FeedGrupal from './pages/FeedGrupal';
import MiPerfil from './pages/MiPerfil';
import Calendario from './pages/Calendario';
import Nav from './components/Nav';
import BottomTabBar from './components/BottomTabBar';
import ActivityModal from './components/ActivityModal';
import ActivityToast from './components/ActivityToast';
import CrearCompetenciaModal from './components/CrearCompetenciaModal';
import OnboardingModal from './components/OnboardingModal';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { getCompetencia } from './api/competencias';
import { getActividades } from './api/actividades';
import { useLoading } from './context/LoadingContext';

class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding:32, color:'#ff6b6b', fontFamily:'monospace', fontSize:13 }}>
        <b>Error:</b> {this.state.err.message}
        <br/><br/>
        <button onClick={() => { localStorage.removeItem('lastCompetenciaId'); window.location.reload(); }}
          style={{ background:'#333', color:'#fff', border:'none', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>
          Limpiar y recargar
        </button>
      </div>
    );
    return this.props.children;
  }
}

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

const PTR_THRESHOLD = 56;

// Wrapper por tab: detecta el gesto, baja el contenido y notifica al padre
function PullToRefreshTab({ active, onRefresh, onPullChange, children }) {
  const { containerRef, pullY, refreshing } = usePullToRefresh(onRefresh, active);
  // `closing`: el refresh terminó y el contenido está volviendo arriba con animación
  const [closing, setClosing] = useState(false);
  const prevRefreshing = useRef(false);

  useEffect(() => {
    // Detectar el flanco descendente de refreshing (true → false)
    if (prevRefreshing.current && !refreshing) {
      setClosing(true);
      // Dar tiempo a que la transición CSS termine antes de limpiar
      setTimeout(() => setClosing(false), 350);
    }
    prevRefreshing.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    onPullChange?.({ pullY, refreshing, closing });
  }, [pullY, refreshing, closing]);

  const offsetY = refreshing || closing ? PTR_THRESHOLD : pullY;
  // Durante el arrastre: sin transición (sigue al dedo en tiempo real)
  // Durante closing: transición suave hacia arriba
  // En reposo: sin transición
  const transition = closing
    ? 'transform 0.38s cubic-bezier(0.22,1,0.36,1)'
    : 'none';

  return (
    <div
      ref={containerRef}
      style={{
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        transform: offsetY > 0 ? `translateY(${offsetY}px)` : 'none',
        transition,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const { withLoading } = useLoading();
  const [actModalOpen, setActModalOpen]       = useState(false);
  const [crearOpen, setCrearOpen]             = useState(false);
  const [refreshKey, setRefreshKey]           = useState(0);
  const [competenciaActiva, setCompetenciaActiva] = useState(null);
  const [mainTab, setMainTab]                 = useState('ranking');
  const [compTab, setCompTab]                 = useState('ranking');
  const [forceOpenSelector, setForceOpenSelector] = useState(0);
  const [adminSheetOpen, setAdminSheetOpen]   = useState(false);
  const [restoringComp, setRestoringComp]     = useState(true);
  const [toast, setToast]                     = useState(null); // { actividad, ptsAntes, ptsDespues }
  const [evolucionSignal, setEvolucionSignal] = useState(0);
  const [showOnboarding, setShowOnboarding]   = useState(false);
  const [ptrState, setPtrState]               = useState({ pullY: 0, refreshing: false, closing: false });
  const onPullChange = useCallback((s) => setPtrState(s), []);
  // Estado de mes compartido entre Ranking y Calendario
  const _now = new Date();
  const [navYear,  setNavYear]  = useState(_now.getFullYear());
  const [navMonth, setNavMonth] = useState(_now.getMonth()); // -1 = Acumulado

  // Mostrar onboarding a usuarios nuevos (sin apodo ni fecha de nacimiento)
  useEffect(() => {
    if (!user) return;
    const key = `nanao_onboarding_done_${user.id}`;
    if (!localStorage.getItem(key) && !user.apodo && !user.fecha_nacimiento) {
      setShowOnboarding(true);
    }
  }, [user?.id]);

  // Restaurar última competencia cuando el usuario está listo
  useEffect(() => {
    if (loading) return;
    if (!user) { setRestoringComp(false); return; }
    const savedId = localStorage.getItem('lastCompetenciaId');
    if (!savedId) { setRestoringComp(false); return; }
    withLoading(() =>
      getCompetencia(savedId)
        .then(detalle => setCompetenciaActiva(detalle))
        .catch(() => localStorage.removeItem('lastCompetenciaId'))
    ).finally(() => setRestoringComp(false));
  }, [loading, user?.id]);

  if (loading || restoringComp) {
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
    localStorage.setItem('lastCompetenciaId', c.id);
    setCompetenciaActiva(c);
    setCompTab('ranking');
    try {
      const detalle = await withLoading(() => getCompetencia(c.id));
      setCompetenciaActiva(detalle);
    } catch { /* si falla, queda sin deportes — ponderador libre */ }
  }

  function handleMainTab(id) {
    setMainTab(id);
  }

  function handleCreated() {
    setRefreshKey(k => k + 1);
    setCrearOpen(false);
    setUnirseOpen(false);
  }

  function handleCreateCompetencia() {
    setCrearOpen(true);
  }

  const isAdmin = user && competenciaActiva && user.id === competenciaActiva.creador_id;

  const tabContent = {
    ranking: competenciaActiva
      ? <CompetenciaDetalle
          key={competenciaActiva.id + compTab}
          competencia={competenciaActiva}
          tab={compTab}
          onTab={setCompTab}
          onBack={() => { localStorage.removeItem('lastCompetenciaId'); setCompetenciaActiva(null); }}
          onNewActivity={() => setActModalOpen(true)}
          adminSheetOpen={adminSheetOpen}
          onAdminSheetClose={() => setAdminSheetOpen(false)}
          onAdminSaved={deps => {
            setCompetenciaActiva(prev => ({ ...prev, deportes: deps }));
            setAdminSheetOpen(false);
          }}
          navYear={navYear}
          navMonth={navMonth}
          onNavYear={setNavYear}
          onNavMonth={setNavMonth}
        />
      : <SinCompetencia onOpen={() => setForceOpenSelector(n => n + 1)} />,
    calendario:  <Calendario   key={refreshKey} competenciaActiva={competenciaActiva} navYear={navYear} navMonth={navMonth} onNavYear={setNavYear} onNavMonth={setNavMonth} />,
    feed:        <FeedGrupal   key={competenciaActiva?.id} competencia={competenciaActiva} />,
    actividades: <MisActividades key={refreshKey} onNewActivity={() => setActModalOpen(true)} evolucionSignal={evolucionSignal} />,
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
        isAdmin={isAdmin}
        onAdminPonderadores={() => setAdminSheetOpen(true)}
      />

      {/* Indicador PTR fijo debajo de la navbar */}
      <PullToRefreshIndicator pullY={ptrState.pullY} refreshing={ptrState.refreshing} closing={ptrState.closing} />

      {/* Viewport */}
      <div style={{ paddingTop:'calc(env(safe-area-inset-top) + 52px)',
                    paddingBottom:'calc(80px + env(safe-area-inset-bottom))',
                    position:'relative', overflow:'hidden' }}>
        {TAB_ORDER.map((id, i) => {
          const offsetPct = (i - activeIdx) * 100;
          const isActive  = i === activeIdx;
          return (
            <div key={id} style={{
              position: isActive ? 'relative' : 'absolute',
              top: 0, left: 0, width: '100%',
              transform: `translateX(${offsetPct}%)`,
              transition: 'transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)',
              pointerEvents: isActive ? 'auto' : 'none',
              visibility: Math.abs(i - activeIdx) > 1 ? 'hidden' : 'visible',
            }}>
              <PullToRefreshTab
                active={isActive}
                onRefresh={() => setRefreshKey(k => k + 1)}
                onPullChange={isActive ? onPullChange : undefined}
              >
                {tabContent[id]}
              </PullToRefreshTab>
            </div>
          );
        })}
      </div>

      <BottomTabBar activeTab={mainTab} onTab={handleMainTab} />

      <ActivityModal
        open={actModalOpen}
        onClose={() => setActModalOpen(false)}
        onCreated={async (actividad) => {
          setRefreshKey(k => k + 1);
          if (!actividad) return;
          // Calcular pts acumulados esta semana incluyendo la nueva actividad
          try {
            const allActs = await getActividades();
            const now = new Date();
            const day = now.getDay() === 0 ? 7 : now.getDay();
            const monDate = new Date(now); monDate.setDate(now.getDate() - (day - 1)); monDate.setHours(0,0,0,0);
            const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6); sunDate.setHours(23,59,59,999);
            const actsThisWeek = (Array.isArray(allActs) ? allActs : []).filter(a => {
              const f = new Date(a.fecha + 'T12:00:00');
              return f >= monDate && f <= sunDate;
            });
            const ptsDespues = actsThisWeek.reduce((s, a) => s + parseFloat(a.puntos), 0);
            const pts_nueva  = parseFloat(actividad.puntos) || (parseFloat(actividad.minutos) * parseFloat(actividad.ponderador));
            const ptsAntes   = Math.max(0, ptsDespues - pts_nueva);
            setToast({ actividad, ptsAntes, ptsDespues });
          } catch {
            // si falla el fetch, mostrar toast sin barra semanal
            const pts_nueva = parseFloat(actividad.puntos) || (parseFloat(actividad.minutos) * parseFloat(actividad.ponderador));
            setToast({ actividad, ptsAntes: 0, ptsDespues: pts_nueva });
          }
        }}
        competenciaActiva={competenciaActiva}
      />

      {toast && (
        <ActivityToast
          actividad={toast.actividad}
          ptsAntes={toast.ptsAntes}
          ptsDespues={toast.ptsDespues}
          onClose={() => setToast(null)}
          onVerEvolucion={() => {
            setToast(null);
            setMainTab('actividades');
            // señal para que MisActividades abra subtab evolucion
            setEvolucionSignal(n => n + 1);
          }}
        />
      )}
      <CrearCompetenciaModal
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreated={comp => { handleCreated(); setCompetenciaActiva(comp); }}
      />

      {showOnboarding && (
        <OnboardingModal onClose={() => {
          localStorage.setItem(`nanao_onboarding_done_${user.id}`, '1');
          setShowOnboarding(false);
        }} />
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppShell />
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}
