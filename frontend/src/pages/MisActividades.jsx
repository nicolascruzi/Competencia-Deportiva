import { useEffect, useRef, useState } from 'react';
import { getActividades, deleteActividad } from '../api/actividades';
import { uploadFoto, deleteFoto } from '../api/fotos';

const SPORT_ICONS = {
  'Bicicleta MTB':'🚵','Bicicleta Rodillo':'🚴','Bicicleta Ruta':'🚴','Box':'🥊',
  'Buceo':'🤿','Crossfit':'🏋️','Cuerda':'🪢','Escalada':'🧗','Funcional':'💪',
  'Fútbol':'⚽','Gimnasio':'🏋️','Golf':'⛳','Natación':'🏊','Padel':'🏓',
  'Spinning':'🚴','Surf':'🏄','Tenis':'🎾','Trail Running':'🏃','Trekking':'🥾','Trote':'🏃',
};
const icon = s => SPORT_ICONS[s] || '🏅';

// ─── Panel de detalle (bottom sheet) ──────────────────────────────────────────

function DetallePanel({ actividad, onClose, onDelete, onFotoUploaded, onFotoDeleted }) {
  const fileInputRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(false);

  // Cierra con swipe hacia abajo
  const startY = useRef(null);
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
      const { foto_url } = await uploadFoto(actividad.id, file);
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
    try {
      await deleteFoto(actividad.id);
      onFotoDeleted(actividad.id);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleDeleteActividad() {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await onDelete(actividad.id);
    onClose();
  }

  const fecha = new Date(actividad.fecha + 'T12:00:00');
  const fechaLabel = fecha.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* Lightbox de foto */}
      {lightbox && actividad.foto_url && (
        <div onClick={() => setLightbox(false)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.96)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <button onClick={() => setLightbox(false)}
            style={{ position:'absolute', top:16, right:16, color:'#7A9BBF', fontSize:22, background:'transparent', border:'none', cursor:'pointer', padding:'6px 10px' }}>
            ✕
          </button>
          <img src={actividad.foto_url} alt={actividad.deporte_nombre}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain' }} />
        </div>
      )}

      {/* Overlay fondo */}
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(5,12,20,0.6)', backdropFilter:'blur(4px)' }} />

      {/* Panel */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101, background:'#132236', border:'1px solid #243D57', borderBottom:'none', borderRadius:'24px 24px 0 0', maxHeight:'92dvh', overflowY:'auto', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12, paddingBottom:4 }}>
          <div style={{ width:40, height:4, borderRadius:4, background:'#243D57' }} />
        </div>

        {/* Foto principal */}
        {actividad.foto_url ? (
          <div style={{ position:'relative', margin:'8px 16px 0', borderRadius:16, overflow:'hidden', cursor:'pointer' }}
               onClick={() => setLightbox(true)}>
            <img src={actividad.foto_url} alt={actividad.deporte_nombre}
              style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
            {/* Gradiente inferior */}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(13,27,42,0.7) 0%, transparent 55%)' }} />
            {/* Hint de toque */}
            <div style={{ position:'absolute', bottom:10, left:0, right:0, textAlign:'center', fontSize:11, color:'rgba(232,240,254,0.7)', fontFamily:"'JetBrains Mono', monospace" }}>
              Toca para ver en grande
            </div>
            {/* Botón cambiar foto */}
            <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{ position:'absolute', top:10, right:10, background:'rgba(13,27,42,0.75)', border:'1px solid #243D57', color:'#E8F0FE', borderRadius:8, padding:'5px 10px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              📷 Cambiar
            </button>
            {/* Botón borrar foto */}
            <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
              style={{ position:'absolute', top:10, left:10, background:'rgba(13,27,42,0.75)', border:'1px solid rgba(248,113,113,0.4)', color:'#F87171', borderRadius:8, padding:'5px 10px', fontSize:12, cursor:'pointer' }}>
              ✕ Quitar
            </button>
          </div>
        ) : (
          /* Sin foto — botón grande para agregar */
          <div style={{ margin:'8px 16px 0' }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width:'100%', aspectRatio:'16/9', borderRadius:16, border:'2px dashed #243D57', background:'transparent', color:'#7A9BBF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
              {uploading ? (
                <>
                  <div style={{ width:24, height:24, border:'2px solid #243D57', borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  <span style={{ fontSize:13 }}>Subiendo…</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize:36 }}>📷</span>
                  <span style={{ fontSize:14, fontWeight:600 }}>Agregar foto</span>
                  <span style={{ fontSize:12 }}>Galería o cámara</span>
                </>
              )}
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display:'none' }} />

        {/* Datos de la actividad */}
        <div style={{ padding:'16px 16px 0' }}>
          {/* Deporte + puntos */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <span style={{ fontSize:40 }}>{icon(actividad.deporte_nombre)}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:28, textTransform:'uppercase', lineHeight:1 }}>
                {actividad.deporte_nombre}
              </div>
              <div style={{ fontSize:12, color:'#7A9BBF', marginTop:2 }}>
                {fechaLabel.charAt(0).toUpperCase() + fechaLabel.slice(1)}
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:28, color:'#38BDF8', lineHeight:1 }}>
                {Math.round(parseFloat(actividad.puntos))}
              </div>
              <div style={{ fontSize:11, color:'#7A9BBF' }}>puntos</div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {[
              { label:'Minutos',    value:Math.round(parseFloat(actividad.minutos)) },
              { label:'Ponderador', value:'×' + parseFloat(actividad.ponderador).toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'#1A2E45', border:'1px solid #243D57', borderRadius:12, padding:'10px 14px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:20, color:'#E8F0FE' }}>{value}</div>
                <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Notas */}
          {actividad.notas && (
            <div style={{ background:'#1A2E45', border:'1px solid #243D57', borderRadius:12, padding:'10px 14px', marginBottom:12 }}>
              <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Notas</div>
              <div style={{ fontSize:14, color:'#E8F0FE', lineHeight:1.5 }}>{actividad.notas}</div>
            </div>
          )}

          {/* Botón eliminar actividad */}
          <button onClick={handleDeleteActividad}
            style={{ width:'100%', padding:'14px', borderRadius:16, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.08)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer' }}>
            Eliminar actividad
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ─── Tarjeta compacta en la lista ─────────────────────────────────────────────

function ActividadCard({ a, onClick }) {
  return (
    <div onClick={onClick}
      style={{ background:'#132236', border:'1px solid #243D57', borderRadius:16, overflow:'hidden', cursor:'pointer', WebkitTapHighlightColor:'transparent', transition:'transform 0.1s' }}
      onTouchStart={e => e.currentTarget.style.transform='scale(0.98)'}
      onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>

      {/* Miniatura de foto si existe */}
      {a.foto_url && (
        <div style={{ position:'relative', height:120, overflow:'hidden' }}>
          <img src={a.foto_url} alt={a.deporte_nombre}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(13,27,42,0.65) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* Info */}
      <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:28, flexShrink:0 }}>{icon(a.deporte_nombre)}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:15 }}>{a.deporte_nombre}</div>
          {a.notas && (
            <div style={{ fontSize:11, color:'#7A9BBF', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.notas}</div>
          )}
          <div style={{ fontSize:11, color:'#7A9BBF', marginTop:2, fontFamily:"'JetBrains Mono', monospace" }}>
            {Math.round(parseFloat(a.minutos))} min
            {a.foto_url && <span style={{ marginLeft:8, color:'#38BDF8' }}>📷</span>}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:18, color:'#38BDF8', lineHeight:1 }}>
            {Math.round(parseFloat(a.puntos))}
          </div>
          <div style={{ fontSize:10, color:'#7A9BBF', marginTop:1 }}>pts</div>
        </div>
        {/* Indicador de que es tappable */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#243D57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [detalle, setDetalle]           = useState(null); // actividad seleccionada

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

  const groupedByDate = actividades.reduce((acc, a) => {
    const fecha = a.fecha.slice(0, 10);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const now       = new Date();
  const mesActual = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actsMes   = actividades.filter(a => a.fecha.slice(0,7) === mesActual);
  const ptosMes   = actsMes.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const minsMes   = actsMes.reduce((s, a) => s + parseFloat(a.minutos), 0);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: '#0D1B2A' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#38BDF8' }}>
          Historial
        </div>
        <div className="font-bold uppercase leading-none"
             style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(26px,7vw,38px)' }}>
          Mis actividades
        </div>

        {actsMes.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label:'Este mes', value:actsMes.length,                             unit:'act.' },
              { label:'Minutos',  value:Math.round(minsMes).toLocaleString('es'),   unit:'min' },
              { label:'Puntos',   value:Math.round(ptosMes).toLocaleString('es'),   unit:'pts', accent:true },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} className="rounded-xl p-3" style={{ background:'#132236', border:'1px solid #243D57' }}>
                <div className="font-bold text-xl leading-tight"
                     style={{ fontFamily:"'JetBrains Mono', monospace", color: accent ? '#38BDF8' : '#E8F0FE' }}>
                  {value}
                </div>
                <div className="text-xs mt-0.5" style={{ color:'#7A9BBF' }}>{unit}</div>
                <div className="text-xs mt-0.5" style={{ color:'#7A9BBF', fontSize:'10px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color:'#7A9BBF' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor:'#243D57', borderTopColor:'#38BDF8' }} />
            Cargando…
          </div>
        ) : actividades.length === 0 ? (
          <div className="text-center py-24" style={{ color:'#7A9BBF' }}>
            <div className="text-5xl mb-4">🏅</div>
            <div className="font-bold text-xl uppercase mb-2" style={{ fontFamily:"'Barlow Condensed', sans-serif", color:'#E8F0FE' }}>
              Sin actividades
            </div>
            <div className="text-sm mb-6">Registrá tu primera actividad.</div>
            <button onClick={onNewActivity}
              className="px-6 py-3 rounded-2xl font-bold text-base uppercase tracking-wide"
              style={{ fontFamily:"'Barlow Condensed', sans-serif", background:'#38BDF8', color:'#0D1B2A' }}>
              + Nueva actividad
            </button>
          </div>
        ) : (
          sortedDates.map(fecha => {
            const acts     = groupedByDate[fecha];
            const date     = new Date(fecha + 'T12:00:00');
            const label    = date.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long' });
            const totalPts = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

            return (
              <div key={fecha}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider"
                       style={{ color:'#7A9BBF', fontFamily:"'JetBrains Mono', monospace" }}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </div>
                  <div className="text-xs font-semibold" style={{ color:'#38BDF8', fontFamily:"'JetBrains Mono', monospace" }}>
                    {Math.round(totalPts)} pts
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {acts.map(a => (
                    <ActividadCard key={a.id} a={a} onClick={() => setDetalle(a)} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Panel de detalle */}
      {detalle && (
        <DetallePanel
          actividad={detalle}
          onClose={() => setDetalle(null)}
          onDelete={handleDelete}
          onFotoUploaded={handleFotoUploaded}
          onFotoDeleted={handleFotoDeleted}
        />
      )}
    </div>
  );
}
