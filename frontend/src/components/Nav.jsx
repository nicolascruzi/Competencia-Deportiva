import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',          label: 'Ranking'    },
  { to: '/actividades', label: 'Mis actividades' },
];

export default function Nav({ onNewActivity }) {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 flex items-center gap-3 px-4 h-13 border-b"
         style={{ background: 'rgba(13,27,42,0.97)', borderColor: '#243D57', backdropFilter: 'blur(12px)', height: '52px' }}>

      <span className="font-bold text-xl tracking-widest uppercase shrink-0"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#38BDF8' }}>
        Nanão Cup 🏆
      </span>

      <div className="flex gap-1 flex-1 overflow-x-auto">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) =>
              'text-xs font-medium px-3 py-1 rounded-lg whitespace-nowrap transition-all ' +
              (isActive ? 'text-[#38BDF8] bg-[#38BDF8]/10' : 'text-[#7A9BBF] hover:text-[#E8F0FE] hover:bg-[#243D57]')
            }>
            {l.label}
          </NavLink>
        ))}
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <span className="text-xs font-semibold hidden sm:block" style={{ color: '#7A9BBF' }}>
          {user?.nombre}
        </span>
        <button onClick={onNewActivity}
          className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all"
          style={{ borderColor: '#243D57', color: '#7A9BBF' }}
          onMouseEnter={e => { e.target.style.borderColor='#38BDF8'; e.target.style.color='#38BDF8'; }}
          onMouseLeave={e => { e.target.style.borderColor='#243D57'; e.target.style.color='#7A9BBF'; }}>
          + Actividad
        </button>
        <button onClick={logout}
          className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all"
          style={{ borderColor: '#243D57', color: '#7A9BBF' }}
          onMouseEnter={e => { e.target.style.borderColor='#243D57'; e.target.style.color='#E8F0FE'; }}
          onMouseLeave={e => { e.target.style.borderColor='#243D57'; e.target.style.color='#7A9BBF'; }}>
          Salir
        </button>
      </div>
    </nav>
  );
}
