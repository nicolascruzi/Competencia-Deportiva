import { useState } from 'react';
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

function AppShell() {
  const { user, loading } = useAuth();
  const [actModalOpen, setActModalOpen]       = useState(false);
  const [crearOpen, setCrearOpen]             = useState(false);
  const [refreshKey, setRefreshKey]           = useState(0);
  const [competenciaActiva, setCompetenciaActiva] = useState(null);
  const [mainTab, setMainTab]                 = useState('ranking');
  const [compTab, setCompTab]                 = useState('ranking');
  // para que SinCompetencia pueda abrir el selector desde el botón
  const [forceOpenSelector, setForceOpenSelector] = useState(0);

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--t-ground)' }}>
        <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Login />;

  function handleSelectCompetencia(c) {
    setCompetenciaActiva(c);
    setCompTab('ranking');
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

  function renderContent() {
    if (mainTab === 'actividades') return <MisActividades key={refreshKey} onNewActivity={() => setActModalOpen(true)} />;
    if (mainTab === 'calendario')  return <Calendario key={refreshKey} />;
    if (mainTab === 'feed')        return <FeedGrupal key={competenciaActiva?.id} competencia={competenciaActiva} />;
    if (mainTab === 'perfil')      return <MiPerfil key={refreshKey} />;

    // ranking — requiere competencia
    if (!competenciaActiva) {
      return <SinCompetencia onOpen={() => setForceOpenSelector(n => n + 1)} />;
    }

    return (
      <CompetenciaDetalle
        key={competenciaActiva.id + compTab}
        competencia={competenciaActiva}
        tab={compTab}
        onTab={setCompTab}
        onBack={() => setCompetenciaActiva(null)}
        onNewActivity={() => setActModalOpen(true)}
      />
    );
  }

  return (
    <>
      <Nav
        onNewActivity={() => setActModalOpen(true)}
        competenciaActiva={competenciaActiva}
        onSelectCompetencia={handleSelectCompetencia}
        onCreateCompetencia={handleCreateCompetencia}
        forceOpenSelector={forceOpenSelector}
      />

      <div style={{ paddingTop:'calc(env(safe-area-inset-top) + 52px)', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>
        {renderContent()}
      </div>

      <BottomTabBar activeTab={mainTab} onTab={handleMainTab} />

      <ActivityModal
        open={actModalOpen}
        onClose={() => setActModalOpen(false)}
        onCreated={() => setRefreshKey(k => k + 1)}
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
