import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActividades, deleteActividad } from '../api/actividades';
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

// ─── Fila de actividad estilo feed ───────────────────────────────────────────

function ActividadCard({ a, onClick }) {
  return (
    <div onClick={onClick} style={{ borderBottom:'1px solid var(--t-surface2)', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>

      {/* Header: deporte + pts + hora */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px 8px' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.02em', color:'var(--t-text)', lineHeight:1 }}>
            {a.deporte_nombre}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>
            {Math.round(parseFloat(a.minutos))} min
            {a.notas && <span style={{ marginLeft:6, fontStyle:'italic', color:'var(--t-muted2)' }}>· {a.notas}</span>}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:'var(--t-accent)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
            {Math.round(parseFloat(a.puntos))}
          </div>
          <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:1 }}>pts</div>
        </div>
      </div>

      {/* Foto full width */}
      {a.foto_url && (
        <div style={{ marginBottom:12, overflow:'hidden' }}>
          <img src={a.foto_url} alt={a.deporte_nombre}
            style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
        </div>
      )}
    </div>
  );
}

// ─── Evolución de puntos ──────────────────────────────────────────────────────

function Evolucion({ actividades }) {
  const canvasRef = useRef(null);

  // Agrupar por mes y acumular puntos
  const meses = [...new Set(actividades.map(a => a.fecha.slice(0,7)))].sort();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meses.length) return;
    const ctx = canvas.getContext('2d');

    // Puntos acumulados por mes
    let acum = 0;
    const data = meses.map(mes => {
      const pts = actividades
        .filter(a => a.fecha.slice(0,7) === mes)
        .reduce((s, a) => s + parseFloat(a.puntos), 0);
      acum += pts;
      return { mes, pts, acum };
    });

    const W = canvas.parentElement?.offsetWidth || 300;
    const H = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const pad = { top:20, right:20, bottom:36, left:50 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => d.acum)) || 1;
    const n = data.length;

    // Área rellena bajo la curva
    const accentR = getComputedStyle(document.documentElement).getPropertyValue('--t-accent-r').trim() || '79,142,247';
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    grad.addColorStop(0, `rgba(${accentR},0.22)`);
    grad.addColorStop(1, `rgba(${accentR},0.0)`);

    const xOf = i => pad.left + (i / Math.max(n - 1, 1)) * w;
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
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.acum);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(xOf(n - 1), pad.top + h);
    ctx.lineTo(xOf(0), pad.top + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Línea principal
    ctx.beginPath();
    ctx.strokeStyle = `rgb(${accentR})`;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.acum);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Puntos + etiquetas de mes
    const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    data.forEach((d, i) => {
      const x = xOf(i), y = yOf(d.acum);
      // Punto
      ctx.beginPath();
      ctx.arc(x, y, i === n - 1 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${accentR})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, i === n - 1 ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'var(--t-ground, #0e0f11)';
      ctx.fill();
      // Etiqueta mes (solo si hay espacio)
      const showLabel = n <= 8 || i % Math.ceil(n / 6) === 0 || i === n - 1;
      if (showLabel) {
        const [yy, mm] = d.mes.split('-');
        ctx.fillStyle = 'rgba(120,145,180,0.8)';
        ctx.font = `9px Inter, sans-serif`;
        ctx.textAlign = i === 0 ? 'left' : i === n - 1 ? 'right' : 'center';
        ctx.fillText(`${MONTHS_SHORT[parseInt(mm) - 1]} ${yy.slice(2)}`, x, H - 8);
      }
    });
  }, [actividades, meses]);

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

  // Stats resumen
  const totalPts  = actividades.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const totalMin  = actividades.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const totalActs = actividades.length;
  const mejorMes  = (() => {
    const byMes = {};
    actividades.forEach(a => {
      const m = a.fecha.slice(0,7);
      byMes[m] = (byMes[m] || 0) + parseFloat(a.puntos);
    });
    const best = Object.entries(byMes).sort((a,b) => b[1]-a[1])[0];
    if (!best) return null;
    const [y, m] = best[0].split('-');
    const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return { label: `${MONTHS_ES[parseInt(m)-1]} ${y}`, pts: Math.round(best[1]) };
  })();

  const statStyle = { display:'flex', flexDirection:'column', alignItems:'center', gap:2, flex:1 };
  const valStyle  = { fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, lineHeight:1, fontVariantNumeric:'tabular-nums' };
  const lblStyle  = { fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em' };

  return (
    <div style={{ padding:'16px 16px 32px', display:'flex', flexDirection:'column', gap:20 }}>

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
      <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'16px 12px 8px' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginBottom:10 }}>
          Puntos acumulados
        </div>
        <canvas ref={canvasRef} style={{ display:'block', width:'100%' }} />
      </div>

      {/* Mejor mes */}
      {mejorMes && (
        <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginBottom:4 }}>Mejor mes</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, color:'var(--t-text)' }}>{mejorMes.label}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, color:'var(--t-accent)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{mejorMes.pts.toLocaleString('es')}</div>
            <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>pts</div>
          </div>
        </div>
      )}

      {/* Tabla mensual */}
      <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, overflow:'hidden' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', padding:'12px 16px 8px', borderBottom:'1px solid var(--t-dim)' }}>
          Por mes
        </div>
        {[...meses].reverse().map(mes => {
          const actsDelMes = actividades.filter(a => a.fecha.slice(0,7) === mes);
          const pts  = Math.round(actsDelMes.reduce((s, a) => s + parseFloat(a.puntos), 0));
          const mins = Math.round(actsDelMes.reduce((s, a) => s + parseFloat(a.minutos), 0));
          const [y, m] = mes.split('-');
          const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
          const maxPtsMes = Math.max(...meses.map(mm => actividades.filter(a=>a.fecha.slice(0,7)===mm).reduce((s,a)=>s+parseFloat(a.puntos),0)));
          const pct = Math.round((pts / (maxPtsMes || 1)) * 100);
          return (
            <div key={mes} style={{ padding:'10px 16px', borderBottom:'1px solid var(--t-surface2)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, color:'var(--t-text)' }}>
                  {MONTHS_ES[parseInt(m)-1]} {y}
                </span>
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:16, color:'var(--t-accent)', fontVariantNumeric:'tabular-nums' }}>{pts.toLocaleString('es')}</span>
                  <span style={{ fontSize:9, color:'var(--t-muted)', marginLeft:3, textTransform:'uppercase' }}>pts</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, height:3, background:'var(--t-surface2)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.7 }} />
                </div>
                <span style={{ fontSize:10, color:'var(--t-muted)', whiteSpace:'nowrap' }}>{actsDelMes.length} ses · {mins} min</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detalle, setDetalle]         = useState(null);
  const [subtab, setSubtab]           = useState('evolucion');

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
          {[{ id:'evolucion', label:'Evolución' }, { id:'historial', label:'Historial' }].map(t => (
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
                <div style={{ display:'flex', flexDirection:'column', gap:14, padding:'0 16px' }}>
                  {fechas.map(fecha => {
                    const acts = grouped[mes][fecha];
                    const date = new Date(fecha + 'T12:00:00');
                    const dow  = date.toLocaleDateString('es', { weekday:'long' });
                    const day  = date.getDate();
                    const ptsDia = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

                    return (
                      <div key={fecha}>
                        {/* Header del día */}
                        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:7 }}>
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
