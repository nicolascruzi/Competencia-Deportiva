import { useAuth } from '../context/AuthContext';

// Tab IDs
// 'competencia' | 'ranking' | 'calendario' | 'feed' | 'perfil'

const TabCompetencia = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : '#4A6A8A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
    <path d="M8 9h8"/><path d="M8 15h8"/><path d="M8 5v14"/><path d="M16 5v14"/>
  </svg>
);

const TabRanking = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : '#4A6A8A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
  </svg>
);

const TabCalendario = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : '#4A6A8A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const TabFeed = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#38BDF8' : '#4A6A8A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18"/><path d="M9 21V9"/>
  </svg>
);

const TabPerfil = ({ active, initial }) => (
  active ? (
    <div style={{ width:26, height:26, borderRadius:'50%', background:'#38BDF8', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:13, color:'#0D1B2A' }}>
      {initial}
    </div>
  ) : (
    <div style={{ width:26, height:26, borderRadius:'50%', border:'2px solid #4A6A8A', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:13, color:'#4A6A8A' }}>
      {initial}
    </div>
  )
);

const TABS = [
  { id:'competencia', label:'Competencia', Icon: TabCompetencia },
  { id:'ranking',     label:'Ranking',     Icon: TabRanking },
  { id:'calendario',  label:'Calendario',  Icon: TabCalendario },
  { id:'feed',        label:'Grupo',       Icon: TabFeed },
  { id:'perfil',      label:'Perfil',      Icon: null },
];

export default function BottomTabBar({ activeTab, onTab }) {
  const { user } = useAuth();
  const initial = user?.nombre?.charAt(0).toUpperCase() || '?';

  return (
    <>
      {/* Relleno debajo del safe-area */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, height:'env(safe-area-inset-bottom)', background:'#0A1520', zIndex:60 }} />

      <nav style={{
        position: 'fixed',
        bottom: 'env(safe-area-inset-bottom)',
        left: 0, right: 0,
        zIndex: 60,
        background: '#0A1520',
        borderTop: '1px solid #1A2E45',
        display: 'flex',
        alignItems: 'stretch',
        height: 58,
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => onTab(id)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer', padding:'6px 0', WebkitTapHighlightColor:'transparent', position:'relative' }}>

              {/* Indicador activo */}
              {isActive && (
                <div style={{ position:'absolute', top:0, left:'20%', right:'20%', height:2, background:'#38BDF8', borderRadius:'0 0 2px 2px' }} />
              )}

              {/* Icono */}
              {id === 'perfil'
                ? <TabPerfil active={isActive} initial={initial} />
                : <Icon active={isActive} />
              }

              {/* Label */}
              <span style={{ fontSize:10, fontWeight: isActive ? 700 : 500, color: isActive ? '#38BDF8' : '#4A6A8A', letterSpacing:'0.02em', lineHeight:1 }}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
