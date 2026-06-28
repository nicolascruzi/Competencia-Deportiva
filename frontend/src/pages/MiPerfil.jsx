import { useEffect, useRef, useState } from 'react';
import { getActividades } from '../api/actividades';
import { updatePerfil, uploadFotoPerfil } from '../api/perfil';
import { useAuth } from '../context/AuthContext';
import Configuracion from './Configuracion';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
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
  const nac = new Date(fechaNac + 'T00:00:00');
  let edad  = hoy.getFullYear() - nac.getFullYear();
  const m   = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

function EditField({ label, displayValue, onSave, type = 'text', options, rawValue }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(rawValue ?? '');
  const [saving, setSaving]   = useState(false);

  function startEdit() { setDraft(rawValue ?? ''); setEditing(true); }
  function cancel()    { setEditing(false); }

  async function save() {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    catch { /* errors logged in parent */ }
    finally { setSaving(false); }
  }

  if (!editing) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--t-dim)' }}>
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:2 }}>{label}</div>
          <div style={{ fontSize:15, fontWeight:600, color: displayValue ? 'var(--t-text)' : 'rgba(var(--t-muted-r,128,128,128),0.5)' }}>
            {displayValue || '—'}
          </div>
        </div>
        <button onClick={startEdit}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:12, fontWeight:600, flexShrink:0 }}>
          <IconEdit /> Editar
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:'11px 0', borderBottom:'1px solid var(--t-dim)' }}>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-accent)', marginBottom:8 }}>{label}</div>
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
        <button onClick={cancel}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <IconXSmall /> Cancelar
        </button>
      </div>
    </div>
  );
}

