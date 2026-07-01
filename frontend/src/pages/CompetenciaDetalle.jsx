import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getRankingComp, getActividadesComp, updatePonderadores } from '../api/competencias';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { getDeportes as getAllDeportes, createDeporte } from '../api/actividades';

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const PERSON_COLORS = [
  '#38BDF8','#34D399','#F59E0B','#F87171','#A78BFA',
  '#FB923C','#2DD4BF','#E879F9','#86EFAC','#FDE68A',
  '#67E8F9','#FCA5A5'
];
const SPORT_ICONS = {
  'Bicicleta MTB':'🚵','Bicicleta Rodillo':'🚴','Bicicleta Ruta':'🚴','Box':'🥊',
  'Buceo':'🤿','Crossfit':'🏋️','Cuerda':'🪢','Escalada':'🧗','Funcional':'💪',
  'Fútbol':'⚽','Gimnasio':'🏋️','Golf':'⛳','Natación':'🏊','Padel':'🏓',
  'Spinning':'🚴','Surf':'🏄','Tenis':'🎾','Trail Running':'🏃','Trekking':'🥾','Trote':'🏃',
};
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const sportIcon = s => SPORT_ICONS[s] || '🏅';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getPersonColor(nombre, nombres) {
  const sorted = [...nombres].sort();
  return PERSON_COLORS[sorted.indexOf(nombre) % PERSON_COLORS.length];
}

function aggregateByPerson(acts) {
  const map = {};
  acts.forEach(a => {
    const key = a.nombre_display || a.nombre;
    if (!map[key]) map[key] = { nombre: key, foto_perfil_url: a.foto_perfil_url ?? null, pts: 0, minutos: 0, actividades: 0, deportes: new Set(), ultimaFecha: null };
    if (!map[key].foto_perfil_url && a.foto_perfil_url) map[key].foto_perfil_url = a.foto_perfil_url;
    map[key].pts       += a.puntos;
    map[key].minutos   += parseFloat(a.minutos);
    map[key].actividades++;
    map[key].deportes.add(a.deporte_nombre);
    const f = new Date(a.fecha);
    if (!map[key].ultimaFecha || f > map[key].ultimaFecha) map[key].ultimaFecha = f;
  });
  return Object.values(map).sort((a, b) => b.pts - a.pts).map((p, i) => ({ ...p, rank: i + 1 }));
}

function aggregateBySport(acts) {
  const map = {};
  acts.forEach(a => {
    if (!map[a.deporte_nombre]) map[a.deporte_nombre] = { deporte: a.deporte_nombre, min: 0, pts: 0, count: 0 };
    map[a.deporte_nombre].min   += parseFloat(a.minutos);
    map[a.deporte_nombre].pts   += a.puntos;
    map[a.deporte_nombre].count++;
  });
  return Object.values(map).sort((a, b) => b.pts - a.pts);
}

// ─── SPINNER ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--t-muted)', fontFamily:"'JetBrains Mono', monospace", fontSize:13, padding:48, justifyContent:'center' }}>
      <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      Cargando…
    </div>
  );
}

// ─── KPI STRIP ────────────────────────────────────────────────────────────────

