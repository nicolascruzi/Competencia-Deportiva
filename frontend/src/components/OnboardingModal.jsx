import { useRef, useState } from 'react';
import { updatePerfil, uploadFotoPerfil } from '../api/perfil';
import { useAuth } from '../context/AuthContext';

const STEPS = ['perfil', 'apodo', 'personal'];

const IconCamera = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export default function OnboardingModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');

  // Campos
  const [apodo, setApodo]               = useState(user?.apodo || '');
  const [sexo, setSexo]                 = useState(user?.sexo || '');
  const [fechaNac, setFechaNac]         = useState(user?.fecha_nacimiento?.slice(0,10) || '');
  const [peso, setPeso]                 = useState(user?.peso_kg || '');
  const [estatura, setEstatura]         = useState(user?.estatura_cm || '');

  const fileRef = useRef(null);

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const data = await uploadFotoPerfil(file);
      updateUser({ foto_perfil_url: data.foto_perfil_url });
    } catch { setError('No se pudo subir la foto. Intentá de nuevo.'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function saveStep() {
    setSaving(true); setError('');
    try {
      const current = STEPS[step];
      let payload = {};
      if (current === 'apodo') payload = { apodo: apodo.trim() || null };
      if (current === 'personal') payload = {
        sexo: sexo || null,
        fecha_nacimiento: fechaNac || null,
        peso_kg: peso ? parseFloat(peso) : null,
        estatura_cm: estatura ? parseInt(estatura) : null,
      };
      if (Object.keys(payload).length > 0) {
        const updated = await updatePerfil(payload);
        updateUser(updated);
      }
      if (step < STEPS.length - 1) setStep(s => s + 1);
      else onClose();
    } catch { setError('Hubo un error guardando. Intentá de nuevo.'); }
    finally { setSaving(false); }
  }

  const initial = user?.nombre?.charAt(0).toUpperCase() || '?';
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(5,12,20,0.88)', backdropFilter:'blur(8px)' }}>
      <div style={{ width:'100%', background:'var(--t-surface)', borderRadius:'24px 24px 0 0', border:'1px solid var(--t-dim)', borderBottom:'none', paddingBottom:'calc(24px + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column' }}>

        {/* Barra de progreso */}
        <div style={{ height:3, background:'var(--t-dim)', borderRadius:'24px 24px 0 0', overflow:'hidden' }}>
          <div style={{ height:'100%', width:progressPct+'%', background:'var(--t-accent)', transition:'width 0.4s ease' }} />
        </div>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:3, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ padding:'8px 20px 20px' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', marginBottom:4 }}>
            Paso {step + 1} de {STEPS.length}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.1 }}>
            {step === 0 && 'Tu foto de perfil'}
            {step === 1 && 'Tu apodo'}
            {step === 2 && 'Datos personales'}
          </div>
          <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:6 }}>
            {step === 0 && 'Poné una foto para que tus compañeros te reconozcan.'}
            {step === 1 && 'El apodo aparecerá en el ranking y los registros.'}
            {step === 2 && 'Opcional — te ayuda a llevar un mejor seguimiento.'}
          </div>
        </div>

        {error && (
          <div style={{ margin:'0 20px 14px', padding:'10px 14px', borderRadius:10, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', fontSize:13 }}>
            {error}
          </div>
        )}

        {/* ── STEP 0: foto ── */}
        {step === 0 && (
          <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
            <div style={{ position:'relative' }}>
              <div style={{ width:100, height:100, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.10)', border:'2px solid rgba(var(--t-accent-r),0.3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {user?.foto_perfil_url ? (
                  <img src={user.foto_perfil_url} alt="perfil" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:44, color:'var(--t-accent)' }}>{initial}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ position:'absolute', bottom:2, right:2, width:32, height:32, borderRadius:'50%', background:'var(--t-accent)', border:'2px solid var(--t-ground)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-ground)', cursor:'pointer' }}>
                {uploading
                  ? <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'var(--t-ground)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  : <IconCamera />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display:'none' }} />
            </div>
            {user?.foto_perfil_url
              ? <div style={{ fontSize:13, color:'#22C55E', fontWeight:600 }}>Foto cargada</div>
              : <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ padding:'11px 28px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                  Subir foto
                </button>
            }
          </div>
        )}

        {/* ── STEP 1: apodo ── */}
        {step === 1 && (
          <div style={{ padding:'0 20px' }}>
            <input
              type="text"
              autoFocus
              placeholder={user?.nombre || 'Tu apodo'}
              value={apodo}
              onChange={e => setApodo(e.target.value)}
              maxLength={30}
              style={{ width:'100%', boxSizing:'border-box', padding:'14px 16px', borderRadius:14, border:'1.5px solid var(--t-accent)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:20, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, outline:'none', textTransform:'uppercase', letterSpacing:'0.04em' }}
            />
            <div style={{ marginTop:8, fontSize:12, color:'var(--t-muted)' }}>
              Si lo dejás vacío se usará tu nombre: <strong style={{ color:'var(--t-text)' }}>{user?.nombre}</strong>
            </div>
            <div style={{ marginTop:16, padding:'12px 14px', borderRadius:12, background:'var(--t-surface2)', border:'1px solid var(--t-dim)' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:6 }}>Así vas a aparecer en el ranking</div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-accent)' }}>
                {apodo.trim() || user?.nombre || '—'}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: datos personales ── */}
        {step === 2 && (
          <div style={{ padding:'0 20px', display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:8 }}>Sexo</div>
              <div style={{ display:'flex', gap:8 }}>
                {[{ v:'M', l:'Masculino' }, { v:'F', l:'Femenino' }, { v:'X', l:'Otro' }].map(opt => (
                  <button key={opt.v} onClick={() => setSexo(opt.v)}
                    style={{ flex:1, padding:'10px 0', borderRadius:12, border:'1.5px solid', fontSize:13, fontWeight:600, cursor:'pointer',
                      background: sexo === opt.v ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                      borderColor: sexo === opt.v ? 'var(--t-accent)' : 'var(--t-dim)',
                      color: sexo === opt.v ? 'var(--t-accent)' : 'var(--t-muted)',
                    }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', display:'block', marginBottom:6 }}>Fecha de nacimiento</label>
              <input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:15, outline:'none', colorScheme:'dark' }}
              />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', display:'block', marginBottom:6 }}>Peso (kg)</label>
                <input type="number" inputMode="decimal" placeholder="70" value={peso} onChange={e => setPeso(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:15, outline:'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', display:'block', marginBottom:6 }}>Estatura (cm)</label>
                <input type="number" inputMode="numeric" placeholder="175" value={estatura} onChange={e => setEstatura(e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:15, outline:'none' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Botones */}
        <div style={{ padding:'20px 20px 0', display:'flex', flexDirection:'column', gap:8 }}>
          <button onClick={saveStep} disabled={saving || uploading}
            style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', opacity:(saving||uploading) ? 0.7 : 1 }}>
            {saving ? 'Guardando…' : step < STEPS.length - 1 ? 'Continuar' : 'Listo'}
          </button>
          <button onClick={step < STEPS.length - 1 ? () => setStep(s => s + 1) : onClose}
            style={{ width:'100%', padding:'11px', borderRadius:14, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {step < STEPS.length - 1 ? 'Omitir este paso' : 'Cerrar'}
          </button>
        </div>

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
