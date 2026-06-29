import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActividades, deleteActividad } from '../api/actividades';
import { uploadFoto, deleteFoto } from '../api/fotos';
import { useLoading } from '../context/LoadingContext';

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const SPORT_ICONS = {
  'Bicicleta MTB':'🚵','Bicicleta Rodillo':'🚴','Bicicleta Ruta':'🚴','Box':'🥊',
  'Buceo':'🤿','Crossfit':'🏋️','Cuerda':'🪢','Escalada':'🧗','Funcional':'💪',
  'Fútbol':'⚽','Gimnasio':'🏋️','Golf':'⛳','Natación':'🏊','Padel':'🏓',
  'Spinning':'🚴','Surf':'🏄','Tenis':'🎾','Trail Running':'🏃','Trekking':'🥾','Trote':'🏃',
};

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

// ─── Reutilizamos el mismo DetallePanel de MisActividades ─────────────────────

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

  const fecha      = new Date(actividad.fecha + 'T12:00:00');
  const fechaLabel = fecha.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
  const yearLabel  = fecha.getFullYear();
  const horaLabel  = actividad.created_at
    ? new Date(actividad.created_at).toLocaleTimeString('es', { hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <>
      {lightbox && actividad.foto_url && (
        <div onClick={() => setLightbox(false)}
          style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <button onClick={() => setLightbox(false)}
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(36,61,87,0.9)', border:'none', color:'var(--t-text)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <img src={actividad.foto_url} alt={actividad.deporte_nombre} onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain' }} />
        </div>
      )}

      <div onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.72)', backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px 16px' }}>
        <div onClick={e => e.stopPropagation()} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ width:'100%', maxWidth:420, background:'var(--t-surface)', border:'1px solid var(--t-surface2)', borderRadius:20, overflow:'hidden', maxHeight:'calc(100dvh - 40px - env(safe-area-inset-top) - env(safe-area-inset-bottom))', display:'flex', flexDirection:'column' }}>

          {actividad.foto_url ? (
            <div style={{ position:'relative', flexShrink:0, cursor:'pointer' }} onClick={() => setLightbox(true)}>
              <img src={actividad.foto_url} alt={actividad.deporte_nombre}
                style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', display:'block' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,12,20,0.85) 0%, transparent 50%)' }} />
              <div style={{ position:'absolute', bottom:12, left:14, right:80 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
                  {actividad.deporte_nombre}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{ position:'absolute', top:10, right:10, background:'rgba(13,27,42,0.85)', border:'1px solid rgba(255,255,255,0.15)', color:'var(--t-text)', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                <IconCamera /><span>Cambiar</span>
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
                style={{ position:'absolute', top:10, left:10, background:'rgba(13,27,42,0.85)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                Quitar
              </button>
            </div>
          ) : (
            <div style={{ padding:'14px 14px 0' }}>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ width:'100%', padding:'14px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'rgba(26,46,69,0.25)', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                {uploading
                  ? <><div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span style={{ fontSize:13 }}>Subiendo…</span></>
                  : <><IconCamera /><span style={{ fontSize:13, fontWeight:600 }}>Agregar foto</span></>}
              </button>
            </div>
          )}

          <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12, overflowY:'auto', flex:1 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              {!actividad.foto_url && (
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:24, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1, flex:1 }}>
                  {actividad.deporte_nombre}
                </div>
              )}
              {actividad.foto_url && <div style={{ flex:1 }} />}
              <button onClick={onClose}
                style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                ✕
              </button>
            </div>

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

            {actividad.notas && (
              <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 13px' }}>
                <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Notas</div>
                <div style={{ fontSize:14, color:'var(--t-text)', lineHeight:1.6 }}>{actividad.notas}</div>
              </div>
            )}

            <button onClick={handleDeleteActividad}
              style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px solid rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.05)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
              Eliminar actividad
            </button>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display:'none' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Bottom sheet con actividades del día ─────────────────────────────────────

