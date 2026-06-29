import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getConfig, saveConfig } from '../api/config';

const FIELDS = [
  {
    key:   'STRAVA_CLIENT_ID',
    label: 'Strava Client ID',
    hint:  'El número que aparece en strava.com/settings/api',
    type:  'text',
    secret: false,
  },
  {
    key:   'STRAVA_CLIENT_SECRET',
    label: 'Strava Client Secret',
    hint:  'El secreto que aparece debajo del Client ID',
    type:  'password',
    secret: true,
  },
  {
    key:   'STRAVA_WEBHOOK_TOKEN',
    label: 'Webhook Token',
    hint:  'Cualquier string que vos elijas (ej: "mi-token-secreto-123")',
    type:  'text',
    secret: false,
  },
  {
    key:   'BACKEND_URL',
    label: 'URL del backend',
    hint:  'Ej: http://localhost:3000 o https://api.tudominio.com',
    type:  'text',
    secret: false,
  },
  {
    key:   'FRONTEND_URL',
    label: 'URL del frontend',
    hint:  'Ej: http://localhost:5173 o https://tudominio.com',
    type:  'text',
    secret: false,
  },
];

function ConfigSheet({ onClose }) {
  const [values, setValues]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const [shown, setShown]     = useState({}); // para campos password
  const startY = useRef(null);

  useEffect(() => {
    getConfig()
      .then(data => setValues(data))
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaved(false);
    try {
      await saveConfig(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)' }} />

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'90dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 12px)' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 14px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
              Configuración
            </div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>Solo visible para administradores</div>
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {/* Contenido scrollable */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4 }}>

          {/* Sección Strava */}
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', marginBottom:12 }}>
            Credenciales de Strava
          </div>

          <div style={{ fontSize:13, color:'var(--t-muted)', lineHeight:1.6, marginBottom:16, padding:'10px 13px', background:'rgba(var(--t-accent-r),0.05)', border:'1px solid rgba(var(--t-accent-r),0.15)', borderRadius:10 }}>
            Creá tu app en{' '}
            <span style={{ color:'var(--t-accent)', fontWeight:600 }}>strava.com/settings/api</span>
            {' '}y pegá las credenciales acá. El "Authorization Callback Domain" debe ser el dominio de tu backend.
          </div>

          {loading ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--t-muted)', fontSize:13, padding:'20px 0' }}>
              <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              Cargando…
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {FIELDS.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', display:'block', marginBottom:5 }}>
                    {field.label}
                  </label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={field.secret && !shown[field.key] ? 'password' : 'text'}
                      value={values[field.key] || ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.hint}
                      autoComplete="off"
                      style={{ width:'100%', padding: field.secret ? '10px 40px 10px 13px' : '10px 13px', borderRadius:10, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:14, outline:'none', boxSizing:'border-box', fontFamily: field.secret && !shown[field.key] ? 'monospace' : 'inherit' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--t-accent)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--t-dim)'; }}
                    />
                    {field.secret && (
                      <button
                        type="button"
                        onClick={() => setShown(s => ({ ...s, [field.key]: !s[field.key] }))}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'var(--t-muted)', cursor:'pointer', padding:4, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {shown[field.key]
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        }
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t-muted2)', marginTop:4, paddingLeft:2 }}>{field.hint}</div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop:12, padding:'9px 13px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, fontSize:13, color:'#F87171' }}>
              {error}
            </div>
          )}

          {saved && (
            <div style={{ marginTop:12, padding:'9px 13px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)', borderRadius:10, fontSize:13, color:'#34D399' }}>
              ✓ Configuración guardada correctamente
            </div>
          )}
        </div>

        {/* Botón guardar fijo abajo */}
        <div style={{ padding:'12px 18px 0', borderTop:'1px solid var(--t-dim)', flexShrink:0 }}>
          <button onClick={handleSave} disabled={saving || loading}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity:(saving || loading) ? 0.6 : 1, cursor:(saving || loading) ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export default function ConfigButton({ isAdmin }) {
  const [open, setOpen] = useState(false);

  if (!isAdmin) return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, border:'1px solid var(--t-dim)', background:'var(--t-surface)', color:'var(--t-muted)', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
        </svg>
        <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.04em' }}>
          Configuración del sistema
        </span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft:'auto' }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {open && createPortal(
        <ConfigSheet onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}
