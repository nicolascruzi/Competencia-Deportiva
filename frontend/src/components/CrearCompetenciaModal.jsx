import { useEffect, useState } from 'react';
import { getDeportes, createDeporte } from '../api/actividades';
import { createGrupo, joinGrupo } from '../api/grupos';
import { useLoading } from '../context/LoadingContext';

// ─── Pantalla de PIN tras crear ───────────────────────────────────────────────

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
    <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:'calc(60px + env(safe-area-inset-bottom))', background:'rgba(5,12,20,0.85)', backdropFilter:'blur(8px)' }}>
      <div style={{ width:'100%', borderRadius:'20px 20px 0 0', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderBottom:'none' }}>
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
          <div style={{ width:'100%', borderRadius:14, padding:'16px 20px', textAlign:'center', background:'rgba(var(--t-accent-r),0.08)', border:'1.5px solid rgba(var(--t-accent-r),0.3)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)', marginBottom:8 }}>PIN de acceso</div>
            <div style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:34, letterSpacing:'0.35em', color:'var(--t-accent)', lineHeight:1 }}>{pin}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
            <button onClick={copiar} style={{ ...btnBase, background: copiado ? '#34D399' : 'var(--t-accent)', color:'var(--t-ground)' }}>
              {copiado ? '✓ Copiado!' : '📋 Copiar PIN'}
            </button>
            <button onClick={compartirWhatsApp} style={{ ...btnBase, background:'#25D366', color:'#fff' }}>
              💬 Compartir por WhatsApp
            </button>
            <button onClick={onClose} style={{ ...btnBase, background:'transparent', border:'1px solid var(--t-dim)', color:'var(--t-muted)' }}>
              Ir a la competencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de ponderador ───────────────────────────────────────────────────────

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

// ─── Modal principal ──────────────────────────────────────────────────────────

const inputStyle = {
  width:'100%', background:'var(--t-surface2)', border:'1px solid var(--t-dim)',
  color:'var(--t-text)', padding:'11px 13px', borderRadius:'10px',
  fontSize:'15px', outline:'none', boxSizing:'border-box',
};

// Calcula bloques de 7 días exactos entre fecha_inicio y fecha_fin (última semana puede ser corta)
function calcularSemanas(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) return [];
  const semanas = [];
  let cursor = new Date(fechaInicio + 'T00:00:00Z');
  const end  = new Date(fechaFin    + 'T00:00:00Z');
  let numero = 1;
  while (cursor <= end) {
    const semanaFin = new Date(cursor);
    semanaFin.setUTCDate(semanaFin.getUTCDate() + 6);
    if (semanaFin > end) semanaFin.setTime(end.getTime());
    semanas.push({ numero_semana: numero, fecha_inicio: cursor.toISOString().slice(0, 10), fecha_fin: semanaFin.toISOString().slice(0, 10) });
    cursor = new Date(semanaFin);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    numero++;
  }
  return semanas;
}

