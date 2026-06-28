import { useEffect, useRef, useState, useCallback } from 'react';
import { getRankingComp, getMesesComp, getActividadesComp } from '../api/competencias';
import { useAuth } from '../context/AuthContext';

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

const TABS = [
  { id: 'podio',    icon: '🏆', label: 'Podio' },
  { id: 'ranking',  icon: '📊', label: 'Ranking' },
  { id: 'calendar', icon: '📅', label: 'Calendario' },
  { id: 'evolucion',icon: '📈', label: 'Evolución' },
  { id: 'carrera',  icon: '🏁', label: 'Carrera' },
  { id: 'deportes', icon: '🏅', label: 'Deportes' },
  { id: 'records',  icon: '🔥', label: 'Récords' },
  { id: 'comparar', icon: '⚔️', label: 'Comparar' },
  { id: 'insights', icon: '💡', label: 'Insights' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getPersonColor(nombre, nombres) {
  const sorted = [...nombres].sort();
  return PERSON_COLORS[sorted.indexOf(nombre) % PERSON_COLORS.length];
}

function aggregateByPerson(acts) {
  const map = {};
  acts.forEach(a => {
    if (!map[a.nombre]) map[a.nombre] = { nombre: a.nombre, pts: 0, minutos: 0, actividades: 0, deportes: new Set(), ultimaFecha: null };
    map[a.nombre].pts       += a.puntos;
    map[a.nombre].minutos   += parseFloat(a.minutos);
    map[a.nombre].actividades++;
    map[a.nombre].deportes.add(a.deporte_nombre);
    const f = new Date(a.fecha);
    if (!map[a.nombre].ultimaFecha || f > map[a.nombre].ultimaFecha) map[a.nombre].ultimaFecha = f;
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
    <div style={{ display:'flex', alignItems:'center', gap:10, color:'#7A9BBF', fontFamily:"'JetBrains Mono', monospace", fontSize:13, padding:48, justifyContent:'center' }}>
      <div style={{ width:16, height:16, border:'2px solid #243D57', borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      Cargando…
    </div>
  );
}

// ─── KPI STRIP ────────────────────────────────────────────────────────────────

function KpiStrip({ acts }) {
  const personas  = new Set(acts.map(a => a.nombre)).size;
  const totalPts  = acts.reduce((s, a) => s + a.puntos, 0);
  const totalMin  = acts.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const sports    = aggregateBySport(acts);
  const people    = aggregateByPerson(acts);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
      {[
        { label:'Participantes', val:personas,               accent:false },
        { label:'Puntos totales',val:Math.round(totalPts).toLocaleString('es'), accent:true },
        { label:'Actividades',   val:acts.length,            accent:false },
        { label:'Horas',         val:Math.round(totalMin/60)+'h', accent:false },
        { label:'Deporte top',   val:sports[0]?.deporte?.split(' ')[0]||'—', accent:false },
        { label:'Líder',         val:people[0]?.nombre?.split(' ')[0]||'—', accent:false },
      ].map(({ label, val, accent }) => (
        <div key={label} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'12px 10px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'#38BDF8', opacity:0.4 }} />
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(18px,4vw,26px)', color: accent ? '#38BDF8' : '#E8F0FE', lineHeight:1 }}>
            {val}
          </div>
          <div style={{ fontSize:10, color:'#7A9BBF', marginTop:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
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
              <div style={{ width:size, height:size, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:size===58?24:18, color:'#0D1B2A' }}>
                {p.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', textAlign:'center', color:'#E8F0FE' }}>
                {p.nombre.split(' ')[0]}
              </div>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:600, color:'#38BDF8', textAlign:'center' }}>
                {Math.round(p.pts).toLocaleString('es')} pts
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', textAlign:'center', fontFamily:"'JetBrains Mono', monospace" }}>{gap}</div>
              <div style={{ background: origIdx===0 ? 'rgba(245,158,11,0.07)' : '#132236', border:'1px solid', borderColor: origIdx===0 ? 'rgba(245,158,11,0.25)' : '#243D57', borderBottom:'none', borderRadius:'6px 6px 0 0', width:'100%', height:height, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:34, color:'#7A9BBF', opacity:0.3 }}>{origIdx+1}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RANKING ──────────────────────────────────────────────────────────────────

function Ranking({ acts, nombres, myId, onOpenProfile }) {
  const people = aggregateByPerson(acts);
  const maxPts = people[0]?.pts || 1;
  const MEDALS = ['🥇','🥈','🥉'];

  if (!people.length) return <EmptyState icon="🏁" title="Sin registros" text="Cargá actividades para ver el ranking." />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* KPIs */}
      <KpiStrip acts={acts} />
      {people.map((p, i) => {
        const color = getPersonColor(p.nombre, nombres);
        const pct   = Math.round((p.pts / maxPts) * 100);
        const isTop = i === 0;
        const isMe  = p.nombre === myId;
        return (
          <div key={p.nombre}
            onClick={() => onOpenProfile(p.nombre, acts)}
            style={{ background: isTop ? 'rgba(56,189,248,0.05)' : '#132236', border:'1px solid', borderColor: isTop ? 'rgba(56,189,248,0.35)' : '#243D57', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', transition:'transform 0.1s', WebkitTapHighlightColor:'transparent' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, color:'#7A9BBF', opacity:0.4, width:28, textAlign:'center', flexShrink:0 }}>{i+1}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                {i < 3 && <span style={{ fontSize:16 }}>{MEDALS[i]}</span>}
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:17, textTransform:'uppercase', color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {p.nombre}{isMe ? ' (yo)' : ''}
                </div>
              </div>
              <div style={{ fontSize:11, color:'#7A9BBF', fontFamily:"'JetBrains Mono', monospace", marginBottom:6 }}>
                {p.actividades} act · {Math.round(p.minutos).toLocaleString('es')} min
              </div>
              <div style={{ height:3, background:'#243D57', borderRadius:2 }}>
                <div style={{ height:'100%', borderRadius:2, background:color, width:pct+'%', transition:'width 0.5s' }} />
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0, paddingLeft:8 }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:20, color:'#38BDF8', lineHeight:1 }}>
                {Math.round(p.pts).toLocaleString('es')}
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', marginTop:2 }}>pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CALENDARIO ───────────────────────────────────────────────────────────────

function Calendario({ acts }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const DOWS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  // El mes lo determina el mes más frecuente/reciente de las acts recibidas
  const activeMes = (() => {
    if (!acts.length) return null;
    const counts = {};
    acts.forEach(a => { const m = a.fecha.slice(0,7); counts[m]=(counts[m]||0)+1; });
    return Object.keys(counts).sort().pop();
  })();

  const viewYear  = activeMes ? parseInt(activeMes.split('-')[0]) : new Date().getFullYear();
  const viewMonth = activeMes ? parseInt(activeMes.split('-')[1]) - 1 : new Date().getMonth();

  // Agrupar actividades del mes visible por día
  const dayActivities = {};
  acts.forEach(a => {
    const d = new Date(a.fecha + 'T12:00:00');
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      const day = d.getDate();
      if (!dayActivities[day]) dayActivities[day] = [];
      dayActivities[day].push(a);
    }
  });

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today       = new Date();
  const todayDate   = today.getFullYear()===viewYear && today.getMonth()===viewMonth ? today.getDate() : -1;

  const emptyCells  = Array.from({ length: firstDow });
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const selectedActs= selectedDay ? (dayActivities[selectedDay] || []) : [];
  const sortedDays  = Object.keys(dayActivities).map(Number).sort((a, b) => a - b);

  // Deportes únicos del mes para leyenda
  const sportsInMonth = [...new Set(
    Object.values(dayActivities).flat().map(a => a.deporte_nombre)
  )].sort();

  function toggleDay(day) {
    setSelectedDay(prev => prev === day ? null : day);
  }

  if (!acts.length) return <EmptyState icon="📅" title="Sin actividades" />;

  return (
    <div>
      {/* Lightbox */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <button onClick={() => setLightboxUrl(null)}
            style={{ position:'absolute', top:16, right:16, color:'#7A9BBF', fontSize:22, background:'transparent', border:'none', cursor:'pointer', padding:'8px 12px' }}>✕</button>
          <img src={lightboxUrl} alt="foto" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain' }} />
        </div>
      )}

      {/* ── GRILLA ── */}
      <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
        <div style={{ minWidth:280 }}>
          {/* Días de semana */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:4 }}>
            {DOWS.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#7A9BBF', padding:'4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Celdas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
            {emptyCells.map((_, i) => <div key={'e'+i} style={{ aspectRatio:'1' }} />)}
            {days.map(day => {
              const dayActs = dayActivities[day] || [];
              const hasActs = dayActs.length > 0;
              const isToday = day === todayDate;
              const isSel   = day === selectedDay;
              const icons   = [...new Set(dayActs.map(a => sportIcon(a.deporte_nombre)))].slice(0, 4);
              return (
                <div key={day}
                  onClick={() => hasActs && toggleDay(day)}
                  style={{
                    aspectRatio:'1', borderRadius:6,
                    background: isSel ? '#132236' : hasActs ? '#1A2E45' : '#1A2E45',
                    border: `1px solid ${isSel ? '#38BDF8' : isToday ? '#38BDF8' : hasActs ? '#243D57' : '#243D57'}`,
                    boxShadow: isToday && !isSel ? '0 0 0 1px rgba(56,189,248,0.3)' : 'none',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    position:'relative', overflow:'hidden',
                    cursor: hasActs ? 'pointer' : 'default',
                    transition:'border-color 0.15s',
                    opacity: hasActs ? 1 : 0.35,
                  }}>
                  {/* Número */}
                  <span style={{
                    fontFamily:"'JetBrains Mono', monospace", fontSize:9, fontWeight:600,
                    color: isToday ? '#38BDF8' : '#7A9BBF',
                    position:'absolute', top:3, left:4, lineHeight:1,
                  }}>{day}</span>
                  {/* Iconos de deportes */}
                  {hasActs && (
                    <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'center', gap:1, padding:'12px 2px 2px', width:'100%' }}>
                      {icons.map((ic, ii) => (
                        <span key={ii} style={{ fontSize:'clamp(10px,2.5vw,16px)', lineHeight:1, flexShrink:0 }}>{ic}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── DETALLE DEL DÍA SELECCIONADO ── */}
      {selectedDay && selectedActs.length > 0 && (
        <div style={{ background:'#1A2E45', border:'1px solid #38BDF8', borderRadius:8, padding:'12px 14px', marginTop:12 }}>
          {/* Título */}
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.06em', color:'#38BDF8', marginBottom:8 }}>
            {(() => {
              const dow = new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('es', { weekday:'long' });
              return `${dow.charAt(0).toUpperCase()+dow.slice(1)} ${selectedDay} de ${MONTHS_ES[viewMonth]} · ${Math.round(selectedActs.reduce((s,a)=>s+a.puntos,0))} pts`;
            })()}
          </div>
          {/* Actividades */}
          {selectedActs.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom: i < selectedActs.length-1 ? '1px solid rgba(36,61,87,0.6)' : 'none', fontSize:13 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{sportIcon(a.deporte_nombre)}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, color:'#E8F0FE' }}>{a.deporte_nombre}</div>
                <div style={{ fontSize:11, color:'#7A9BBF' }}>{a.nombre}</div>
                {a.notas && <div style={{ fontSize:11, color:'#4A7A9B', fontStyle:'italic', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.notas}</div>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
                {a.foto_url && (
                  <div onClick={() => setLightboxUrl(a.foto_url)}
                    style={{ width:40, height:40, borderRadius:6, overflow:'hidden', cursor:'pointer', flexShrink:0, border:'1px solid #243D57' }}>
                    <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                )}
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#38BDF8', textAlign:'right', lineHeight:1.5 }}>
                  {Math.round(a.puntos)} pts<br />
                  <span style={{ fontSize:10, color:'#7A9BBF' }}>{Math.round(parseFloat(a.minutos))} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LEYENDA ── */}
      {sportsInMonth.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:14 }}>
          {sportsInMonth.map(s => (
            <div key={s} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color:'#7A9BBF' }}>
              <span>{sportIcon(s)}</span><span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── LOG MENSUAL ── */}
      {sortedDays.length > 0 && (
        <div style={{ marginTop:20, borderTop:'1px solid #243D57', paddingTop:16 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.07em', color:'#7A9BBF', marginBottom:10 }}>
            Actividades de {MONTHS_ES[viewMonth]}
          </div>
          {sortedDays.map(day => {
            const dayActs = dayActivities[day];
            const dow = new Date(viewYear, viewMonth, day).toLocaleDateString('es', { weekday:'short' });
            const dayLabel = `${dow.charAt(0).toUpperCase()+dow.slice(1)} ${day}`;
            return (
              <div key={day} style={{ marginBottom:12 }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:600, color:'#7A9BBF', marginBottom:5, letterSpacing:'0.04em' }}>{dayLabel}</div>
                {dayActs.map((a, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'#132236', border:'1px solid #243D57', borderRadius:8, marginBottom:4, fontSize:13 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>{sportIcon(a.deporte_nombre)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, color:'#E8F0FE', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.deporte_nombre}</div>
                      <div style={{ fontSize:11, color:'#7A9BBF' }}>{a.nombre}</div>
                    </div>
                    {a.foto_url && (
                      <div onClick={() => setLightboxUrl(a.foto_url)}
                        style={{ width:36, height:36, borderRadius:6, overflow:'hidden', cursor:'pointer', flexShrink:0, border:'1px solid #243D57' }}>
                        <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    )}
                    <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#7A9BBF', flexShrink:0, textAlign:'right', lineHeight:1.5 }}>
                      <div style={{ color:'#38BDF8' }}>{Math.round(a.puntos)} pts</div>
                      <div>{Math.round(parseFloat(a.minutos))} min</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
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
    <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:14, padding:16 }}>
      <canvas ref={canvasRef} style={{ display:'block', width:'100%' }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:12 }}>
        {people.map(p => (
          <button key={p}
            onClick={() => setHidden(h => { const n=new Set(h); n.has(p)?n.delete(p):n.add(p); return n; })}
            style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:500, padding:'3px 8px', borderRadius:6, border:'1px solid transparent', background:'transparent', color: hidden.has(p) ? '#7A9BBF' : '#E8F0FE', opacity: hidden.has(p) ? 0.45 : 1, cursor:'pointer', transition:'all 0.15s' }}>
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
    <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:14, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <button onClick={() => { if (frame>=allDates.length-1) setFrame(0); setPlaying(p=>!p); }}
          style={{ width:36, height:36, border:'1px solid rgba(56,189,248,0.35)', background:'rgba(56,189,248,0.12)', color:'#38BDF8', borderRadius:8, fontSize:17, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          {playing ? '⏸' : '▷'}
        </button>
        <button onClick={() => { setPlaying(false); setFrame(0); }}
          style={{ width:36, height:36, border:'1px solid #243D57', background:'#243D57', color:'#E8F0FE', borderRadius:8, fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          ⟳
        </button>
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'#7A9BBF' }}>{allDates[frame]}</span>
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
              <div style={{ flex:1, height:30, background:'#243D57', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, background:color, width:pct+'%', transition:'width 0.4s cubic-bezier(0.22,1,0.36,1)', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:7, minWidth:4 }}>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:600, color:'#0D1B2A' }}>{Math.round(p.pts)}</span>
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
    <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:14, padding:16 }}>
      <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3 }}>Minutos por deporte</div>
      <div style={{ fontSize:12, color:'#7A9BBF', marginBottom:14 }}>Total de minutos por disciplina en el período</div>
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {sports.map((s, i) => {
          const pct   = Math.round((s.min/maxMin)*100);
          const color = PERSON_COLORS[i % PERSON_COLORS.length];
          return (
            <div key={s.deporte} style={{ display:'flex', alignItems:'center', gap:8, minHeight:28 }}>
              <span style={{ fontSize:16, flexShrink:0, width:22, textAlign:'center' }}>{sportIcon(s.deporte)}</span>
              <div style={{ flexShrink:0, width:'clamp(80px,25vw,130px)', fontSize:12, color:'#E8F0FE', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'right' }}>{s.deporte}</div>
              <div style={{ flex:1, height:18, background:'#243D57', borderRadius:3, overflow:'hidden', position:'relative' }}>
                <div style={{ height:'100%', width:pct+'%', background:color, borderRadius:3, opacity:0.85, transition:'width 0.5s' }} />
              </div>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:600, color:'#7A9BBF', flexShrink:0, minWidth:44, textAlign:'right' }}>
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

  // Más puntos en un día
  const dayPts = {};
  acts.forEach(a => {
    const k = a.nombre + '|' + a.fecha.slice(0,10);
    if (!dayPts[k]) dayPts[k] = { nombre:a.nombre, fecha:a.fecha.slice(0,10), pts:0 };
    dayPts[k].pts += a.puntos;
  });
  const bestDay = Object.values(dayPts).sort((a,b)=>b.pts-a.pts)[0];

  // Más minutos en una semana
  const weekMin = {};
  acts.forEach(a => {
    const d = new Date(a.fecha + 'T12:00:00');
    d.setDate(d.getDate() - d.getDay());
    const wk = d.toISOString().slice(0,10);
    const k  = a.nombre + '|' + wk;
    if (!weekMin[k]) weekMin[k] = { nombre:a.nombre, min:0 };
    weekMin[k].min += parseFloat(a.minutos);
  });
  const bestWeek = Object.values(weekMin).sort((a,b)=>b.min-a.min)[0];

  // Más actividades
  const actCount = {};
  acts.forEach(a => { actCount[a.nombre] = (actCount[a.nombre]||0)+1; });
  const mostAct = Object.entries(actCount).sort((a,b)=>b[1]-a[1])[0];

  // Racha
  const personDays = {};
  acts.forEach(a => {
    if (!personDays[a.nombre]) personDays[a.nombre] = new Set();
    personDays[a.nombre].add(a.fecha.slice(0,10));
  });
  let maxStreak = { nombre:'', streak:0 };
  Object.entries(personDays).forEach(([nombre, daysSet]) => {
    const days = [...daysSet].sort(); let cur=1, best=1;
    for (let i=1;i<days.length;i++) {
      const diff = (new Date(days[i])-new Date(days[i-1]))/(86400000);
      if (diff===1) { cur++; best=Math.max(best,cur); } else cur=1;
    }
    if (best>maxStreak.streak) maxStreak={nombre,streak:best};
  });

  const recs = [
    { icon:'⚡', label:'Más puntos en un día',      value:bestDay  ? Math.round(bestDay.pts)+' pts'  : '—', nombre:bestDay?.nombre||'' },
    { icon:'🕐', label:'Más minutos en una semana', value:bestWeek ? Math.round(bestWeek.min)+' min' : '—', nombre:bestWeek?.nombre||'' },
    { icon:'📌', label:'Más actividades',            value:mostAct  ? mostAct[1]+' sesiones'         : '—', nombre:mostAct?.[0]||'' },
    { icon:'🔥', label:'Mayor racha',                value:maxStreak.streak+' días',                         nombre:maxStreak.nombre },
  ];

  // Premios
  const people  = aggregateByPerson(acts);
  const topMin  = [...people].sort((a,b)=>b.minutos-a.minutos)[0];
  let topSpec   = { nombre:'', sport:'', pct:0 };
  people.forEach(p => {
    const pData=acts.filter(a=>a.nombre===p.nombre);
    const sp={}; pData.forEach(a=>{sp[a.deporte_nombre]=(sp[a.deporte_nombre]||0)+a.puntos;});
    const total=Object.values(sp).reduce((s,v)=>s+v,0);
    Object.entries(sp).forEach(([s,pts])=>{ if(pts/total>topSpec.pct) topSpec={nombre:p.nombre,sport:s,pct:pts/total}; });
  });
  const topMulti = [...people].sort((a,b)=>[...b.deportes].length-[...a.deportes].length)[0];
  const topAvg   = [...people].sort((a,b)=>(b.pts/b.actividades)-(a.pts/a.actividades))[0];
  const wkPts    = {};
  acts.forEach(a => { const d=new Date(a.fecha+'T12:00:00'); if(d.getDay()===0||d.getDay()===6){wkPts[a.nombre]=(wkPts[a.nombre]||0)+a.puntos;} });
  const topWknd  = Object.entries(wkPts).sort((a,b)=>b[1]-a[1])[0];

  const awards = [
    { trophy:'💪', title:'Máquina Incansable',    winner:topMin?.nombre,    detail:topMin?Math.round(topMin.minutos)+' min':'' },
    { trophy:'🎯', title:'Especialista',           winner:topSpec.nombre,    detail:topSpec.sport+' · '+Math.round(topSpec.pct*100)+'%' },
    { trophy:'🌈', title:'Multideportista',        winner:topMulti?.nombre,  detail:topMulti?[...topMulti.deportes].length+' deportes':'' },
    { trophy:'⚡', title:'Sprinter',               winner:topAvg?.nombre,    detail:topAvg?Math.round(topAvg.pts/topAvg.actividades)+' pts/ses.':'' },
    { trophy:'🏖️', title:'Rey Fin de Semana',      winner:topWknd?.[0],      detail:topWknd?Math.round(topWknd[1])+' pts':'' },
    { trophy:'👑', title:'Líder',                  winner:people[0]?.nombre, detail:people[0]?Math.round(people[0].pts)+' pts':'' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {recs.map(r => (
          <div key={r.label} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'12px 12px', display:'flex', flexDirection:'column', gap:4, transition:'border-color 0.2s' }}>
            <div style={{ fontSize:20 }}>{r.icon}</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, color:'#38BDF8' }}>{r.value}</div>
            <div style={{ fontWeight:600, fontSize:12, color:'#E8F0FE' }}>{r.nombre}</div>
            <div style={{ fontSize:11, color:'#7A9BBF' }}>{r.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.1em', color:'#38BDF8', marginBottom:4 }}>Reconocimientos</div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(22px,5vw,32px)', textTransform:'uppercase', lineHeight:1, marginBottom:14 }}>Premios especiales</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {awards.map(a => (
            <div key={a.title} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'14px 12px', textAlign:'center', transition:'transform 0.2s, border-color 0.2s' }}>
              <div style={{ fontSize:26, marginBottom:5 }}>{a.trophy}</div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:4, lineHeight:1.2, color:'#E8F0FE' }}>{a.title}</div>
              <div style={{ fontSize:13, color:'#38BDF8', fontWeight:600 }}>{a.winner||'—'}</div>
              <div style={{ fontSize:11, color:'#7A9BBF', marginTop:2, fontFamily:"'JetBrains Mono', monospace" }}>{a.detail}</div>
            </div>
          ))}
        </div>
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

  const selectStyle = { width:'100%', background:'#1A2E45', border:'1px solid #243D57', color:'#E8F0FE', padding:'9px 12px', borderRadius:8, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', appearance:'none', cursor:'pointer', fontSize:16 };

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
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, color:'#7A9BBF', flexShrink:0 }}>VS</div>
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
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'#7A9BBF', textAlign:'center' }}>VS</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(16px,4vw,24px)', textTransform:'uppercase', color:cB, textAlign:'right' }}>{selB.split(' ')[0]}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:3, marginBottom:14 }}>
            {comps.map(c => (
              <>
                <div key={c.label+'A'} style={{ background:'#132236', border:'1px solid #243D57', borderTop:`3px solid ${cA}`, borderRadius:8, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:15, marginTop:2, color: c.vA>c.vB?'#38BDF8':'#E8F0FE' }}>{c.fmt(c.vA)}</div>
                  <div style={{ fontSize:9, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>{c.label}</div>
                </div>
                <div key={c.label+'div'} style={{ display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#243D57' }}>·</div>
                <div key={c.label+'B'} style={{ background:'#132236', border:'1px solid #243D57', borderTop:`3px solid ${cB}`, borderRadius:8, padding:'8px', textAlign:'center' }}>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:15, marginTop:2, color: c.vB>c.vA?'#38BDF8':'#E8F0FE' }}>{c.fmt(c.vB)}</div>
                  <div style={{ fontSize:9, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600 }}>{c.label}</div>
                </div>
              </>
            ))}
          </div>
          <canvas ref={canvasRef} style={{ display:'block', width:'100%' }} height={170} />
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#7A9BBF' }}>
          <div style={{ fontSize:40, marginBottom:10 }}>⚔️</div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:18, textTransform:'uppercase', color:'#E8F0FE' }}>Elige dos competidores</div>
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
    ins.push(<>🥇 <strong style={{color:'#38BDF8'}}>{people[0].nombre.split(' ')[0]}</strong> lidera con {Math.round(people[0].pts).toLocaleString('es')} puntos — {gap} por encima del segundo.</>);
  }
  if (sports.length) {
    const total=acts.reduce((s,a)=>s+a.puntos,0);
    const pct=Math.round((sports[0].pts/total)*100);
    ins.push(<>🏅 El <strong style={{color:'#38BDF8'}}>{sports[0].deporte}</strong> aporta el {pct}% de los puntos del período.</>);
  }
  const totalH=Math.round(acts.reduce((s,a)=>s+parseFloat(a.minutos),0)/60);
  ins.push(<>⏱ El grupo registró <strong style={{color:'#38BDF8'}}>{totalH} horas</strong> de entrenamiento en el período.</>);

  const topAct=[...people].sort((a,b)=>b.actividades-a.actividades)[0];
  if (topAct) ins.push(<>📌 <strong style={{color:'#38BDF8'}}>{topAct.nombre.split(' ')[0]}</strong> es el más constante con {topAct.actividades} actividades registradas.</>);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {ins.map((text, i) => (
        <div key={i} style={{ background:'#132236', border:'1px solid #243D57', borderLeft:'3px solid #38BDF8', borderRadius:8, padding:'12px 14px', fontSize:14, lineHeight:1.5, color:'#E8F0FE' }}>
          {text}
        </div>
      ))}
    </div>
  );
}

// ─── PROFILE PANEL ────────────────────────────────────────────────────────────

function ProfilePanel({ nombre, acts, nombres, onClose }) {
  if (!nombre) return null;
  const data   = acts.filter(a => a.nombre===nombre);
  const pts    = data.reduce((s,a)=>s+a.puntos,0);
  const min    = data.reduce((s,a)=>s+parseFloat(a.minutos),0);
  const color  = getPersonColor(nombre, nombres);

  const sportMap = {};
  data.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre]={min:0,pts:0,sesiones:0};
    sportMap[a.deporte_nombre].min+=parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts+=a.puntos;
    sportMap[a.deporte_nombre].sesiones++;
  });
  const sportRows = Object.entries(sportMap).sort((a,b)=>b[1].pts-a[1].pts);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(5,12,20,0.75)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'flex-start', justifyContent:'flex-end' }}
         onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ width:'min(400px,100vw)', height:'100vh', background:'#132236', borderLeft:'1px solid #243D57', overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'52px 20px 32px', display:'flex', flexDirection:'column', gap:18 }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:16, color:'#7A9BBF', fontSize:18, padding:'6px 10px', borderRadius:8, background:'transparent', border:'none', cursor:'pointer' }}>✕</button>

        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:'clamp(32px,8vw,50px)', textTransform:'uppercase', letterSpacing:'0.02em', lineHeight:1, color }}>{nombre}</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { label:'Puntos', val:Math.round(pts).toLocaleString('es') },
            { label:'Minutos', val:Math.round(min).toLocaleString('es') },
            { label:'Actividades', val:data.length },
            { label:'Prom/sesión', val:data.length?Math.round(pts/data.length):0 },
          ].map(s => (
            <div key={s.label} style={{ background:'#1A2E45', border:'1px solid #243D57', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:19, color:'#38BDF8' }}>{s.val}</div>
              <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Desglose por deporte</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sportRows.map(([sport, v]) => {
              const pct = pts > 0 ? Math.round(v.pts/pts*100) : 0;
              return (
                <div key={sport} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#1A2E45', border:'1px solid #243D57', borderRadius:8 }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{sportIcon(sport)}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sport}</div>
                    <div style={{ height:4, background:'#243D57', borderRadius:2, marginTop:5 }}>
                      <div style={{ height:4, width:pct+'%', background:color, borderRadius:2, transition:'width 0.4s' }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0, fontFamily:"'JetBrains Mono', monospace", fontSize:12, lineHeight:1.6 }}>
                    <div style={{ color:'#E8F0FE', fontWeight:700 }}>{Math.round(v.pts)} <span style={{ color:'#7A9BBF', fontWeight:400 }}>pts</span></div>
                    <div style={{ color:'#7A9BBF' }}>{Math.round(v.min)} min · {v.sesiones} ses.</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 20px', color:'#7A9BBF' }}>
      <div style={{ fontSize:40, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:19, textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:6, color:'#E8F0FE' }}>{title}</div>
      {text && <div style={{ fontSize:13 }}>{text}</div>}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function CompetenciaDetalle({ competencia, onBack, onNewActivity }) {
  const { user } = useAuth();
  const [tab, setTab]         = useState('podio');
  const [meses, setMeses]     = useState([]);
  const [mes, setMes]         = useState('');
  const [acts, setActs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null); // nombre seleccionado para el panel
  const tabsRef = useRef(null);

  // Cargar meses disponibles
  useEffect(() => {
    getMesesComp(competencia.id).then(m => {
      setMeses(m);
      if (m.length) setMes(m[0]);
      else setLoading(false);
    });
  }, [competencia.id]);

  // Cargar actividades cuando cambia mes (o cuando meses cargó sin mes)
  useEffect(() => {
    setLoading(true);
    getActividadesComp(competencia.id, mes || undefined)
      .then(setActs)
      .finally(() => setLoading(false));
  }, [competencia.id, mes]);

  const nombres = [...new Set(acts.map(a => a.nombre))].sort();

  // Determinar el año/mes del viewMonth para el calendario
  const viewYear  = mes ? parseInt(mes.split('-')[0]) : new Date().getFullYear();
  const viewMonth = mes ? parseInt(mes.split('-')[1]) - 1 : new Date().getMonth();

  const mesLabel = mes
    ? MONTHS_ES[parseInt(mes.split('-')[1]) - 1] + ' ' + mes.split('-')[0]
    : 'Acumulado total';

  function renderTab() {
    if (loading) return <Spinner />;
    switch (tab) {
      case 'podio':    return <Podio acts={acts} nombres={nombres} />;
      case 'ranking':  return <Ranking acts={acts} nombres={nombres} myId={user?.nombre} onOpenProfile={n => setProfile(n)} />;
      case 'calendar': return <Calendario acts={acts} />;
      case 'evolucion':return <Evolucion acts={acts} nombres={nombres} />;
      case 'carrera':  return <Carrera acts={acts} nombres={nombres} />;
      case 'deportes': return <Deportes acts={acts} />;
      case 'records':  return <Records acts={acts} />;
      case 'comparar': return <Comparador acts={acts} nombres={nombres} />;
      case 'insights': return <Insights acts={acts} />;
      default:         return null;
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── SUBHEADER STICKY ───────────────────────────────────────────── */}
      <div style={{ position:'sticky', top:52, zIndex:10, background:'rgba(13,27,42,0.98)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)' }}>

        {/* Fila 1: back + nombre de competencia */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px 4px', borderBottom:'1px solid #1A2E45' }}>
          <button onClick={onBack}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, border:'1px solid #243D57', background:'transparent', color:'#7A9BBF', cursor:'pointer', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(18px,5vw,26px)', textTransform:'uppercase', lineHeight:1.1, color:'#E8F0FE', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {competencia.nombre}
          </div>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:10, color: mes ? '#38BDF8' : '#7A9BBF', whiteSpace:'nowrap', flexShrink:0 }}>
            {mesLabel}
          </div>
        </div>

        {/* Fila 2: barra de mes estilo month-bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, height:34, borderBottom:'1px solid #1A2E45', padding:'0 12px' }}>
          {/* Botón anterior */}
          <button
            onClick={() => { const i=meses.indexOf(mes); if(mes===''&&meses.length){setMes(meses[meses.length-1]);}else if(i>0){setMes(meses[i-1]);}else if(i===0){setMes('');} }}
            style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'#7A9BBF', fontSize:18, cursor:'pointer', flexShrink:0, padding:0 }}>
            ‹
          </button>

          {/* Scroll de meses */}
          <div style={{ flex:1, display:'flex', overflowX:'auto', scrollbarWidth:'none', WebkitOverflowScrolling:'touch', gap:2, alignItems:'center', justifyContent:'center' }}>
            <style>{`.mbar::-webkit-scrollbar{display:none}`}</style>
            {[{ val:'', label:'Total' }, ...meses.map(m => {
              const [y, mo] = m.split('-');
              return { val:m, label: MONTHS_ES[parseInt(mo)-1].slice(0,3).toUpperCase()+' '+y.slice(2) };
            })].map(({ val, label }) => (
              <button key={val} onClick={() => setMes(val)}
                style={{
                  padding:'3px 10px', borderRadius:14, fontSize:11, fontWeight:700,
                  whiteSpace:'nowrap', flexShrink:0, border:'none', cursor:'pointer',
                  transition:'all 0.15s',
                  background: mes===val ? 'rgba(56,189,248,0.18)' : 'transparent',
                  color: mes===val ? '#38BDF8' : '#7A9BBF',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Botón siguiente */}
          <button
            onClick={() => { const i=meses.indexOf(mes); if(mes===''&&meses.length){setMes(meses[0]);}else if(i<meses.length-1){setMes(meses[i+1]);} }}
            style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'#7A9BBF', fontSize:18, cursor:'pointer', flexShrink:0, padding:0 }}>
            ›
          </button>
        </div>

        {/* Fila 3: tabs de sección */}
        <div ref={tabsRef} style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', WebkitOverflowScrolling:'touch' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'6px 14px', fontSize:10, fontWeight:700, whiteSpace:'nowrap', border:'none', borderBottom: tab===t.id ? '2px solid #38BDF8' : '2px solid transparent', background: tab===t.id ? 'rgba(56,189,248,0.05)' : 'transparent', color: tab===t.id ? '#38BDF8' : '#7A9BBF', cursor:'pointer', flexShrink:0, transition:'color 0.15s, background 0.15s', letterSpacing:'0.02em', textTransform:'uppercase' }}>
              <span style={{ fontSize:15 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding:'12px 16px 32px' }}>
        {renderTab()}
      </div>

      {/* Profile panel */}
      {profile && (
        <ProfilePanel
          nombre={profile}
          acts={acts}
          nombres={nombres}
          onClose={() => setProfile(null)}
        />
      )}
    </>
  );
}
