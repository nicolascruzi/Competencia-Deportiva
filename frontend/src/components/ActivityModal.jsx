import { useEffect, useRef, useState } from 'react';
import { getDeportes, createActividad } from '../api/actividades';
import { getGrupos } from '../api/grupos';
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

// competenciaActiva: { id, nombre, deportes: [{deporte_nombre, ponderador}], ... } | null
export default function ActivityModal({ open, onClose, onCreated, competenciaActiva }) {
  const { user } = useAuth();
  const [deportes, setDeportes]     = useState([]);
  const [form, setForm]             = useState({ deporte_nombre: '', minutos: '', ponderador: '', fecha: '', notas: '' });
  const [foto, setFoto]             = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [cantidadCompaneros, setCantidadCompaneros] = useState(0); // 0-3, 3 = "3 o más"
  const [misCompetencias, setMisCompetencias] = useState([]);
  const [cargandoCompetencias, setCargandoCompetencias] = useState(true);
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const fileInputRef                = useRef(null);
  const { withLoading } = useLoading();

  // Se muestra el selector si alguna competencia en curso de algún grupo tiene el bonus activado en algún tramo
  const mostrarSelectorCompaneros = misCompetencias.some(g =>
    (g.competencias_en_curso ?? []).some(c =>
      parseFloat(c.bonus_1_companero_pts) > 0 ||
      parseFloat(c.bonus_2_companeros_pts) > 0 ||
      parseFloat(c.bonus_3mas_companeros_pts) > 0
    )
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

  // Si el deporte elegido es alguno de los dos "deporte de la semana" vigentes en la competencia
  // activa (el tranquilo o el extremo — comparten el mismo extra), se suma un extra — se muestra
  // desglosado ("1.10 +0.30") para que quede explícito de dónde sale el total.
  const extraSemana = (() => {
    if (!competenciaActiva || !form.deporte_nombre) return 0;
    const esDeporteDeLaSemana =
      competenciaActiva.deporte_semana_actual_nombre === form.deporte_nombre ||
      competenciaActiva.deporte_semana_actual_nombre_2 === form.deporte_nombre;
    if (!esDeporteDeLaSemana) return 0;
    const v = parseFloat(competenciaActiva.deporte_semana_actual_ponderador_extra);
    return !isNaN(v) ? v : 0;
  })();
  const ponderadorTotal = (parseFloat(form.ponderador) || 0) + extraSemana;

  // Puntos de bonus por compañía configurados en la competencia activa, por tramo.
  const bonusCompaneros = {
    1: parseFloat(competenciaActiva?.bonus_1_companero_pts) || 0,
    2: parseFloat(competenciaActiva?.bonus_2_companeros_pts) || 0,
    3: parseFloat(competenciaActiva?.bonus_3mas_companeros_pts) || 0,
  };

  useEffect(() => { getDeportes().then(setDeportes).catch(() => {}); }, []);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(f => ({ ...f, fecha: today, notas: '', minutos: '' }));
      setError('');
      setFoto(null);
      setFotoPreview(null);
      setCantidadCompaneros(0);
      setNotasAbiertas(false);
      setCargandoCompetencias(true);
      getGrupos().then(setMisCompetencias).catch(() => setMisCompetencias([])).finally(() => setCargandoCompetencias(false));
    }
  }, [open]);

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
        const actividad = await createActividad({
          deporte_nombre: form.deporte_nombre,
          minutos:        parseFloat(form.minutos),
          fecha:          form.fecha,
          notas:          form.notas || null,
          cantidad_companeros: cantidadCompaneros,
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

          {/* Minutos + Fecha en la misma fila — son los dos únicos datos que cambian siempre */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Minutos">
              <Input type="number" inputMode="numeric" min="1" required placeholder="60"
                value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} />
            </Field>
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
          </div>

          {/* Ponderador — solo una línea informativa, no un campo propio (el usuario no lo edita). */}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--t-muted)', marginTop:-4 }}>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:'var(--t-accent)' }}>
              {ponderadorTotal.toFixed(2)}
            </span>
            <span>
              {extraSemana > 0
                ? <>ponderador, incluye <span style={{ color:'var(--t-accent)', fontWeight:600 }}>+{extraSemana}</span> por ser el deporte de la semana</>
                : pondBloqueado
                ? <>ponderador fijado por {competenciaActiva.nombre}</>
                : 'ponderador según el deporte'}
            </span>
          </div>

          {/* Hecho en compañía — chips compactos con label inline, sin su propio bloque "Field".
              Mientras se determina si corresponde mostrarlo, se reserva el espacio con un skeleton. */}
          {cargandoCompetencias && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: i === 0 ? 62 : 40, height:28, borderRadius:16, background:'var(--t-dim)', opacity:0.5 }} />
              ))}
            </div>
          )}
          {!cargandoCompetencias && mostrarSelectorCompaneros && (
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:6 }}>
              <span style={{ fontSize:12, color:'var(--t-muted)', marginRight:2 }}>Con compañeros:</span>
              {[
                { value: 0, label: 'Solo yo' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3+' },
              ].map(opt => {
                const selected = cantidadCompaneros === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setCantidadCompaneros(opt.value)}
                    style={{
                      padding:'5px 12px', borderRadius:16,
                      border: selected ? '1.5px solid var(--t-accent)' : '1px solid var(--t-dim)',
                      background: selected ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                      color: selected ? 'var(--t-accent)' : 'var(--t-muted)',
                      cursor:'pointer', fontSize:12.5, fontWeight:600, WebkitTapHighlightColor:'transparent',
                    }}>
                    {opt.label}
                  </button>
                );
              })}
              {cantidadCompaneros > 0 && bonusCompaneros[cantidadCompaneros] > 0 && (
                <span style={{ fontSize:11.5, color:'var(--t-accent)', fontWeight:600 }}>+{bonusCompaneros[cantidadCompaneros]} pts</span>
              )}
            </div>
          )}

          {/* Notas y foto — acciones secundarias opcionales, colapsadas a íconos chicos para no
              ocupar espacio cuando no se usan. */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!notasAbiertas && (
              <button type="button" onClick={() => setNotasAbiertas(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:16, border:'1px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:12.5, WebkitTapHighlightColor:'transparent' }}>
                + Nota
              </button>
            )}
            {!fotoPreview && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:16, border:'1px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:12.5, WebkitTapHighlightColor:'transparent' }}>
                <IconCamera /> Foto
              </button>
            )}
          </div>

          {notasAbiertas && (
            <Input type="text" placeholder="Descripción breve…" autoFocus
              value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          )}

          {fotoPreview && (
            <div style={{ position:'relative', borderRadius:10, overflow:'hidden', aspectRatio:'16/9' }}>
              <img src={fotoPreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              <button type="button" onClick={clearFoto}
                style={{ position:'absolute', top:8, right:8, width:28, height:28, borderRadius:6, background:'rgba(5,12,20,0.8)', border:'1px solid rgba(248,113,113,0.4)', color:'#F87171', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                ✕
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*"
            onChange={handleFotoChange} style={{ display:'none' }} />

          {/* Preview de puntos totales — desglosado para que quede claro cuánto viene del ponderador
              (minutos × ponderador, incluyendo el extra de deporte de la semana si corresponde) y
              cuánto del bonus por hacerlo con compañeros. */}
          {minutos !== null && minutos > 0 && (() => {
            const ptsPonderador = minutos * ponderadorTotal;
            const ptsCompaneros = cantidadCompaneros > 0 ? bonusCompaneros[cantidadCompaneros] : 0;
            const ptsTotal = ptsPonderador + ptsCompaneros;
            return (
              <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(var(--t-accent-r),0.07)', border:'1px solid rgba(var(--t-accent-r),0.18)', display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--t-muted)', fontWeight:600 }}>Puntos totales</span>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:18, color:'var(--t-accent)' }}>
                    {ptsTotal.toFixed(1)} pts
                  </span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2, fontSize:11, color:'var(--t-muted)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>{minutos} min × {ponderadorTotal.toFixed(2)} ponderador</span>
                    <span>{ptsPonderador.toFixed(1)} pts</span>
                  </div>
                  {ptsCompaneros > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>Con compañeros</span>
                      <span>+{ptsCompaneros} pts</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