function fechaLabel(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function CrearCompetenciaModal({ open, onClose, onCreated }) {
  const { withLoading } = useLoading();
  // paso: 'elegir' | 'crear' | 'unirse' | 'pin'
  const [paso, setPaso]         = useState('elegir');
  const [nombre, setNombre]     = useState('');
  const [deportes, setDeportes] = useState([]);
  const [ponders, setPonders]   = useState({});
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [pinData, setPinData]   = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [focusedNombre, setFocusedNombre] = useState(false);
  const [focusedPin, setFocusedPin]       = useState(false);

  // Deporte custom
  const [customNombre, setCustomNombre]   = useState('');
  const [customEmoji, setCustomEmoji]     = useState('');
  const [customPond, setCustomPond]       = useState('1.0');
  const [addingCustom, setAddingCustom]   = useState(false);
  const [customError, setCustomError]     = useState('');

  // Fechas, equipos, deporte de la semana, challenges, bonus por compañía
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [equiposNombres, setEquiposNombres] = useState(['Equipo 1', 'Equipo 2']);
  const [semanasData, setSemanasData] = useState({}); // { [numero_semana]: {deporte_semana_nombre, deporte_semana_ponderador_extra} }
  const [semanaAbierta, setSemanaAbierta] = useState(null);
  const [challengesData, setChallengesData] = useState([]); // [{texto, puntos, numero_semana}]
  const [bonus1, setBonus1]       = useState('0');
  const [bonus2, setBonus2]       = useState('0');
  const [bonus3mas, setBonus3mas] = useState('0');

  const semanasCalculadas = calcularSemanas(fechaInicio, fechaFin);

  function reloadDeportes() {
    return getDeportes().then(deps => {
      setDeportes(deps);
      setPonders(prev => {
        const next = { ...prev };
        deps.forEach(d => { if (!(d.nombre in next)) next[d.nombre] = d.ponderador_default; });
        return next;
      });
    });
  }

  useEffect(() => {
    if (open) {
      setPaso('elegir');
      setNombre(''); setError(''); setPinInput('');
      setCustomNombre(''); setCustomEmoji(''); setCustomPond('1.0'); setAddingCustom(false); setCustomError('');
      setFechaInicio(''); setFechaFin(''); setEquiposNombres(['Equipo 1', 'Equipo 2']);
      setSemanasData({}); setSemanaAbierta(null); setChallengesData([]);
      setBonus1('0'); setBonus2('0'); setBonus3mas('0');
      withLoading(() => reloadDeportes());
    }
  }, [open]);

  async function handleAgregarCustom() {
    if (!customNombre.trim()) return setCustomError('Ingresá el nombre del deporte');
    setCustomError('');
    try {
      await createDeporte({ nombre: customNombre.trim(), icono: customEmoji.trim() || '🏅', ponderador_default: parseFloat(customPond) || 1.0 });
      await reloadDeportes();
      setCustomNombre(''); setCustomEmoji(''); setCustomPond('1.0'); setAddingCustom(false);
    } catch (err) {
      setCustomError(err.message);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError('El nombre es obligatorio');
    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) return setError('Definí fecha de inicio y fin, o ninguna de las dos');
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) return setError('La fecha de fin no puede ser anterior a la de inicio');
    setError(''); setLoading(true);
    try {
      const ponderadores = Object.entries(ponders).map(([deporte_nombre, ponderador]) => ({
        deporte_nombre, ponderador: parseFloat(ponderador),
      }));
      const equipos_nombres = equiposNombres.map(n => n.trim()).filter(Boolean);
      const semanas = semanasCalculadas
        .map(s => ({ numero_semana: s.numero_semana, ...semanasData[s.numero_semana] }))
        .filter(s => s.deporte_semana_nombre);
      const challenges = challengesData
        .filter(c => c.texto?.trim())
        .map(c => ({ texto: c.texto.trim(), puntos: parseFloat(c.puntos) || 0, numero_semana: c.numero_semana ?? null }));
      const grupo = await withLoading(() => createGrupo({
        nombre: nombre.trim(),
        ponderadores,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        equipos_nombres,
        semanas,
        challenges,
        bonus_1_companero_pts: parseFloat(bonus1) || 0,
        bonus_2_companeros_pts: parseFloat(bonus2) || 0,
        bonus_3mas_companeros_pts: parseFloat(bonus3mas) || 0,
      }));
      setPinData({ nombre: grupo.nombre, pin: grupo.pin, id: grupo.id });
      setPaso('pin');
      onCreated?.(grupo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnirse(e) {
    e.preventDefault();
    if (pinInput.length !== 6) return setError('El PIN debe tener 6 dígitos');
    setError(''); setLoading(true);
    try {
      const comp = await withLoading(() => joinGrupo(pinInput));
      onCreated?.(comp);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;
  if (paso === 'pin') return <PinDisplay nombre={pinData.nombre} pin={pinData.pin} onClose={onClose} />;

  const isCentered = paso === 'elegir' || paso === 'unirse';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex', flexDirection:'column', justifyContent: isCentered ? 'center' : 'flex-end', padding: isCentered ? '0 16px' : 0, paddingBottom: isCentered ? 0 : 'calc(60px + env(safe-area-inset-bottom))', background:'rgba(5,12,20,0.75)', backdropFilter:'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ width:'100%', borderRadius: isCentered ? 20 : '20px 20px 0 0', background:'var(--t-surface)', border:'1px solid var(--t-dim)', maxHeight:'calc(92dvh - env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 18px 12px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {paso !== 'elegir' && (
              <button onClick={() => { setPaso('elegir'); setError(''); }}
                style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                ‹
              </button>
            )}
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', color:'var(--t-text)' }}>
              {paso === 'elegir' ? 'Competencia' : paso === 'crear' ? 'Nueva competencia' : 'Unirse con PIN'}
            </div>
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

        {/* ── PASO: elegir ── */}
        {paso === 'elegir' && (
          <div style={{ padding:'4px 18px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={() => setPaso('crear')}
              style={{ width:'100%', padding:'18px', borderRadius:14, border:'1.5px solid rgba(var(--t-accent-r),0.35)', background:'rgba(var(--t-accent-r),0.06)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, textTransform:'uppercase', color:'var(--t-accent)', lineHeight:1 }}>Crear competencia</div>
              <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:4 }}>Configurá nombre y ponderadores</div>
            </button>
            <button onClick={() => setPaso('unirse')}
              style={{ width:'100%', padding:'18px', borderRadius:14, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>Unirse con PIN</div>
              <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:4 }}>Ingresá el PIN de 6 dígitos que te compartieron</div>
            </button>
          </div>
        )}

        {/* ── PASO: crear ── */}
        {paso === 'crear' && (
          <form onSubmit={handleCrear} style={{ overflowY:'auto', flex:1, minHeight:0, padding:'0 18px', paddingBottom:'calc(1.5rem + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Nombre de la competencia</label>
              <input
                type="text" required placeholder="Ej: Liga de verano 2026"
                value={nombre} onChange={e => setNombre(e.target.value)}
                style={{ ...inputStyle, borderColor: focusedNombre ? 'var(--t-accent)' : 'var(--t-dim)' }}
                onFocus={() => setFocusedNombre(true)}
                onBlur={() => setFocusedNombre(false)}
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Ponderadores por deporte</label>
                <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>Puntos = minutos × ponderador. Podés cambiarlo después.</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {deportes.map(d => (
                  <PonderadorRow key={d.nombre} deporte={d.nombre} icono={d.icono} value={ponders[d.nombre] ?? d.ponderador_default} onChange={v => setPonders(p => ({ ...p, [d.nombre]: v }))} />
                ))}
              </div>

              {/* Agregar deporte custom */}
              {!addingCustom ? (
                <button type="button" onClick={() => setAddingCustom(true)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:12, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13, fontWeight:600, width:'100%', justifyContent:'center', marginTop:4 }}>
                  + Agregar deporte extra
                </button>
              ) : (
                <div style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:12, padding:'12px', display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte extra</div>
                  {customError && <div style={{ fontSize:12, color:'#F87171' }}>{customError}</div>}
                  <div style={{ display:'flex', gap:8 }}>
                    <input
                      type="text" placeholder="Emoji" value={customEmoji}
                      onChange={e => setCustomEmoji(e.target.value)}
                      style={{ width:52, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px', borderRadius:8, fontSize:20, textAlign:'center', outline:'none', flexShrink:0 }}
                    />
                    <input
                      type="text" placeholder="Nombre del deporte" value={customNombre}
                      onChange={e => setCustomNombre(e.target.value)}
                      style={{ flex:1, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:14, outline:'none' }}
                    />
                    <input
                      type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="Pond."
                      value={customPond} onChange={e => setCustomPond(e.target.value)}
                      style={{ width:60, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-accent)', padding:'8px', borderRadius:8, fontSize:14, textAlign:'center', outline:'none', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, flexShrink:0 }}
                    />
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button type="button" onClick={handleAgregarCustom}
                      style={{ flex:1, padding:'9px', borderRadius:9, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, textTransform:'uppercase', cursor:'pointer' }}>
                      Agregar
                    </button>
                    <button type="button" onClick={() => { setAddingCustom(false); setCustomError(''); }}
                      style={{ padding:'9px 14px', borderRadius:9, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:13, cursor:'pointer' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rango de fechas */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Duración (opcional)</label>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Definí un rango para habilitar equipos y challenges semanales.</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} />
                <input type="date" value={fechaFin} min={fechaInicio || undefined} onChange={e => setFechaFin(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Equipos */}
            {fechaInicio && fechaFin && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Equipos</label>
                <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Solo nombres por ahora — asignás a cada participante después, desde la competencia.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {equiposNombres.map((n, i) => (
                    <div key={i} style={{ display:'flex', gap:8 }}>
                      <input
                        type="text" value={n} placeholder={`Equipo ${i + 1}`}
                        onChange={e => setEquiposNombres(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                        style={{ ...inputStyle, flex:1 }}
                      />
                      <button type="button" onClick={() => setEquiposNombres(prev => prev.filter((_, j) => j !== i))}
                        style={{ width:38, flexShrink:0, borderRadius:10, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setEquiposNombres(prev => [...prev, `Equipo ${prev.length + 1}`])}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13, fontWeight:600, width:'100%', justifyContent:'center' }}>
                  + Agregar equipo
                </button>
              </div>
            )}

            {/* Challenges (opcional, no depende de tener fechas configuradas) */}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Challenges (opcional)</label>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Podés agregar más después, editando la competencia.</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {challengesData.map((c, i) => (
                  <div key={i} style={{ border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8, background:'var(--t-surface2)' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        type="text" placeholder="Challenge (ej: Hacer 100 flexiones)"
                        value={c.texto || ''}
                        onChange={e => setChallengesData(prev => prev.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))}
                        style={{ ...inputStyle, flex:1 }}
                      />
                      <button type="button" onClick={() => setChallengesData(prev => prev.filter((_, j) => j !== i))}
                        style={{ width:38, flexShrink:0, borderRadius:10, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer' }}>✕</button>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <input
                        type="number" inputMode="decimal" min="0" step="1" placeholder="Puntos"
                        value={c.puntos ?? ''}
                        onChange={e => setChallengesData(prev => prev.map((x, j) => j === i ? { ...x, puntos: e.target.value } : x))}
                        style={{ ...inputStyle, width:90, flexShrink:0 }}
                      />
                      {semanasCalculadas.length > 0 && (
                        <select
                          value={c.numero_semana ?? ''}
                          onChange={e => setChallengesData(prev => prev.map((x, j) => j === i ? { ...x, numero_semana: e.target.value ? parseInt(e.target.value) : null } : x))}
                          style={{ ...inputStyle, flex:1, appearance:'none' }}
                        >
                          <option value="">Sin semana (siempre vigente)</option>
                          {semanasCalculadas.map(s => <option key={s.numero_semana} value={s.numero_semana}>Semana {s.numero_semana} — {fechaLabel(s.fecha_inicio)} al {fechaLabel(s.fecha_fin)}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setChallengesData(prev => [...prev, { texto: '', puntos: 0, numero_semana: null }])}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderRadius:10, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13, fontWeight:600, width:'100%', justifyContent:'center' }}>
                + Agregar challenge
              </button>
            </div>

            {/* Deporte de la semana (solo si hay rango de fechas) */}
            {semanasCalculadas.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Deporte de la semana (opcional)</label>
                <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Podés dejarlo vacío y completarlo después editando la competencia.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {semanasCalculadas.map(s => {
                    const abierta = semanaAbierta === s.numero_semana;
                    const data = semanasData[s.numero_semana] || {};
                    const tieneContenido = !!data.deporte_semana_nombre;
                    return (
                      <div key={s.numero_semana} style={{ border:'1px solid var(--t-dim)', borderRadius:12, overflow:'hidden', background:'var(--t-surface2)' }}>
                        <button type="button" onClick={() => setSemanaAbierta(abierta ? null : s.numero_semana)}
                          style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>
                            Semana {s.numero_semana} — {fechaLabel(s.fecha_inicio)} al {fechaLabel(s.fecha_fin)}
                            {tieneContenido && <span style={{ color:'var(--t-accent)' }}> ✓</span>}
                          </span>
                          <span style={{ color:'var(--t-muted)' }}>{abierta ? '▲' : '▼'}</span>
                        </button>
                        {abierta && (
                          <div style={{ padding:'0 12px 12px', display:'flex', gap:8 }}>
                            <select
                              value={data.deporte_semana_nombre || ''}
                              onChange={e => setSemanasData(prev => ({ ...prev, [s.numero_semana]: { ...prev[s.numero_semana], deporte_semana_nombre: e.target.value } }))}
                              style={{ ...inputStyle, flex:1, appearance:'none' }}
                            >
                              <option value="">Sin deporte de la semana</option>
                              {deportes.map(d => <option key={d.nombre} value={d.nombre}>{d.icono} {d.nombre}</option>)}
                            </select>
                            <input
                              type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="Extra"
                              value={data.deporte_semana_ponderador_extra ?? ''}
                              onChange={e => setSemanasData(prev => ({ ...prev, [s.numero_semana]: { ...prev[s.numero_semana], deporte_semana_ponderador_extra: e.target.value } }))}
                              disabled={!data.deporte_semana_nombre}
                              style={{ ...inputStyle, width:70, flexShrink:0, textAlign:'center', opacity: data.deporte_semana_nombre ? 1 : 0.5 }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bonus por actividad en compañía */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>Bonus por actividad en compañía (opcional)</label>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>Puntos extra según con cuántos compañeros de la competencia se hizo la actividad. Cada tramo es independiente; 0 = sin bonus.</div>
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
        )}

        {/* ── PASO: unirse ── */}
        {paso === 'unirse' && (
          <form onSubmit={handleUnirse} style={{ padding:'4px 18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--t-muted)' }}>PIN de 6 dígitos</label>
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="000000"
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ ...inputStyle, fontSize:24, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", letterSpacing:'0.3em', borderColor: focusedPin ? 'var(--t-accent)' : 'var(--t-dim)' }}
                onFocus={() => setFocusedPin(true)}
                onBlur={() => setFocusedPin(false)}
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || pinInput.length !== 6}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity:(loading || pinInput.length !== 6) ? 0.5 : 1, cursor: pinInput.length === 6 ? 'pointer' : 'default' }}>
              {loading ? 'Uniéndose…' : 'Unirme'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