function KpiStrip({ acts }) {
  const personas = new Set(acts.map(a => a.nombre)).size;
  const totalPts = acts.reduce((s, a) => s + a.puntos, 0);
  const totalMin = acts.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const items = [
    { label:'Jugadores',     val: personas },
    { label:'Pts totales',   val: Math.round(totalPts).toLocaleString('es'), accent: true },
    { label:'Actividades',   val: acts.length },
    { label:'Horas',         val: Math.round(totalMin / 60) + 'h' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderBottom:'1px solid var(--t-surface2)', padding:'8px 0' }}>
      {items.map(({ label, val, accent }) => (
        <div key={label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1, padding:'0 4px' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color: accent ? 'var(--t-accent)' : 'var(--t-text)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
            {val}
          </div>
          <div style={{ fontSize:9, color:'var(--t-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PODIO ────────────────────────────────────────────────────────────────────

function Podio({ acts, nombres }) {
  const people = aggregateByPerson(acts);
  if (people.length < 1) return <EmptyState icon="🏆" title="Sin datos" />;
  const top3   = people.slice(0, 3);
  const leader = top3[0].pts;
  const gold   = '#F59E0B', silver = '#94A3B8', bronze = '#B45309';
  const colors = [gold, silver, bronze];
  const heights= [88, 62, 44];
  const sizes  = [58, 48, 48];
  const order  = [1, 0, 2]; // center=gold, left=silver, right=bronze

  const slots = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div>
      <KpiStrip acts={acts} />
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:0, paddingTop:16 }}>
        {slots.map((p, si) => {
          const origIdx = [1, 0, 2][si];
          if (!p) return null;
          const color  = colors[origIdx];
          const height = heights[origIdx];
          const size   = sizes[origIdx];
          const gap    = origIdx === 0 ? 'Líder' : `-${Math.round(leader - p.pts)} pts`;
          return (
            <div key={p.nombre} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, flex:1, maxWidth:120 }}>
              <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:size===58?24:18, color:'var(--t-ground)', overflow:'hidden', border:'2px solid rgba(255,255,255,0.15)' }}>
                {p.foto_perfil_url
                  ? <img src={p.foto_perfil_url} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : p.nombre.charAt(0).toUpperCase()
                }
              </div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'center', color:'var(--t-text)' }}>
                {p.nombre.split(' ')[0]}
              </div>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:600, color:'var(--t-accent)', textAlign:'center' }}>
                {Math.round(p.pts).toLocaleString('es')} pts
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', textAlign:'center', fontFamily:"'JetBrains Mono', monospace" }}>{gap}</div>
              <div style={{ background: origIdx===0 ? 'rgba(245,158,11,0.07)' : 'var(--t-surface)', border:'1px solid', borderColor: origIdx===0 ? 'rgba(245,158,11,0.25)' : 'var(--t-dim)', borderBottom:'none', borderRadius:'6px 6px 0 0', width:'100%', height:height, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:34, color:'var(--t-muted)', opacity:0.3 }}>{origIdx+1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RANKING ──────────────────────────────────────────────────────────────────

function PlayerDrawer({ person, acts, onClose }) {
  const myActs = acts
    .filter(a => (a.nombre_display || a.nombre) === person.nombre)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const sportMap = {};
  myActs.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre] = { min:0, pts:0, n:0 };
    sportMap[a.deporte_nombre].min += parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts += a.puntos;
    sportMap[a.deporte_nombre].n++;
  });
  const sports = Object.entries(sportMap).sort((a,b) => b[1].pts - a[1].pts);

  // Últimas 8 semanas de evolución
  const N_WEEKS = 8;
  const now = new Date();
  const weekLabels = Array.from({ length: N_WEEKS }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (N_WEEKS - 1 - i) * 7);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const weekPts = weeklyPts(acts, person.nombre, N_WEEKS);

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }} />

      {/* Sheet */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:201, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'78dvh', overflowY:'auto', paddingBottom:'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header del jugador */}
        <div style={{ padding:'12px 20px 16px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {/* Avatar */}
            <div style={{ width:48, height:48, borderRadius:14, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:24, color:'var(--t-muted2)', flexShrink:0, overflow:'hidden' }}>
              {person.foto_perfil_url
                ? <img src={person.foto_perfil_url} alt={person.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : person.nombre.charAt(0).toUpperCase()
              }
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1 }}>
                {person.nombre}
              </div>
              <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:3 }}>
                Posición #{person.rank}
              </div>
            </div>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✕</button>
          </div>

          {/* Stats en fila */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, marginTop:14, border:'1px solid var(--t-dim)', borderRadius:10, overflow:'hidden' }}>
            {[
              { label:'Puntos', val: Math.round(person.pts).toLocaleString('es') },
              { label:'Sesiones', val: person.actividades },
              { label:'Horas', val: Math.round(person.minutos / 60) + 'h' },
            ].map(({ label, val }, i) => (
              <div key={label} style={{ padding:'10px 8px', textAlign:'center', borderRight: i < 2 ? '1px solid var(--t-dim)' : 'none', background:'var(--t-surface)' }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:'var(--t-text)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)', marginTop:3 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deportes */}
        {sports.length > 0 && (
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--t-dim)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
              Deportes
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {sports.map(([deporte, v]) => {
                const pct = Math.round((v.pts / person.pts) * 100);
                return (
                  <div key={deporte} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{sportIcon(deporte)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deporte}</span>
                        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'var(--t-muted)', flexShrink:0, marginLeft:8 }}>{v.n} ses</span>
                      </div>
                      <div style={{ height:3, background:'var(--t-dim)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.6 }} />
                      </div>
                    </div>
                    <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700, color:'var(--t-accent)', flexShrink:0, minWidth:52, textAlign:'right' }}>
                      {Math.round(v.pts)} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evolución semanal */}
        {weekPts.some(v => v > 0) && (
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--t-dim)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:12 }}>
              Evolución — últimas {N_WEEKS} semanas
            </div>
            {/* Barras */}
            <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:64 }}>
              {weekPts.map((pts, i) => {
                const maxW = Math.max(...weekPts, 1);
                const h = Math.max(2, Math.round((pts / maxW) * 56));
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                    <div style={{ width:'100%', height:h, background: pts > 0 ? 'var(--t-accent)' : 'var(--t-dim)', borderRadius:'3px 3px 0 0', opacity: pts > 0 ? 0.85 : 0.3 }} />
                    <span style={{ fontSize:8, color:'var(--t-muted)', fontVariantNumeric:'tabular-nums' }}>{weekLabels[i]}</span>
                  </div>
                );
              })}
            </div>
            {/* Totales debajo */}
            <div style={{ display:'flex', gap:4, marginTop:2 }}>
              {weekPts.map((pts, i) => (
                <div key={i} style={{ flex:1, textAlign:'center' }}>
                  {pts > 0 && <span style={{ fontSize:8, fontWeight:700, color:'var(--t-accent)', fontVariantNumeric:'tabular-nums' }}>{Math.round(pts)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas actividades */}
        <div style={{ padding:'14px 20px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
            Últimas actividades
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {myActs.slice(0, 8).map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'var(--t-surface2)', borderRadius:10, border:'1px solid var(--t-dim)' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{sportIcon(a.deporte_nombre)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.deporte_nombre}</div>
                  <div style={{ fontSize:11, color:'var(--t-muted)' }}>
                    {new Date(a.fecha + 'T12:00:00').toLocaleDateString('es', { day:'numeric', month:'short' })}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0, fontFamily:"'JetBrains Mono', monospace" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--t-accent)' }}>{Math.round(a.puntos)} pts</div>
                  <div style={{ fontSize:10, color:'var(--t-muted)' }}>{Math.round(parseFloat(a.minutos))} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RankingEvolucion({ acts, nombres }) {
  const canvasRef = useRef(null);
  const [hidden, setHidden] = useState(new Set());

  const people   = [...new Set(acts.map(a => a.nombre))].sort();
  const allDates = [...new Set(acts.map(a => a.fecha.slice(0,10)))].sort();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !acts.length) return;
    const ctx = canvas.getContext('2d');

    const cumulMap = {};
    people.forEach(p => { cumulMap[p] = 0; });
    const series = {};
    people.forEach(p => { series[p] = {}; });
    [...acts].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(a => {
      cumulMap[a.nombre] += a.puntos;
      series[a.nombre][a.fecha.slice(0,10)] = cumulMap[a.nombre];
    });
    const personLines = people.map(p => {
      let last = 0;
      return allDates.map(d => { if (series[p][d] !== undefined) last = series[p][d]; return last; });
    });

    const W = canvas.parentElement?.offsetWidth || 300;
    const H = 240;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top:16, right:16, bottom:28, left:46 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;
    const maxVal = Math.max(...personLines.flat()) || 1;
    const n = allDates.length;

    // Gridlines
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + h * (1 - t);
      ctx.strokeStyle = 'rgba(50,65,90,0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + w, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120,145,180,0.7)';
      ctx.font = `10px JetBrains Mono, monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * t).toLocaleString('es'), pad.left - 5, y + 4);
    });

    // Etiquetas eje X
    const maxLabels = W < 340 ? 3 : 5;
    const step = Math.max(1, Math.floor(n / maxLabels));
    ctx.fillStyle = 'rgba(120,145,180,0.7)';
    ctx.font = `9px Inter, sans-serif`;
    ctx.textAlign = 'center';
    allDates.forEach((d, i) => {
      if (i % step === 0 || i === n - 1) {
        const x = pad.left + (i / Math.max(n - 1, 1)) * w;
        const parts = d.split('-');
        ctx.fillText(`${parts[2]}/${parts[1]}`, x, H - 6);
      }
    });

    // Líneas por persona
    personLines.forEach((line, pi) => {
      if (hidden.has(people[pi])) return;
      const color = getPersonColor(people[pi], nombres);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      line.forEach((val, i) => {
        const x = pad.left + (i / Math.max(n - 1, 1)) * w;
        const y = pad.top + h * (1 - val / maxVal);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      // Punto final
      const lx = pad.left + w;
      const ly = pad.top + h * (1 - line[line.length - 1] / maxVal);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'var(--t-ground, #0e0f11)';
      ctx.beginPath(); ctx.arc(lx, ly, 2, 0, Math.PI * 2); ctx.fill();
    });
  }, [acts, nombres, hidden, people, allDates]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [draw]);

  if (!acts.length) return <EmptyState icon="📈" title="Sin datos" />;

  return (
    <div style={{ padding:'12px 0 24px' }}>
      <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'14px 12px 10px', margin:'0 16px', overflow:'hidden' }}>
        <canvas ref={canvasRef} style={{ display:'block', width:'100%', maxWidth:'100%' }} />
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
          {people.map(p => (
            <button key={p}
              onClick={() => setHidden(h => { const n = new Set(h); n.has(p) ? n.delete(p) : n.add(p); return n; })}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, padding:'4px 9px', borderRadius:7, border:'1px solid var(--t-dim)', background: hidden.has(p) ? 'transparent' : 'rgba(var(--t-accent-r),0.04)', color: hidden.has(p) ? 'var(--t-muted)' : 'var(--t-text)', opacity: hidden.has(p) ? 0.4 : 1, cursor:'pointer', WebkitTapHighlightColor:'transparent', maxWidth:'100%' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: getPersonColor(p, nombres), flexShrink:0, display:'inline-block', opacity: hidden.has(p) ? 0.3 : 1 }} />
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = ['#C25E2A','#5E83A6','#B08534','#7E6BB0','#3F9B86','#C07D3F','#4A7C59','#A6455E'];

// Calcula puntos por semana sobre un array de actividades ya filtrado
function weeklyPtsFromData(data, n = 4) {
  const now = new Date();
  const weeks = Array.from({ length: n }, (_, i) => {
    const end   = new Date(now); end.setDate(now.getDate() - i * 7); end.setHours(23,59,59,999);
    const start = new Date(end); start.setDate(end.getDate() - 6);   start.setHours(0,0,0,0);
    return { start, end };
  }).reverse();
  return weeks.map(({ start, end }) =>
    data
      .filter(a => { const d = new Date(a.fecha + 'T12:00:00'); return d >= start && d <= end; })
      .reduce((s, a) => s + (parseFloat(a.puntos) || 0), 0)
  );
}

// Convierte fecha 'YYYY-MM-DD' a un número entero YYYYMMDD para comparar sin zonas horarias
function fechaNum(s) {
  const clean = (s || '').slice(0, 10).replace(/-/g, '');
  return parseInt(clean, 10) || 0;
}

// Calcula puntos por semana (últimas N semanas) anclado a la última actividad del jugador
function weeklyPts(acts, nombre, n = 4) {
  const mine = acts.filter(a => (a.nombre_display || a.nombre) === nombre || String(a.user_id) === String(nombre));
  if (!mine.length) return Array(n).fill(0);

  // Anclar al último día con actividad, comparando fechas como YYYYMMDD
  const anchorNum = mine.reduce((mx, a) => Math.max(mx, fechaNum(a.fecha)), 0);
  const anchorStr = String(anchorNum); // YYYYMMDD

  return Array.from({ length: n }, (_, i) => {
    // semana i=0 es la más reciente (termina en anchor), i=n-1 la más antigua
    const endNum   = anchorNum - i * 7;
    const startNum = endNum - 6;
    return mine
      .filter(a => { const fn = fechaNum(a.fecha); return fn >= startNum && fn <= endNum; })
      .reduce((s, a) => s + (parseFloat(a.puntos) || 0), 0);
  }).reverse(); // cronológico: semana más antigua primero
}

function Spark({ values, accent }) {
  const W = 48, H = 18, PAD = 1.5;
  const N = values.length;
  if (N < 2) return null;
  const mn = Math.min(...values), mx = Math.max(...values);
  const norm = values.map(v => (v - mn) / Math.max(mx - mn, 0.01));
  const xs = Array.from({ length: N }, (_, i) => PAD + (i / (N - 1)) * (W - PAD * 2));
  const ys = norm.map(v => H - PAD - v * (H - PAD * 2));
  const line = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const area = `${xs[0]},${H} ${line} ${xs[N-1]},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display:'block', overflow:'visible' }}>
      <polyline points={area} fill={accent} fillOpacity="0.09" stroke="none" />
      <polyline points={line} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[N-1]} cy={ys[N-1]} r="2.4" fill={accent} stroke="var(--t-ground)" strokeWidth="1" />
    </svg>
  );
}

function Ranking({ acts, rankingData, nombres, myId, onOpenProfile }) {
  const [subtab, setSubtab]       = useState('tabla');
  const [lightboxFoto, setLightboxFoto] = useState(null); // url

  const people = rankingData.length
    ? rankingData.map((r, i) => ({
        id:              r.id,
        nombre:          r.nombre_display || r.nombre,
        foto_perfil_url: r.foto_perfil_url,
        pts:             parseFloat(r.puntos) || 0,
        minutos:         parseFloat(r.minutos) || 0,
        actividades:     parseInt(r.actividades) || 0,
        rank:            i + 1,
      }))
    : aggregateByPerson(acts);

  if (!people.length) return <EmptyState icon="🏁" title="Sin registros" text="Cargá actividades para ver el ranking." />;

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setSubtab(id)}
      style={{ padding:'8px 16px', border:'none', cursor:'pointer', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', WebkitTapHighlightColor:'transparent', background:'transparent',
        color: subtab === id ? 'var(--t-accent)' : 'var(--t-muted)',
        borderBottom: subtab === id ? '2.5px solid var(--t-accent)' : '2.5px solid transparent',
      }}>{label}</button>
  );

  return (
    <div>
      {/* Subtabs */}
      <div style={{ display:'flex', gap:0, padding:'0 12px', borderBottom:'1px solid var(--t-dim)' }}>
        {tabBtn('tabla', 'Tabla')}
        {tabBtn('evolucion', 'Evolución')}
      </div>

      {/* Lightbox foto ranking */}
      {lightboxFoto && createPortal(
        <div onClick={() => setLightboxFoto(null)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <img src={lightboxFoto} alt="" style={{ width:240, height:240, borderRadius:'50%', objectFit:'cover', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }} />
        </div>,
        document.body
      )}

      {subtab === 'evolucion' ? (
        <RankingEvolucion acts={acts} nombres={nombres} />
      ) : (
        <div style={{ background:'var(--t-surface)', borderRadius:'16px 16px 0 0', marginTop:8 }}>
          {people.map((p, i) => {
            const isMe    = p.nombre === myId;
            const color   = AVATAR_COLORS[i % AVATAR_COLORS.length];
            const horas   = Math.round(p.minutos / 60);
            const sparkValues = weeklyPts(acts, p.nombre);

            return (
              <div key={p.nombre}
                onClick={() => onOpenProfile?.(p.nombre, p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '11px 12px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--t-dim)',
                  background: isMe ? 'rgba(var(--t-accent-r),0.06)' : 'transparent',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}>

                {/* Posición */}
                <div style={{ width:18, textAlign:'center', flexShrink:0, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, lineHeight:1, color: i === 0 ? 'var(--t-accent)' : 'var(--t-muted)', fontVariantNumeric:'tabular-nums' }}>
                  {i + 1}
                </div>

                {/* Avatar */}
                <div
                  onClick={p.foto_perfil_url ? (e) => { e.stopPropagation(); setLightboxFoto(p.foto_perfil_url); } : undefined}
                  style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:color, boxShadow:'0 2px 6px rgba(0,0,0,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor: p.foto_perfil_url ? 'pointer' : 'default' }}>
                  {p.foto_perfil_url
                    ? <img src={p.foto_perfil_url} alt={p.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:15, color:'#fff' }}>{p.nombre?.charAt(0).toUpperCase()}</span>
                  }
                </div>

                {/* Nombre + stats */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:15, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {p.nombre}
                    </span>
                    {isMe && <span style={{ background:'var(--t-accent)', color:'#fff', fontSize:8, fontWeight:800, letterSpacing:'0.04em', padding:'2px 5px', borderRadius:4, flexShrink:0 }}>TÚ</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--t-muted)' }}>{p.actividades} ses</span>
                    <span style={{ fontSize:10, color:'var(--t-dim2)', opacity:0.5 }}>·</span>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--t-muted)' }}>{horas}h</span>
                  </div>
                </div>

                {/* Sparkline — últimas 4 semanas */}
                <div style={{ flexShrink:0 }}>
                  <Spark values={sparkValues} accent="var(--t-accent)" />
                </div>

                {/* Puntos */}
                <div style={{ textAlign:'right', flexShrink:0, minWidth:36 }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, lineHeight:0.9, color:'var(--t-text)', fontVariantNumeric:'tabular-nums' }}>
                    {Math.round(p.pts).toLocaleString('es')}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.05em', color:'var(--t-muted)', marginTop:2 }}>PTS</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CALENDARIO ───────────────────────────────────────────────────────────────

function Calendario({ acts, mes, meses, onMes }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const DOWS = ['L','M','X','J','V','S','D'];

  // Reset selección cuando cambia el mes
  useEffect(() => { setSelectedDay(null); }, [mes]);

  // Determinar qué mes mostrar en el grid.
  // Si hay un mes seleccionado en la barra global, usarlo.
  // Si es "acumulado" (mes=''), derivar del mes más reciente de las acts.
  const activeMes = (() => {
    if (mes) return mes;
    if (!acts.length) return null;
    return acts.map(a => a.fecha.slice(0,7)).sort().pop();
  })();

  const viewYear  = activeMes ? parseInt(activeMes.split('-')[0]) : new Date().getFullYear();
  const viewMonth = activeMes ? parseInt(activeMes.split('-')[1]) - 1 : new Date().getMonth();

  // Agrupar TODAS las actividades del mes visible por día (todos los participantes)
  const dayActivities = {};
  acts.forEach(a => {
    const d = new Date(a.fecha + 'T12:00:00');
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!dayActivities[day]) dayActivities[day] = [];
      dayActivities[day].push(a);
    }
  });

  const firstDow    = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today       = new Date();
  const todayDate   = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : -1;
  const emptyCells  = Array.from({ length: firstDow });
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selectedActs = selectedDay ? (dayActivities[selectedDay] || []).filter(Boolean) : [];
  const sortedDays   = Object.keys(dayActivities).map(Number).sort((a, b) => a - b);

  // Navegación entre meses (usando meses disponibles del padre)
  const mesIdx = meses.indexOf(activeMes);
  function prevMes() {
    if (!meses.length) return;
    if (!mes) { onMes(meses[meses.length - 1]); return; }
    if (mesIdx > 0) onMes(meses[mesIdx - 1]);
  }
  function nextMes() {
    if (!meses.length) return;
    if (mesIdx < meses.length - 1) onMes(meses[mesIdx + 1]);
    else if (mesIdx === meses.length - 1) onMes('');
  }
  const canPrev = mes ? mesIdx > 0 : false;
  const canNext = mes ? true : false;

  if (!meses.length && !acts.length) return <EmptyState icon="📅" title="Sin actividades" />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Lightbox foto */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <button onClick={() => setLightboxUrl(null)}
            style={{ position:'absolute', top:16, right:16, background:'transparent', border:'none', color:'var(--t-muted)', fontSize:22, cursor:'pointer', padding:'8px 12px' }}>✕</button>
          <img src={lightboxUrl} alt="foto" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:12, objectFit:'contain' }} />
        </div>
      )}

      {/* ── Cabecera del mes ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={prevMes} disabled={!canPrev}
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color: canPrev ? 'var(--t-text)' : 'var(--t-dim)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', cursor: canPrev ? 'pointer' : 'default' }}>
          ‹
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--t-text)', lineHeight:1 }}>
            {MONTHS_ES[viewMonth]}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color:'var(--t-muted)', marginTop:2 }}>{viewYear}</div>
        </div>
        <button onClick={nextMes} disabled={!canNext}
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color: canNext ? 'var(--t-text)' : 'var(--t-dim)', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center', cursor: canNext ? 'pointer' : 'default' }}>
          ›
        </button>
      </div>

      {/* ── Grid del calendario ── */}
      <div>
        {/* Días de semana */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:3 }}>
          {DOWS.map(d => (
            <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--t-muted2)', padding:'2px 0' }}>{d}</div>
          ))}
        </div>
        {/* Celdas de días */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {emptyCells.map((_, i) => <div key={'e'+i} style={{ aspectRatio:'1' }} />)}
          {days.map(day => {
            const dayActs = (dayActivities[day] || []).filter(Boolean);
            const hasActs = dayActs.length > 0;
            const isToday = day === todayDate;
            const isSel   = day === selectedDay;
            // Agrupar por persona para mostrar un punto por participante
            const participants = [...new Set(dayActs.map(a => a.nombre))];
            const icons = [...new Set(dayActs.map(a => sportIcon(a.deporte_nombre)))].slice(0, 2);

            return (
              <div key={day}
                onClick={() => hasActs && setSelectedDay(d => d === day ? null : day)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: isSel ? 'rgba(var(--t-accent-r),0.12)' : hasActs ? 'var(--t-surface2)' : 'transparent',
                  border: `1px solid ${isSel ? 'var(--t-accent)' : isToday ? 'rgba(var(--t-accent-r),0.5)' : hasActs ? 'var(--t-dim)' : 'transparent'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden',
                  cursor: hasActs ? 'pointer' : 'default',
                  transition: 'border-color 0.12s, background 0.12s',
                }}>
                {/* Número del día */}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 600, lineHeight: 1,
                  color: isToday ? 'var(--t-accent)' : hasActs ? 'var(--t-text)' : 'var(--t-muted2)',
                }}>{day}</span>
                {/* Iconos de deporte (emoji) */}
                {hasActs && (
                  <div style={{ display:'flex', gap:1, marginTop:2, justifyContent:'center' }}>
                    {icons.map((ic, ii) => (
                      <span key={ii} style={{ fontSize: 10, lineHeight: 1 }}>{ic}</span>
                    ))}
                  </div>
                )}
                {/* Puntos de participantes (uno por persona) */}
                {hasActs && participants.length > 0 && (
                  <div style={{ display:'flex', gap:2, marginTop:3, justifyContent:'center', flexWrap:'wrap' }}>
                    {participants.slice(0,4).map((n, ni) => (
                      <span key={ni} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: PERSON_COLORS[ni % PERSON_COLORS.length],
                        display: 'block', flexShrink: 0,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detalle del día seleccionado ── */}
      {selectedDay && selectedActs.length > 0 && (
        <div style={{ background:'var(--t-surface2)', border:'1px solid var(--t-accent)', borderRadius:10, overflow:'hidden' }}>
          {/* Header del día */}
          <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid var(--t-dim)', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--t-accent)' }}>
              {new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' }).replace(/^\w/, c => c.toUpperCase())}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'var(--t-muted)' }}>
              {Math.round(selectedActs.reduce((s,a) => s + (parseFloat(a.puntos)||0), 0))} pts
            </div>
          </div>
          {/* Lista de actividades */}
          {selectedActs.map((a, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
              borderBottom: i < selectedActs.length - 1 ? '1px solid rgba(36,61,87,0.5)' : 'none',
            }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{sportIcon(a.deporte_nombre)}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>{a.deporte_nombre}</div>
                <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:1 }}>{a.nombre_display || a.nombre}</div>
                {a.notas && (
                  <div style={{ fontSize:11, color:'var(--t-muted2)', fontStyle:'italic', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {a.notas}
                  </div>
                )}
              </div>
              {/* Foto thumbnail */}
              {a.foto_url && (
                <div onClick={() => setLightboxUrl(a.foto_url)}
                  style={{ width:44, height:44, borderRadius:6, overflow:'hidden', cursor:'pointer', flexShrink:0, border:'1px solid var(--t-dim)' }}>
                  <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              )}
              {/* Puntos + minutos */}
              <div style={{ textAlign:'right', flexShrink:0, fontFamily:"'JetBrains Mono', monospace" }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--t-accent)' }}>{Math.round(parseFloat(a.puntos)||0)} pts</div>
                <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:1 }}>{Math.round(parseFloat(a.minutos))} min</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log mensual (lista cronológica) ── */}
      {sortedDays.length > 0 && (
        <div style={{ borderTop:'1px solid var(--t-dim)', paddingTop:12 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted2)', marginBottom:10 }}>
            Actividades de {MONTHS_ES[viewMonth]}
          </div>
          {sortedDays.map(day => {
            const dayActs = (dayActivities[day] || []).filter(Boolean);
            const dow = new Date(viewYear, viewMonth, day)
              .toLocaleDateString('es', { weekday:'short' });
            return (
              <div key={day} style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--t-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                  {dow.charAt(0).toUpperCase() + dow.slice(1)} {day}
                </div>
                {dayActs.map((a, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:8, marginBottom:3 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{sportIcon(a.deporte_nombre)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.deporte_nombre}</div>
                      <div style={{ fontSize:11, color:'var(--t-muted)' }}>{a.nombre}</div>
                    </div>
                    {a.foto_url && (
                      <div onClick={() => setLightboxUrl(a.foto_url)}
                        style={{ width:34, height:34, borderRadius:5, overflow:'hidden', cursor:'pointer', flexShrink:0, border:'1px solid var(--t-dim)' }}>
                        <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    )}
                    <div style={{ textAlign:'right', flexShrink:0, fontFamily:"'JetBrains Mono', monospace", fontSize:11 }}>
                      <div style={{ color:'var(--t-accent)', fontWeight:600 }}>{Math.round(parseFloat(a.puntos)||0)} pts</div>
                      <div style={{ color:'var(--t-muted)' }}>{Math.round(parseFloat(a.minutos))} min</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Sin actividades en este mes */}
      {sortedDays.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t-muted2)', fontSize:13 }}>
          Sin actividades registradas en {MONTHS_ES[viewMonth]}
        </div>
      )}
    </div>
  );
}

// ─── EVOLUCIÓN ────────────────────────────────────────────────────────────────

function Evolucion({ acts, nombres }) {
  const canvasRef = useRef(null);
  const [hidden, setHidden] = useState(new Set());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !acts.length) return;
    const ctx = canvas.getContext('2d');

    const people   = [...new Set(acts.map(a => a.nombre))].sort();
    const allDates = [...new Set(acts.map(a => a.fecha.slice(0,10)))].sort();

    const cumulMap = {};
    people.forEach(p => { cumulMap[p] = 0; });
    const series = {};
    people.forEach(p => { series[p] = {}; });

    [...acts].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(a => {
      cumulMap[a.nombre] += a.puntos;
      series[a.nombre][a.fecha.slice(0,10)] = cumulMap[a.nombre];
    });

    const personLines = people.map(p => {
      let last = 0;
      return allDates.map(d => { if (series[p][d] !== undefined) last = series[p][d]; return last; });
    });

    const W = canvas.parentElement.offsetWidth || 300;
    const H = 260;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top:16, right:14, bottom:30, left:46 };
    const w   = W - pad.left - pad.right;
    const h   = H - pad.top - pad.bottom;
    const maxVal = Math.max(...personLines.flat()) || 1;
    const n   = allDates.length;

    ctx.strokeStyle = 'rgba(36,61,87,0.8)';
    ctx.lineWidth = 1;
    [0,0.25,0.5,0.75,1].forEach(t => {
      const y = pad.top + h*(1-t);
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+w,y); ctx.stroke();
      ctx.fillStyle = 'rgba(122,155,191,0.7)';
      ctx.font = `10px JetBrains Mono, monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal*t).toLocaleString('es'), pad.left-5, y+4);
    });

    const maxLabels = W < 340 ? 3 : W < 500 ? 4 : 6;
    const step = Math.max(1, Math.floor(n/maxLabels));
    ctx.fillStyle = 'rgba(122,155,191,0.7)';
    ctx.font = `9px Inter, sans-serif`;
    ctx.textAlign = 'center';
    allDates.forEach((d, i) => {
      if (i % step === 0 || i === n-1) {
        const x = pad.left + (i/Math.max(n-1,1))*w;
        const parts = d.split('-');
        ctx.fillText(`${parts[2]}/${parts[1]}`, x, H-6);
      }
    });

    personLines.forEach((line, pi) => {
      if (hidden.has(people[pi])) return;
      const color = getPersonColor(people[pi], nombres);
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      line.forEach((val, i) => {
        const x = pad.left + (i/Math.max(n-1,1))*w;
        const y = pad.top + h*(1-val/maxVal);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.stroke();
      const lx = pad.left + w;
      const ly = pad.top + h*(1-line[line.length-1]/maxVal);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(lx,ly,4,0,Math.PI*2); ctx.fill();
    });
  }, [acts, nombres, hidden]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [draw]);

  const people = [...new Set(acts.map(a => a.nombre))].sort();

  if (!acts.length) return <EmptyState icon="📈" title="Sin datos" />;

  return (
    <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:16 }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%' }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
        {people.map(p => (
          <button key={p}
            onClick={() => setHidden(h => { const n=new Set(h); n.has(p)?n.delete(p):n.add(p); return n; })}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:500, padding:'3px 8px', borderRadius:6, border:'1px solid transparent', background:'transparent', color: hidden.has(p) ? 'var(--t-muted)' : 'var(--t-text)', opacity: hidden.has(p) ? 0.45 : 1, cursor:'pointer', transition:'all 0.15s' }}>
            <span style={{ width:9, height:9, borderRadius:'50%', background:getPersonColor(p, nombres), flexShrink:0, display:'inline-block' }} />
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CARRERA ANIMADA ──────────────────────────────────────────────────────────

function Carrera({ acts, nombres }) {
  const [frame, setFrame]     = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const allDates = [...new Set(acts.map(a => a.fecha.slice(0,10)))].sort();

  const getSnapshot = useCallback((fi) => {
    const subset = acts.filter(a => a.fecha.slice(0,10) <= allDates[fi]);
    return aggregateByPerson(subset);
  }, [acts, allDates]);

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setFrame(f => {
          if (f >= allDates.length - 1) { setPlaying(false); return f; }
          return f + 1;
        });
      }, 400);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, allDates.length]);

  const people = getSnapshot(frame);
  const maxPts = people[0]?.pts || 1;

  if (!acts.length) return <EmptyState icon="🏁" title="Sin datos" />;

  return (
    <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <button onClick={() => { if (frame>=allDates.length-1) setFrame(0); setPlaying(p=>!p); }}
          style={{ width:36, height:36, border:'1px solid rgba(var(--t-accent-r),0.35)', background:'rgba(var(--t-accent-r),0.12)', color:'var(--t-accent)', borderRadius:8, fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {playing ? '⏸' : '▷'}
        </button>
        <button onClick={() => { setPlaying(false); setFrame(0); }}
          style={{ width:36, height:36, border:'1px solid var(--t-dim)', background:'var(--t-dim)', color:'var(--t-text)', borderRadius:8, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          ⟳
        </button>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-muted)' }}>{allDates[frame]}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
        {people.slice(0, 8).map(p => {
          const pct   = (p.pts/maxPts)*100;
          const color = getPersonColor(p.nombre, nombres);
          return (
            <div key={p.nombre} style={{ display:'flex', alignItems:'center', gap:8, height:30, transition:'all 0.4s cubic-bezier(0.22,1,0.36,1)' }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', width:72, textAlign:'right', flexShrink:0, color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {p.nombre.split(' ')[0]}
              </div>
              <div style={{ flex:1, height:30, background:'var(--t-dim)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, background:color, width:pct+'%', transition:'width 0.4s cubic-bezier(0.22,1,0.36,1)', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:7, minWidth:4 }}>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:600, color:'var(--t-ground)' }}>{Math.round(p.pts)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DEPORTES ─────────────────────────────────────────────────────────────────

function Deportes({ acts }) {
  const sports = aggregateBySport(acts);
  const maxMin = sports[0]?.min || 1;

  if (!sports.length) return <EmptyState icon="🏅" title="Sin datos" />;

  return (
    <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:16 }}>
      <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Minutos por deporte</div>
      <div style={{ fontSize:12, color:'var(--t-muted)', marginBottom:14 }}>Total de minutos por disciplina en el período</div>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {sports.map((s, i) => {
          const pct   = Math.round((s.min/maxMin)*100);
          const color = PERSON_COLORS[i % PERSON_COLORS.length];
          return (
            <div key={s.deporte} style={{ display:'flex', alignItems:'center', gap:8, minHeight:28 }}>
              <span style={{ fontSize:16, flexShrink:0, width:22, textAlign:'center' }}>{sportIcon(s.deporte)}</span>
              <div style={{ flexShrink:0, width:'clamp(80px,25vw,130px)', fontSize:12, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'right' }}>{s.deporte}</div>
              <div style={{ flex:1, height:18, background:'var(--t-dim)', borderRadius:3, overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', width:pct+'%', background:color, borderRadius:3, opacity:0.85, transition:'width 0.5s' }} />
              </div>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:600, color:'var(--t-muted)', flexShrink:0, minWidth:44, textAlign:'right' }}>
                {Math.round(s.min).toLocaleString('es')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RÉCORDS ──────────────────────────────────────────────────────────────────

function Records({ acts }) {
  if (!acts.length) return <EmptyState icon="🔥" title="Sin datos" />;

  const people = aggregateByPerson(acts);
  if (!people.length) return <EmptyState icon="🔥" title="Sin datos" />;

  // Más puntos en un día
  const dayPts = {};
  acts.forEach(a => {
    const k = a.nombre + '|' + a.fecha.slice(0,10);
    if (!dayPts[k]) dayPts[k] = { nombre: a.nombre, pts: 0 };
    dayPts[k].pts += (parseFloat(a.puntos) || 0);
  });
  const bestDay = Object.values(dayPts).sort((a,b) => b.pts - a.pts)[0];

  // Más minutos en una semana
  const weekMin = {};
  acts.forEach(a => {
    const d = new Date(a.fecha + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const wk = d.toISOString().slice(0,10);
    const k  = a.nombre + '|' + wk;
    if (!weekMin[k]) weekMin[k] = { nombre: a.nombre, min: 0 };
    weekMin[k].min += (parseFloat(a.minutos) || 0);
  });
  const bestWeek = Object.values(weekMin).sort((a,b) => b.min - a.min)[0];

  // Más actividades
  const actCount = {};
  acts.forEach(a => { actCount[a.nombre] = (actCount[a.nombre] || 0) + 1; });
  const mostAct = Object.entries(actCount).sort((a,b) => b[1] - a[1])[0];

  // Racha de días consecutivos
  const personDays = {};
  acts.forEach(a => {
    if (!personDays[a.nombre]) personDays[a.nombre] = new Set();
    personDays[a.nombre].add(a.fecha.slice(0,10));
  });
  let maxStreak = { nombre: '', streak: 0 };
  Object.entries(personDays).forEach(([nombre, daysSet]) => {
    const days = [...daysSet].sort(); let cur = 1, best = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]) - new Date(days[i-1])) / 86400000;
      if (diff === 1) { cur++; best = Math.max(best, cur); } else cur = 1;
    }
    if (best > maxStreak.streak) maxStreak = { nombre, streak: best };
  });

  // Premios
  const topMin  = people.length ? [...people].sort((a,b) => b.minutos - a.minutos)[0] : null;
  const topAvg  = people.length ? [...people].sort((a,b) => (b.pts / (b.actividades||1)) - (a.pts / (a.actividades||1)))[0] : null;

  let topSpec = { nombre: '', sport: '', pct: 0 };
  people.forEach(p => {
    const pData = acts.filter(a => a.nombre === p.nombre);
    const sp = {};
    pData.forEach(a => { sp[a.deporte_nombre] = (sp[a.deporte_nombre] || 0) + (parseFloat(a.puntos) || 0); });
    const total = Object.values(sp).reduce((s,v) => s + v, 0);
    if (total > 0) {
      Object.entries(sp).forEach(([s, pts]) => {
        if (pts / total > topSpec.pct) topSpec = { nombre: p.nombre, sport: s, pct: pts / total };
      });
    }
  });

  const topMultiData = people.map(p => ({ nombre: p.nombre, nd: p.deportes instanceof Set ? p.deportes.size : 0 }))
    .sort((a,b) => b.nd - a.nd)[0];

  const wkPts = {};
  acts.forEach(a => {
    const dow = new Date(a.fecha + 'T12:00:00').getDay();
    if (dow === 0 || dow === 6) wkPts[a.nombre] = (wkPts[a.nombre] || 0) + (parseFloat(a.puntos) || 0);
  });
  const topWknd = Object.entries(wkPts).sort((a,b) => b[1] - a[1])[0];

  const recs = [
    { label: 'Mejor día',          value: bestDay  ? Math.round(bestDay.pts) + ' pts'  : '—', sub: bestDay?.nombre  || '' },
    { label: 'Mejor semana',       value: bestWeek ? Math.round(bestWeek.min) + ' min' : '—', sub: bestWeek?.nombre || '' },
    { label: 'Más actividades',    value: mostAct  ? mostAct[1] + ' ses.'               : '—', sub: mostAct?.[0]    || '' },
    { label: 'Racha más larga',    value: maxStreak.streak ? maxStreak.streak + ' días' : '—', sub: maxStreak.nombre       },
  ];

  const awards = [
    { title: 'Máquina',      winner: topMin?.nombre,        detail: topMin     ? Math.round(topMin.minutos) + ' min'                          : '' },
    { title: 'Especialista', winner: topSpec.nombre || '—', detail: topSpec.sport ? topSpec.sport + ' · ' + Math.round(topSpec.pct * 100) + '%' : '' },
    { title: 'Versátil',     winner: topMultiData?.nombre,  detail: topMultiData ? topMultiData.nd + ' deportes'                               : '' },
    { title: 'Eficiente',    winner: topAvg?.nombre,        detail: topAvg     ? Math.round(topAvg.pts / (topAvg.actividades || 1)) + ' pts/ses.' : '' },
    { title: 'Fin de semana',winner: topWknd?.[0] || '—',  detail: topWknd    ? Math.round(topWknd[1]) + ' pts'                               : '' },
    { title: 'Líder',        winner: people[0]?.nombre,     detail: people[0]  ? Math.round(people[0].pts) + ' pts'                           : '' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {recs.map(r => (
          <div key={r.label} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'12px' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, color:'var(--t-accent)', lineHeight:1 }}>{r.value}</div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--t-text)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.sub || '—'}</div>
            <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.05em' }}>{r.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {awards.map(a => (
          <div key={a.title} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'12px' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--t-muted2)', marginBottom:4 }}>{a.title}</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--t-accent)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.winner || '—'}</div>
            <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2, fontFamily:"'JetBrains Mono', monospace" }}>{a.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARADOR ───────────────────────────────────────────────────────────────

function Comparador({ acts, nombres }) {
  const people = [...new Set(acts.map(a => a.nombre))].sort();
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!selA || !selB || selA===selB || !canvasRef.current) return;
    const dA = acts.filter(a => a.nombre===selA);
    const dB = acts.filter(a => a.nombre===selB);
    const cA = getPersonColor(selA, nombres);
    const cB = getPersonColor(selB, nombres);
    drawCmp(canvasRef.current, dA, dB, cA, cB);
  }, [selA, selB, acts, nombres]);

  if (!people.length) return <EmptyState icon="⚔️" title="Sin datos" />;

  const dA = acts.filter(a => a.nombre===selA);
  const dB = acts.filter(a => a.nombre===selB);
  const sA = { pts:dA.reduce((s,a)=>s+a.puntos,0), min:dA.reduce((s,a)=>s+parseFloat(a.minutos),0), act:dA.length, deportes:new Set(dA.map(a=>a.deporte_nombre)) };
  const sB = { pts:dB.reduce((s,a)=>s+a.puntos,0), min:dB.reduce((s,a)=>s+parseFloat(a.minutos),0), act:dB.length, deportes:new Set(dB.map(a=>a.deporte_nombre)) };
  const cA = getPersonColor(selA, nombres);
  const cB = getPersonColor(selB, nombres);

  const comps = [
    { label:'Puntos',      vA:Math.round(sA.pts), vB:Math.round(sB.pts), fmt:v=>v.toLocaleString('es') },
    { label:'Minutos',     vA:Math.round(sA.min), vB:Math.round(sB.min), fmt:v=>v.toLocaleString('es') },
    { label:'Actividades', vA:sA.act,             vB:sB.act,             fmt:v=>v },
    { label:'Deportes',    vA:sA.deportes.size,   vB:sB.deportes.size,   fmt:v=>v },
    { label:'Prom/ses.',   vA:sA.act?Math.round(sA.pts/sA.act):0, vB:sB.act?Math.round(sB.pts/sB.act):0, fmt:v=>v+' pts' },
  ];

  const selectStyle = { width:'100%', background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:8, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', appearance:'none', cursor:'pointer', fontSize:16 };

  return (
    <div>
      {/* Selects */}
      <div style={{ display:'flex', gap:10, marginBottom:selA&&selB&&selA!==selB?16:0, alignItems:'center' }}>
        <div style={{ flex:1 }}>
          <select style={selectStyle} value={selA} onChange={e=>setSelA(e.target.value)}>
            <option value="">— A —</option>
            {people.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, color:'var(--t-muted)', flexShrink:0 }}>VS</div>
        <div style={{ flex:1 }}>
          <select style={selectStyle} value={selB} onChange={e=>setSelB(e.target.value)}>
            <option value="">— B —</option>
            {people.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {selA && selB && selA!==selB ? (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:4, marginBottom:12, alignItems:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(16px,4vw,24px)', textTransform:'uppercase', color:cA }}>{selA.split(' ')[0]}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'var(--t-muted)', textAlign:'center' }}>VS</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(16px,4vw,24px)', textTransform:'uppercase', color:cB, textAlign:'right' }}>{selB.split(' ')[0]}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:3, marginBottom:14 }}>
            {comps.map(c => (
              <>
                <div key={c.label+'A'} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderTop:`3px solid ${cA}`, borderRadius:8, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:15, marginTop:2, color: c.vA>c.vB?'var(--t-accent)':'var(--t-text)' }}>{c.fmt(c.vA)}</div>
                  <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>{c.label}</div>
                </div>
                <div key={c.label+'div'} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'var(--t-dim)' }}>·</div>
                <div key={c.label+'B'} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderTop:`3px solid ${cB}`, borderRadius:8, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:15, marginTop:2, color: c.vB>c.vA?'var(--t-accent)':'var(--t-text)' }}>{c.fmt(c.vB)}</div>
                  <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>{c.label}</div>
                </div>
              </>
            ))}
          </div>
          <canvas ref={canvasRef} style={{ display:'block', width:'100%' }} height={170} />
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--t-muted)' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⚔️</div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>Elige dos competidores</div>
        </div>
      )}
    </div>
  );
}

function drawCmp(canvas, dA, dB, cA, cB) {
  const ctx = canvas.getContext('2d');
  const W   = canvas.parentElement.offsetWidth || 280;
  const H   = 170;
  const dpr = window.devicePixelRatio || 1;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.scale(dpr, dpr);

  const allDates = [...new Set([...dA,...dB].map(a=>a.fecha.slice(0,10)))].sort();
  let cA2=0, cB2=0; const sA=[], sB=[];
  allDates.forEach(d => {
    dA.filter(a=>a.fecha.slice(0,10)===d).forEach(a=>{cA2+=a.puntos;}); sA.push(cA2);
    dB.filter(a=>a.fecha.slice(0,10)===d).forEach(a=>{cB2+=a.puntos;}); sB.push(cB2);
  });

  const maxVal=Math.max(...sA,...sB)||1;
  const n=allDates.length;
  const pad={top:12,right:12,bottom:24,left:42};
  const w=W-pad.left-pad.right, h=H-pad.top-pad.bottom;

  ctx.strokeStyle='rgba(36,61,87,0.6)'; ctx.lineWidth=1;
  [0,0.5,1].forEach(t=>{
    const y=pad.top+h*(1-t);
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+w,y); ctx.stroke();
    ctx.fillStyle='rgba(122,155,191,0.6)'; ctx.font='10px JetBrains Mono,monospace'; ctx.textAlign='right';
    ctx.fillText(Math.round(maxVal*t).toLocaleString('es'), pad.left-4, y+4);
  });

  [[sA,cA],[sB,cB]].forEach(([series,color])=>{
    ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.lineJoin='round';
    ctx.beginPath();
    series.forEach((val,i)=>{
      const x=pad.left+(i/Math.max(n-1,1))*w;
      const y=pad.top+h*(1-val/maxVal);
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.stroke();
  });
}

// ─── INSIGHTS ─────────────────────────────────────────────────────────────────

function Insights({ acts }) {
  if (!acts.length) return <EmptyState icon="💡" title="Sin datos" />;
  const people = aggregateByPerson(acts);
  const sports = aggregateBySport(acts);
  const ins    = [];

  if (people.length>=2) {
    const gap=Math.round(people[0].pts-people[1].pts);
    ins.push(<>🥇 <strong style={{color:'var(--t-accent)'}}>{people[0].nombre.split(' ')[0]}</strong> lidera con {Math.round(people[0].pts).toLocaleString('es')} puntos — {gap} por encima del segundo.</>);
  }
  if (sports.length) {
    const total=acts.reduce((s,a)=>s+a.puntos,0);
    const pct=Math.round((sports[0].pts/total)*100);
    ins.push(<>🏅 El <strong style={{color:'var(--t-accent)'}}>{sports[0].deporte}</strong> aporta el {pct}% de los puntos del período.</>);
  }
  const totalH=Math.round(acts.reduce((s,a)=>s+parseFloat(a.minutos),0)/60);
  ins.push(<>⏱ El grupo registró <strong style={{color:'var(--t-accent)'}}>{totalH} horas</strong> de entrenamiento en el período.</>);

  const topAct=[...people].sort((a,b)=>b.actividades-a.actividades)[0];
  if (topAct) ins.push(<>📌 <strong style={{color:'var(--t-accent)'}}>{topAct.nombre.split(' ')[0]}</strong> es el más constante con {topAct.actividades} actividades registradas.</>);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {ins.map((text, i) => (
        <div key={i} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderLeft:'3px solid var(--t-accent)', borderRadius:8, padding:'12px 14px', fontSize:14, lineHeight:1.5, color:'var(--t-text)' }}>
          {text}
        </div>
      ))}
    </div>
  );
}

