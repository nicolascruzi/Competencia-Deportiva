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
    const texto = encodeURIComponent(`Unite a mi competencia "${nombre}" en Pura Racha 🔥\nEl PIN es: ${pin}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  }

  const btnBase = { width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(5,12,20,0.85)', backdropFilter:'blur(8px)' }}>
      <div style={{ width:'100%', borderRadius:'20px 20px 0 0', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderBottom:'none' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        <div style={{ padding:'12px 18px', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>

          <div style={{ fontSize:32 }}>🎉</div>

          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1, marginBottom:6 }}>
              ¡Competencia creada!
            </div>
            <div style={{ fontSize:13, color:'var(--t-muted)' }}>
              Compartí este PIN para que otros se unan a{' '}
              <span style={{ color:'var(--t-text)', fontWeight:600 }}>{nombre}</span>
            </div>
          </div>

          {/* PIN */}
          <div style={{ width:'100%', borderRadius:14, padding:'16px 20px', textAlign:'center', background:'rgba(var(--t-accent-r),0.08)', border:'1.5px solid rgba(var(--t-accent-r),0.3)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:8 }}>
              PIN de acceso
            </div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:34, letterSpacing:'0.35em', color:'var(--t-accent)', lineHeight:1 }}>
              {pin}
            </div>
          </div>

          {/* Botones */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
            <button onClick={copiar}
              style={{ ...btnBase, background: copiado ? '#34D399' : 'var(--t-accent)', color:'var(--t-ground)' }}>
              {copiado ? '✓ Copiado!' : '📋 Copiar PIN'}
            </button>
            <button onClick={compartirWhatsApp}
              style={{ ...btnBase, background:'#25D366', color:'#fff' }}>
              💬 Compartir por WhatsApp
            </button>
            <button onClick={onClose}
              style={{ ...btnBase, background:'transparent', border:'1px solid var(--t-dim)', color:'var(--t-muted)' }}>
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
  width: '100%', background: 'var(--t-surface2)', border: '1px solid var(--t-dim)',
  color: 'var(--t-text)', padding: '11px 13px', borderRadius: '10px',
  fontSize: '15px', outline: 'none', boxSizing: 'border-box',
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
    <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(5,12,20,0.75)', backdropFilter:'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ width:'100%', borderRadius:'20px 20px 0 0', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderBottom:'none', maxHeight:'92dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px 12px', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)' }}>
            Nueva competencia
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin:'0 18px 10px', borderRadius:10, padding:'10px 14px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>
            {error}
          </div>
        )}

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} style={{ overflowY:'auto', flex:1, padding:'0 18px', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', gap:16 }}>

          {/* Nombre */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>
              Nombre de la competencia
            </label>
            <input
              type="text" required placeholder="Ej: Liga de verano 2026"
              value={nombre} onChange={e => setNombre(e.target.value)}
              style={{ ...inputStyle, borderColor: focusedNombre ? 'var(--t-accent)' : 'var(--t-dim)' }}
              onFocus={() => setFocusedNombre(true)}
              onBlur={() => setFocusedNombre(false)}
            />
          </div>

          {/* Ponderadores */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>
                Ponderadores por deporte
              </label>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>
                Puntos = minutos × ponderador. Podés cambiarlo después.
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
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
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer', flexShrink:0 }}>
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
         style={{ background: 'var(--t-surface2)', border: '1px solid var(--t-dim)' }}>
      <span className="text-xl shrink-0">{icono}</span>
      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--t-text)' }}>{deporte}</span>
      <input
        type="number" inputMode="decimal" min="0.1" step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '64px', background: 'var(--t-ground)', border: '1px solid',
          borderColor: focused ? 'var(--t-accent)' : 'var(--t-dim)',
          color: 'var(--t-accent)', padding: '6px 8px', borderRadius: '8px',
          fontSize: '16px', outline: 'none', textAlign: 'center',
          fontFamily: "'JetBrains Mono', monospace",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}
