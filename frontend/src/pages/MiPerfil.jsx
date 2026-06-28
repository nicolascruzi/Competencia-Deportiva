import { useEffect, useState } from 'react';
import { getActividades } from '../api/actividades';
import { useAuth } from '../context/AuthContext';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function MiPerfil({ onNewActivity }) {
  const { user, logout } = useAuth();
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const minsMes = actsMes.reduce((s, a) => s + parseFloat(a.minutos), 0);

  const sportMap = {};
  acts.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre] = { min:0, pts:0, n:0 };
    sportMap[a.deporte_nombre].min += parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts += parseFloat(a.puntos);
    sportMap[a.deporte_nombre].n++;
  });
  const sports = Object.entries(sportMap).sort((a,b) => b[1].min - a[1].min);
  const maxMin = sports[0]?.[1]?.min || 1;

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── HERO ── */}
      <div style={{ padding:'28px 20px 20px', background:'linear-gradient(180deg, #0A1520 0%, #0D1B2A 100%)', borderBottom:'1px solid #1A2E45' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(56,189,248,0.12)', border:'2px solid rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:28, color:'#38BDF8', flexShrink:0 }}>
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:28, textTransform:'uppercase', lineHeight:1, color:'#E8F0FE' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:13, color:'#4A7A9B', marginTop:4 }}>{user?.email}</div>
          </div>
        </div>

        {/* Stats globales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Total pts',  value: Math.round(totalPts).toLocaleString('es'), accent:true },
            { label:'Horas',      value: Math.round(totalMin/60)+'h',               accent:false },
            { label:'Sesiones',   value: totalActs,                                 accent:false },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'11px 10px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#38BDF8', opacity: accent ? 0.8 : 0.3 }} />
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'clamp(16px,4vw,22px)', color: accent ? '#38BDF8' : '#E8F0FE', lineHeight:1 }}>
                {value}
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ESTE MES ── */}
      {actsMes.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1A2E45' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#7A9BBF', marginBottom:10 }}>
            {MONTHS_ES[now.getMonth()]} {now.getFullYear()}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'#38BDF8', lineHeight:1 }}>
                {Math.round(ptsMes).toLocaleString('es')}
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Puntos este mes</div>
            </div>
            <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'#E8F0FE', lineHeight:1 }}>
                {actsMes.length}
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Sesiones este mes</div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPORTES ── */}
      {sports.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #1A2E45' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'#7A9BBF', marginBottom:10 }}>
            Mis deportes
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sports.map(([sport, v]) => {
              const pct = Math.round((v.min / maxMin) * 100);
              return (
                <div key={sport} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#E8F0FE' }}>{sport}</span>
                      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#7A9BBF' }}>
                        {Math.round(v.min)} min
                      </span>
                    </div>
                    <div style={{ height:4, background:'#1A2E45', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:'#38BDF8', borderRadius:2, opacity:0.7 }} />
                    </div>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#38BDF8', flexShrink:0, minWidth:40, textAlign:'right' }}>
                    {v.n} ses.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACCIONES ── */}
      <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={onNewActivity}
          style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'#38BDF8', color:'#0D1B2A', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          + Registrar actividad
        </button>
        <button onClick={logout}
          style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid #1A2E45', background:'transparent', color:'#7A9BBF', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:24, color:'#4A7A9B', fontSize:13 }}>
          <div style={{ width:16, height:16, border:'2px solid #243D57', borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          Cargando…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}
