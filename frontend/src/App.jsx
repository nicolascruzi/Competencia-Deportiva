import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import MisCompetencias from './pages/MisCompetencias';
import CompetenciaDetalle from './pages/CompetenciaDetalle';
import FeedGrupal from './pages/FeedGrupal';
import MiPerfil from './pages/MiPerfil';
import Nav from './components/Nav';
import BottomTabBar from './components/BottomTabBar';
import ActivityModal from './components/ActivityModal';

// Bottom tabs: 'competencia' | 'ranking' | 'calendario' | 'feed' | 'perfil'

function AppShell() {
  const { user, loading } = useAuth();
  const [actModalOpen, setActModalOpen]           = useState(false);
  const [refreshKey, setRefreshKey]               = useState(0);
  const [competenciaActiva, setCompetenciaActiva] = useState(null);
  const [mainTab, setMainTab]                     = useState('competencia');
  // Tab interno de CompetenciaDetalle
  const [compTab, setCompTab]                     = useState('ranking');

  if (loading) {
    return (
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--t-ground)' }}>
        <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) return <Login />;

  function onCreated() { setRefreshKey(k => k + 1); }

  function handleSelectCompetencia(c) {
    setCompetenciaActiva(c);
    setCompTab('ranking');
    setMainTab('ranking');
  }

  function handleBack() {
    setCompetenciaActiva(null);
    setCompTab('ranking');
    setMainTab('competencia');
  }

  function handleMainTab(id) {
    setMainTab(id);
    if (id === 'ranking')    setCompTab('ranking');
    if (id === 'calendario') setCompTab('calendar');
  }

  function renderContent() {
    // Feed y perfil no dependen de la competencia activa
    if (mainTab === 'feed')   return <FeedGrupal key={competenciaActiva?.id} competencia={competenciaActiva} />;
    if (mainTab === 'perfil') return <MiPerfil key={refreshKey} onNewActivity={() => setActModalOpen(true)} />;

    // Sin competencia seleccionada → lista de competencias
    if (!competenciaActiva)  return <MisCompetencias onSelect={handleSelectCompetencia} />;

    // Con competencia activa
    if (mainTab === 'competencia') {
      return (
        <CompetenciaDetalle
          key={competenciaActiva.id}
          competencia={competenciaActiva}
          tab={compTab}
          onTab={setCompTab}
          onBack={handleBack}
          onNewActivity={() => setActModalOpen(true)}
        />
      );
    }

    // ranking o calendario → CompetenciaDetalle con el tab fijado
    return (
      <CompetenciaDetalle
        key={competenciaActiva.id}
        competencia={competenciaActiva}
        tab={compTab}
        onTab={setCompTab}
        onBack={handleBack}
        onNewActivity={() => setActModalOpen(true)}
      />
    );
  }

  return (
    <>
      <Nav onNewActivity={() => setActModalOpen(true)} />

      {/* Contenido: padding superior = header fijo, padding inferior = bottom tab bar */}
      <div style={{ paddingTop:'calc(env(safe-area-inset-top) + 52px)', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>
        {renderContent()}
      </div>

      <BottomTabBar activeTab={mainTab} onTab={handleMainTab} />

      <ActivityModal
        open={actModalOpen}
        onClose={() => setActModalOpen(false)}
        onCreated={onCreated}
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
