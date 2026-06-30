
const TabRanking = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
  </svg>
);
const TabCalendario = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const TabActividades = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const TabFeed = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const TabPerfil = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

// Tabs admin
const TabUsuarios = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const TabCompetencias = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
    <path d="M8 9h8"/><path d="M8 15h8"/>
  </svg>
);
const TabActividadesAdmin = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const TabDeportes = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 000 20M12 2a14.5 14.5 0 010 20M2 12h20"/>
  </svg>
);
const TabAdminPerfil = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--t-accent)' : 'var(--t-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const TABS_USER = [
  { id:'ranking',     label:'Ranking',     Icon: TabRanking },
  { id:'calendario',  label:'Calendario',  Icon: TabCalendario },
  { id:'feed',        label:'Feed',        Icon: TabFeed },
  { id:'actividades', label:'Actividades', Icon: TabActividades },
  { id:'perfil',      label:'Perfil',      Icon: TabPerfil },
];

const TABS_ADMIN = [
  { id:'admin_usuarios',     label:'Usuarios',     Icon: TabUsuarios },
  { id:'admin_competencias', label:'Competencias', Icon: TabCompetencias },
  { id:'admin_actividades',  label:'Actividades',  Icon: TabActividadesAdmin },
  { id:'admin_deportes',     label:'Deportes',     Icon: TabDeportes },
  { id:'perfil',             label:'Perfil',       Icon: TabAdminPerfil },
];

export default function BottomTabBar({ activeTab, onTab, isGlobalAdmin }) {
  const TABS = isGlobalAdmin ? TABS_ADMIN : TABS_USER;
  return (
    <>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'env(safe-area-inset-bottom)', background:'var(--t-ground)', zIndex:59 }} />
      <nav style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 60,
        background: isGlobalAdmin ? 'color-mix(in srgb, var(--t-tab-bg) 92%, var(--t-accent) 8%)' : 'var(--t-tab-bg)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: isGlobalAdmin ? '1px solid rgba(var(--t-accent-r),0.3)' : '1px solid var(--t-dim)',
        borderRadius: 32,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
        display: 'flex', alignItems: 'center',
        padding: '0 6px', height: 58, gap: 0,
        width: 'calc(100% - 32px)', maxWidth: 380,
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => onTab(id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              background: isActive ? 'rgba(var(--t-accent-r), 0.12)' : 'transparent',
              border: 'none', cursor: 'pointer', padding: '8px 4px',
              borderRadius: 24, WebkitTapHighlightColor: 'transparent',
              transition: 'background 0.18s', height: 46,
            }}>
              <Icon active={isActive} />
              <span style={{
                fontSize: 9, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--t-accent)' : 'var(--t-muted)',
                letterSpacing: '0.02em', lineHeight: 1, whiteSpace: 'nowrap',
              }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
