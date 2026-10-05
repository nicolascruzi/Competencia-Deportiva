import { useEffect, useRef, useState } from 'react';
import {
  updatePonderadores, updateSemanas,
  crearChallenge, updateChallenge, deleteChallenge, updateConfiguracion,
} from '../api/competencias';
import { updateEquiposGrupo, updateAsignacionesGrupo } from '../api/grupos';
import { useLoading } from '../context/LoadingContext';
import { getDeportes as getAllDeportes, createDeporte, updateDeporte, deleteDeporte } from '../api/actividades';

const IconEditDeporte = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrashDeporte = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);

function AdminSheetLoading({ onClose, embedded = false }) {
  const body = (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'48px 20px' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid var(--t-dim)', borderTopColor:'var(--t-accent)', animation:'spin 0.8s linear infinite' }} />
      <div style={{ fontSize:13, color:'var(--t-muted)' }}>Cargando…</div>
    </div>
  );
  if (embedded) return body;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>
        {body}
      </div>
    </>
  );
}

// Envoltorio compartido por los 4 paneles admin: en modo modal (embedded=false, el default) se
// comporta como bottom-sheet con backdrop, swipe-down y botón ✕, exactamente como antes. En modo
// embedded=true (usado desde la pantalla de detalle de competencia) se renderiza como un bloque de
// contenido normal, sin backdrop ni posicionamiento fijo, para que viva dentro de esa misma pantalla
// en vez de abrirse como un sheet aparte.
function SheetShell({ embedded, onClose, onTouchStart, onTouchEnd, title, meta, children, footer }) {
  if (embedded) {
    return (
      <div style={{ display:'flex', flexDirection:'column' }}>
        {children}
        {footer}
      </div>
    );
  }
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'90dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ display:'flex', justifyContent:'center', padding:'14px 0 10px', flexShrink:0, cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1 }}>
              {title}
            </div>
            {meta && <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>{meta}</div>}
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>
        {children}
        {footer}
      </div>
    </>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

// ─── SHEET ADMIN: editar ponderadores ────────────────────────────────────────

function AdminPonderadoresSheet({ competencia, onClose, onSaved, readOnly = false, embedded = false }) {
  const [deportes, setDeportes]   = useState([]);
  const [ponders, setPonders]     = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  // Estado para nuevo deporte
  const [nuevoNombre, setNuevoNombre]   = useState('');
  const [nuevoIcono, setNuevoIcono]     = useState('🏅');
  const [nuevoPond, setNuevoPond]       = useState('1.0');
  const [addingDeporte, setAddingDeporte] = useState(false);
  const [addSuccess, setAddSuccess]     = useState('');
  const [addError, setAddError]         = useState('');
  // Edición inline de un deporte existente (nombre/ícono/ponderador por defecto del catálogo)
  const [editandoId, setEditandoId]     = useState(null);
  const [editDraft, setEditDraft]       = useState({ nombre: '', icono: '', ponderador_default: '' });
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState('');
  const [borrandoId, setBorrandoId]     = useState(null);
  const startY = useRef(null);
  const { withLoading } = useLoading();

  function loadDeportes() {
    return getAllDeportes().then(deps => {
      setDeportes(deps);
      setPonders(prev => {
        const map = {};
        deps.forEach(d => { map[d.nombre] = prev[d.nombre] ?? d.ponderador_default; });
        (competencia.deportes || []).forEach(cd => { map[cd.deporte_nombre] = prev[cd.deporte_nombre] ?? cd.ponderador; });
        return map;
      });
    });
  }

  useEffect(() => { withLoading(loadDeportes); }, []);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleAddDeporte() {
    const nombre = nuevoNombre.trim();
    if (!nombre) { setAddError('El nombre es obligatorio'); return; }
    if (deportes.some(d => d.nombre.toLowerCase() === nombre.toLowerCase())) {
      setAddError('Ya existe ese deporte'); return;
    }
    const pond = parseFloat(nuevoPond) || 1;
    setAddingDeporte(true); setAddError(''); setAddSuccess('');
    try {
      await createDeporte({ nombre, icono: nuevoIcono || '🏅', ponderador_default: pond });
      setPonders(p => ({ ...p, [nombre]: pond }));
      await getAllDeportes().then(deps => {
        setDeportes(deps);
        setPonders(prev => {
          const map = { ...prev };
          deps.forEach(d => { if (!(d.nombre in map)) map[d.nombre] = d.ponderador_default; });
          return map;
        });
      });
      setAddSuccess(`"${nombre}" se agregó — búscalo en la lista y no olvides Guardar cambios.`);
      setNuevoNombre('');
      setNuevoIcono('🏅');
      setNuevoPond('1.0');
    } catch (err) {
      setAddError(err.message || 'Error al crear deporte');
    } finally {
      setAddingDeporte(false);
    }
  }

  function empezarEdicion(d) {
    setEditandoId(d.id);
    setEditDraft({ nombre: d.nombre, icono: d.icono, ponderador_default: String(d.ponderador_default) });
    setEditError('');
  }

  async function handleGuardarEdicion(deporteOriginal) {
    const nombre = editDraft.nombre.trim();
    if (!nombre) { setEditError('El nombre es obligatorio'); return; }
    const pond = parseFloat(editDraft.ponderador_default) || 1;
    setEditSaving(true); setEditError('');
    try {
      await updateDeporte(deporteOriginal.id, { nombre, icono: editDraft.icono || '🏅', ponderador_default: pond });
      const deps = await getAllDeportes();
      setDeportes(deps);
      // El ponderador tipeado por el usuario para este deporte en esta sesión vive bajo la key del
      // nombre viejo — si cambió el nombre, se migra a la key nueva para no perderlo.
      setPonders(prev => {
        const map = { ...prev };
        if (deporteOriginal.nombre !== nombre && deporteOriginal.nombre in map) {
          map[nombre] = map[deporteOriginal.nombre];
          delete map[deporteOriginal.nombre];
        }
        return map;
      });
      setEditandoId(null);
    } catch (err) {
      setEditError(err.message || 'Error al editar el deporte');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleBorrarDeporte(d) {
    if (!confirm(`¿Eliminar "${d.nombre}" del catálogo? Las actividades ya registradas con este deporte no se borran, pero dejará de estar disponible para elegir en nuevas actividades.`)) return;
    setBorrandoId(d.id); setEditError('');
    try {
      await deleteDeporte(d.id);
      setDeportes(prev => prev.filter(x => x.id !== d.id));
      setPonders(prev => {
        const map = { ...prev };
        delete map[d.nombre];
        return map;
      });
    } catch (err) {
      setEditError(err.message || 'Error al eliminar el deporte');
    } finally {
      setBorrandoId(null);
    }
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const ponderadores = Object.entries(ponders).map(([deporte_nombre, ponderador]) => ({
        deporte_nombre, ponderador: parseFloat(ponderador),
      }));
      await withLoading(() => updatePonderadores(competencia.id, ponderadores));
      onSaved(ponderadores);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputBase = { background:'var(--t-ground)', border:'1.5px solid var(--t-dim)', color:'var(--t-text)', padding:'7px 10px', borderRadius:8, fontSize:16, outline:'none', fontFamily:'inherit', boxSizing:'border-box', minWidth:0 };

  return (
    <SheetShell embedded={embedded} onClose={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      title="Ponderadores"
      meta={<>{competencia.nombre}{readOnly && <span style={{ marginLeft:6, color:'var(--t-dim2)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' }}>· Solo lectura</span>}</>}
      footer={!readOnly && (
        <div style={{ padding: embedded ? '16px 0 0' : '12px 18px 0', flexShrink:0, borderTop:'1px solid var(--t-dim)' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}>

      {error && (
        <div style={{ margin: embedded ? '12px 0 0' : '8px 18px 0', borderRadius:10, padding:'9px 13px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>
          {error}
        </div>
      )}

      {/* Lista — en modo modal scrollea sola (flex:1 + overflow), en modo embebido sigue el scroll de la página */}
      <div style={{ ...(embedded ? { padding:'14px 0 0' } : { overflowY:'auto', flex:1, padding:'10px 18px' }), display:'flex', flexDirection:'column', gap:6 }}>
        <div style={{ fontSize:11, color:'var(--t-muted)', marginBottom:4 }}>
          Puntos = minutos × ponderador. Los cambios afectan el cálculo desde ahora.
        </div>

        {/* Agregar nuevo deporte — solo admin */}
        {!readOnly && (
          <div style={{ marginBottom:4, border:'1px dashed var(--t-dim)', borderRadius:12, padding:'12px 14px', display:'flex', flexDirection:'column', gap:10, boxSizing:'border-box', width:'100%', flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>
              Nuevo deporte
            </div>
            <div style={{ display:'flex', gap:8, width:'100%', flexShrink:0 }}>
              {/* Emoji */}
              <input
                type="text"
                value={nuevoIcono}
                onChange={e => setNuevoIcono(e.target.value)}
                maxLength={4}
                style={{ ...inputBase, width:48, flexShrink:0, textAlign:'center', fontSize:20, padding:'5px 6px' }}
              />
              {/* Nombre */}
              <input
                type="text"
                placeholder="Nombre"
                value={nuevoNombre}
                onChange={e => { setNuevoNombre(e.target.value); setAddError(''); setAddSuccess(''); }}
                style={{ ...inputBase, flex:1, minWidth:0 }}
              />
              {/* Ponderador */}
              <input
                type="text" inputMode="decimal"
                value={nuevoPond}
                onChange={e => {
                  const v = e.target.value;
                  if (/^\d*\.?\d*$/.test(v)) setNuevoPond(v);
                }}
                style={{ ...inputBase, width:54, flexShrink:0, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:'var(--t-accent)' }}
              />
            </div>
            {addError && (
              <div style={{ fontSize:12, color:'#F87171' }}>{addError}</div>
            )}
            {addSuccess && (
              <div style={{ fontSize:12, color:'var(--t-accent)' }}>✓ {addSuccess}</div>
            )}
            <button
              onClick={handleAddDeporte}
              disabled={addingDeporte || !nuevoNombre.trim()}
              style={{ alignSelf:'flex-start', padding:'7px 16px', borderRadius:8, border:'1.5px solid var(--t-accent)', background:'transparent', color:'var(--t-accent)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', cursor: nuevoNombre.trim() ? 'pointer' : 'default', opacity: nuevoNombre.trim() ? 1 : 0.5, WebkitTapHighlightColor:'transparent' }}>
              {addingDeporte ? 'Agregando…' : '+ Agregar'}
            </button>
          </div>
        )}

        {editError && (
          <div style={{ fontSize:12, color:'#F87171' }}>{editError}</div>
        )}

        {deportes.map(d => {
          if (editandoId === d.id) {
            return (
              <div key={d.nombre} style={{ border:'1.5px solid var(--t-accent)', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8, background:'var(--t-surface2)', flexShrink:0 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    type="text" value={editDraft.icono} maxLength={4}
                    onChange={e => setEditDraft(prev => ({ ...prev, icono: e.target.value }))}
                    style={{ ...inputBase, width:48, flexShrink:0, textAlign:'center', fontSize:20, padding:'5px 6px' }}
                  />
                  <input
                    type="text" value={editDraft.nombre}
                    onChange={e => setEditDraft(prev => ({ ...prev, nombre: e.target.value }))}
                    style={{ ...inputBase, flex:1, minWidth:0 }}
                  />
                  <input
                    type="text" inputMode="decimal" value={editDraft.ponderador_default}
                    onChange={e => {
                      const v = e.target.value;
                      if (/^\d*\.?\d*$/.test(v)) setEditDraft(prev => ({ ...prev, ponderador_default: v }));
                    }}
                    style={{ ...inputBase, width:54, flexShrink:0, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:'var(--t-accent)' }}
                  />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => handleGuardarEdicion(d)} disabled={editSaving}
                    style={{ padding:'7px 16px', borderRadius:8, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                    {editSaving ? 'Guardando…' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditandoId(null)} disabled={editSaving}
                    style={{ padding:'7px 16px', borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:13, fontWeight:600, cursor: editSaving ? 'default' : 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={d.nombre} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:10, padding:'8px 12px', flexShrink:0 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>{d.icono}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:500, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.nombre}</span>
              {readOnly
                ? <span style={{ width:58, textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:15, color:'var(--t-accent)' }}>
                    {ponders[d.nombre] ?? d.ponderador_default}
                  </span>
                : (
                  <>
                    <input
                      type="text" inputMode="decimal"
                      value={ponders[d.nombre] ?? d.ponderador_default}
                      onChange={e => {
                        const v = e.target.value;
                        // Permitir escribir decimales libremente (ej: "1.", "1.2")
                        if (/^\d*\.?\d*$/.test(v)) setPonders(p => ({ ...p, [d.nombre]: v }));
                      }}
                      style={{ width:58, background:'var(--t-ground)', border:'1.5px solid var(--t-dim)', color:'var(--t-accent)', padding:'5px 7px', borderRadius:8, fontSize:16, outline:'none', textAlign:'center', fontFamily:"'JetBrains Mono', monospace", fontWeight:700 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--t-accent)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--t-dim)'; }}
                    />
                    <button onClick={() => empezarEdicion(d)} aria-label={`Editar ${d.nombre}`}
                      style={{ width:30, height:30, flexShrink:0, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                      <IconEditDeporte />
                    </button>
                    <button onClick={() => handleBorrarDeporte(d)} disabled={borrandoId === d.id} aria-label={`Eliminar ${d.nombre}`}
                      style={{ width:30, height:30, flexShrink:0, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-danger)', display:'flex', alignItems:'center', justifyContent:'center', cursor: borrandoId === d.id ? 'default' : 'pointer', opacity: borrandoId === d.id ? 0.5 : 1 }}>
                      {borrandoId === d.id
                        ? <div style={{ width:12, height:12, border:'2px solid rgba(185,28,28,0.3)', borderTopColor:'var(--t-danger)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                        : <IconTrashDeporte />
                      }
                    </button>
                  </>
                )
              }
            </div>
          );
        })}
      </div>
    </SheetShell>
  );
}

// ─── SHEET ADMIN: gestión de equipos (nombres + asignación de participantes) ──

// ─── SHEET ADMIN: configuración general (fechas + bonus por compañía) ────────

function AdminConfigSheet({ competencia, onClose, onSaved, readOnly = false, embedded = false }) {
  const [nombre, setNombre] = useState(competencia.nombre || '');
  const [fechaInicio, setFechaInicio] = useState(competencia.fecha_inicio || '');
  const [fechaFin, setFechaFin]       = useState(competencia.fecha_fin || '');
  const [bonus1, setBonus1]         = useState(String(parseFloat(competencia.bonus_1_companero_pts) || 0));
  const [bonus2, setBonus2]         = useState(String(parseFloat(competencia.bonus_2_companeros_pts) || 0));
  const [bonus3mas, setBonus3mas]   = useState(String(parseFloat(competencia.bonus_3mas_companeros_pts) || 0));
  const [bonusDeporteSemana, setBonusDeporteSemana] = useState(String(parseFloat(competencia.bonus_deporte_semana_extra) ?? 0.3));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const startY = useRef(null);

  const tieneSemanas = (competencia.semanas?.length ?? 0) > 0;

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleSave() {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) { setError('El nombre no puede estar vacío'); return; }
    setSaving(true); setError('');
    try {
      const actualizada = await updateConfiguracion(competencia.id, {
        nombre: nombreLimpio,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
        bonus_1_companero_pts: parseFloat(bonus1) || 0,
        bonus_2_companeros_pts: parseFloat(bonus2) || 0,
        bonus_3mas_companeros_pts: parseFloat(bonus3mas) || 0,
        bonus_deporte_semana_extra: parseFloat(bonusDeporteSemana) || 0,
      });
      onSaved(actualizada);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetShell embedded={embedded} onClose={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      title="Configuración general"
      meta={readOnly ? competencia.nombre : null}
      footer={!readOnly && (
        <div style={{ padding: embedded ? '16px 0 0' : '12px 18px 0', flexShrink:0, borderTop:'1px solid var(--t-dim)' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}>

      {error && (
        <div style={{ margin: embedded ? '12px 0 0' : '8px 18px 0', borderRadius:10, padding:'9px 13px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>{error}</div>
      )}

      <div style={{ ...(embedded ? { padding:'14px 0 0' } : { overflowY:'auto', flex:1, padding:'10px 18px' }), display:'flex', flexDirection:'column', gap:18 }}>

          {/* Nombre */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Nombre de la competencia</div>
            <input
              type="text" value={nombre} disabled={readOnly}
              onChange={e => setNombre(e.target.value)}
              style={{ background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
            />
          </div>

          {/* Fechas */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Duración</div>
            {tieneSemanas && (
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>
                Las semanas que ya tenían deporte o challenges configurados se conservan mientras sus días sigan dentro del nuevo rango; las que queden afuera se eliminan.
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <input
                type="date" value={fechaInicio} disabled={readOnly}
                onChange={e => setFechaInicio(e.target.value)}
                style={{ background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
              />
              <input
                type="date" value={fechaFin} min={fechaInicio || undefined} disabled={readOnly}
                onChange={e => setFechaFin(e.target.value)}
                style={{ background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
              />
            </div>
          </div>

          {/* Bonus por compañía */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Bonus por actividad en compañía</div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>
              Puntos extra según con cuántos compañeros de la competencia se marcó haber hecho la actividad. Cada tramo es independiente; 0 = sin bonus para esa cantidad.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label: '1 compañero',        value: bonus1,   setValue: setBonus1 },
                { label: '2 compañeros',       value: bonus2,   setValue: setBonus2 },
                { label: '3 o más compañeros', value: bonus3mas, setValue: setBonus3mas },
              ].map(tier => (
                <div key={tier.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--t-dim)', background:'var(--t-surface2)' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{tier.label}</span>
                  <input
                    type="number" inputMode="decimal" min="0" step="1" disabled={readOnly}
                    value={tier.value} onChange={e => tier.setValue(e.target.value)}
                    style={{ width:80, textAlign:'center', background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'7px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Extra ponderador deporte de la semana */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Extra ponderador deporte de la semana</div>
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>
              Se suma al ponderador propio del deporte elegido (a mano en la semana 1, por votación desde la semana 2) durante esa semana.
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 12px', borderRadius:10, border:'1px solid var(--t-dim)', background:'var(--t-surface2)' }}>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)' }}>Extra (+)</span>
              <input
                type="text" inputMode="decimal" placeholder="0.0" disabled={readOnly}
                value={bonusDeporteSemana}
                onChange={e => {
                  const limpio = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                  if (/^\d*\.?\d*$/.test(limpio)) setBonusDeporteSemana(limpio);
                }}
                style={{ width:80, textAlign:'center', background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'7px 10px', borderRadius:8, fontSize:16, outline:'none' }}
              />
            </div>
          </div>
      </div>
    </SheetShell>
  );
}

function AdminEquiposSheet({ competencia, onClose, onSaved, readOnly = false, embedded = false }) {
  const [equipos, setEquipos] = useState((competencia.equipos || []).map(e => ({ id: e.id, nombre: e.nombre, color: e.color })));
  const [asignaciones, setAsignaciones] = useState(() => {
    const map = {};
    (competencia.equipos || []).forEach(e => (e.miembros || []).forEach(m => { map[m.id] = e.id; }));
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const startY = useRef(null);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await updateEquiposGrupo(competencia.grupo_id, equipos.map(e => ({ id: e.id, nombre: e.nombre, color: e.color })));
      const asigArray = Object.entries(asignaciones).map(([user_id, equipo_id]) => ({ user_id: parseInt(user_id), equipo_id }));
      if (asigArray.length) await updateAsignacionesGrupo(competencia.grupo_id, asigArray);

      const updated = equipos.map(e => ({
        ...e,
        miembros: (competencia.participantes || []).filter(p => asignaciones[p.id] === e.id),
      }));
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetShell embedded={embedded} onClose={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      title="Equipos"
      meta={competencia.nombre}
      footer={!readOnly && (
        <div style={{ padding: embedded ? '16px 0 0' : '12px 18px 0', flexShrink:0, borderTop:'1px solid var(--t-dim)' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}>

      {error && (
        <div style={{ margin: embedded ? '12px 0 0' : '8px 18px 0', borderRadius:10, padding:'9px 13px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>{error}</div>
      )}

      <div style={{ ...(embedded ? { padding:'14px 0 0' } : { overflowY:'auto', flex:1, padding:'10px 18px' }), display:'flex', flexDirection:'column', gap:16 }}>

      {readOnly ? (
        // Vista de solo consulta: equipos como grupos de personas, sin inputs ni selects deshabilitados.
        (() => {
          const equiposConId = equipos.filter(e => e.id != null);
          const sinEquipo = (competencia.participantes || []).filter(p => asignaciones[p.id] == null);
          if (equiposConId.length === 0) {
            return (
              <div style={{ textAlign:'center', padding:'30px 16px', color:'var(--t-muted)', fontSize:13 }}>
                Esta competencia todavía no tiene equipos configurados.
              </div>
            );
          }
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {equiposConId.map(e => {
                const miembros = (competencia.participantes || []).filter(p => asignaciones[p.id] === e.id);
                return (
                  <div key={e.id} style={{ border:'1px solid var(--t-dim)', borderRadius:12, padding:'12px 14px', background:'var(--t-surface2)' }}>
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', color:'var(--t-text)' }}>{e.nombre}</div>
                    <div style={{ fontSize:13, color:'var(--t-muted)', marginTop:4 }}>
                      {miembros.length > 0 ? miembros.map(p => p.nombre_display || p.nombre).join(', ') : 'Sin integrantes'}
                    </div>
                  </div>
                );
              })}
              {sinEquipo.length > 0 && (
                <div style={{ fontSize:12, color:'var(--t-muted)', padding:'4px 2px' }}>
                  Sin equipo: {sinEquipo.map(p => p.nombre_display || p.nombre).join(', ')}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <>
          {/* Nombres de equipo */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Nombres</div>
            {equipos.map((e, i) => (
              <div key={e.id ?? `nuevo-${i}`} style={{ display:'flex', gap:8, flexShrink:0 }}>
                <input
                  type="text" value={e.nombre}
                  onChange={ev => setEquipos(prev => prev.map((x, j) => j === i ? { ...x, nombre: ev.target.value } : x))}
                  style={{ flex:1, background:'var(--t-ground)', border:'1.5px solid var(--t-dim)', color:'var(--t-text)', padding:'7px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                />
                <button onClick={() => setEquipos(prev => prev.filter((_, j) => j !== i))}
                  style={{ width:36, flexShrink:0, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer' }}>✕</button>
              </div>
            ))}
            <button onClick={() => setEquipos(prev => [...prev, { id: null, nombre: `Equipo ${prev.length + 1}`, color: null }])}
              style={{ padding:'8px', borderRadius:8, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              + Agregar equipo
            </button>
          </div>

          {/* Asignación de participantes */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Participantes</div>
            {(competencia.participantes || []).map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', borderRadius:10, padding:'8px 12px', flexShrink:0 }}>
                <span style={{ flex:1, fontSize:14, color:'var(--t-text)' }}>{p.nombre_display || p.nombre}</span>
                <select
                  value={asignaciones[p.id] ?? ''}
                  onChange={e => setAsignaciones(prev => ({ ...prev, [p.id]: e.target.value ? parseInt(e.target.value) : null }))}
                  style={{ background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'6px 8px', borderRadius:8, fontSize:16, outline:'none' }}
                >
                  <option value="">Sin equipo</option>
                  {equipos.filter(e => e.id != null).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
    </SheetShell>
  );
}

// ─── SHEET ADMIN: challenges semanales + deporte de la semana ────────────────

function AdminSemanasSheet({ competencia, onClose, onSaved, readOnly = false, embedded = false }) {
  const [deportes, setDeportes]   = useState([]);
  const [semanas, setSemanas]     = useState(competencia.semanas || []);
  const [challenges, setChallenges] = useState((competencia.challenges || []).map(c => ({ ...c, _isNew: false })));
  const [eliminados, setEliminados] = useState([]);
  const [abierta, setAbierta]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const startY = useRef(null);

  useEffect(() => { getAllDeportes().then(setDeportes).catch(() => {}); }, []);

  // Ponderador vigente de un deporte en esta competencia (override si existe, si no el default del
  // catálogo) — mismo criterio que usa el backend para separar "tranquilos" (<=1) de "extremos" (>1).
  const pondPorNombre = {};
  (competencia.deportes || []).forEach(cd => { pondPorNombre[cd.deporte_nombre] = parseFloat(cd.ponderador); });
  function ponderadorVigente(d) { return pondPorNombre[d.nombre] ?? parseFloat(d.ponderador_default); }
  const deportesTranquilos = deportes.filter(d => ponderadorVigente(d) <= 1);
  const deportesExtremos   = deportes.filter(d => ponderadorVigente(d) > 1);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  function updateSemana(id, patch) {
    setSemanas(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  }

  function updateChallengeLocal(key, patch) {
    setChallenges(prev => prev.map(c => (c.id ?? c._key) === key ? { ...c, ...patch } : c));
  }

  function addChallenge() {
    setChallenges(prev => [...prev, { _key: `nuevo-${Date.now()}`, _isNew: true, texto: '', puntos: 0, fecha_inicio: '', fecha_fin: '' }]);
  }

  function removeChallengeLocal(key) {
    const target = challenges.find(c => (c.id ?? c._key) === key);
    if (target?.id != null) setEliminados(prev => [...prev, target.id]);
    setChallenges(prev => prev.filter(c => (c.id ?? c._key) !== key));
  }

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await updateSemanas(competencia.id, semanas.filter(s => s.numero_semana === 1 || s.id === competencia.semana_actual_id).map(s => ({
        id: s.id,
        deporte_semana_nombre: s.deporte_semana_nombre,
        deporte_semana_nombre_2: s.deporte_semana_nombre_2,
        deporte_semana_ponderador_extra: s.deporte_semana_ponderador_extra,
      })));

      for (const challengeId of eliminados) {
        await deleteChallenge(competencia.id, challengeId);
      }

      const savedChallenges = [];
      for (const c of challenges) {
        if (!c.texto?.trim()) continue;
        const payload = {
          texto: c.texto.trim(),
          puntos: parseFloat(c.puntos) || 0,
          fecha_inicio: c.fecha_inicio || null,
          fecha_fin: c.fecha_fin || null,
        };
        if (c._isNew) {
          savedChallenges.push(await crearChallenge(competencia.id, payload));
        } else {
          const updated = await updateChallenge(competencia.id, c.id, payload);
          savedChallenges.push({ ...updated, completado: c.completado ?? false });
        }
      }

      onSaved(semanas, savedChallenges);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetShell embedded={embedded} onClose={onClose} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      title="Challenges semanales"
      meta={competencia.nombre}
      footer={!readOnly && (
        <div style={{ padding: embedded ? '16px 0 0' : '12px 18px 0', flexShrink:0, borderTop:'1px solid var(--t-dim)' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:16, textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--t-accent)', color:'var(--t-ground)', opacity: saving ? 0.7 : 1, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      )}>

      {error && (
        <div style={{ margin: embedded ? '12px 0 0' : '8px 18px 0', borderRadius:10, padding:'9px 13px', fontSize:13, background:'rgba(248,113,113,0.12)', border:'1px solid rgba(248,113,113,0.3)', color:'#F87171', flexShrink:0 }}>{error}</div>
      )}

      <div style={{ ...(embedded ? { padding:'14px 0 0' } : { overflowY:'auto', flex:1, padding:'10px 18px' }), display:'flex', flexDirection:'column', gap:18 }}>

      {readOnly ? (
        <>
          {/* Vista de solo consulta: lista simple de challenges y el deporte vigente de la semana
              actual, sin inputs/selects deshabilitados ni acordeones de edición. */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
            {challenges.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 16px', color:'var(--t-muted)', fontSize:13 }}>
                Esta competencia todavía no tiene challenges configurados.
              </div>
            ) : challenges.map(c => (
              <div key={c.id ?? c._key} style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--t-dim)', borderRadius:10, padding:'9px 12px', background:'var(--t-surface2)', flexShrink:0 }}>
                <span style={{ flex:1, minWidth:0, fontSize:14, color:'var(--t-text)' }}>{c.texto}</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--t-accent)', flexShrink:0 }}>+{Math.round(c.puntos ?? 0)}</span>
              </div>
            ))}
          </div>

          {(() => {
            const semanaActual = semanas.find(s => s.id === competencia.semana_actual_id);
            if (!semanaActual || (!semanaActual.deporte_semana_nombre && !semanaActual.deporte_semana_nombre_2)) return null;
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Deporte de esta semana</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {semanaActual.deporte_semana_nombre && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--t-dim)', borderRadius:10, padding:'9px 12px', background:'var(--t-surface2)' }}>
                      <span style={{ fontSize:12, color:'var(--t-muted)', flex:1 }}>Tranquilo</span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{semanaActual.deporte_semana_nombre}</span>
                    </div>
                  )}
                  {semanaActual.deporte_semana_nombre_2 && (
                    <div style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid var(--t-dim)', borderRadius:10, padding:'9px 12px', background:'var(--t-surface2)' }}>
                      <span style={{ fontSize:12, color:'var(--t-muted)', flex:1 }}>Extremo</span>
                      <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{semanaActual.deporte_semana_nombre_2}</span>
                    </div>
                  )}
                  {semanaActual.deporte_semana_ponderador_extra > 0 && (
                    <div style={{ fontSize:12, color:'var(--t-muted)' }}>
                      Extra: <span style={{ color:'var(--t-accent)', fontWeight:600 }}>+{semanaActual.deporte_semana_ponderador_extra}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* ── Challenges ──────────────────────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
            {challenges.map(c => {
              const key = c.id ?? c._key;
              return (
                <div key={key} style={{ border:'1px solid var(--t-dim)', borderRadius:12, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8, background:'var(--t-surface2)', flexShrink:0 }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <input
                      type="text" placeholder="Challenge"
                      value={c.texto || ''}
                      onChange={e => updateChallengeLocal(key, { texto: e.target.value })}
                      style={{ flex:1, minWidth:0, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                    />
                    <button onClick={() => removeChallengeLocal(key)}
                      style={{ width:36, flexShrink:0, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer' }}>✕</button>
                  </div>
                  <input
                    type="number" inputMode="decimal" min="0" step="1" placeholder="Puntos"
                    value={c.puntos ?? ''}
                    onChange={e => updateChallengeLocal(key, { puntos: e.target.value })}
                    style={{ width:80, flexShrink:0, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                  />
                  {c.fecha_inicio || c.fecha_fin ? (
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input
                        type="date"
                        value={c.fecha_inicio || ''}
                        onChange={e => updateChallengeLocal(key, { fecha_inicio: e.target.value })}
                        style={{ flex:1, minWidth:0, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                      />
                      <span style={{ color:'var(--t-muted)', fontSize:12 }}>al</span>
                      <input
                        type="date" min={c.fecha_inicio || undefined}
                        value={c.fecha_fin || ''}
                        onChange={e => updateChallengeLocal(key, { fecha_fin: e.target.value })}
                        style={{ flex:1, minWidth:0, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none' }}
                      />
                      <button onClick={() => updateChallengeLocal(key, { fecha_inicio: '', fecha_fin: '' })}
                        title="Quitar fechas (siempre vigente)"
                        style={{ flexShrink:0, width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => updateChallengeLocal(key, { fecha_inicio: competencia.fecha_inicio || '', fecha_fin: competencia.fecha_fin || '' })}
                      style={{ alignSelf:'flex-start', padding:'6px 10px', borderRadius:8, border:'1px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:12 }}>
                      + Acotar a un rango de fechas (hoy: siempre vigente)
                    </button>
                  )}
                </div>
              );
            })}
            <button onClick={addChallenge}
              style={{ padding:'8px', borderRadius:8, border:'1.5px dashed var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              + Agregar challenge
            </button>
          </div>

          {/* ── Deportes de la semana editables a mano: siempre la semana 1, y además la semana
              actual (sea cual sea su número) — así el admin puede corregirlos aunque ya haya
              votación. Hay dos categorías independientes: tranquilo (ponderador <=1) y extremo
              (ponderador >1), cada una con su propio deporte ganador. Ambas comparten el mismo
              ponderador extra. ── */}
          {semanas.some(s => s.numero_semana === 1 || s.id === competencia.semana_actual_id) && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Deportes de la semana</div>
              <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:-4 }}>
                La semana 1 se fija a mano. De la semana 2 en adelante cada categoría se decide por votación de los participantes, pero puedes sobreescribir la semana actual.
              </div>
              {semanas.filter(s => s.numero_semana === 1 || s.id === competencia.semana_actual_id)
                .sort((a, b) => a.numero_semana - b.numero_semana)
                .map(s => {
                const isOpen = abierta === s.id;
                const isActual = s.id === competencia.semana_actual_id;
                const tieneContenido = !!s.deporte_semana_nombre || !!s.deporte_semana_nombre_2;
                return (
                  <div key={s.id} style={{ border: isActual ? '1.5px solid var(--t-accent)' : '1px solid var(--t-dim)', borderRadius:12, overflow:'hidden', background:'var(--t-surface2)', flexShrink:0 }}>
                    <button onClick={() => setAbierta(isOpen ? null : s.id)}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>
                        Semana {s.numero_semana} — {s.fecha_inicio} al {s.fecha_fin}
                        {isActual && <span style={{ color:'var(--t-accent)', fontWeight:700 }}> · actual</span>}
                        {tieneContenido && <span style={{ color:'var(--t-accent)' }}> ✓</span>}
                      </span>
                      <span style={{ color:'var(--t-muted)' }}>{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                        <div style={{ display:'flex', gap:8 }}>
                          <select
                            value={s.deporte_semana_nombre || ''}
                            onChange={e => updateSemana(s.id, { deporte_semana_nombre: e.target.value })}
                            style={{ flex:1, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none', appearance:'none' }}
                          >
                            <option value="">Sin deporte tranquilo</option>
                            {deportesTranquilos.map(d => <option key={d.nombre} value={d.nombre}>{d.icono} {d.nombre}</option>)}
                          </select>
                          <select
                            value={s.deporte_semana_nombre_2 || ''}
                            onChange={e => updateSemana(s.id, { deporte_semana_nombre_2: e.target.value })}
                            style={{ flex:1, background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none', appearance:'none' }}
                          >
                            <option value="">Sin deporte extremo</option>
                            {deportesExtremos.map(d => <option key={d.nombre} value={d.nombre}>{d.icono} {d.nombre}</option>)}
                          </select>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:12, color:'var(--t-muted)', flex:1 }}>Extra compartido (ambos deportes)</span>
                          <input
                            type="text" inputMode="decimal" placeholder="0.0" disabled={!s.deporte_semana_nombre && !s.deporte_semana_nombre_2}
                            value={s.deporte_semana_ponderador_extra ?? ''}
                            onChange={e => {
                              const limpio = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                              if (/^\d*\.?\d*$/.test(limpio)) updateSemana(s.id, { deporte_semana_ponderador_extra: limpio });
                            }}
                            style={{ width:70, flexShrink:0, textAlign:'center', background:'var(--t-ground)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'8px 10px', borderRadius:8, fontSize:16, outline:'none', opacity: (s.deporte_semana_nombre || s.deporte_semana_nombre_2) ? 1 : 0.5 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>
    </SheetShell>
  );
}

export { AdminSheetLoading, AdminPonderadoresSheet, AdminEquiposSheet, AdminSemanasSheet, AdminConfigSheet };
