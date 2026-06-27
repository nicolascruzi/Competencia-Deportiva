import { useEffect, useState } from 'react';
import { getDeportes } from '../api/actividades';
import { createCompetencia } from '../api/competencias';

// Pantalla de PIN tras crear la competencia
function PinDisplay({ nombre, pin, onClose }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(pin).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function compartirWhatsApp() {
    const texto = encodeURIComponent(`Unite a mi competencia "${nombre}" en Nanão Cup 🏆\nEl PIN es: ${pin}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
         style={{ background: 'rgba(5,12,20,0.85)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full rounded-t-3xl flex flex-col items-center"
           style={{ background: '#132236', border: '1px solid #243D57', borderBottom: 'none' }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#243D57' }} />
        </div>

        <div className="px-6 pt-4 pb-8 w-full flex flex-col items-center gap-6"
             style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

          <div className="text-4xl">🎉</div>

          <div className="text-center">
            <div className="font-bold text-2xl uppercase mb-1"
                 style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
              ¡Competencia creada!
            </div>
            <div className="text-sm" style={{ color: '#7A9BBF' }}>
              Compartí este PIN para que otros se unan a
            </div>
            <div className="font-bold text-base mt-0.5" style={{ color: '#E8F0FE' }}>
              {nombre}
            </div>
          </div>

          {/* PIN grande */}
          <div className="rounded-2xl px-8 py-6 text-center w-full"
               style={{ background: 'rgba(56,189,248,0.08)', border: '2px solid rgba(56,189,248,0.3)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7A9BBF' }}>
              PIN de acceso
            </div>
            <div className="font-bold tracking-[0.4em]"
                 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '42px', color: '#38BDF8' }}>
              {pin}
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-3 w-full">
            <button onClick={copiar}
              className="w-full py-4 rounded-2xl font-bold text-base uppercase tracking-wide flex items-center justify-center gap-2 transition-all"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: copiado ? '#34D399' : '#38BDF8', color: '#0D1B2A' }}>
              {copiado ? '✓ Copiado!' : '📋 Copiar PIN'}
            </button>

            <button onClick={compartirWhatsApp}
              className="w-full py-4 rounded-2xl font-bold text-base uppercase tracking-wide flex items-center justify-center gap-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#25D366', color: '#fff' }}>
              💬 Compartir por WhatsApp
            </button>

            <button onClick={onClose}
              className="w-full py-4 rounded-2xl font-bold text-base uppercase tracking-wide border"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#243D57', color: '#7A9BBF', background: 'transparent' }}>
              Ir a la competencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', background: '#1A2E45', border: '1px solid #243D57',
  color: '#E8F0FE', padding: '12px 14px', borderRadius: '12px',
  fontSize: '16px', outline: 'none',
};

export default function CrearCompetenciaModal({ open, onClose, onCreated }) {
  const [paso, setPaso]             = useState('form'); // 'form' | 'pin'
  const [nombre, setNombre]         = useState('');
  const [deportes, setDeportes]     = useState([]);
  const [ponders, setPonders]       = useState({});  // { deporte_nombre: ponderador }
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [pinData, setPinData]       = useState(null); // { nombre, pin }
  const [focusedNombre, setFocusedNombre] = useState(false);

  useEffect(() => {
    if (open) {
      getDeportes().then(deps => {
        setDeportes(deps);
        const initial = {};
        deps.forEach(d => { initial[d.nombre] = d.ponderador_default; });
        setPonders(initial);
      });
      setNombre('');
      setError('');
      setPaso('form');
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    setError(''); setLoading(true);
    try {
      const ponderadores = Object.entries(ponders).map(([deporte_nombre, ponderador]) => ({
        deporte_nombre, ponderador: parseFloat(ponderador),
      }));
      const comp = await createCompetencia({ nombre: nombre.trim(), ponderadores });
      setPinData({ nombre: comp.nombre, pin: comp.pin, id: comp.id });
      setPaso('pin');
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  if (paso === 'pin') return <PinDisplay nombre={pinData.nombre} pin={pinData.pin} onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
         style={{ background: 'rgba(5,12,20,0.75)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full rounded-t-3xl flex flex-col"
           style={{ background: '#132236', border: '1px solid #243D57', borderBottom: 'none', maxHeight: '92dvh', overflowY: 'auto' }}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#243D57' }} />
        </div>

        <div className="px-5 pb-2 pt-3 flex items-center justify-between">
          <div className="font-bold text-2xl uppercase tracking-wide"
               style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Nueva competencia
          </div>
          <button onClick={onClose} className="text-xl px-2 py-1" style={{ color: '#7A9BBF' }}>✕</button>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl px-4 py-3 text-sm"
               style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 pb-6 flex flex-col gap-5"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9BBF' }}>
              Nombre de la competencia
            </label>
            <input
              type="text" required placeholder="Ej: Liga de verano 2026"
              value={nombre} onChange={e => setNombre(e.target.value)}
              style={{ ...inputStyle, borderColor: focusedNombre ? '#38BDF8' : '#243D57' }}
              onFocus={() => setFocusedNombre(true)}
              onBlur={() => setFocusedNombre(false)}
            />
          </div>

          {/* Ponderadores */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9BBF' }}>
              Ponderadores por deporte
            </label>
            <div className="text-xs mb-1" style={{ color: '#7A9BBF' }}>
              Los puntos = minutos × ponderador. Podés cambiarlo después.
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {deportes.map(d => (
                <PonderadorRow
                  key={d.nombre}
                  deporte={d.nombre}
                  icono={d.icono}
                  value={ponders[d.nombre] ?? d.ponderador_default}
                  onChange={v => setPonders(p => ({ ...p, [d.nombre]: v }))}
                />
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-wide transition-opacity mt-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creando…' : 'Crear competencia'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PonderadorRow({ deporte, icono, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2"
         style={{ background: '#1A2E45', border: '1px solid #243D57' }}>
      <span className="text-xl shrink-0">{icono}</span>
      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#E8F0FE' }}>{deporte}</span>
      <input
        type="number" inputMode="decimal" min="0.1" step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '64px', background: '#0D1B2A', border: '1px solid',
          borderColor: focused ? '#38BDF8' : '#243D57',
          color: '#38BDF8', padding: '6px 8px', borderRadius: '8px',
          fontSize: '16px', outline: 'none', textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}
