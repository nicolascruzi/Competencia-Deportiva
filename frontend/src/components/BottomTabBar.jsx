import { useAuth } from '../context/AuthContext';

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
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const TABS = [
  { id:'ranking',      label:'Ranking',      Icon: TabRanking },
  { id:'calendario',   label:'Calendario',   Icon: TabCalendario },
  { id:'feed',         label:'Grupo',        Icon: TabFeed },
  { id:'actividades',  label:'Actividades',  Icon: TabActividades },
  { id:'perfil',       label:'Perfil',       Icon: null },
];

export default function BottomTabBar({ activeTab, onTab }) {
  const { user } = useAuth();
  const initial = user?.nombre?.charAt(0).toUpperCase() || '?';

  return (
    <>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'env(safe-area-inset-bottom)', background:'var(--t-ground)', zIndex:59 }} />
      <nav style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
        left: '50%', transform: 'translateX(-50%)',
        zIndex: 60,
        background: 'var(--t-tab-bg)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--t-dim)',
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
              {id === 'perfil' ? (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: isActive ? 'var(--t-accent)' : 'transparent',
                  border: isActive ? 'none' : '2px solid var(--t-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 13,
                  color: isActive ? 'var(--t-ground)' : 'var(--t-muted)',
                  transition: 'all 0.18s',
                }}>{initial}</div>
              ) : (
                <Icon active={isActive} />
              )}
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