function DaySheet({ fecha, acts, onClose, onSelectAct }) {
  const startY = useRef(null);
  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  const [d, m, y] = [fecha.getDate(), fecha.getMonth(), fecha.getFullYear()];
  const label = `${DAYS_ES[fecha.getDay()]} ${d} de ${MONTHS_ES[m]}`;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }} />
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:201, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'60dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 6px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        {/* Título */}
        <div style={{ padding:'4px 20px 14px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
            {label}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>{acts.length} actividad{acts.length !== 1 ? 'es' : ''}</div>
        </div>
        {/* Lista */}
        <div style={{ overflowY:'auto', padding:'10px 16px', display:'flex', flexDirection:'column', gap:8 }}>
          {acts.map(a => (
            <div key={a.id} onClick={() => onSelectAct(a)}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
              {a.foto_url && (
                <div style={{ width:44, height:44, borderRadius:10, overflow:'hidden', flexShrink:0 }}>
                  <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                </div>
              )}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
                  {a.deporte_nombre}
                </div>
                <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3, fontFamily:"'JetBrains Mono', monospace" }}>
                  {Math.round(parseFloat(a.minutos))} min
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:18, color:'var(--t-accent)', lineHeight:1 }}>
                  {Math.round(parseFloat(a.puntos))}
                </div>
                <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>pts</div>
              </div>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-muted2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Calendario ───────────────────────────────────────────────────────────────

export default function Calendario({ competenciaActiva, navYear, navMonth, onNavYear, onNavMonth }) {
  const now = new Date();
  // Mes sincronizado con Ranking cuando se pasan las props externas
  const year  = navYear  ?? now.getFullYear();
  const month = navMonth ?? now.getMonth();
  function setYear(v)  { onNavYear?.(typeof v === 'function' ? v(year)  : v); }
  function setMonth(v) { onNavMonth?.(typeof v === 'function' ? v(month) : v); }

  const [acts, setActs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    getActividades().then(data => setActs((data || []).filter(Boolean))).finally(() => setLoading(false));
  }, []);

  // Mapa fecha → actividades
  const byDate = {};
  acts.forEach(a => {
    const key = a.fecha.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  // Días del mes
  const firstDay  = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  function dayKey(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function handleDayClick(d) {
    if (!d) return;
    const key = dayKey(d);
    if (byDate[key]?.length) {
      setSelectedDate(new Date(year, month, d));
    }
  }

  function handleFotoUploaded(id, url) {
    setActs(prev => prev.map(a => a.id === id ? { ...a, foto_url: url } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url: url } : prev);
  }
  function handleFotoDeleted(id) {
    setActs(prev => prev.map(a => a.id === id ? { ...a, foto_url: null } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url: null } : prev);
  }
  async function handleDelete(id) {
    await deleteActividad(id);
    setActs(prev => prev.filter(a => a.id !== id));
  }

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`
    : null;
  const selectedActs = selectedKey ? (byDate[selectedKey] || []) : [];

  return (
    <div style={{ paddingBottom:32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header competencia — idéntico a Ranking Fila 1 */}
      {competenciaActiva && (
        <div style={{ padding:'8px 20px 4px', borderBottom:'1px solid var(--t-surface2)' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', lineHeight:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {competenciaActiva.nombre}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)', marginTop:2 }}>
            Calendario
          </div>
        </div>
      )}

      {/* Navegación de mes — igual que Ranking */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'2px 8px 4px', borderBottom:'1px solid var(--t-surface2)' }}>
        <button onClick={prevMonth}
          style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
            {MONTHS_ES[month]}
          </div>
          <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>{year}</div>
        </div>
        <button onClick={nextMonth}
          style={{ width:36, height:36, borderRadius:10, border:'none', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Cabecera días de semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px', marginBottom:6 }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', padding:'4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Resumen del mes */}
      {!loading && (() => {
        const mesActs = acts.filter(a => {
          const d = new Date(a.fecha + 'T12:00:00');
          return d.getFullYear() === year && d.getMonth() === month;
        });
        const sesiones       = mesActs.length;
        const diasEntrenados = new Set(mesActs.map(a => a.fecha.slice(0, 10))).size;
        const minutos        = mesActs.reduce((s, a) => s + parseFloat(a.minutos || 0), 0);
        const puntos         = mesActs.reduce((s, a) => s + parseFloat(a.puntos  || 0), 0);

        let rachaActual = 0;
        const check = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        while (true) {
          const k = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,'0')}-${String(check.getDate()).padStart(2,'0')}`;
          if (!byDate[k]?.length) break;
          rachaActual++;
          check.setDate(check.getDate() - 1);
        }

        const chip = { background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 13px' };
        const num  = c => ({ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color: c, lineHeight:1 });
        const lbl  = { fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:4 };

        return (
          <div style={{ padding:'0 12px 16px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom: rachaActual >= 2 ? 6 : 0 }}>
              <div style={chip}><div style={num('var(--t-accent)')}>{sesiones}</div><div style={lbl}>Ses.</div></div>
              <div style={chip}><div style={num('var(--t-text)')}>{diasEntrenados}</div><div style={lbl}>Días</div></div>
              <div style={chip}><div style={num('var(--t-text)')}>{Math.round(minutos/60)}h</div><div style={lbl}>Horas</div></div>
              <div style={chip}><div style={num('var(--t-accent)')}>{Math.round(puntos)}</div><div style={lbl}>Pts</div></div>
            </div>
            {rachaActual >= 2 && (
              <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'9px 13px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>🔥</span>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, color:'var(--t-text)', textTransform:'uppercase', letterSpacing:'0.04em' }}>
                  Racha de {rachaActual} días
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grid de días */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'var(--t-muted)' }}>
          <div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, padding:'0 12px' }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const key      = dayKey(d);
            const isToday  = key === todayKey;
            const hasActs  = !!byDate[key]?.length;
            const count    = byDate[key]?.length || 0;
            const isSel    = selectedKey === key;

            // Emojis del día
            const dayActs  = (byDate[key] || []).filter(Boolean);
            const sportIcon = s => SPORT_ICONS[s] || '🏅';
            let emojiNode = null;
            if (count === 1) {
              emojiNode = (
                <span style={{ fontSize: isSel ? 13 : 14, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                  {sportIcon(dayActs[0].deporte_nombre)}
                </span>
              );
            } else if (count === 2) {
              emojiNode = (
                <div style={{ display:'flex', gap:1 }}>
                  {dayActs.slice(0,2).map((a, ei) => (
                    <span key={ei} style={{ fontSize:10, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                      {sportIcon(a.deporte_nombre)}
                    </span>
                  ))}
                </div>
              );
            } else {
              // 3+ → deporte con más minutos + badge con el total
              const top = [...dayActs].sort((a,b) => parseFloat(b.minutos) - parseFloat(a.minutos))[0];
              emojiNode = (
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:13, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                    {sportIcon(top.deporte_nombre)}
                  </span>
                  <span style={{ position:'absolute', top:-3, right:-6, background: isSel ? 'rgba(255,255,255,0.9)' : 'var(--t-accent)', color: isSel ? 'var(--t-accent)' : 'var(--t-ground)', fontSize:8, fontWeight:800, borderRadius:6, padding:'1px 3px', lineHeight:1.2, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    {count}
                  </span>
                </div>
              );
            }

            return (
              <button key={key} onClick={() => handleDayClick(d)}
                style={{
                  position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  aspectRatio:'1', borderRadius:12, border:'none', cursor: hasActs ? 'pointer' : 'default',
                  background: isSel ? 'var(--t-accent)' : isToday ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                  WebkitTapHighlightColor:'transparent', gap:1,
                }}>
                <span style={{
                  fontFamily:"'Barlow Condensed', sans-serif", fontWeight: isToday || isSel ? 900 : 600,
                  fontSize: hasActs ? 13 : 16, lineHeight:1,
                  color: isSel ? 'var(--t-ground)' : isToday ? 'var(--t-accent)' : hasActs ? 'var(--t-text)' : 'var(--t-muted)',
                }}>
                  {d}
                </span>
                {emojiNode}
              </button>
            );
          })}
        </div>
      )}


      {/* Bottom sheet con actividades del día */}
      {selectedDate && !detalle && createPortal(
        <DaySheet
          fecha={selectedDate}
          acts={selectedActs}
          onClose={() => setSelectedDate(null)}
          onSelectAct={a => setDetalle(a)}
        />,
        document.body
      )}

      {/* Detalle de actividad */}
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
