import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActividades, deleteActividad, getDeportes } from '../api/actividades';
import { uploadFoto, deleteFoto } from '../api/fotos';
import { useLoading } from '../context/LoadingContext';

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Panel de detalle (bottom sheet) ─────────────────────────────────────────

function DetallePanel({ actividad, onClose, onDelete, onFotoUploaded, onFotoDeleted }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(false);
  const startY = useRef(null);
  const { withLoading } = useLoading();

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { foto_url } = await withLoading(() => uploadFoto(actividad.id, file));
      onFotoUploaded(actividad.id, foto_url);
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteFoto() {
    if (!confirm('¿Eliminar la foto?')) return;
    try { await withLoading(() => deleteFoto(actividad.id)); onFotoDeleted(actividad.id); }
    catch (err) { alert('Error: ' + err.message); }
  }

  async function handleDeleteActividad() {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await withLoading(() => onDelete(actividad.id));
    onClose();
  }

  const fecha = new Date(actividad.fecha + 'T12:00:00');
  const fechaLabel = fecha.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
  const yearLabel  = fecha.getFullYear();

  // Hora registrada: viene de created_at
  const horaLabel = actividad.created_at
    ? new Date(actividad.created_at).toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <>
      {/* Lightbox */}
      {lightbox && actividad.foto_url && (
        <div onClick={() => setLightbox(false)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <button onClick={() => setLightbox(false)}
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(36,61,87,0.9)', border:'none', color:'var(--t-text)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <img src={actividad.foto_url} alt={actividad.deporte_nombre} onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain' }} />
        </div>
      )}

      {/* Overlay — toca fuera para cerrar */}
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(5,12,20,0.72)', backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'8px 16px' }}>

        {/* Tarjeta centrada — stopPropagation para que el click interno no cierre */}
        <div onClick={e => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ width:'100%', maxWidth:420, background:'var(--t-surface)', border:'1px solid var(--t-surface2)', borderRadius:20, overflow:'hidden', maxHeight:'calc(100dvh - 40px - env(safe-area-inset-top) - env(safe-area-inset-bottom))', display:'flex', flexDirection:'column' }}>

          {/* ── BODY (scrollable) ── */}
          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12, overflowY:'auto', flex:1 }}>

            {/* 1. Título + botón cerrar */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1, flex:1 }}>
                {actividad.deporte_nombre}
              </div>
              <button onClick={onClose}
                style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                ✕
              </button>
            </div>

            {/* 2. Fecha y hora */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--t-muted)', fontSize:13 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span style={{ textTransform:'capitalize' }}>{fechaLabel}, {yearLabel}</span>
              </div>
              {horaLabel && (
                <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--t-muted2)', fontSize:13 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>{horaLabel}</span>
                </div>
              )}
            </div>

            {/* 3. Foto */}
            {actividad.foto_url ? (
              <div style={{ position:'relative', flexShrink:0, cursor:'pointer', borderRadius:12, overflow:'hidden' }}
                onClick={() => setLightbox(true)}>
                <img src={actividad.foto_url} alt={actividad.deporte_nombre}
                  style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,12,20,0.5) 0%, transparent 60%)' }} />
                <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  style={{ position:'absolute', top:8, right:8, background:'rgba(13,27,42,0.55)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(232,240,254,0.55)', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                  <IconCamera />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
                  style={{ position:'absolute', top:8, left:8, background:'rgba(13,27,42,0.55)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(248,113,113,0.75)', borderRadius:8, padding:'4px 8px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                  Quitar
                </button>
                <div style={{ position:'absolute', bottom:8, right:10, fontSize:10, color:'rgba(232,240,254,0.45)' }}>
                  Toca para ampliar
                </div>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                style={{ width:'100%', padding:'14px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'rgba(26,46,69,0.25)', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                {uploading
                  ? <><div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span style={{ fontSize:13 }}>Subiendo…</span></>
                  : <><IconCamera /><span style={{ fontSize:13, fontWeight:600 }}>Agregar foto</span></>}
              </button>
            )}

            {/* Métricas */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--t-accent)', opacity:0.7 }} />
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:24, color:'var(--t-accent)', lineHeight:1 }}>
                  {Math.round(parseFloat(actividad.puntos))}
                </div>
                <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:5 }}>Puntos</div>
              </div>
              <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:24, color:'var(--t-text)', lineHeight:1 }}>
                  {Math.round(parseFloat(actividad.minutos))}
                </div>
                <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:5 }}>Minutos</div>
              </div>
            </div>

            {/* Notas */}
            {actividad.notas && (
              <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 13px' }}>
                <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Notas</div>
                <div style={{ fontSize:14, color:'var(--t-text)', lineHeight:1.6 }}>{actividad.notas}</div>
              </div>
            )}

            {/* Eliminar */}
            <button onClick={handleDeleteActividad}
              style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px solid rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.05)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
              Eliminar actividad
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Card de actividad estilo feed ───────────────────────────────────────────