export default function MiPerfil({ onNewActivity }) {
  const { user, logout, updateUser } = useAuth();
  const [acts, setActs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getActividades().then(setActs).finally(() => setLoading(false));
  }, []);

  const totalPts  = acts.reduce((s, a) => s + parseFloat(a.puntos), 0);
  const totalMin  = acts.reduce((s, a) => s + parseFloat(a.minutos), 0);
  const totalActs = acts.length;

  const now     = new Date();
  const mesKey  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const actsMes = acts.filter(a => a.fecha.slice(0,7) === mesKey);
  const ptsMes  = actsMes.reduce((s, a) => s + parseFloat(a.puntos), 0);

  const sportMap = {};
  acts.forEach(a => {
    if (!sportMap[a.deporte_nombre]) sportMap[a.deporte_nombre] = { min:0, pts:0, n:0 };
    sportMap[a.deporte_nombre].min += parseFloat(a.minutos);
    sportMap[a.deporte_nombre].pts += parseFloat(a.puntos);
    sportMap[a.deporte_nombre].n++;
  });
  const sports = Object.entries(sportMap).sort((a,b) => b[1].min - a[1].min);
  const maxMin = sports[0]?.[1]?.min || 1;

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

  if (showConfig) {
    return (
      <>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px 10px', borderBottom:'1px solid var(--t-dim)', background:'var(--t-nav-bg)' }}>
          <button onClick={() => setShowConfig(false)}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>
            Configuración
          </span>
        </div>
        <Configuracion />
      </>
    );
  }

  return (
    <div style={{ paddingBottom:32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── HERO ── */}
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>

          {/* Avatar con cámara */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:66, height:66, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'2px solid rgba(var(--t-accent-r),0.3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
              {user?.foto_perfil_url ? (
                <img src={user.foto_perfil_url} alt="perfil" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:30, color:'var(--t-accent)' }}>
                  {user?.nombre?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{ position:'absolute', bottom:1, right:1, width:22, height:22, borderRadius:'50%', background:'var(--t-accent)', border:'2px solid var(--t-ground)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-ground)', cursor:'pointer' }}>
              {uploadingPhoto
                ? <div style={{ width:10, height:10, border:'1.5px solid rgba(255,255,255,0.35)', borderTopColor:'var(--t-ground)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                : <IconCamera />
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }} />
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
          </div>
        </div>

        {/* Stats globales */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Total pts',  value: Math.round(totalPts).toLocaleString('es'), accent:true },
            { label:'Horas',      value: Math.round(totalMin/60)+'h',               accent:false },
            { label:'Sesiones',   value: totalActs,                                 accent:false },
          ].map(({ label, value, accent }) => (
            <div key={label} style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 10px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--t-accent)', opacity: accent ? 0.8 : 0.25 }} />
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:'clamp(15px,4vw,20px)', color: accent ? 'var(--t-accent)' : 'var(--t-text)', lineHeight:1 }}>
                {value}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DATOS PERSONALES ── */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:4 }}>
          Datos personales
        </div>

        <EditField
          label="Sexo"
          displayValue={sexoLabel}
          rawValue={user?.sexo ?? ''}
          options={[
            { label:'Masculino', value:'M' },
            { label:'Femenino',  value:'F' },
            { label:'Otro',      value:'X' },
          ]}
          onSave={v => saveField('sexo', v)}
        />

        <EditField
          label="Fecha de nacimiento"
          displayValue={fechaNacDisplay}
          rawValue={user?.fecha_nacimiento ?? ''}
          type="date"
          onSave={v => saveField('fecha_nacimiento', v)}
        />

        <EditField
          label="Peso"
          displayValue={user?.peso_kg ? `${user.peso_kg} kg` : null}
          rawValue={user?.peso_kg ?? ''}
          type="number"
          onSave={v => saveField('peso_kg', v ? parseFloat(v) : null)}
        />

        <EditField
          label="Estatura"
          displayValue={user?.estatura_cm ? `${user.estatura_cm} cm` : null}
          rawValue={user?.estatura_cm ?? ''}
          type="number"
          onSave={v => saveField('estatura_cm', v ? parseInt(v) : null)}
        />
      </div>

      {/* ── ESTE MES ── */}
      {actsMes.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
            {MONTHS_ES[now.getMonth()]} {now.getFullYear()}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'var(--t-accent)', lineHeight:1 }}>
                {Math.round(ptsMes).toLocaleString('es')}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Puntos este mes</div>
            </div>
            <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'11px 13px' }}>
              <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:22, color:'var(--t-text)', lineHeight:1 }}>
                {actsMes.length}
              </div>
              <div style={{ fontSize:10, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>Sesiones este mes</div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPORTES ── */}
      {sports.length > 0 && (
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--t-dim)' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:10 }}>
            Mis deportes
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sports.map(([sport, v]) => {
              const pct = Math.round((v.min / maxMin) * 100);
              return (
                <div key={sport} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>{sport}</span>
                      <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-muted)' }}>
                        {Math.round(v.min)} min
                      </span>
                    </div>
                    <div style={{ height:4, background:'var(--t-dim)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:pct+'%', background:'var(--t-accent)', borderRadius:2, opacity:0.75 }} />
                    </div>
                  </div>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-accent)', flexShrink:0, minWidth:40, textAlign:'right' }}>
                    {v.n} ses.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── OPCIONES ── */}
      <div style={{ padding:'12px 20px', display:'flex', flexDirection:'column', gap:8 }}>
        <button onClick={() => setShowConfig(true)}
          style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'14px 16px', borderRadius:14, border:'1px solid var(--t-dim)', background:'var(--t-surface)', color:'var(--t-text)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
          <span style={{ color:'var(--t-accent)' }}><IconSettings /></span>
          <span style={{ flex:1, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            Configuración
          </span>
          <span style={{ color:'var(--t-muted)' }}><IconChevron /></span>
        </button>

        <button onClick={onNewActivity}
          style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          + Registrar actividad
        </button>

        <button onClick={logout}
          style={{ width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:24, color:'var(--t-muted)', fontSize:13 }}>
          <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          Cargando…
        </div>
      )}
    </div>
  );
}