// ─── PROFILE PANEL ────────────────────────────────────────────────────────────

function ProfilePanel({ nombre, userId, competenciaId, acts, rankingData = [], nombres, onClose }) {
  if (!nombre) return null;
  const [fotoLightbox, setFotoLightbox] = useState(false);
  // allData: actividades acumuladas del jugador (sin filtro de mes) para la evolución
  const [allData, setAllData] = useState(null); // null = cargando

  useEffect(() => {
    if (!competenciaId) { setAllData([]); return; }
    getActividadesComp(competenciaId).then(rows => {
      const filtered = (Array.isArray(rows) ? rows : []).filter(a =>
        userId != null ? a.user_id == userId : (a.nombre_display || a.nombre) === nombre
      );
      setAllData(filtered);
    }).catch(() => setAllData([]));
  }, [competenciaId, userId, nombre]);

  // Filtrar acts del período visible para los stats de la vista actual
  const data = acts.filter(a =>
    userId != null ? a.user_id == userId : (a.nombre_display || a.nombre) === nombre
  );
  // Para evolución usamos allData (acumulado) si ya cargó, sino data del período
  const evoData = allData ?? data;

  const pts  = data.reduce((s, a) => s + (parseFloat(a.puntos) || 0), 0);
  const min  = data.reduce((s, a) => s + parseFloat(a.minutos), 0);

  const rankEntry = rankingData.find(r => userId != null ? r.id == userId : (r.nombre_display || r.nombre) === nombre);
  const fotoUrl = rankEntry?.foto_perfil_url
    ?? data.find(a => a.foto_perfil_url)?.foto_perfil_url
    ?? null;

  const sportMap = {};
  data.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre] = { min:0, pts:0, sesiones:0 };
    sportMap[a.deporte_nombre].min      += parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts      += a.puntos;
    sportMap[a.deporte_nombre].sesiones++;
  });
  const sportRows = Object.entries(sportMap).sort((a, b) => b[1].pts - a[1].pts);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(5,12,20,0.75)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'min(400px,100vw)', height:'100dvh', background:'var(--t-surface)', borderLeft:'1px solid var(--t-dim)', overflowY:'auto', WebkitOverflowScrolling:'touch', display:'flex', flexDirection:'column' }}>

        {/* Lightbox foto */}
        {fotoLightbox && fotoUrl && createPortal(
          <div onClick={() => setFotoLightbox(false)} style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={fotoUrl} alt={nombre} style={{ width:240, height:240, borderRadius:'50%', objectFit:'cover', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }} />
          </div>,
          document.body
        )}

        {/* Header */}
        <div style={{ padding:'16px 16px 14px', borderBottom:'1px solid var(--t-dim)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <div
            onClick={() => fotoUrl && setFotoLightbox(true)}
            style={{ width:52, height:52, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:'var(--t-surface2)', border:'1px solid var(--t-dim)', display:'flex', alignItems:'center', justifyContent:'center', cursor: fotoUrl ? 'pointer' : 'default' }}>
            {fotoUrl
              ? <img src={fotoUrl} alt={nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, color:'var(--t-muted)' }}>{nombre.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', letterSpacing:'0.02em', lineHeight:1, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nombre}</div>
            <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>{data.length} actividades registradas</div>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>✕</button>
        </div>

        <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, border:'1px solid var(--t-dim)', borderRadius:10, overflow:'hidden' }}>
            {[
              { label:'Puntos',     val: Math.round(pts).toLocaleString('es') },
              { label:'Horas',      val: Math.round(min / 60) + 'h' },
              { label:'Sesiones',   val: data.length },
            ].map((s, i) => (
              <div key={s.label} style={{ padding:'10px 8px', textAlign:'center', borderRight: i < 2 ? '1px solid var(--t-dim)' : 'none', background:'var(--t-surface)' }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:'var(--t-text)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{s.val}</div>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Evolución semanal */}
          {allData === null && (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t-muted)', fontSize:12 }}>Cargando evolución…</div>
          )}
          {allData !== null && (() => {
            if (evoData.length === 0) return null;
            const N = 8;

            // Comparar fechas como YYYYMMDD para evitar problemas de zona horaria
            const anchorNum = evoData.reduce((mx, a) => Math.max(mx, fechaNum(a.fecha)), 0);

            const weeksData = Array.from({ length: N }, (_, i) => {
              const endNum   = anchorNum - i * 7;
              const startNum = endNum - 6;
              const slice = evoData.filter(a => { const fn = fechaNum(a.fecha); return fn >= startNum && fn <= endNum; });
              return {
                pts: slice.reduce((s, a) => s + (parseFloat(a.puntos) || 0), 0),
                min: slice.reduce((s, a) => s + (parseFloat(a.minutos) || 0), 0),
                endNum,
              };
            }).reverse();

            // Si todos los puntos son 0, mostrar minutos en su lugar
            const usarMin = weeksData.every(w => w.pts === 0);
            const wVals   = weeksData.map(w => usarMin ? w.min : w.pts);
            const wLabels = weeksData.map(w => {
              const s = String(w.endNum);
              return `${s.slice(6)}/${s.slice(4,6)}`;
            });
            const maxW = Math.max(...wVals, 1);

            return (
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
                  Evolución · {usarMin ? 'minutos' : 'puntos'} — últimas {N} semanas
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:64 }}>
                  {wVals.map((v, i) => {
                    const h = Math.max(2, Math.round((v / maxW) * 56));
                    return (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                        <div style={{ width:'100%', height:h, background: v > 0 ? 'var(--t-accent)' : 'var(--t-dim)', borderRadius:'3px 3px 0 0', opacity: v > 0 ? 0.85 : 0.3 }} />
                        <span style={{ fontSize:7, color:'var(--t-muted)', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{wLabels[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', gap:3, marginTop:1 }}>
                  {wVals.map((v, i) => (
                    <div key={i} style={{ flex:1, textAlign:'center' }}>
                      {v > 0 && <span style={{ fontSize:7, fontWeight:700, color:'var(--t-accent)', fontVariantNumeric:'tabular-nums' }}>{Math.round(v)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Deportes */}
          {sportRows.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:8 }}>Por deporte</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {sportRows.map(([sport, v]) => {
                  const pct = pts > 0 ? Math.round(v.pts / pts * 100) : 0;
                  return (
                    <div key={sport} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:8 }}>
                      <span style={{ fontSize:18, flexShrink:0 }}>{sportIcon(sport)}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sport}</div>
                        <div style={{ height:2, background:'var(--t-dim)', borderRadius:2, marginTop:5 }}>
                          <div style={{ height:2, width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.6, transition:'width 0.4s' }} />
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, fontFamily:"'JetBrains Mono', monospace", fontSize:11, lineHeight:1.5 }}>
                        <div style={{ color:'var(--t-accent)', fontWeight:700 }}>{Math.round(v.pts)} pts</div>
                        <div style={{ color:'var(--t-muted)' }}>{v.sesiones} ses</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--t-muted)' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:19, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, color:'var(--t-text)' }}>{title}</div>
      {text && <div style={{ fontSize:13 }}>{text}</div>}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

// ─── SHEET ADMIN: editar ponderadores ────────────────────────────────────────

function AdminPonderadoresSheet({ competencia, onClose, onSaved, readOnly = false }) {
  const [deportes, setDeportes]   = useState([]);
  const [ponders, setPonders]     = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  // Estado para nuevo deporte
  const [nuevoNombre, setNuevoNombre]   = useState('');
  const [nuevoIcono, setNuevoIcono]     = useState('🏅');
  const [nuevoPond, setNuevoPond]       = useState('1.0');
  const [addingDeporte, setAddingDeporte] = useState(false);
  const [addError, setAddError]         = useState('');
  const startY = useRef(null);
  const { withLoading } = useLoading();

  function loadDeportes() {
    return getAllDeportes().then(deps => {
      setDeportes(deps);
      setPonders(prev => {
        const map = {};
        deps.forEach(d => { map[d.nombre] = prev[d.nombre] ?? d.ponderador_default; });
        (competencia.deportes || []).forEach(cd => { map[cd.deporte_nombre] = prev[cd.deporte_nombre] ?? cd.ponderador; });
        return map;
      });
    });
  }

  useEffect(() => { withLoading(loadDeportes); }, []);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleAddDeporte() {
    const nombre = nuevoNombre.trim();
    if (!nombre) { setAddError('El nombre es obligatorio'); return; }
    if (deportes.some(d => d.nombre.toLowerCase() === nombre.toLowerCase())) {
      setAddError('Ya existe ese deporte'); return;
    }
    setAddingDeporte(true); setAddError('');
    try {
      await createDeporte({ nombre, icono: nuevoIcono || '🏅', ponderador_default: parseFloat(nuevoPond) || 1 });
      // Agregar al ponderador map local con el valor ingresado
      setPonders(p => ({ ...p, [nombre]: parseFloat(nuevoPond) || 1 }));
      // Recargar lista de deportes
      await loadDeportes();
      setNuevoNombre('');
      setNuevoIcono('🏅');
      setNuevoPond('1.0');
    } catch (err) {
      setAddError(err.message || 'Error al crear deporte');
    } finally {
      setAddingDeporte(false);
    }
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const ponderadores = Object.entries(ponders).map(([deporte_nombre, ponderador]) => ({
        deporte_nombre, ponderador: parseFloat(ponderador),
      }));
      await withLoading(() => updatePonderadores(competencia.id, ponderadores));
      onSaved(ponderadores);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputBase = { background:'var(--t-ground)', border:'1.5px solid var(--t-dim)', color:'var(--t-text)', padding:'7px 10px', borderRadius:8, fontSize:14, outline:'none', fontFamily:'inherit', boxSizing:'border-box', minWidth:0 };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'90dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
              Ponderadores
            </div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>
              {competencia.nombre}{readOnly && <span style={{ marginLeft:6, color:'var(--t-dim2)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>· Solo lectura</span>}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin:'8px 18px 0', borderRadius:10, padding:'9px 13px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>
            {error}
          </div>
        )}

        {/* Lista scrollable */}
        <div style={{ overflowY:'auto', flex:1, padding:'10px 18px', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:11, color:'var(--t-muted)', marginBottom:4 }}>
            Puntos = minutos × ponderador. Los cambios afectan el cálculo desde ahora.
          </div>

          {deportes.map(d => (
            <div key={d.nombre} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:10, padding:'8px 12px' }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{d.icono}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:500, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nombre}</span>
              {readOnly
                ? <span style={{ width:58, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:15, color:'var(--t-accent)' }}>
                    {ponders[d.nombre] ?? d.ponderador_default}
                  </span>
                : <input
                    type="number" inputMode="decimal" min="0.1" step="0.1"
                    value={ponders[d.nombre] ?? d.ponderador_default}
                    onChange={e => setPonders(p => ({ ...p, [d.nombre]: e.target.value }))}
                    style={{ width:58, background:'var(--t-ground)', border:'1.5px solid var(--t-dim)', color:'var(--t-accent)', padding:'5px 7px', borderRadius:8, fontSize:15, outline:'none', textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--t-accent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--t-dim)'; }}
                  />
              }
            </div>
          ))}

          {/* Agregar nuevo deporte — solo admin */}
          {!readOnly && (
            <div style={{ marginTop:10, border:'1px dashed var(--t-dim)', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, boxSizing:'border-box', width:'100%', overflow:'hidden' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>
                Nuevo deporte
              </div>
              <div style={{ display:'flex', gap:8, width:'100%', overflow:'hidden' }}>
                {/* Emoji */}
                <input
                  type="text"
                  value={nuevoIcono}
                  onChange={e => setNuevoIcono(e.target.value)}
                  maxLength={4}
                  style={{ ...inputBase, width:48, flexShrink:0, textAlign:'center', fontSize:20, padding:'5px 6px' }}
                />
                {/* Nombre */}
                <input
                  type="text"
                  placeholder="Nombre"
                  value={nuevoNombre}
                  onChange={e => { setNuevoNombre(e.target.value); setAddError(''); }}
                  style={{ ...inputBase, flex:1, minWidth:0 }}
                />
                {/* Ponderador */}
                <input
                  type="number" inputMode="decimal" min="0.1" step="0.1"
                  value={nuevoPond}
                  onChange={e => setNuevoPond(e.target.value)}
                  style={{ ...inputBase, width:54, flexShrink:0, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:'var(--t-accent)' }}
                />
              </div>
              {addError && (
                <div style={{ fontSize:12, color:'#F87171' }}>{addError}</div>
              )}
              <button onClick={handleAddDeporte} disabled={addingDeporte || !nuevoNombre.trim()}
                style={{ alignSelf:'flex-start', padding:'7px 16px', borderRadius:8, border:'1.5px solid var(--t-accent)', background:'transparent', color:'var(--t-accent)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', cursor: nuevoNombre.trim() ? 'pointer' : 'default', opacity: nuevoNombre.trim() ? 1 : 0.5 }}>
                {addingDeporte ? 'Agregando…' : '+ Agregar'}
              </button>
            </div>
          )}
        </div>

        {/* Guardar — solo admin */}
        {!readOnly && (
          <div style={{ padding:'12px 18px 0', flexShrink:0, borderTop:'1px solid var(--t-dim)' }}>
            <button onClick={handleSave} disabled={saving}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function CompetenciaDetalle({ competencia, onBack, onNewActivity, tab, onTab, adminSheetOpen, onAdminSheetClose, onAdminSaved, navYear, navMonth, onNavYear, onNavMonth }) {
  const { user } = useAuth();
  const { withLoading } = useLoading();
  const now = new Date();

  // Navegación sincronizada con Calendario a través de props externas
  const year  = navYear  ?? now.getFullYear();
  const month = navMonth ?? now.getMonth();
  function setYear(v)  { onNavYear?.(typeof v === 'function' ? v(year)  : v); }
  function setMonth(v) { onNavMonth?.(typeof v === 'function' ? v(month) : v); }

  const isAcumulado = month === -1;
  // mes como string 'YYYY-MM' o '' para acumulado (lo que espera el backend)
  const mes = isAcumulado ? '' : `${year}-${String(month + 1).padStart(2, '0')}`;

  const [acts, setActs]             = useState([]);
  const [rankingData, setRankingData] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [profile, setProfile]       = useState(null);
  const [compConDeportes, setCompConDeportes] = useState(competencia);
  const [rankingRefreshKey, setRankingRefreshKey] = useState(0);

  const isAdmin = user?.id === competencia.creador_id;

  // Cargar actividades + ranking (que incluye participantes con 0 pts) cuando cambia mes o ponderadores
  useEffect(() => {
    setLoading(true);
    withLoading(() =>
      Promise.all([
        getActividadesComp(competencia.id, mes || undefined),
        getRankingComp(competencia.id, mes || undefined),
      ]).then(([actsData, rankData]) => {
        setActs((Array.isArray(actsData) ? actsData : []).filter(Boolean));
        setRankingData((Array.isArray(rankData) ? rankData : []).filter(Boolean));
      })
    ).finally(() => setLoading(false));
  }, [competencia.id, mes, rankingRefreshKey]);

  // Navegación: prev/next idéntico al Calendario pero con Acumulado al final
  function prev() {
    if (isAcumulado) {
      // Acumulado → mes actual
      setYear(now.getFullYear()); setMonth(now.getMonth()); return;
    }
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    // Un paso más allá del mes actual → Acumulado
    if (!isAcumulado && year === now.getFullYear() && month === now.getMonth()) {
      setMonth(-1); return;
    }
    if (isAcumulado) return; // tope derecho
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  const canNext = !isAcumulado;

  const nombres = [...new Set(acts.map(a => a.nombre))].sort();

  // Para tabs que usan viewYear/viewMonth (calendario interno)
  const viewYear  = isAcumulado ? now.getFullYear() : year;
  const viewMonth = isAcumulado ? now.getMonth() : month;

  const mesLabel = isAcumulado ? 'Acumulado' : MONTHS_ES[month];
  const mesSubLabel = isAcumulado ? 'todos los tiempos' : String(year);

  function renderTab() {
    if (loading) return <Spinner />;
    switch (tab) {
      case 'podio':    return <Podio    acts={acts} nombres={nombres} />;
      case 'ranking':  return <Ranking  acts={acts} rankingData={rankingData} nombres={nombres} myId={user?.nombre_display || user?.nombre} onOpenProfile={(n, id) => setProfile({ nombre: n, id })} />;
      case 'calendar': return <Calendario acts={acts.filter(a => (a.nombre_display || a.nombre) === (user?.nombre_display || user?.nombre))} mes={mes} meses={[]} onMes={() => {}} />;
      case 'evolucion':return <Evolucion acts={acts} nombres={nombres} />;
      case 'carrera':  return <Carrera  acts={acts} nombres={nombres} />;
      case 'deportes': return <Deportes acts={acts} />;
      case 'records':  return <Records  acts={acts} />;
      case 'comparar': return <Comparador acts={acts} nombres={nombres} />;
      case 'insights': return <Insights acts={acts} />;
      default:         return null;
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── SUBHEADER ───────────────────────────────────────────── */}
      <div style={{ position:'relative', zIndex:10, background:'var(--t-ground)' }}>

        {/* Fila 1: nombre competencia + tab activo */}
        <div style={{ padding:'8px 20px 4px', borderBottom:'1px solid var(--t-surface2)' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {competencia.nombre}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)', marginTop:2 }}>
            {tab === 'ranking' ? 'Ranking' : tab === 'podio' ? 'Podio' : tab === 'calendar' ? 'Calendario' : tab === 'evolucion' ? 'Evolución' : tab === 'carrera' ? 'Carrera' : tab === 'deportes' ? 'Deportes' : tab === 'records' ? 'Récords' : tab === 'comparar' ? 'Comparar' : tab === 'insights' ? 'Insights' : 'Competencia'}
          </div>
        </div>

        {/* Fila 2: navegación mes (idéntica al Calendario) */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 8px 4px', borderBottom:'1px solid var(--t-surface2)' }}>
          <button onClick={prev}
            style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
              {mesLabel}
            </div>
            <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>{mesSubLabel}</div>
          </div>
          <button onClick={next} disabled={!canNext}
            style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color: canNext ? 'var(--t-muted)' : 'var(--t-dim)', cursor: canNext ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding:'12px 16px 32px' }}>
        {renderTab()}
      </div>

      {/* Profile panel y admin sheet via portal para escapar del stacking context del transform */}
      {profile && createPortal(
        <ProfilePanel
          nombre={profile.nombre ?? profile}
          userId={profile.id ?? null}
          competenciaId={competencia.id}
          acts={acts}
          rankingData={rankingData}
          nombres={nombres}
          onClose={() => setProfile(null)}
        />,
        document.body
      )}

      {adminSheetOpen && createPortal(
        <AdminPonderadoresSheet
          competencia={compConDeportes}
          readOnly={user?.id !== competencia.creador_id}
          onClose={onAdminSheetClose}
          onSaved={ponderadores => {
            setCompConDeportes(prev => ({
              ...prev,
              deportes: ponderadores.map(p => ({ deporte_nombre: p.deporte_nombre, ponderador: p.ponderador })),
            }));
            setRankingRefreshKey(k => k + 1);
            onAdminSaved?.(ponderadores.map(p => ({ deporte_nombre: p.deporte_nombre, ponderador: p.ponderador })));
          }}
        />,
        document.body
      )}
    </>
  );
}
