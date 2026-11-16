import { useRef, useState } from 'react';
import { updateActividad } from '../api/actividades';
import { uploadFoto, deleteFoto } from '../api/fotos';
import { useLoading } from '../context/LoadingContext';
import { hoyLocal } from '../lib/fecha';

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

// Form de edición de una actividad, reutilizado tanto desde "Mis actividades" (MisActividades.jsx)
// como desde el menú de tres puntitos de una publicación en el feed (FeedCard.jsx).
export default function EditActividadModal({ actividad, deportes, onClose, onSaved, onFotoUploaded, onFotoDeleted }) {
  const today = hoyLocal();
  const [form, setForm] = useState({
    deporte_nombre: actividad.deporte_nombre,
    minutos:        String(Math.round(parseFloat(actividad.minutos))),
    ponderador:     String(parseFloat(actividad.ponderador)),
    fecha:          actividad.fecha?.slice(0, 10) || today,
    notas:          actividad.notas || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [fotoUrl, setFotoUrl]       = useState(actividad.foto_url || null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef(null);
  const { withLoading } = useLoading();

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const { foto_url } = await withLoading(() => uploadFoto(actividad.id, file));
      setFotoUrl(foto_url);
      onFotoUploaded?.(actividad.id, foto_url);
    } catch (err) {
      alert('Error al subir la foto: ' + err.message);
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteFoto() {
    if (!confirm('¿Eliminar la foto?')) return;
    try {
      await withLoading(() => deleteFoto(actividad.id));
      setFotoUrl(null);
      onFotoDeleted?.(actividad.id);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    const today = hoyLocal();
    if (form.fecha > today) {
      setError('No puedes registrar actividades en fechas futuras.');
      return;
    }
    setSaving(true); setError('');
    try {
      const updated = await withLoading(() => updateActividad(actividad.id, {
        deporte_nombre: form.deporte_nombre,
        minutos:        parseFloat(form.minutos),
        fecha:          form.fecha,
        notas:          form.notas || null,
      }));
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const iStyle = { background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:10, fontSize:15, outline:'none', boxSizing:'border-box', width:'100%' };
  const lStyle = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', marginBottom:4, display:'block' };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:310, background:'rgba(0,0,0,0.5)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:311, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(env(safe-area-inset-bottom) + 24px)', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', marginBottom:4 }}>
          Editar actividad
        </div>
        {error && <div style={{ padding:'9px 12px', borderRadius:10, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', fontSize:13 }}>{error}</div>}

        {/* Foto */}
        {fotoUrl ? (
          <div style={{ position:'relative', borderRadius:12, overflow:'hidden' }}>
            <img src={fotoUrl} alt={form.deporte_nombre} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFoto}
              style={{ position:'absolute', top:8, right:8, background:'rgba(13,27,42,0.75)', border:'1px solid rgba(255,255,255,0.15)', color:'var(--t-text)', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
              <IconCamera /><span>Cambiar</span>
            </button>
            <button type="button" onClick={handleDeleteFoto}
              style={{ position:'absolute', top:8, left:8, background:'rgba(13,27,42,0.75)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', borderRadius:8, padding:'5px 9px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              Quitar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFoto}
            style={{ width:'100%', padding:'14px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'rgba(26,46,69,0.25)', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
            {uploadingFoto
              ? <><div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} /><span style={{ fontSize:13 }}>Subiendo…</span></>
              : <><IconCamera /><span style={{ fontSize:13, fontWeight:600 }}>Agregar foto</span></>}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoChange} style={{ display:'none' }} />

        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={lStyle}>Deporte</label>
            <select value={form.deporte_nombre} onChange={e => {
              const nombre = e.target.value;
              const dep = deportes.find(d => d.nombre === nombre);
              setForm(f => ({ ...f, deporte_nombre: nombre, ponderador: String(dep?.ponderador_default ?? 1) }));
            }} style={{ ...iStyle, appearance:'none' }}>
              {deportes.map(d => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lStyle}>Minutos</label>
              <input type="number" inputMode="numeric" min="1" required value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} style={iStyle} />
            </div>
            <div>
              <label style={lStyle}>Ponderador</label>
              <div style={{ ...iStyle, color:'var(--t-accent)', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, display:'flex', alignItems:'center', opacity:0.7 }}>
                {form.ponderador}
              </div>
            </div>
          </div>
          <div>
            <label style={lStyle}>Fecha</label>
            <input type="date" required max={today} value={form.fecha}
              onChange={e => {
                const val = e.target.value > today ? today : e.target.value;
                setForm(f => ({ ...f, fecha: val }));
              }} style={iStyle} />
          </div>
          <div>
            <label style={lStyle}>Notas (opcional)</label>
            <input type="text" placeholder="Descripción breve…" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} style={iStyle} />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
