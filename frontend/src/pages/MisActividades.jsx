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

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Panel de detalle (bottom sheet) ─────────────────────────────────────────

function DetallePanel({ actividad, onClose, onDelete, onFotoUploaded, onFotoDeleted }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(false);
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
    try { await deleteFoto(actividad.id); onFotoDeleted(actividad.id); }
    catch (err) { alert('Error: ' + err.message); }
  }

  async function handleDeleteActividad() {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await onDelete(actividad.id);
    onClose();
  }

  const fecha = new Date(actividad.fecha + 'T12:00:00');
  const fechaLabel = fecha.toLocaleDateString('es', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <>
      {/* Lightbox */}
      {lightbox && actividad.foto_url && (
        <div onClick={() => setLightbox(false)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <button onClick={() => setLightbox(false)}
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(36,61,87,0.9)', border:'none', color:'#E8F0FE', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <img src={actividad.foto_url} alt={actividad.deporte_nombre} onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain' }} />
        </div>
      )}

      {/* Overlay */}
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(5,12,20,0.65)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }} />

      {/* Sheet */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:101, background:'#0F1D2E', border:'1px solid #243D57', borderBottom:'none', borderRadius:'20px 20px 0 0', maxHeight:'93dvh', overflowY:'auto', paddingBottom:'calc(24px + env(safe-area-inset-bottom))' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 8px' }}>
          <div style={{ width:36, height:4, borderRadius:4, background:'#243D57' }} />
        </div>

        {/* Foto */}
        {actividad.foto_url ? (
          <div onClick={() => setLightbox(true)} style={{ position:'relative', margin:'0 16px 16px', borderRadius:14, overflow:'hidden', cursor:'pointer' }}>
            <img src={actividad.foto_url} alt={actividad.deporte_nombre}
              style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(5,12,20,0.75) 0%, transparent 50%)' }} />
            <div style={{ position:'absolute', bottom:10, left:0, right:0, textAlign:'center', fontSize:11, color:'rgba(232,240,254,0.6)', letterSpacing:'0.04em' }}>
              Toca para ampliar
            </div>
            <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{ position:'absolute', top:10, right:10, background:'rgba(13,27,42,0.8)', border:'1px solid rgba(255,255,255,0.15)', color:'#E8F0FE', borderRadius:8, padding:'6px 11px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              📷 Cambiar
            </button>
            <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
              style={{ position:'absolute', top:10, left:10, background:'rgba(13,27,42,0.8)', border:'1px solid rgba(248,113,113,0.35)', color:'#F87171', borderRadius:8, padding:'6px 11px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              ✕ Quitar
            </button>
          </div>
        ) : (
          <div style={{ margin:'0 16px 16px' }}>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ width:'100%', aspectRatio:'16/9', borderRadius:14, border:'1.5px dashed #243D57', background:'rgba(26,46,69,0.3)', color:'#7A9BBF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
              {uploading
                ? <><div style={{ width:24, height:24, border:'2px solid #243D57', borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span style={{ fontSize:13 }}>Subiendo…</span></>
                : <><span style={{ fontSize:34 }}>📷</span><span style={{ fontSize:14, fontWeight:600 }}>Agregar foto</span><span style={{ fontSize:12, marginTop:2 }}>Galería o cámara</span></>}
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display:'none' }} />

        {/* Info principal */}
        <div style={{ padding:'0 20px' }}>

          {/* Deporte + fecha + puntos */}
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:18 }}>
            <span style={{ fontSize:44, lineHeight:1, flexShrink:0 }}>{icon(actividad.deporte_nombre)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'#E8F0FE' }}>
                {actividad.deporte_nombre}
              </div>
              <div style={{ fontSize:12, color:'#7A9BBF', marginTop:4, lineHeight:1.4 }}>
                {fechaLabel.charAt(0).toUpperCase() + fechaLabel.slice(1)}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:30, color:'#38BDF8', lineHeight:1 }}>
                {Math.round(parseFloat(actividad.puntos))}
              </div>
              <div style={{ fontSize:10, color:'#7A9BBF', marginTop:3, textTransform:'uppercase', letterSpacing:'0.08em' }}>puntos</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            {[
              { label:'Minutos', value: Math.round(parseFloat(actividad.minutos)) + ' min' },
              { label:'Ponderador', value: '×' + parseFloat(actividad.ponderador).toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'#E8F0FE', lineHeight:1 }}>{value}</div>
                <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:5 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Notas */}
          {actividad.notas && (
            <div style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:10, color:'#7A9BBF', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Notas</div>
              <div style={{ fontSize:14, color:'#E8F0FE', lineHeight:1.6 }}>{actividad.notas}</div>
            </div>
          )}

          {/* Eliminar */}
          <button onClick={handleDeleteActividad}
            style={{ width:'100%', padding:'14px', borderRadius:14, border:'1px solid rgba(248,113,113,0.25)', background:'rgba(248,113,113,0.06)', color:'#F87171', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', marginTop:4 }}>
            Eliminar actividad
          </button>
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
      style={{ background:'#0F1D2E', border:'1px solid #1E3450', borderRadius:14, overflow:'hidden', cursor:'pointer', WebkitTapHighlightColor:'transparent', display:'flex', alignItems:'stretch', transition:'border-color 0.15s' }}
      onTouchStart={e => { e.currentTarget.style.borderColor='#38BDF8'; e.currentTarget.style.transform='scale(0.985)'; }}
      onTouchEnd={e => { e.currentTarget.style.borderColor='#1E3450'; e.currentTarget.style.transform='scale(1)'; }}>

      {/* Foto lateral (si existe) */}
      {a.foto_url && (
        <div style={{ width:72, flexShrink:0, position:'relative', overflow:'hidden' }}>
          <img src={a.foto_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent 60%, rgba(15,29,46,0.4) 100%)' }} />
        </div>
      )}

      {/* Contenido */}
      <div style={{ flex:1, minWidth:0, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
        {/* Icono (solo si no hay foto) */}
        {!a.foto_url && (
          <span style={{ fontSize:28, flexShrink:0, lineHeight:1 }}>{icon(a.deporte_nombre)}</span>
        )}

        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.02em', color:'#E8F0FE', lineHeight:1 }}>
            {a.deporte_nombre}
          </div>
          <div style={{ fontSize:12, color:'#7A9BBF', marginTop:4, fontFamily:"'JetBrains Mono', monospace" }}>
            {Math.round(parseFloat(a.minutos))} min
            {a.foto_url && <span style={{ marginLeft:8, color:'rgba(56,189,248,0.7)' }}>📷</span>}
          </div>
          {a.notas && (
            <div style={{ fontSize:11, color:'#4A7A9B', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:'italic' }}>
              {a.notas}
            </div>
          )}
        </div>

        {/* Puntos */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:20, color:'#38BDF8', lineHeight:1 }}>
            {Math.round(parseFloat(a.puntos))}
          </div>
          <div style={{ fontSize:10, color:'#7A9BBF', marginTop:3, textTransform:'uppercase', letterSpacing:'0.05em' }}>pts</div>
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2A4A6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
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
  const totalActs = actividades.length;

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>

      {/* ── HEADER ── */}
      <div style={{ padding:'22px 20px 18px', background:'linear-gradient(180deg, #0A1520 0%, #0D1B2A 100%)', borderBottom:'1px solid #1A2E45' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'#38BDF8', marginBottom:6 }}>
          Historial
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(28px,8vw,40px)', textTransform:'uppercase', lineHeight:1, color:'#E8F0FE' }}>
          Mis actividades
        </div>

        {/* KPIs del mes actual */}
        {actsMes.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16 }}>
            {[
              { label:'Este mes',  value: actsMes.length,                           unit:'actividades', accent:false },
              { label:'Minutos',   value: Math.round(minsMes).toLocaleString('es'), unit:'min',         accent:false },
              { label:'Puntos',    value: Math.round(ptosMes).toLocaleString('es'), unit:'pts',         accent:true  },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} style={{ background:'#132236', border:'1px solid #243D57', borderRadius:12, padding:'12px 12px 10px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: accent ? '#38BDF8' : '#243D57', opacity: accent ? 0.8 : 0.4 }} />
                <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'clamp(16px,4.5vw,22px)', color: accent ? '#38BDF8' : '#E8F0FE', lineHeight:1 }}>
                  {value}
                </div>
                <div style={{ fontSize:10, color:'#7A9BBF', marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LISTA ── */}
      <div style={{ padding:'0 0 40px' }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'80px 20px', color:'#7A9BBF', fontSize:14 }}>
            <div style={{ width:20, height:20, border:'2px solid #243D57', borderTopColor:'#38BDF8', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            Cargando…
          </div>
        ) : actividades.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px', color:'#7A9BBF' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🏅</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, textTransform:'uppercase', color:'#E8F0FE', marginBottom:8 }}>
              Sin actividades
            </div>
            <div style={{ fontSize:14, lineHeight:1.6, marginBottom:24 }}>
              Registrá tu primera actividad para empezar a acumular puntos.
            </div>
            <button onClick={onNewActivity}
              style={{ padding:'13px 28px', borderRadius:14, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', background:'#38BDF8', color:'#0D1B2A', border:'none', cursor:'pointer' }}>
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
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'20px 20px 10px' }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, textTransform:'uppercase', letterSpacing:'0.07em', color:'#7A9BBF', flexShrink:0 }}>
                    {mesLabel}
                  </div>
                  <div style={{ flex:1, height:1, background:'#1A2E45' }} />
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, fontWeight:700, color:'#38BDF8', flexShrink:0 }}>
                    {Math.round(ptsMes)} pts
                  </div>
                </div>

                {/* Días del mes */}
                <div style={{ display:'flex', flexDirection:'column', gap:16, padding:'0 20px' }}>
                  {fechas.map(fecha => {
                    const acts = grouped[mes][fecha];
                    const date = new Date(fecha + 'T12:00:00');
                    const dow  = date.toLocaleDateString('es', { weekday:'long' });
                    const day  = date.getDate();
                    const ptsDia = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

                    return (
                      <div key={fecha}>
                        {/* Header del día */}
                        <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
                          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700, color:'#4A7A9B', textTransform:'capitalize' }}>
                            {dow} {day}
                          </span>
                          <span style={{ fontSize:10, color:'#7A9BBF', fontFamily:"'JetBrains Mono', monospace" }}>
                            · {Math.round(ptsDia)} pts
                          </span>
                        </div>
                        {/* Tarjetas */}
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
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
