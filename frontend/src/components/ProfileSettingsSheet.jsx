import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { updatePerfil, uploadFotoPerfil } from '../api/perfil';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const IconCamera = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconXSmall = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function calcEdad(fechaNac) {
  if (!fechaNac) return null;
  const hoy = new Date();
  const [y, m, d] = fechaNac.slice(0, 10).split('-').map(Number);
  const nac = new Date(y, m - 1, d);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const mes = hoy.getMonth() - nac.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
  return isNaN(edad) ? null : edad;
}

function EditField({ label, onSave, onCancel, type = 'text', options, rawValue }) {
  const [draft, setDraft]   = useState(rawValue ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try { await onSave(draft); }
    catch { /* errors logged in parent */ }
    finally { setSaving(false); }
  }

  return (
    <div style={{ background:'var(--t-surface2)', border:'1.5px solid var(--t-accent)', borderRadius:12, padding:'12px 14px' }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-accent)', marginBottom:10 }}>{label}</div>
      {options ? (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {options.map(opt => (
            <button key={opt.value} onClick={() => setDraft(opt.value)}
              style={{ padding:'7px 16px', borderRadius:20, border:'1.5px solid', fontSize:13, fontWeight:600, cursor:'pointer',
                background: draft === opt.value ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                borderColor: draft === opt.value ? 'var(--t-accent)' : 'var(--t-dim)',
                color: draft === opt.value ? 'var(--t-accent)' : 'var(--t-muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
          style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid var(--t-accent)', background:'var(--t-surface)', color:'var(--t-text)', fontSize:15, outline:'none', boxSizing:'border-box', marginBottom:10 }}
        />
      )}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={save} disabled={saving}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 16px', borderRadius:8, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontSize:13, fontWeight:700, cursor:'pointer', opacity: saving ? 0.65 : 1 }}>
          <IconCheck /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <IconXSmall /> Cancelar
        </button>
      </div>
    </div>
  );
}

function PersonalCell({ label, value, onEdit }) {
  return (
    <div
      onClick={onEdit}
      style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 12px', cursor:'pointer', display:'flex', flexDirection:'column', gap:4, position:'relative' }}
    >
      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color: value ? 'var(--t-text)' : 'var(--t-dim)', lineHeight:1.2 }}>
        {value || '—'}
      </div>
      <div style={{ position:'absolute', top:8, right:8, opacity:0.35, color:'var(--t-muted)' }}>
        <IconEdit />
      </div>
    </div>
  );
}

function PushToggle() {
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

  const denied = permission === 'denied';

  return (
    <div style={{ borderRadius:12, border:'1px solid var(--t-dim)', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', gap:12 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)' }}>
            Notificaciones
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2, lineHeight:1.4 }}>
            {denied
              ? 'Bloqueadas en el navegador — habilitá en ajustes del sistema'
              : subscribed
              ? 'Activadas — te avisamos de comentarios y actividades nuevas'
              : 'Recibí alertas cuando un compañero sube contenido'}
          </div>
        </div>
        {/* Toggle */}
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading || denied}
          style={{
            flexShrink: 0,
            width: 48, height: 28,
            borderRadius: 14,
            border: 'none',
            background: subscribed ? 'var(--t-accent)' : 'var(--t-surface2)',
            cursor: (loading || denied) ? 'default' : 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            opacity: denied ? 0.4 : 1,
          }}>
          <span style={{
            position: 'absolute',
            top: 3, left: subscribed ? 23 : 3,
            width: 22, height: 22,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }} />
        </button>
      </div>
      {error && (
        <div style={{ padding:'8px 14px', fontSize:12, color:'#F87171', borderTop:'1px solid var(--t-dim)', background:'rgba(248,113,113,0.06)' }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── SHEET: foto + datos personales + notificaciones + cerrar sesión ─────────

export default function ProfileSettingsSheet({ onClose }) {
  const { user, logout, updateUser } = useAuth();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingField, setEditingField]     = useState(null);
  const fileInputRef = useRef(null);

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = await uploadFotoPerfil(file);
      updateUser({ foto_perfil_url: data.foto_perfil_url });
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  async function saveField(field, value) {
    const data = await updatePerfil({ [field]: value || null });
    updateUser(data);
  }

  const edad = calcEdad(user?.fecha_nacimiento);
  const sexoLabel = user?.sexo === 'M' ? 'Masculino' : user?.sexo === 'F' ? 'Femenino' : user?.sexo === 'X' ? 'Otro' : null;
  const fechaNacDisplay = user?.fecha_nacimiento
    ? (() => {
        const [y, m, d] = user.fecha_nacimiento.slice(0, 10).split('-').map(Number);
        const label = new Date(y, m - 1, d).toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' });
        return label + (edad !== null ? ` · ${edad} años` : '');
      })()
    : null;
  const displayName = user?.nombre_display || user?.apodo || user?.nombre || '';

  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(5,12,20,0.75)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:'100%', maxWidth:480, maxHeight:'88dvh', background:'var(--t-surface)', borderRadius:'20px 20px 0 0', display:'flex', flexDirection:'column' }}>

        {/* Handle + header */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 20px 14px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)' }}>
            Editar perfil
          </div>
          <button onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ overflowY:'auto', WebkitOverflowScrolling:'touch', flex:1 }}>

          {/* Foto */}
          <div style={{ display:'flex', justifyContent:'center', padding:'20px 20px 8px' }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'2px solid rgba(var(--t-accent-r),0.3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {user?.foto_perfil_url ? (
                  <img src={user.foto_perfil_url} alt="perfil" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:34, color:'var(--t-accent)' }}>
                    {displayName?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{ position:'absolute', bottom:1, right:1, width:26, height:26, borderRadius:'50%', background:'var(--t-accent)', border:'2px solid var(--t-surface)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-ground)', cursor:'pointer' }}>
                {uploadingPhoto
                  ? <div style={{ width:11, height:11, border:'1.5px solid rgba(255,255,255,0.35)', borderTopColor:'var(--t-ground)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  : <IconCamera />
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }} />
            </div>
          </div>

          {/* Datos personales */}
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
              Datos personales
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <PersonalCell label="Apodo (ranking)" value={user?.apodo} onEdit={() => setEditingField('apodo')} />
              <PersonalCell label="Nombre" value={user?.nombre} onEdit={() => setEditingField('nombre')} />
              <PersonalCell label="Apellido" value={user?.apellido} onEdit={() => setEditingField('apellido')} />
              <PersonalCell label="Sexo" value={sexoLabel} onEdit={() => setEditingField('sexo')} />
              <PersonalCell label="Nacimiento" value={fechaNacDisplay} onEdit={() => setEditingField('fecha_nacimiento')} />
              <PersonalCell label="Peso" value={user?.peso_kg ? `${user.peso_kg} kg` : null} onEdit={() => setEditingField('peso_kg')} />
              <PersonalCell label="Estatura" value={user?.estatura_cm ? `${user.estatura_cm} cm` : null} onEdit={() => setEditingField('estatura_cm')} />
            </div>
            {editingField && (
              <div style={{ marginTop:12 }}>
                <EditField
                  label={
                    editingField === 'apodo' ? 'Apodo (aparece en ranking)' :
                    editingField === 'nombre' ? 'Nombre' :
                    editingField === 'apellido' ? 'Apellido' :
                    editingField === 'sexo' ? 'Sexo' :
                    editingField === 'fecha_nacimiento' ? 'Fecha de nacimiento' :
                    editingField === 'peso_kg' ? 'Peso' : 'Estatura'
                  }
                  rawValue={
                    editingField === 'apodo' ? (user?.apodo ?? '') :
                    editingField === 'nombre' ? (user?.nombre ?? '') :
                    editingField === 'apellido' ? (user?.apellido ?? '') :
                    editingField === 'sexo' ? (user?.sexo ?? '') :
                    editingField === 'fecha_nacimiento' ? (user?.fecha_nacimiento?.slice(0,10) ?? '') :
                    editingField === 'peso_kg' ? (user?.peso_kg ?? '') :
                    (user?.estatura_cm ?? '')
                  }
                  type={
                    editingField === 'sexo' ? 'text' :
                    editingField === 'fecha_nacimiento' ? 'date' :
                    (editingField === 'peso_kg' || editingField === 'estatura_cm') ? 'number' : 'text'
                  }
                  options={editingField === 'sexo' ? [
                    { label:'Masculino', value:'M' },
                    { label:'Femenino',  value:'F' },
                    { label:'Otro',      value:'X' },
                  ] : undefined}
                  onSave={async v => {
                    if (editingField === 'peso_kg') await saveField('peso_kg', v ? parseFloat(v) : null);
                    else if (editingField === 'estatura_cm') await saveField('estatura_cm', v ? parseInt(v) : null);
                    else await saveField(editingField, v);
                    setEditingField(null);
                  }}
                  onCancel={() => setEditingField(null)}
                />
              </div>
            )}
          </div>

          {/* Opciones */}
          <div style={{ padding:'16px 20px 32px', display:'flex', flexDirection:'column', gap:8 }}>
            <PushToggle />
            <button onClick={logout}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
