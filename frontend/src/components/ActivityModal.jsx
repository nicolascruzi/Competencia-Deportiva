import { useEffect, useRef, useState } from 'react';
import { getDeportes, createActividad } from '../api/actividades';
import { getCompetencias } from '../api/competencias';
import { uploadFoto } from '../api/fotos';
import { useLoading } from '../context/LoadingContext';
import { useAuth } from '../context/AuthContext';

const S = {
  input: {
    width: '100%', background: 'var(--t-surface2)', border: '1px solid var(--t-dim)',
    color: 'var(--t-text)', padding: '9px 12px', borderRadius: '10px',
    fontSize: '16px', outline: 'none', boxSizing: 'border-box',
  },
};

function Input({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props}
      style={{ ...S.input, ...style, borderColor: focused ? 'var(--t-accent)' : 'var(--t-dim)' }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );
}

function Select({ children, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select {...props}
      style={{ ...S.input, ...style, borderColor: focused ? 'var(--t-accent)' : 'var(--t-dim)', appearance: 'none', cursor: 'pointer' }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {children}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-muted)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

// competenciaActiva: { id, nombre, creador_id, deportes: [{deporte_nombre, ponderador}], ... } | null
export default function ActivityModal({ open, onClose, onCreated, competenciaActiva }) {
  const { user } = useAuth();
  const [deportes, setDeportes]     = useState([]);
  const [form, setForm]             = useState({ deporte_nombre: '', minutos: '', ponderador: '', fecha: '', notas: '' });
  const [foto, setFoto]             = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  // { [competencia_id]: number[] } — un set de compañeros marcados por cada competencia en curso con equipo
  const [companerosPorComp, setCompanerosPorComp] = useState({});
  const [misCompetencias, setMisCompetencias] = useState([]);
  const fileInputRef                = useRef(null);
  const { withLoading } = useLoading();

  // Competencias en curso con bonus por compañía activado y al menos otro participante — una sección de chips por cada una
  const competenciasConBonus = misCompetencias.filter(c =>
    c.en_curso && parseFloat(c.bonus_companeros_pts) > 0 && (c.otros_participantes?.length ?? 0) > 0
  );

  // Mapa de ponderadores de la competencia activa: { deporte_nombre → ponderador }
  // Solo se considera "activo" si la competencia tiene deportes configurados con al menos un valor
  const compPondMap = (() => {
    const deps = competenciaActiva?.deportes;
    if (!Array.isArray(deps) || deps.length === 0) return null;
    const map = Object.fromEntries(deps.filter(Boolean).map(d => [d.deporte_nombre, parseFloat(d.ponderador)]));
    return Object.keys(map).length > 0 ? map : null;
  })();

  // Devuelve el ponderador correcto para un deporte dado el contexto
  function getPonderador(nombre, dep) {
    if (compPondMap && compPondMap[nombre] != null && !isNaN(compPondMap[nombre])) return compPondMap[nombre];
    return dep?.ponderador_default ?? 1;
  }

  // Ponderador bloqueado solo si el deporte actual tiene un valor configurado en la competencia
  const pondBloqueado = compPondMap && form.deporte_nombre && compPondMap[form.deporte_nombre] != null && !isNaN(compPondMap[form.deporte_nombre]);

  useEffect(() => { getDeportes().then(setDeportes).catch(() => {}); }, []);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(f => ({ ...f, fecha: today, notas: '', minutos: '' }));
      setError('');
      setFoto(null);
      setFotoPreview(null);
      setCompanerosPorComp({});
      getCompetencias().then(setMisCompetencias).catch(() => setMisCompetencias([]));
    }
  }, [open]);

  function toggleCompanero(competenciaId, userId) {
    setCompanerosPorComp(prev => {
      const actuales = prev[competenciaId] ?? [];
      const nuevos = actuales.includes(userId) ? actuales.filter(x => x !== userId) : [...actuales, userId];
      return { ...prev, [competenciaId]: nuevos };
    });
  }

  useEffect(() => {
    if (deportes.length) {
      const nombre = form.deporte_nombre || deportes[0].nombre;
      const dep    = deportes.find(d => d.nombre === nombre) || deportes[0];
      setForm(f => ({ ...f, deporte_nombre: dep.nombre, ponderador: getPonderador(dep.nombre, dep) }));
    }
  }, [deportes, competenciaActiva]);

  function onDeporteChange(nombre) {
    const dep = deportes.find(d => d.nombre === nombre);
    setForm(f => ({ ...f, deporte_nombre: nombre, ponderador: getPonderador(nombre, dep) }));
  }

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearFoto() {
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    if (form.fecha > today) {
      setError('No puedes registrar actividades en fechas futuras.');
      return;
    }
    setError(''); setLoading(true);
    try {
      let savedActividad = null;
      await withLoading(async () => {
        const companerosIds = [...new Set(Object.values(companerosPorComp).flat())];
        const actividad = await createActividad({
          deporte_nombre: form.deporte_nombre,
          minutos:        parseFloat(form.minutos),
          ponderador:     parseFloat(form.ponderador),
          fecha:          form.fecha,
          notas:          form.notas || null,
          companeros_ids: companerosIds,
        });
        if (foto && actividad.id) {
          await uploadFoto(actividad.id, foto).catch(() => {});
        }
        savedActividad = actividad;
      });
      onCreated?.(savedActividad);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const minutos = form.minutos ? parseFloat(form.minutos) : null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:200, display:'flex', flexDirection:'column', justifyContent:'flex-end', background:'rgba(5,12,20,0.72)', backdropFilter:'blur(5px)', WebkitBackdropFilter:'blur(5px)' }}>

      <div style={{ background:'var(--t-surface)', borderRadius:'20px 20px 0 0', border:'1px solid var(--t-dim)', borderBottom:'none', maxHeight:'92dvh', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>

        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 6px' }}>
          <div style={{ width:36, height:3, borderRadius:2, background:'var(--t-dim)' }} />
        </div>

        {/* Cabecera */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px 10px' }}>
          <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)' }}>
            Nueva actividad
          </span>
          <button onClick={onClose}
            style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ margin:'0 16px 10px', padding:'9px 12px', borderRadius:10, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', fontSize:13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}
          style={{ padding:'0 16px', paddingBottom:`calc(16px + env(safe-area-inset-bottom))`, display:'flex', flexDirection:'column', gap:12 }}>

          {/* Deporte */}
          <Field label="Deporte">
            <Select value={form.deporte_nombre} onChange={e => onDeporteChange(e.target.value)}>
              {deportes.map(d => (
                <option key={d.id} value={d.nombre}>{d.nombre}</option>
              ))}
            </Select>
          </Field>

          {/* Minutos + Ponderador en la misma fila */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Minutos">
              <Input type="number" inputMode="numeric" min="1" required placeholder="60"
                value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} />
            </Field>
            <Field label={pondBloqueado ? 'Ponderador (comp.)' : 'Ponderador'}>
              {pondBloqueado ? (
                <div style={{ ...S.input, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'default', opacity:0.7 }}>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:'var(--t-accent)' }}>
                    {form.ponderador}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
              ) : (
                <Input type="number" inputMode="decimal" min="0.1" step="0.1" required
                  value={form.ponderador} onChange={e => setForm(f => ({ ...f, ponderador: e.target.value }))} />
              )}
            </Field>
          </div>
          {pondBloqueado && (
            <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:-6 }}>
              Ponderador fijado por <span style={{ color:'var(--t-accent)', fontWeight:600 }}>{competenciaActiva.nombre}</span>. Solo el admin puede modificarlo.
            </div>
          )}

          {/* Fecha */}
          <Field label="Fecha">
            <Input type="date" required
              max={new Date().toISOString().slice(0, 10)}
              value={form.fecha}
              onChange={e => {
                const today = new Date().toISOString().slice(0, 10);
                const val = e.target.value > today ? today : e.target.value;
                setForm(f => ({ ...f, fecha: val }));
              }} />
          </Field>

          {/* Notas */}
          <Field label="Notas (opcional)">
            <Input type="text" placeholder="Descripción breve…"
              value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </Field>

          {/* Hecho en compañía — una sección por cada competencia en curso con bonus activado */}
          {competenciasConBonus.map(c => {
            const seleccionados = companerosPorComp[c.id] ?? [];
            return (
              <Field key={c.id} label={competenciasConBonus.length > 1
                ? `¿Lo hiciste con alguien de "${c.nombre}"?`
                : '¿Lo hiciste con algún compañero de la competencia?'}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {c.otros_participantes.map(m => {
                    const selected = seleccionados.includes(m.id);
                    return (
                      <button key={m.id} type="button" onClick={() => toggleCompanero(c.id, m.id)}
                        style={{
                          display:'flex', alignItems:'center', gap:6, padding:'6px 12px 6px 6px', borderRadius:20,
                          border: selected ? '1.5px solid var(--t-accent)' : '1.5px solid var(--t-dim)',
                          background: selected ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                          color: selected ? 'var(--t-accent)' : 'var(--t-muted)',
                          cursor:'pointer', fontSize:13, fontWeight:600, WebkitTapHighlightColor:'transparent',
                        }}>
                        <span style={{ width:22, height:22, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:'rgba(var(--t-accent-r),0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800 }}>
                          {m.foto_perfil_url
                            ? <img src={m.foto_perfil_url} alt={m.nombre_display} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : m.nombre_display?.charAt(0).toUpperCase()}
                        </span>
                        {m.nombre_display}
                      </button>
                    );
                  })}
                </div>
              </Field>
            );
          })}

          {/* Foto */}
          <Field label="Foto (opcional)">
            {fotoPreview ? (
              <div style={{ position:'relative', borderRadius:10, overflow:'hidden', aspectRatio:'16/9' }}>
                <img src={fotoPreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <button type="button" onClick={clearFoto}
                  style={{ position:'absolute', top:8, right:8, width:28, height:28, borderRadius:6, background:'rgba(5,12,20,0.8)', border:'1px solid rgba(248,113,113,0.4)', color:'#F87171', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ width:'100%', padding:'12px 16px', borderRadius:10, border:'1px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='var(--t-accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--t-dim)'}>
                <span style={{ color:'var(--t-muted2)', flexShrink:0 }}><IconCamera /></span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--t-muted)' }}>Agregar foto</div>
                  <div style={{ fontSize:11, color:'var(--t-muted2)', marginTop:1 }}>Galería o cámara</div>
                </div>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*"
              onChange={handleFotoChange} style={{ display:'none' }} />
          </Field>

          {/* Preview minutos */}
          {minutos !== null && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, background:'rgba(var(--t-accent-r),0.07)', border:'1px solid rgba(var(--t-accent-r),0.18)' }}>
              <span style={{ fontSize:12, color:'var(--t-muted)', fontWeight:600 }}>Duración</span>
              <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:18, color:'var(--t-accent)' }}>
                {minutos} min
              </span>
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', borderRadius:12, border:'none', cursor: loading ? 'default' : 'pointer', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: loading ? 0.7 : 1, marginTop:2 }}>
            {loading ? 'Guardando…' : 'Guardar actividad'}
          </button>

        </form>
      </div>
    </div>
  );
}
