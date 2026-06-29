import { useState } from 'react';
import { joinCompetencia } from '../api/competencias';

const inputStyle = {
  background: 'var(--t-surface2)', border: '1px solid',
  color: 'var(--t-text)', padding: '14px 12px', borderRadius: '12px',
  fontSize: '24px', outline: 'none', textAlign: 'center',
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3em',
  width: '100%', boxSizing: 'border-box',
};

export default function UnirseCompetenciaModal({ open, onClose, onJoined }) {
  const [pin, setPin]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [focused, setFocused] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (pin.length !== 6) return setError('El PIN debe tener 6 dígitos');
    setError(''); setLoading(true);
    try {
      const result = await joinCompetencia(pin);
      onJoined?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
         style={{ background: 'rgba(5,12,20,0.75)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ width:'100%', borderRadius:'20px 20px 0 0', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderBottom:'none' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px 12px' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)' }}>
            Unirse con PIN
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin:'0 18px 12px', borderRadius:10, padding:'10px 14px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding:'0 18px', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', gap:14 }}>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>
              PIN de 6 dígitos
            </label>
            <input
              type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ ...inputStyle, borderColor: focused ? 'var(--t-accent)' : 'var(--t-dim)' }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
            />
          </div>

          <button type="submit" disabled={loading || pin.length !== 6}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity:(loading || pin.length !== 6) ? 0.5 : 1, cursor: pin.length === 6 ? 'pointer' : 'default' }}>
            {loading ? 'Uniéndose…' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}
