import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MisCompetencias from './pages/MisCompetencias';
import CompetenciaDetalle from './pages/CompetenciaDetalle';
import MisActividades from './pages/MisActividades';
import Nav from './components/Nav';
import ActivityModal from './components/ActivityModal';

function AppShell() {
  const { user, loading } = useAuth();
  const [actModalOpen, setActModalOpen]         = useState(false);
  const [refreshKey, setRefreshKey]             = useState(0);
  const [competenciaActiva, setCompetenciaActiva] = useState(null);
  const [tab, setTab]                           = useState('ranking');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1B2A' }}>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
      </div>
    );
  }

  if (!user) return <Login />;

  function onCreated() { setRefreshKey(k => k + 1); }

  return (
    <>
      <Nav
        onNewActivity={() => setActModalOpen(true)}
        showTabs={!!competenciaActiva}
        tab={tab}
        onTab={setTab}
      />
      <Routes>
        <Route path="/" element={
          competenciaActiva
            ? <CompetenciaDetalle
                key={competenciaActiva.id}
                competencia={competenciaActiva}
                tab={tab}
                onTab={setTab}
                onBack={() => { setCompetenciaActiva(null); setTab('ranking'); }}
                onNewActivity={() => setActModalOpen(true)}
              />
            : <MisCompetencias onSelect={c => { setCompetenciaActiva(c); setTab('ranking'); }} />
        } />
        <Route path="/actividades"
          element={<MisActividades key={refreshKey} onNewActivity={() => setActModalOpen(true)} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ActivityModal open={actModalOpen} onClose={() => setActModalOpen(false)} onCreated={onCreated} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