function timeAgoMA(str) {
  if (!str) return '';
  const diff = (Date.now() - new Date(str)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  if (diff < 604800)return `${Math.floor(diff/86400)}d`;
  return new Date(str).toLocaleDateString('es', { day:'numeric', month:'short' });
}

function ActividadCard({ a, onClick }) {
  const fechaLabel = new Date(a.fecha + 'T12:00:00').toLocaleDateString('es', { weekday:'short', day:'numeric', month:'short' });

  return (
    <div onClick={onClick} style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-surface2)', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>

      {/* Header — igual al feed */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px 10px' }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'1.5px solid rgba(var(--t-accent-r),0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'var(--t-accent)', flexShrink:0 }}>
          🏃
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1 }}>
            {a.deporte_nombre}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted2)', marginTop:2 }}>
            {fechaLabel}
          </div>
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted2)', flexShrink:0 }}>
          {timeAgoMA(a.created_at || a.fecha)}
        </div>
      </div>

      {/* Foto borde a borde */}
      {a.foto_url && (
        <img src={a.foto_url} alt={a.deporte_nombre}
          style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
      )}

      {/* Stats: pts · min · fecha */}
      <div style={{ display:'flex', alignItems:'center', gap:0, padding:'10px 14px 4px' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:20, color:'var(--t-accent)', lineHeight:1 }}>
            {Math.round(parseFloat(a.puntos))}
          </span>
          <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>pts</span>
        </div>
        <div style={{ width:1, height:16, background:'var(--t-surface2)', margin:'0 12px' }} />
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:16, color:'var(--t-muted)', lineHeight:1 }}>
            {Math.round(parseFloat(a.minutos))}
          </span>
          <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>min</span>
        </div>
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--t-muted2)' }}>
          ×{parseFloat(a.ponderador).toFixed(1)}
        </div>
      </div>

      {/* Notas */}
      {a.notas
        ? <div style={{ padding:'4px 14px 10px', fontSize:14, color:'var(--t-muted)', lineHeight:1.5 }}>{a.notas}</div>
        : <div style={{ height:8 }} />
      }
    </div>
  );
}

// ─── Evolución de puntos ──────────────────────────────────────────────────────

const MONTHS_ES_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT_EV = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}

function getWeekMon(weekKey) {
  const [y, w] = weekKey.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const mon = new Date(jan4);
  mon.setDate(jan4.getDate() - (jan4Day - 1) + (w - 1) * 7);
  return mon;
}

