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

// ─── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(5,12,20,0.93)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <button onClick={onClose}
        style={{ position:'absolute', top:16, right:16, color:'#7A9BBF', fontSize:22, background:'transparent', border:'none', cursor:'pointer', padding:'6px 10px' }}>
        ✕
      </button>
      <img src={url} alt="Foto actividad"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:16, objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }} />
    </div>
  );
}

// ─── Tarjeta de actividad ──────────────────────────────────────────────────────

function ActividadCard({ a, onDelete, onFotoUploaded, onFotoDeleted }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox]   = useState(false);

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { foto_url } = await uploadFoto(a.id, file);
      onFotoUploaded(a.id, foto_url);
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteFoto() {
    if (!confirm('¿Eliminar la foto de esta actividad?')) return;
    try {
      await deleteFoto(a.id);
      onFotoDeleted(a.id);
    } catch (err) {
      alert('Error al eliminar la foto: ' + err.message);
    }
  }

  return (
    <>
      {lightbox && a.foto_url && <Lightbox url={a.foto_url} onClose={() => setLightbox(false)} />}

      <div className="rounded-2xl border overflow-hidden"
           style={{ background: '#132236', borderColor: '#243D57' }}>

        {/* Foto si existe */}
        {a.foto_url && (
          <div className="relative cursor-pointer" style={{ aspectRatio:'16/9' }}
               onClick={() => setLightbox(true)}>
            <img src={a.foto_url} alt={a.deporte_nombre}
              className="w-full h-full object-cover" />
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(13,27,42,0.6) 0%, transparent 50%)' }} />
            {/* Botón borrar foto */}
            <button onClick={e => { e.stopPropagation(); handleDeleteFoto(); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background:'rgba(5,12,20,0.7)', color:'#F87171', border:'1px solid rgba(248,113,113,0.35)', cursor:'pointer' }}>
              ✕
            </button>
          </div>
        )}

        {/* Info de la actividad */}
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="text-3xl shrink-0">{icon(a.deporte_nombre)}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base">{a.deporte_nombre}</div>
            {a.notas && (
              <div className="text-xs mt-0.5 truncate" style={{ color: '#7A9BBF' }}>{a.notas}</div>
            )}
            <div className="text-xs mt-1" style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(parseFloat(a.minutos))} min
            </div>
          </div>

          {/* Puntos */}
          <div className="text-right shrink-0">
            <div className="font-bold text-lg leading-tight"
                 style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
              {Math.round(parseFloat(a.puntos))}
            </div>
            <div className="text-xs" style={{ color: '#7A9BBF' }}>pts</div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-1 shrink-0">
            {/* Agregar/cambiar foto */}
            <button onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all text-sm"
              style={{ color: uploading ? '#38BDF8' : '#7A9BBF', background: 'transparent', cursor:'pointer' }}
              disabled={uploading}
              title={a.foto_url ? 'Cambiar foto' : 'Agregar foto'}>
              {uploading ? '⏳' : '📷'}
            </button>
            {/* Eliminar actividad */}
            <button onClick={() => onDelete(a.id)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: '#7A9BBF', background: 'transparent', cursor:'pointer' }}
              onTouchStart={e => e.currentTarget.style.color = '#F87171'}
              onTouchEnd={e => e.currentTarget.style.color = '#7A9BBF'}>
              ✕
            </button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
      </div>
    </>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function MisActividades({ onNewActivity }) {
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading]         = useState(true);

  async function load() {
    setLoading(true);
    try { setActividades(await getActividades()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    await deleteActividad(id);
    load();
  }

  function handleFotoUploaded(id, foto_url) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, foto_url } : a));
  }

  function handleFotoDeleted(id) {
    setActividades(prev => prev.map(a => a.id === id ? { ...a, foto_url: null } : a));
  }

  const groupedByDate = actividades.reduce((acc, a) => {
    const fecha = a.fecha.slice(0, 10);
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const now      = new Date();
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
              { label: 'Este mes', value: actsMes.length, unit: 'act.' },
              { label: 'Minutos',  value: Math.round(minsMes).toLocaleString('es'), unit: 'min' },
              { label: 'Puntos',   value: Math.round(ptosMes).toLocaleString('es'), unit: 'pts', accent: true },
            ].map(({ label, value, unit, accent }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: '#132236', border: '1px solid #243D57' }}>
                <div className="font-bold text-xl leading-tight"
                     style={{ fontFamily: "'JetBrains Mono', monospace", color: accent ? '#38BDF8' : '#E8F0FE' }}>
                  {value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9BBF' }}>{unit}</div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9BBF', fontSize: '10px' }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color: '#7A9BBF' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
            Cargando…
          </div>
        ) : actividades.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#7A9BBF' }}>
            <div className="text-5xl mb-4">🏅</div>
            <div className="font-bold text-xl uppercase mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
              Sin actividades
            </div>
            <div className="text-sm mb-6">Registrá tu primera actividad.</div>
            <button onClick={onNewActivity}
              className="px-6 py-3 rounded-2xl font-bold text-base uppercase tracking-wide"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A' }}>
              + Nueva actividad
            </button>
          </div>
        ) : (
          sortedDates.map(fecha => {
            const acts     = groupedByDate[fecha];
            const date     = new Date(fecha + 'T12:00:00');
            const label    = date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
            const totalPts = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);

            return (
              <div key={fecha}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wider"
                       style={{ color: '#7A9BBF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: '#38BDF8', fontFamily: "'JetBrains Mono', monospace" }}>
                    {Math.round(totalPts)} pts
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {acts.map(a => (
                    <ActividadCard
                      key={a.id}
                      a={a}
                      onDelete={handleDelete}
                      onFotoUploaded={handleFotoUploaded}
                      onFotoDeleted={handleFotoDeleted}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
