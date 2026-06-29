import { useEffect, useRef, useState } from 'react';
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

// ─── Tarjeta de actividad ─────────────────────────────────────────────────────

function ActividadCard({ a, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'var(--t-surface)', border:'1px solid var(--t-surface2)', borderRadius:14, overflow:'hidden', cursor:'pointer', WebkitTapHighlightColor:'transparent', display:'flex', alignItems:'stretch', transition:'border-color 0.15s' }}
      onTouchStart={e => { e.currentTarget.style.borderColor='var(--t-accent)'; e.currentTarget.style.transform='scale(0.985)'; }}
      onTouchEnd={e => { e.currentTarget.style.borderColor='var(--t-surface2)'; e.currentTarget.style.transform='scale(1)'; }}>

      {/* Foto lateral (si existe) */}
      {a.foto_url && (
        <div style={{ width:68, flexShrink:0, position:'relative', overflow:'hidden' }}>
          <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent 60%, rgba(15,29,46,0.4) 100%)' }} />
        </div>
      )}

      {/* Contenido */}
      <div style={{ flex:1, minWidth:0, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.02em', color:'var(--t-text)', lineHeight:1 }}>
            {a.deporte_nombre}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:4, fontFamily:"'JetBrains Mono', monospace" }}>
            {Math.round(parseFloat(a.minutos))} min
          </div>
          {a.notas && (
            <div style={{ fontSize:11, color:'var(--t-muted2)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:'italic' }}>
              {a.notas}
            </div>
          )}
        </div>

        {/* Puntos */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:19, color:'var(--t-accent)', lineHeight:1 }}>
            {Math.round(parseFloat(a.puntos))}
          </div>
          <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>pts</div>
        </div>

        {/* Chevron */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-muted2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [detalle, setDetalle]         = useState(null);

  async function load() {
    setLoading(true);
    try { setActividades(await getActividades()); }
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
      <div style={{ padding:'20px 20px 16px', background:'linear-gradient(180deg, var(--t-ground) 0%, var(--t-ground) 100%)', borderBottom:'1px solid var(--t-surface2)' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:5 }}>
          Historial
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(26px,7vw,36px)', textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
          Mis actividades
        </div>

        {/* KPIs del mes actual */}
        {actsMes.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:14 }}>
            {[
              { label:'Este mes',  value: actsMes.length,                           unit:'actividades', accent:false },
              { label:'Minutos',   value: Math.round(minsMes).toLocaleString('es'), unit:'min',         accent:false },
              { label:'Puntos',    value: Math.round(ptosMes).toLocaleString('es'), unit:'pts',         accent:true  },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 10px 8px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: accent ? 'var(--t-accent)' : 'var(--t-dim)', opacity: accent ? 0.8 : 0.4 }} />
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'clamp(15px,4vw,20px)', color: accent ? 'var(--t-accent)' : 'var(--t-text)', lineHeight:1 }}>
                  {value}
                </div>
                <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:3, textTransform:'uppercase', letterSpacing:'0.06em' }}>{unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTA ── */}
      <div style={{ padding:'0 0 40px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'80px 20px', color:'var(--t-muted)', fontSize:14 }}>
            <div style={{ width:20, height:20, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            Cargando…
          </div>
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
                        {/* Tarjetas */}
                        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                          {acts.map(a => (
                            <ActividadCard key={a.id} a={a} onClick={() => setDetalle(a)} />
                          ))}
                        </div>
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