function Evolucion({ actividades }) {
  const canvasRef = useRef(null);
  const [granularidad, setGranularidad] = useState('semana'); // 'semana' | 'mes'
  const [deporteFiltro, setDeporteFiltro] = useState('__all__');
  const [mesFiltro, setMesFiltro] = useState('__all__'); // 'YYYY-MM' | '__all__'

  // Deportes y meses presentes
  const deportesPresentes = [...new Set(actividades.map(a => a.deporte_nombre))].sort();
  const mesesPresentes = [...new Set(actividades.map(a => a.fecha.slice(0,7)))].sort().reverse();

  // Actividades filtradas por deporte y mes
  const actsFiltradas = actividades
    .filter(a => deporteFiltro === '__all__' || a.deporte_nombre === deporteFiltro)
    .filter(a => mesFiltro === '__all__' || a.fecha.slice(0,7) === mesFiltro);

  // Periodos según granularidad
  const periodos = granularidad === 'mes'
    ? [...new Set(actsFiltradas.map(a => a.fecha.slice(0,7)))].sort()
    : [...new Set(actsFiltradas.map(a => getISOWeek(a.fecha)))].sort();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !periodos.length) return;
    const ctx = canvas.getContext('2d');

    let acum = 0;
    const data = periodos.map(p => {
      const pts = actsFiltradas
        .filter(a => (granularidad === 'mes' ? a.fecha.slice(0,7) : getISOWeek(a.fecha)) === p)
        .reduce((s, a) => s + parseFloat(a.puntos), 0);
      acum += pts;
      return { p, pts, acum };
    });

    const W = canvas.parentElement?.offsetWidth || 300;
    const H = 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top:20, right:16, bottom:32, left:46 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => d.acum)) || 1;
    const n = data.length;

    const accentR = getComputedStyle(document.documentElement).getPropertyValue('--t-accent-r').trim() || '249,115,22';
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    grad.addColorStop(0, `rgba(${accentR},0.22)`);
    grad.addColorStop(1, `rgba(${accentR},0.0)`);

    const xOf = i => pad.left + (n === 1 ? w / 2 : (i / (n - 1)) * w);
    const yOf = v => pad.top + h * (1 - v / maxVal);

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
      ctx.fillText(Math.round(maxVal * t).toLocaleString('es'), pad.left - 6, y + 4);
    });

    // Área
    if (n > 1) {
      ctx.beginPath();
      data.forEach((d, i) => { const x = xOf(i), y = yOf(d.acum); i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
      ctx.lineTo(xOf(n-1), pad.top+h); ctx.lineTo(xOf(0), pad.top+h);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    }

    // Línea
    if (n > 1) {
      ctx.beginPath();
      ctx.strokeStyle = `rgb(${accentR})`; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      data.forEach((d, i) => { const x = xOf(i), y = yOf(d.acum); i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y); });
      ctx.stroke();
    }

    // Puntos + etiquetas
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.acum);
      ctx.beginPath(); ctx.arc(x, y, i === n-1 ? 5 : 3.5, 0, Math.PI*2);
      ctx.fillStyle = `rgb(${accentR})`; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, i === n-1 ? 2.5 : 1.5, 0, Math.PI*2);
      ctx.fillStyle = '#050C14'; ctx.fill();

      const showLabel = n <= 8 || i % Math.ceil(n / 6) === 0 || i === n-1;
      if (showLabel) {
        let label;
        if (granularidad === 'mes') {
          const [yy, mm] = d.p.split('-');
          label = `${MONTHS_SHORT_EV[parseInt(mm)-1]} ${yy.slice(2)}`;
        } else {
          const mon = getWeekMon(d.p);
          label = `${mon.getDate()}/${mon.getMonth()+1}`;
        }
        ctx.fillStyle = 'rgba(120,145,180,0.8)';
        ctx.font = `9px Inter, sans-serif`;
        ctx.textAlign = i === 0 ? 'left' : i === n-1 ? 'right' : 'center';
        ctx.fillText(label, x, H - 6);
      }
    });
  }, [actsFiltradas, periodos, granularidad]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const ro = new ResizeObserver(draw);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [draw]);

  if (!actividades.length) return (
    <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--t-muted)', fontSize:14 }}>
      Sin actividades registradas.
    </div>
  );

  // Stats sobre las actividades filtradas
  const totalPts  = actsFiltradas.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const totalMin  = actsFiltradas.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const totalActs = actsFiltradas.length;

  const mejorPeriodo = (() => {
    if (!periodos.length) return null;
    const byP = {};
    actsFiltradas.forEach(a => {
      const p = granularidad === 'mes' ? a.fecha.slice(0,7) : getISOWeek(a.fecha);
      byP[p] = (byP[p] || 0) + parseFloat(a.puntos);
    });
    const best = Object.entries(byP).sort((a,b) => b[1]-a[1])[0];
    if (!best) return null;
    let label;
    if (granularidad === 'mes') {
      const [y, m] = best[0].split('-');
      label = `${MONTHS_ES_FULL[parseInt(m)-1]} ${y}`;
    } else {
      const mon = getWeekMon(best[0]);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const fmt = d => `${d.getDate()}/${d.getMonth()+1}`;
      label = `${fmt(mon)} – ${fmt(sun)}`;
    }
    return { label, pts: Math.round(best[1]) };
  })();

  const statStyle = { display:'flex', flexDirection:'column', alignItems:'center', gap:2, flex:1 };
  const valStyle  = { fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, lineHeight:1, fontVariantNumeric:'tabular-nums' };
  const lblStyle  = { fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em' };

  const maxPtsPeriodo = periodos.length
    ? Math.max(...periodos.map(p => actsFiltradas.filter(a => (granularidad==='mes'?a.fecha.slice(0,7):getISOWeek(a.fecha))===p).reduce((s,a)=>s+parseFloat(a.puntos),0)))
    : 1;

  const pillBtn = (active) => ({
    padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer',
    fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:12,
    textTransform:'uppercase', letterSpacing:'0.05em',
    background: active ? 'var(--t-accent)' : 'var(--t-surface2)',
    color: active ? 'var(--t-ground)' : 'var(--t-muted)',
    transition:'background 0.15s, color 0.15s',
  });

  return (
    <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:16 }}>

      {/* Controles fila 1: granularidad + deporte */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div style={{ display:'flex', gap:4, background:'var(--t-surface2)', borderRadius:22, padding:3 }}>
          <button style={pillBtn(granularidad==='semana')} onClick={() => setGranularidad('semana')}>Semana</button>
          <button style={pillBtn(granularidad==='mes')} onClick={() => setGranularidad('mes')}>Mes</button>
        </div>
        <select
          value={deporteFiltro}
          onChange={e => setDeporteFiltro(e.target.value)}
          style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color: deporteFiltro === '__all__' ? 'var(--t-muted)' : 'var(--t-text)', padding:'6px 10px', borderRadius:10, fontSize:12, fontWeight:600, appearance:'none', cursor:'pointer', maxWidth:150 }}>
          <option value="__all__">Todos los deportes</option>
          {deportesPresentes.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Controles fila 2: filtro de mes */}
      <select
        value={mesFiltro}
        onChange={e => setMesFiltro(e.target.value)}
        style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color: mesFiltro === '__all__' ? 'var(--t-muted)' : 'var(--t-text)', padding:'7px 12px', borderRadius:10, fontSize:12, fontWeight:600, appearance:'none', cursor:'pointer', width:'100%' }}>
        <option value="__all__">Todos los meses</option>
        {mesesPresentes.map(m => {
          const [y, mo] = m.split('-');
          return <option key={m} value={m}>{MONTHS_ES_FULL[parseInt(mo)-1]} {y}</option>;
        })}
      </select>

      {/* Stats resumen */}
      <div style={{ display:'flex', gap:0, background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, overflow:'hidden' }}>
        <div style={{ ...statStyle, padding:'14px 8px', borderRight:'1px solid var(--t-dim)' }}>
          <span style={{ ...valStyle, color:'var(--t-accent)' }}>{Math.round(totalPts).toLocaleString('es')}</span>
          <span style={lblStyle}>Pts totales</span>
        </div>
        <div style={{ ...statStyle, padding:'14px 8px', borderRight:'1px solid var(--t-dim)' }}>
          <span style={{ ...valStyle, color:'var(--t-text)' }}>{totalActs}</span>
          <span style={lblStyle}>Actividades</span>
        </div>
        <div style={{ ...statStyle, padding:'14px 8px' }}>
          <span style={{ ...valStyle, color:'var(--t-text)' }}>{Math.round(totalMin / 60)}h</span>
          <span style={lblStyle}>Horas</span>
        </div>
      </div>

      {/* Gráfico */}
      {actsFiltradas.length > 0 ? (
        <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'16px 12px 8px', overflow:'hidden' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginBottom:10 }}>
            Puntos acumulados · {granularidad === 'mes' ? 'por mes' : 'por semana'}
          </div>
          <canvas ref={canvasRef} style={{ display:'block', width:'100%', maxWidth:'100%' }} />
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'32px 24px', color:'var(--t-muted)', fontSize:13, background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14 }}>
          Sin actividades de {deporteFiltro} registradas.
        </div>
      )}

      {/* Mejor periodo */}
      {mejorPeriodo && (
        <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginBottom:4 }}>
              Mejor {granularidad === 'mes' ? 'mes' : 'semana'}
            </div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, color:'var(--t-text)' }}>{mejorPeriodo.label}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, color:'var(--t-accent)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{mejorPeriodo.pts.toLocaleString('es')}</div>
            <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>pts</div>
          </div>
        </div>
      )}

      {/* Tabla de periodos */}
      {periodos.length > 0 && (
        <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', padding:'12px 16px 8px', borderBottom:'1px solid var(--t-dim)' }}>
            Por {granularidad === 'mes' ? 'mes' : 'semana'}
          </div>
          {[...periodos].reverse().map(p => {
            const actsP = actsFiltradas.filter(a => (granularidad==='mes'?a.fecha.slice(0,7):getISOWeek(a.fecha))===p);
            const pts   = Math.round(actsP.reduce((s,a) => s+parseFloat(a.puntos),0));
            const mins  = Math.round(actsP.reduce((s,a) => s+parseFloat(a.minutos),0));
            const pct   = Math.round((pts / (maxPtsPeriodo || 1)) * 100);
            let label;
            if (granularidad === 'mes') {
              const [y, m] = p.split('-');
              label = `${MONTHS_ES_FULL[parseInt(m)-1]} ${y}`;
            } else {
              const mon = getWeekMon(p);
              const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
              const fmt = d => `${d.getDate()}/${d.getMonth()+1}`;
              label = `${fmt(mon)} – ${fmt(sun)}`;
            }
            return (
              <div key={p} style={{ padding:'10px 16px', borderBottom:'1px solid var(--t-surface2)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, color:'var(--t-text)' }}>{label}</span>
                  <div>
                    <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:16, color:'var(--t-accent)', fontVariantNumeric:'tabular-nums' }}>{pts.toLocaleString('es')}</span>
                    <span style={{ fontSize:9, color:'var(--t-muted)', marginLeft:3, textTransform:'uppercase' }}>pts</span>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:3, background:'var(--t-surface2)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.7 }} />
                  </div>
                  <span style={{ fontSize:10, color:'var(--t-muted)', whiteSpace:'nowrap' }}>{actsP.length} ses · {mins} min</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Objetivos semanales ──────────────────────────────────────────────────────

const STORAGE_KEY = 'nanao_objetivos';

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d); mon.setDate(d.getDate() + diffToMon); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return { mon, sun };
}

function formatWeekLabel(mon, sun) {
  const fmt = d => d.toLocaleDateString('es', { day:'numeric', month:'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

const DOW_LABELS = ['L','M','X','J','V','S','D'];

function Objetivos({ actividades }) {
  const [deportes, setDeportes]   = useState([]);
  const [objetivos, setObjetivos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  });
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState({ deporte:'', sesiones:3 });

  useEffect(() => { getDeportes().then(setDeportes).catch(() => {}); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(objetivos)); }, [objetivos]);

  const now   = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - i * 7);
    return getWeekRange(d);
  }).reverse();

  function sesionesEnSemana(deporte, { mon, sun }) {
    return actividades.filter(a => {
      const f = new Date(a.fecha + 'T12:00:00');
      return a.deporte_nombre === deporte && f >= mon && f <= sun;
    }).length;
  }

  // Returns array of 7 booleans [L..D] indicating if there's a session that day
  function diasEnSemana(deporte, { mon }) {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const ds = d.toISOString().slice(0,10);
      return actividades.some(a => a.deporte_nombre === deporte && a.fecha === ds);
    });
  }

  function guardar() {
    const dep = form.deporte;
    const ses = Math.max(1, parseInt(form.sesiones) || 1);
    if (!dep) return;
    setObjetivos(prev => {
      const exists = prev.find(o => o.deporte === dep);
      if (exists) return prev.map(o => o.deporte === dep ? { ...o, sesiones: ses } : o);
      return [...prev, { deporte: dep, sesiones: ses }];
    });
    setEditando(null);
  }

  function eliminar(deporte) {
    setObjetivos(prev => prev.filter(o => o.deporte !== deporte));
  }

  const deportesDisponibles = deportes.filter(d => !objetivos.find(o => o.deporte === d.nombre) || editando?.deporte === d.nombre);
  const semanaActual = weeks[weeks.length - 1];

  // cumplidos esta semana
  const cumplidos = objetivos.filter(o => sesionesEnSemana(o.deporte, semanaActual) >= o.sesiones).length;

  return (
    <div style={{ paddingBottom:40 }}>

      {/* Resumen semanal */}
      {objetivos.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 10px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>
            Semana actual
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:700,
            color: cumplidos === objetivos.length ? '#22C55E' : cumplidos > 0 ? '#FBBF24' : 'var(--t-muted)',
            letterSpacing:'0.03em' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            {cumplidos} de {objetivos.length} cumplido{objetivos.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {objetivos.length === 0 && !editando && (
        <div style={{ textAlign:'center', padding:'40px 24px 8px', color:'var(--t-muted)', fontSize:13 }}>
          Todavía no tenés objetivos. Creá uno abajo.
        </div>
      )}

      {/* Objetivo cards */}
      {objetivos.map(obj => {
        const sesHoy = sesionesEnSemana(obj.deporte, semanaActual);
        const cumple = sesHoy >= obj.sesiones;
        const falta  = obj.sesiones - sesHoy;

        const hist = weeks.map((w, wi) => {
          const ses  = sesionesEnSemana(obj.deporte, w);
          const dias = diasEnSemana(obj.deporte, w);
          const isCurrent = wi === weeks.length - 1;
          const ok   = ses >= obj.sesiones;
          // compute day strings for today check
          const dayStrs = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(w.mon); d.setDate(w.mon.getDate() + i);
            return d.toISOString().slice(0,10);
          });
          return { label: formatWeekLabel(w.mon, w.sun), ses, dias, ok, isCurrent, dayStrs };
        });

        return (
          <div key={obj.deporte} style={{
            borderBottom: '1px solid var(--t-dim)',
            position: 'relative',
            background: cumple ? 'linear-gradient(180deg, rgba(34,197,94,0.04) 0%, transparent 70px)' : 'transparent',
          }}>
            {/* Rail izquierdo */}
            <div style={{
              position:'absolute', left:0, top:16, bottom:16, width:3,
              borderRadius:'0 2px 2px 0',
              background: cumple ? '#22C55E' : 'var(--t-accent)',
            }} />

            {/* Fila principal */}
            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 16px 12px 20px' }}>
              {/* Nombre + estado */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:19, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {obj.deporte}
                </div>
                {cumple ? (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginTop:4, fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#22C55E', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:5, padding:'2px 7px' }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Meta cumplida
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:3 }}>
                    {falta} sesión{falta !== 1 ? 'es' : ''} para completar
                  </div>
                )}
              </div>

              {/* Ratio grande */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:0, flexShrink:0 }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:52, lineHeight:1, color: cumple ? '#22C55E' : sesHoy > 0 ? 'var(--t-accent)' : 'var(--t-dim)', fontVariantNumeric:'tabular-nums', letterSpacing:'-0.03em' }}>
                  {sesHoy}
                </span>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:28, color:'var(--t-dim)', lineHeight:1, paddingBottom:4, margin:'0 1px' }}>/</span>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:22, color:'var(--t-muted)', lineHeight:1, paddingBottom:4, fontVariantNumeric:'tabular-nums' }}>
                  {obj.sesiones}
                </span>
                <span style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', paddingBottom:6, marginLeft:4, lineHeight:1.3 }}>
                  ses<br/>sem
                </span>
              </div>

              {/* Acciones */}
              <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                <button onClick={() => { setForm({ deporte: obj.deporte, sesiones: obj.sesiones }); setEditando(obj); }}
                  style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => eliminar(obj.deporte)}
                  style={{ width:28, height:28, borderRadius:8, border:'1px solid rgba(248,113,113,0.2)', background:'transparent', color:'#F87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Grid semanal */}
            <div style={{ padding:'0 20px 14px', display:'flex', flexDirection:'column', gap:6 }}>
              {/* Header días */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:70, flexShrink:0 }} />
                <div style={{ display:'flex', gap:5, flex:1 }}>
                  {DOW_LABELS.map(l => (
                    <div key={l} style={{ width:22, textAlign:'center', fontSize:9, fontWeight:700, color:'var(--t-muted)', letterSpacing:'0.04em' }}>{l}</div>
                  ))}
                </div>
                <div style={{ width:24, flexShrink:0 }} />
              </div>

              {hist.map((w, wi) => (
                <div key={wi} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:10, color: w.isCurrent ? 'var(--t-text)' : 'var(--t-muted)', fontWeight: w.isCurrent ? 700 : 400, whiteSpace:'nowrap', width:70, flexShrink:0 }}>
                    {w.isCurrent ? 'Esta sem.' : formatWeekLabel(weeks[wi].mon, weeks[wi].sun).split(' – ')[0]}
                  </div>
                  <div style={{ display:'flex', gap:5, flex:1 }}>
                    {w.dias.map((filled, di) => {
                      const isToday = w.dayStrs[di] === todayStr;
                      return (
                        <div key={di} style={{
                          width:22, height:22, borderRadius:6,
                          border: `1px solid ${filled ? (w.ok ? 'rgba(34,197,94,0.35)' : 'rgba(249,115,22,0.4)') : isToday ? 'var(--t-muted)' : 'var(--t-dim)'}`,
                          background: filled ? (w.ok ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.15)') : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:8, fontWeight:700,
                          color: filled ? (w.ok ? '#22C55E' : 'var(--t-accent)') : isToday ? 'var(--t-text)' : 'transparent',
                        }}>
                          {filled ? '✓' : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color: w.ok ? '#22C55E' : 'var(--t-muted)', width:24, textAlign:'right', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
                    {w.ses}/{obj.sesiones}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Formulario nuevo / editar */}
      <div style={{ padding:'16px 16px 0' }}>
        {editando !== null ? (
          <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-accent)', borderRadius:16, padding:'16px 14px' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, textTransform:'uppercase', color:'var(--t-text)', marginBottom:12 }}>
              {editando === 'nuevo' ? 'Nuevo objetivo' : `Editar · ${editando.deporte}`}
            </div>

            {editando === 'nuevo' && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)', marginBottom:5 }}>Deporte</div>
                <select value={form.deporte} onChange={e => setForm(f => ({ ...f, deporte: e.target.value }))}
                  style={{ width:'100%', background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:9, fontSize:14, appearance:'none' }}>
                  <option value="">Seleccioná un deporte</option>
                  {deportesDisponibles.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)', marginBottom:8 }}>Sesiones por semana</div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <button onClick={() => setForm(f => ({ ...f, sesiones: Math.max(1, f.sesiones - 1) }))}
                  style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:32, color:'var(--t-accent)', minWidth:32, textAlign:'center', lineHeight:1 }}>{form.sesiones}</span>
                <button onClick={() => setForm(f => ({ ...f, sesiones: Math.min(14, f.sesiones + 1) }))}
                  style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                <span style={{ fontSize:12, color:'var(--t-muted)' }}>sesiones / sem</span>
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={guardar}
                style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
                Guardar
              </button>
              <button onClick={() => setEditando(null)}
                style={{ padding:'11px 16px', borderRadius:10, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, cursor:'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setForm({ deporte:'', sesiones:3 }); setEditando('nuevo'); }}
            style={{ width:'100%', padding:'13px', borderRadius:14, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            + Agregar objetivo
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detalle, setDetalle]         = useState(null);
  const [subtab, setSubtab]           = useState('historial');

  async function load() {
    setLoading(true);
    try { const d = await getActividades(); setActividades((Array.isArray(d) ? d : []).filter(Boolean)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    await deleteActividad(id);
    setActividades(prev => prev.filter(a => a.id !== id));
  }

  function handleFotoUploaded(id, foto_url) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, foto_url } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url } : prev);
  }

  function handleFotoDeleted(id) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, foto_url: null } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url: null } : prev);
  }

  // Agrupar por mes → fecha
  const grouped = {}; // { 'YYYY-MM': { 'YYYY-MM-DD': [act, ...] } }
  actividades.forEach(a => {
    const mes   = a.fecha.slice(0, 7);
    const fecha = a.fecha.slice(0, 10);
    if (!grouped[mes]) grouped[mes] = {};
    if (!grouped[mes][fecha]) grouped[mes][fecha] = [];
    grouped[mes][fecha].push(a);
  });
  const sortedMeses = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  // Stats del mes actual
  const now      = new Date();
  const mesKey   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actsMes  = actividades.filter(a => a.fecha.slice(0,7) === mesKey);
  const ptosMes  = actsMes.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const minsMes  = actsMes.reduce((s, a) => s + parseFloat(a.minutos), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>

      {/* ── HEADER ── */}
      <div style={{ background:'var(--t-ground)', borderBottom:'1px solid var(--t-surface2)' }}>
        <div style={{ padding:'20px 20px 14px' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:5 }}>
            Personal
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(26px,7vw,36px)', textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
            Mis actividades
          </div>
        </div>

        {/* Subtabs */}
        <div style={{ display:'flex', padding:'0 16px', gap:4 }}>
          {[{ id:'historial', label:'Historial' }, { id:'objetivos', label:'Objetivos' }, { id:'evolucion', label:'Evolución' }].map(t => (
            <button key={t.id} onClick={() => setSubtab(t.id)}
              style={{ padding:'7px 16px', borderRadius:'10px 10px 0 0', border:'none', cursor:'pointer', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', WebkitTapHighlightColor:'transparent', transition:'all 0.15s',
                background: subtab === t.id ? 'var(--t-surface)' : 'transparent',
                color: subtab === t.id ? 'var(--t-accent)' : 'var(--t-muted)',
                borderBottom: subtab === t.id ? '2px solid var(--t-accent)' : '2px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ padding:'0 0 40px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'80px 20px', color:'var(--t-muted)', fontSize:14 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            Cargando…
          </div>
        ) : subtab === 'evolucion' ? (
          <Evolucion actividades={actividades} />
        ) : subtab === 'objetivos' ? (
          <Objetivos actividades={actividades} />
        ) : actividades.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px', color:'var(--t-muted)' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', marginBottom:8 }}>
              Sin actividades
            </div>
            <div style={{ fontSize:14, lineHeight:1.6, marginBottom:24 }}>
              Registrá tu primera actividad para empezar a acumular puntos.
            </div>
            <button onClick={onNewActivity}
              style={{ padding:'13px 28px', borderRadius:14, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', background:'var(--t-accent)', color:'var(--t-ground)', border:'none', cursor:'pointer' }}>
              + Nueva actividad
            </button>
          </div>
        ) : (
          sortedMeses.map(mes => {
            const [y, m] = mes.split('-');
            const mesLabel = `${MONTHS_ES[parseInt(m)-1]} ${y}`;
            const fechas = Object.keys(grouped[mes]).sort((a, b) => b.localeCompare(a));
            const ptsMes = Object.values(grouped[mes]).flat().reduce((s, a) => s + parseFloat(a.puntos), 0);

            return (
              <div key={mes}>
                {/* Separador de mes */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'18px 20px 8px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:13, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)', flexShrink:0 }}>
                    {mesLabel}
                  </div>
                  <div style={{ flex:1, height:1, background:'var(--t-surface2)' }} />
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700, color:'var(--t-accent)', flexShrink:0 }}>
                    {Math.round(ptsMes)} pts
                  </div>
                </div>

                {/* Días del mes */}
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {fechas.map(fecha => {
                    const acts = grouped[mes][fecha];
                    const date = new Date(fecha + 'T12:00:00');
                    const dow  = date.toLocaleDateString('es', { weekday:'long' });
                    const day  = date.getDate();
                    const ptsDia = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

                    return (
                      <div key={fecha}>
                        {/* Header del día */}
                        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:7, padding:'0 16px' }}>
                          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, color:'var(--t-muted2)', textTransform:'capitalize' }}>
                            {dow} {day}
                          </span>
                          <span style={{ fontSize:10, color:'var(--t-muted)', fontFamily:"'JetBrains Mono', monospace" }}>
                            · {Math.round(ptsDia)} pts
                          </span>
                        </div>
                        {acts.map(a => (
                          <ActividadCard key={a.id} a={a} onClick={() => setDetalle(a)} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {detalle && createPortal(
        <DetallePanel
          actividad={detalle}
          onClose={() => setDetalle(null)}
          onDelete={handleDelete}
          onFotoUploaded={handleFotoUploaded}
          onFotoDeleted={handleFotoDeleted}
        />,
        document.body
      )}
    </div>
  );
}
