import { useRef, useState } from 'react';
import { uploadFoto, deleteFoto } from '../api/fotos';
import { useLoading } from '../context/LoadingContext';

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

// ─── Detalle de una actividad — con readOnly=true, viven la foto en grande, puntos, minutos y
// notas, pero sin los botones de cambiar/quitar foto ni eliminar actividad (no aplican sobre
// actividades de otra persona). ──────────────────────────────────────────────────────────────
export function DetallePanel({ actividad, onClose, onDelete, onFotoUploaded, onFotoDeleted, readOnly = false }) {
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
              {!readOnly && (
                <>
                  <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ position:'absolute', top:10, right:10, background:'rgba(13,27,42,0.85)', border:'1px solid rgba(255,255,255,0.15)', color:'var(--t-text)', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                    <IconCamera /><span>Cambiar</span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
                    style={{ position:'absolute', top:10, left:10, background:'rgba(13,27,42,0.85)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                    Quitar
                  </button>
                </>
              )}
            </div>
          ) : (
            !readOnly && (
              <div style={{ padding:'14px 14px 0' }}>
                <button onClick={() => fileInputRef.current?.click()}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'rgba(26,46,69,0.25)', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
                  {uploading
                    ? <><div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span style={{ fontSize:13 }}>Subiendo…</span></>
                    : <><IconCamera /><span style={{ fontSize:13, fontWeight:600 }}>Agregar foto</span></>}
                </button>
              </div>
            )
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

            {!readOnly && (
              <button onClick={handleDeleteActividad}
                style={{ width:'100%', padding:'11px', borderRadius:12, border:'1px solid rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.05)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
                Eliminar actividad
              </button>
            )}
          </div>
        </div>
      </div>
      {!readOnly && (
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display:'none' }} />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Bottom sheet con actividades del día ─────────────────────────────────────
export function DaySheet({ fecha, acts, onClose, onSelectAct }) {
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
