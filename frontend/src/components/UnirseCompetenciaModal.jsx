import { useState } from 'react';
import { joinCompetencia } from '../api/competencias';

const inputStyle = {
  background: 'var(--t-surface2)', border: '1px solid',
  color: 'var(--t-text)', padding: '16px', borderRadius: '16px',
  fontSize: '32px', outline: 'none', textAlign: 'center',
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.4em',
  width: '100%',
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

      <div className="w-full rounded-t-3xl flex flex-col"
           style={{ background: 'var(--t-surface)', border: '1px solid var(--t-dim)', borderBottom: 'none' }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--t-dim)' }} />
        </div>

        <div className="px-5 pb-2 pt-3 flex items-center justify-between">
          <div className="font-bold text-2xl uppercase tracking-wide"
               style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Unirse con PIN
          </div>
          <button onClick={onClose} className="text-xl px-2 py-1" style={{ color: 'var(--t-muted)' }}>✕</button>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl px-4 py-3 text-sm"
               style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 pb-8 flex flex-col gap-5"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t-muted)' }}>
              Ingresá el PIN de 6 dígitos
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
            className="w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-wide transition-opacity"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", background: 'var(--t-accent)', color: 'var(--t-ground)', opacity: (loading || pin.length !== 6) ? 0.5 : 1 }}>
            {loading ? 'Uniéndose…' : 'Unirme'}
          </button>
        </form>
      </div>
    </div>
  );
}
