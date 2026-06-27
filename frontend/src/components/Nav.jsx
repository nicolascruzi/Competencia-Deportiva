import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Nav({ onNewActivity }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 border-b"
              style={{ background: 'rgba(13,27,42,0.97)', borderColor: '#243D57', backdropFilter: 'blur(12px)', height: '52px' }}>
        <span className="font-bold text-xl tracking-widest uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#38BDF8' }}>
          Nanão Cup 🏆
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: '#7A9BBF' }}>{user?.nombre}</span>
          <button onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: '#243D57', color: '#7A9BBF' }}>
            Salir
          </button>
        </div>
      </header>

      {/* Bottom tab bar — mobile nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
           style={{ background: 'rgba(13,27,42,0.97)', borderColor: '#243D57', backdropFilter: 'blur(12px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        <NavLink to="/" end
          className={({ isActive }) =>
            'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors ' +
            (isActive ? 'text-[#38BDF8]' : 'text-[#7A9BBF]')
          }>
          {({ isActive }) => (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10M12 20V4M6 20v-6"/>
              </svg>
              <span>Ranking</span>
            </>
          )}
        </NavLink>

        {/* Botón central + Actividad */}
        <div className="flex-1 flex items-center justify-center">
          <button onClick={onNewActivity}
            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg transition-transform active:scale-95"
            style={{ background: '#38BDF8', color: '#0D1B2A', marginTop: '-20px', boxShadow: '0 4px 20px rgba(56,189,248,0.4)' }}>
            +
          </button>
        </div>

        <NavLink to="/actividades"
          className={({ isActive }) =>
            'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors ' +
            (isActive ? 'text-[#38BDF8]' : 'text-[#7A9BBF]')
          }>
          {({ isActive }) => (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              <span>Mis actividades</span>
            </>
          )}
        </NavLink>
      </nav>

      {/* Spacer para que el contenido no quede bajo la tab bar */}
      <div style={{ height: 'calc(72px + env(safe-area-inset-bottom))', flexShrink: 0 }} className="pointer-events-none" />
    </>
  );
}
