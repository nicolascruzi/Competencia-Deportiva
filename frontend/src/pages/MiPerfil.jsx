import { useEffect, useState } from 'react';
import { getActividades } from '../api/actividades';
import { useAuth } from '../context/AuthContext';
import Configuracion from './Configuracion';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

export default function MiPerfil({ onNewActivity }) {
  const { user, logout } = useAuth();
  const [acts, setActs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    getActividades().then(setActs).finally(() => setLoading(false));
  }, []);

  const totalPts  = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const totalMin  = acts.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const totalActs = acts.length;

  const now     = new Date();
  const mesKey  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actsMes = acts.filter(a => a.fecha.slice(0,7) === mesKey);
  const ptsMes  = actsMes.reduce((s, a) => s + parseFloat(a.puntos), 0);

  const sportMap = {};
  acts.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre] = { min:0, pts:0, n:0 };
    sportMap[a.deporte_nombre].min += parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts += parseFloat(a.puntos);
    sportMap[a.deporte_nombre].n++;
  });
  const sports = Object.entries(sportMap).sort((a,b) => b[1].min - a[1].min);
  const maxMin = sports[0]?.[1]?.min || 1;

  if (showConfig) {
    return (
      <>
        {/* Sub-header configuración */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px 10px', borderBottom:'1px solid var(--t-dim)', background:'var(--t-nav-bg)' }}>
          <button onClick={() => setShowConfig(false)}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>
            Configuración
          </span>
        </div>
        <Configuracion />
      </>
    );
  }

  return (
    <div style={{ paddingBottom:32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── HERO ── */}
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'2px solid rgba(var(--t-accent-r),0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, color:'var(--t-accent)', flexShrink:0 }}>
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          </div>
        </div>

        {/* Stats globales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Total pts',  value: Math.round(totalPts).toLocaleString('es'), accent:true },
            { label:'Horas',      value: Math.round(totalMin/60)+'h',               accent:false },
            { label:'Sesiones',   value: totalActs,                                 accent:false },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 10px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--t-accent)', opacity: accent ? 0.8 : 0.25 }} />
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'clamp(15px,4vw,20px)', color: accent ? 'var(--t-accent)' : 'var(--t-text)', lineHeight:1 }}>
                {value}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ESTE MES ── */}
      {actsMes.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
            {MONTHS_ES[now.getMonth()]} {now.getFullYear()}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'var(--t-accent)', lineHeight:1 }}>
                {Math.round(ptsMes).toLocaleString('es')}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Puntos este mes</div>
            </div>
            <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'var(--t-text)', lineHeight:1 }}>
                {actsMes.length}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Sesiones este mes</div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPORTES ── */}
      {sports.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
            Mis deportes
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sports.map(([sport, v]) => {
              const pct = Math.round((v.min / maxMin) * 100);
              return (
                <div key={sport} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>{sport}</span>
                      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-muted)' }}>
                        {Math.round(v.min)} min
                      </span>
                    </div>
                    <div style={{ height:4, background:'var(--t-dim)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.75 }} />
                    </div>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-accent)', flexShrink:0, minWidth:40, textAlign:'right' }}>
                    {v.n} ses.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OPCIONES ── */}
      <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>

        {/* Botón Configuración */}
        <button onClick={() => setShowConfig(true)}
          style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 16px', borderRadius:14, border:'1px solid var(--t-dim)', background:'var(--t-surface)', color:'var(--t-text)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
          <span style={{ color:'var(--t-accent)' }}><IconSettings /></span>
          <span style={{ flex:1, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            Configuración
          </span>
          <span style={{ color:'var(--t-muted)' }}><IconChevron /></span>
        </button>

        {/* Nueva actividad */}
        <button onClick={onNewActivity}
          style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          + Registrar actividad
        </button>

        {/* Cerrar sesión */}
        <button onClick={logout}
          style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:24, color:'var(--t-muted)', fontSize:13 }}>
          <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          Cargando…
        </div>
      )}
    </div>
  );
}
