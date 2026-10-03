import { useEffect, useRef, useState } from 'react';
import { getDeportes } from '../api/actividades';
import { crearCompetenciaGrupo } from '../api/grupos';
import { useLoading } from '../context/LoadingContext';

const inputStyle = {
  width:'100%', background:'var(--t-surface2)', border:'1px solid var(--t-dim)',
  color:'var(--t-text)', padding:'11px 13px', borderRadius:'10px',
  fontSize:'15px', outline:'none', boxSizing:'border-box',
};

function PonderadorRow({ deporte, icono, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'8px 12px' }}>
      <span style={{ fontSize:20, flexShrink:0 }}>{icono}</span>
      <span style={{ flex:1, fontSize:14, fontWeight:500, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{deporte}</span>
      <input
        type="number" inputMode="decimal" min="0.1" step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width:64, background:'var(--t-ground)', border:'1.5px solid', borderColor: focused ? 'var(--t-accent)' : 'var(--t-dim)', color:'var(--t-accent)', padding:'6px 8px', borderRadius:8, fontSize:16, outline:'none', textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

export default function NuevaCompetenciaSheet({ grupoId, onClose, onCreated }) {
  const { withLoading } = useLoading();
  const [nombre, setNombre]     = useState('');
  const [deportes, setDeportes] = useState([]);
  const [ponders, setPonders]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [bonus1, setBonus1]       = useState('0');
  const [bonus2, setBonus2]       = useState('0');
  const [bonus3mas, setBonus3mas] = useState('0');
  const startY = useRef(null);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  useEffect(() => {
    getDeportes().then(deps => {
      setDeportes(deps);
      setPonders(prev => {
        const next = { ...prev };
        deps.forEach(d => { if (!(d.nombre in next)) next[d.nombre] = d.ponderador_default; });
        return next;
      });
    }).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) return setError('Define fecha de inicio y fin, o ninguna de las dos');
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) return setError('La fecha de fin no puede ser anterior a la de inicio');
    setError(''); setLoading(true);
    try {
      const ponderadores = Object.entries(ponders).map(([deporte_nombre, ponderador]) => ({
        deporte_nombre, ponderador: parseFloat(ponderador),
      }));
      const competencia = await withLoading(() => crearCompetenciaGrupo(grupoId, {
        nombre: nombre.trim(),
        ponderadores,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        bonus_1_companero_pts: parseFloat(bonus1) || 0,
        bonus_2_companeros_pts: parseFloat(bonus2) || 0,
        bonus_3mas_companeros_pts: parseFloat(bonus3mas) || 0,
      }));
      onCreated?.(competencia);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:260, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:261, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'90dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ display:'flex', justifyContent:'center', padding:'14px 0 10px', flexShrink:0, cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
            Nueva competencia
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ margin:'8px 18px 0', borderRadius:10, padding:'10px 14px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ overflowY:'auto', flex:1, minHeight:0, padding:'14px 18px', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Nombre de la competencia</label>
            <input
              type="text" required autoFocus placeholder="Ej: Octubre 2026"
              value={nombre} onChange={e => setNombre(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Ponderadores por deporte</label>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>Puntos = minutos × ponderador. Puedes cambiarlo después.</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {deportes.map(d => (
                <PonderadorRow key={d.nombre} deporte={d.nombre} icono={d.icono} value={ponders[d.nombre] ?? d.ponderador_default} onChange={v => setPonders(p => ({ ...p, [d.nombre]: v }))} />
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Duración (opcional)</label>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Define un rango para habilitar challenges semanales y votación de deporte de la semana.</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
              <input type="date" value={fechaFin} min={fechaInicio || undefined} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Bonus por actividad en compañía (opcional)</label>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Puntos extra según con cuántos compañeros se hizo la actividad. Cada tramo es independiente; 0 = sin bonus.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label: '1 compañero',        value: bonus1,   setValue: setBonus1 },
                { label: '2 compañeros',       value: bonus2,   setValue: setBonus2 },
                { label: '3 o más compañeros', value: bonus3mas, setValue: setBonus3mas },
              ].map(tier => (
                <div key={tier.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 12px', borderRadius:10, border:'1px solid var(--t-dim)', background:'var(--t-surface2)' }}>
                  <span style={{ fontSize:14, color:'var(--t-text)' }}>{tier.label}</span>
                  <input
                    type="number" inputMode="decimal" min="0" step="1"
                    value={tier.value} onChange={e => tier.setValue(e.target.value)}
                    style={{ ...inputStyle, width:80, textAlign:'center' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer', flexShrink:0 }}>
            {loading ? 'Creando…' : 'Crear competencia'}
          </button>
        </form>
      </div>
    </>
  );
}
