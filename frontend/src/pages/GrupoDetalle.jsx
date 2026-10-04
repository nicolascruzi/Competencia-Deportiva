import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  getParticipantesGrupo, sacarParticipante, renombrarGrupo,
  getCompetenciasGrupo, cerrarCompetenciaGrupo, borrarCompetenciaGrupo,
} from '../api/grupos';
import { getRankingComp } from '../api/competencias';
import PageHeader from '../components/PageHeader';
import SubTabs from '../components/SubTabs';
import NuevaCompetenciaSheet from '../components/NuevaCompetenciaSheet';
import {
  AdminSheetLoading, AdminPonderadoresSheet, AdminEquiposSheet, AdminSemanasSheet, AdminConfigSheet,
} from '../components/AdminCompetenciaSheets';
import { getCompetencia } from '../api/competencias';

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const IconDots = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
  </svg>
);
const IconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M6 4h12v6a6 6 0 01-12 0V4z"/><path d="M12 16v4"/><path d="M8 20h8"/>
  </svg>
);
const IconStop = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
);

function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ─── TAB: Integrantes ─────────────────────────────────────────────────────────

function TabIntegrantes({ grupo, isAdmin, onSalirGrupo, onBorrarGrupo }) {
  const { user } = useAuth();
  const [participantes, setParticipantes] = useState(null);
  const [error, setError] = useState('');
  const [sacandoId, setSacandoId] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    getParticipantesGrupo(grupo.id)
      .then(res => { if (!cancelado) setParticipantes(res); })
      .catch(err => { if (!cancelado) setError(err.message); });
    return () => { cancelado = true; };
  }, [grupo.id]);

  async function handleSacar(p) {
    const nombreLabel = p.nombre_display || p.nombre;
    if (!confirm(`¿Sacar a ${nombreLabel} del grupo "${grupo.nombre}"? Deja de ser participante; sus actividades y puntos ya registrados no se borran.`)) return;
    setSacandoId(p.id); setError('');
    try {
      await sacarParticipante(grupo.id, p.id);
      setParticipantes(prev => prev.filter(x => x.id !== p.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSacandoId(null);
    }
  }

  async function handleSalir() {
    if (!confirm(`¿Salir de "${grupo.nombre}"? Dejas de ser participante del grupo. Tus actividades y puntos ya registrados no se borran.`)) return;
    setSaliendo(true); setError('');
    try {
      await onSalirGrupo(grupo.id);
    } catch (err) {
      setError(err.message);
      setSaliendo(false);
    }
  }

  async function handleBorrar() {
    if (!confirm(`¿Borrar "${grupo.nombre}" para SIEMPRE? Se pierde para todos los participantes, junto con sus competencias, equipos y challenges. Esto no se puede deshacer.`)) return;
    const nombreEscrito = prompt(`Para confirmar, escribe exactamente el nombre del grupo:\n\n${grupo.nombre}`);
    if (nombreEscrito == null) return;
    setBorrando(true); setError('');
    try {
      await onBorrarGrupo(grupo.id, nombreEscrito);
    } catch (err) {
      setError(err.message);
      setBorrando(false);
    }
  }

  return (
    <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:14 }}>
      {participantes === null && !error && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'30px 20px', color:'var(--t-muted)' }}>
          <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          <span style={{ fontSize:13 }}>Cargando integrantes…</span>
        </div>
      )}
      <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
        {participantes?.map(p => {
          const esYo = String(p.id) === String(user?.id);
          const puedeSacar = isAdmin && !esYo && !p.es_creador;
          return (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 8px', borderRadius:12 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, overflow:'hidden', background:'rgba(var(--t-accent-r),0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {p.foto_perfil_url
                  ? <img src={p.foto_perfil_url} alt={p.nombre_display} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:'var(--t-accent)' }}>{p.nombre_display?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>
                  {p.nombre_display}{esYo ? ' (tú)' : ''}
                </span>
                {(p.es_creador || p.es_admin) && (
                  <div style={{ display:'flex', gap:5, marginTop:2 }}>
                    {p.es_creador && <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-accent)' }}>Creador</span>}
                    {p.es_admin && <span style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-muted)' }}>Admin</span>}
                  </div>
                )}
              </div>
              {puedeSacar && (
                <button
                  disabled={sacandoId === p.id}
                  onClick={() => handleSacar(p)}
                  aria-label={`Sacar a ${p.nombre_display} del grupo`}
                  style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-danger)', display:'flex', alignItems:'center', justifyContent:'center', cursor: sacandoId === p.id ? 'default' : 'pointer', opacity: sacandoId === p.id ? 0.5 : 1, flexShrink:0 }}>
                  {sacandoId === p.id
                    ? <div style={{ width:12, height:12, border:'2px solid rgba(185,28,28,0.3)', borderTopColor:'var(--t-danger)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                    : <IconTrash />
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <div style={{ fontSize:12, color:'var(--t-danger)' }}>{error}</div>}

      <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:8, borderTop:'1px solid var(--t-dim)' }}>
        <button
          disabled={saliendo}
          onClick={handleSalir}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-danger)', fontSize:14, fontWeight:700, cursor: saliendo ? 'default' : 'pointer', opacity: saliendo ? 0.6 : 1 }}>
          {saliendo ? 'Saliendo…' : 'Salir del grupo'}
        </button>
        {isAdmin && (
          <button
            disabled={borrando}
            onClick={handleBorrar}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px', borderRadius:12, border:'1px solid var(--t-danger)', background:'transparent', color:'var(--t-danger)', fontSize:14, fontWeight:700, cursor: borrando ? 'default' : 'pointer', opacity: borrando ? 0.6 : 1 }}>
            <IconTrash />
            {borrando ? 'Borrando…' : 'Borrar grupo'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Card de una competencia dentro del listado ───────────────────────────────

function CompetenciaCard({ competencia: c, isAdmin, cerrando, borrando, onAbrir, onCerrar, onBorrar }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const enCurso = c.estado === 'en_curso';

  useEffect(() => {
    if (!menuOpen) return;
    function onClickFuera(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, [menuOpen]);

  return (
    <div style={{
      position:'relative', width:'100%', borderRadius:16,
      background: enCurso ? 'linear-gradient(135deg, rgba(var(--t-accent-r),0.1), rgba(var(--t-accent-r),0.02))' : 'var(--t-surface2)',
      border: enCurso ? '1px solid rgba(var(--t-accent-r),0.25)' : '1px solid var(--t-dim)',
    }}>
      <button onClick={onAbrir}
        style={{ display:'flex', alignItems:'flex-start', gap:12, width:'100%', padding:'16px 16px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
        <div style={{
          width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
          background: enCurso ? 'rgba(var(--t-accent-r),0.16)' : 'var(--t-dim)',
          color: enCurso ? 'var(--t-accent)' : 'var(--t-muted)',
        }}>
          <IconTrophy />
        </div>
        <div style={{ flex:1, minWidth:0, paddingTop:1 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.01em', color:'var(--t-text)', lineHeight:1.2, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {c.nombre}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, flexWrap:'wrap' }}>
            <span style={{
              fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', padding:'3px 8px', borderRadius:20, flexShrink:0,
              color: enCurso ? 'var(--t-accent)' : 'var(--t-muted)',
              background: enCurso ? 'rgba(var(--t-accent-r),0.14)' : 'var(--t-dim)',
            }}>
              {enCurso ? '● En curso' : 'Finalizada'}
            </span>
            <span style={{ fontSize:11.5, color:'var(--t-muted)' }}>
              {c.fecha_inicio ? `${fmtFecha(c.fecha_inicio)} al ${fmtFecha(c.fecha_fin)}` : 'Sin fechas configuradas'}
            </span>
          </div>
        </div>
        <span style={{ color:'var(--t-muted)', flexShrink:0, marginTop:4 }}><IconChevronRight /></span>
      </button>

      {isAdmin && (
        <div ref={menuRef} style={{ position:'absolute', top:10, right:10 }}>
          <button onClick={() => setMenuOpen(o => !o)} aria-label="Más acciones"
            style={{ width:28, height:28, borderRadius:8, border:'none', background:'transparent', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
            <IconDots />
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', top:32, right:0, zIndex:30, width:190, background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', overflow:'hidden' }}>
              {enCurso && (
                <button
                  disabled={cerrando || borrando}
                  onClick={() => { setMenuOpen(false); onCerrar(); }}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'11px 14px', background:'transparent', border:'none', cursor: cerrando ? 'default' : 'pointer', textAlign:'left', color:'var(--t-text)', fontSize:13, fontWeight:600, opacity: cerrando ? 0.6 : 1, WebkitTapHighlightColor:'transparent' }}>
                  <IconStop /> {cerrando ? 'Cerrando…' : 'Cerrar competencia'}
                </button>
              )}
              <button
                disabled={cerrando || borrando}
                onClick={() => { setMenuOpen(false); onBorrar(); }}
                style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'11px 14px', background:'transparent', border:'none', borderTop: enCurso ? '1px solid var(--t-dim)' : 'none', cursor: borrando ? 'default' : 'pointer', textAlign:'left', color:'var(--t-danger)', fontSize:13, fontWeight:600, opacity: borrando ? 0.6 : 1, WebkitTapHighlightColor:'transparent' }}>
                <IconTrash /> {borrando ? 'Borrando…' : 'Borrar competencia'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB: Competencias (listado del grupo) ───────────────────────────────────

function TabCompetencias({ grupo, isAdmin, onAbrirCompetencia }) {
  const [competencias, setCompetencias] = useState(null);
  const [error, setError] = useState('');
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [cerrandoId, setCerrandoId] = useState(null);
  const [borrandoId, setBorrandoId] = useState(null);

  function reload() {
    return getCompetenciasGrupo(grupo.id)
      .then(setCompetencias)
      .catch(err => setError(err.message));
  }

  useEffect(() => { reload(); }, [grupo.id]);

  async function handleCerrar(comp) {
    if (!confirm(`¿Cerrar "${comp.nombre}"? El ranking quedará congelado como histórico.`)) return;
    setCerrandoId(comp.id); setError('');
    try {
      await cerrarCompetenciaGrupo(grupo.id, comp.id);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setCerrandoId(null);
    }
  }

  async function handleBorrar(comp) {
    if (!confirm(`¿Borrar "${comp.nombre}" definitivamente? Se pierden su ranking, semanas y configuración. Esto no se puede deshacer.`)) return;
    setBorrandoId(comp.id); setError('');
    try {
      await borrarCompetenciaGrupo(grupo.id, comp.id);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:8 }}>
      {error && <div style={{ fontSize:13, color:'var(--t-danger)' }}>{error}</div>}

      {competencias === null ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'30px 0', color:'var(--t-muted)', fontSize:13, gap:8 }}>
          <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          Cargando…
        </div>
      ) : (
        <>
          {isAdmin && (
            <button onClick={() => setNuevaOpen(true)}
              style={{ width:'100%', padding:'12px', borderRadius:12, border:'1.5px solid rgba(var(--t-accent-r),0.35)', background:'rgba(var(--t-accent-r),0.08)', color:'var(--t-accent)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, textTransform:'uppercase', letterSpacing:'0.04em', cursor:'pointer', marginBottom:4 }}>
              + Crear nueva competencia
            </button>
          )}
          {competencias.map(c => (
            <CompetenciaCard
              key={c.id}
              competencia={c}
              isAdmin={isAdmin}
              cerrando={cerrandoId === c.id}
              borrando={borrandoId === c.id}
              onAbrir={() => onAbrirCompetencia(c)}
              onCerrar={() => handleCerrar(c)}
              onBorrar={() => handleBorrar(c)}
            />
          ))}
          {competencias.length === 0 && (
            <div style={{ textAlign:'center', padding:'20px 0', color:'var(--t-muted)', fontSize:13 }}>Todavía no hay competencias en este grupo.</div>
          )}
        </>
      )}

      {nuevaOpen && (
        <NuevaCompetenciaSheet
          grupoId={grupo.id}
          onClose={() => setNuevaOpen(false)}
          onCreated={() => reload()}
        />
      )}
    </div>
  );
}

// ─── Sub-pantalla: detalle administrable de una competencia ──────────────────

function CompetenciaAdminDetalle({ grupo, competenciaResumen, isAdmin, onBack }) {
  const [compConDeportes, setCompConDeportes] = useState(competenciaResumen);
  const [detalleCompletoId, setDetalleCompletoId] = useState(null);
  const [sheetAbierto, setSheetAbierto] = useState(null); // 'ponderadores' | 'equipos' | 'semanas' | 'config' | null
  const [ranking, setRanking] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setDetalleCompletoId(null);
    getCompetencia(competenciaResumen.id).then(full => {
      if (cancelado) return;
      setCompConDeportes(prev => ({ ...prev, ...full }));
      setDetalleCompletoId(competenciaResumen.id);
    }).catch(() => {});
    return () => { cancelado = true; };
  }, [competenciaResumen.id]);
  const detalleListo = detalleCompletoId === competenciaResumen.id;

  useEffect(() => {
    if (compConDeportes.estado !== 'finalizada') return;
    let cancelado = false;
    getRankingComp(competenciaResumen.id)
      .then(rows => { if (!cancelado) setRanking(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [competenciaResumen.id, compConDeportes.estado]);

  const SECCIONES = [
    { id: 'ponderadores', label: 'Ponderadores' },
    { id: 'equipos', label: 'Equipos' },
    { id: 'semanas', label: 'Challenges' },
    { id: 'config', label: 'Config' },
  ];

  return (
    <div style={{ minHeight:'100%' }}>
      <div style={{ padding:'16px 20px 0' }}>
        <button onClick={onBack}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', cursor:'pointer', color:'var(--t-muted)', fontSize:13, padding:0, WebkitTapHighlightColor:'transparent' }}>
          <IconBack /> Volver a {grupo.nombre}
        </button>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:24, textTransform:'uppercase', color:'var(--t-text)', marginTop:8, lineHeight:1 }}>
          {competenciaResumen.nombre}
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:4 }}>
          {competenciaResumen.estado === 'en_curso' ? 'En curso' : 'Finalizada'}
          {competenciaResumen.fecha_inicio && ` · ${fmtFecha(competenciaResumen.fecha_inicio)} al ${fmtFecha(competenciaResumen.fecha_fin)}`}
        </div>
      </div>

      {/* Competencia finalizada: solo se muestra el ranking congelado, sin acceso a edición */}
      {compConDeportes.estado === 'finalizada' ? (
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:6 }}>
          {ranking === null ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'30px 0', color:'var(--t-muted)', fontSize:13, gap:8 }}>
              <div style={{ width:14, height:14, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
              Cargando ranking…
            </div>
          ) : (
            ranking.map((p, i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, background:'var(--t-surface2)', border:'1px solid var(--t-dim)' }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:14, color:'var(--t-muted)', width:18, textAlign:'center', flexShrink:0 }}>{i + 1}</span>
                <span style={{ flex:1, minWidth:0, fontSize:14, fontWeight:600, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nombre_display}</span>
                <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:15, color:'var(--t-accent)', flexShrink:0 }}>
                  {Math.round(p.puntos)} <span style={{ fontSize:10, color:'var(--t-muted)', fontWeight:600 }}>pts</span>
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div style={{ marginTop:14 }}>
            <SubTabs tabs={SECCIONES} active={null} onChange={id => setSheetAbierto(id)} />
          </div>
          <div style={{ padding:'20px', fontSize:13, color:'var(--t-muted)' }}>
            Toca una sección arriba para ver o editar sus detalles.
          </div>
        </>
      )}

      {sheetAbierto && createPortal(
        detalleListo ? (
          sheetAbierto === 'ponderadores' ? (
            <AdminPonderadoresSheet
              competencia={compConDeportes} readOnly={!isAdmin}
              onClose={() => setSheetAbierto(null)}
              onSaved={deps => setCompConDeportes(prev => ({ ...prev, deportes: deps }))}
            />
          ) : sheetAbierto === 'equipos' ? (
            <AdminEquiposSheet
              competencia={compConDeportes} readOnly={!isAdmin}
              onClose={() => setSheetAbierto(null)}
              onSaved={updated => setCompConDeportes(prev => ({ ...prev, equipos: updated }))}
            />
          ) : sheetAbierto === 'semanas' ? (
            <AdminSemanasSheet
              competencia={compConDeportes} readOnly={!isAdmin}
              onClose={() => setSheetAbierto(null)}
              onSaved={(semanas, challenges) => setCompConDeportes(prev => ({ ...prev, semanas, challenges }))}
            />
          ) : (
            <AdminConfigSheet
              competencia={compConDeportes} readOnly={!isAdmin}
              onClose={() => setSheetAbierto(null)}
              onSaved={actualizada => setCompConDeportes(prev => ({ ...prev, ...actualizada }))}
            />
          )
        ) : <AdminSheetLoading onClose={() => setSheetAbierto(null)} />,
        document.body
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

const TABS = [
  { id: 'integrantes', label: 'Integrantes' },
  { id: 'competencias', label: 'Competencias' },
];

export default function GrupoDetalle({ grupo, isAdmin, onClose, onBorrarGrupo, onSalirGrupo, onGrupoRenombrado }) {
  const [tab, setTab] = useState('integrantes');
  const [competenciaAbierta, setCompetenciaAbierta] = useState(null); // resumen de competencia, o null
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreDraft, setNombreDraft] = useState(grupo.nombre);
  const [nombreActual, setNombreActual] = useState(grupo.nombre);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [errorNombre, setErrorNombre] = useState('');

  async function handleGuardarNombre() {
    const nombreLimpio = nombreDraft.trim();
    if (!nombreLimpio || nombreLimpio === nombreActual) { setEditandoNombre(false); setNombreDraft(nombreActual); return; }
    setGuardandoNombre(true); setErrorNombre('');
    try {
      const actualizado = await renombrarGrupo(grupo.id, nombreLimpio);
      setNombreActual(actualizado.nombre);
      setEditandoNombre(false);
      onGrupoRenombrado?.(grupo.id, actualizado.nombre);
    } catch (err) {
      setErrorNombre(err.message);
    } finally {
      setGuardandoNombre(false);
    }
  }

  if (competenciaAbierta) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:150, background:'var(--t-ground)', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
        <CompetenciaAdminDetalle
          grupo={{ ...grupo, nombre: nombreActual }}
          competenciaResumen={competenciaAbierta}
          isAdmin={isAdmin}
          onBack={() => setCompetenciaAbierta(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:150, background:'var(--t-ground)', overflowY:'auto', WebkitOverflowScrolling:'touch' }}>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', top:14, left:14, zIndex:20 }}>
          <button onClick={onClose} aria-label="Volver"
            style={{ width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', color:'var(--t-muted)', cursor:'pointer', padding:0, WebkitTapHighlightColor:'transparent' }}>
            <IconBack />
          </button>
        </div>
        <PageHeader
          eyebrow="Grupo"
          title={
            editandoNombre ? (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input
                  autoFocus
                  value={nombreDraft}
                  onChange={e => setNombreDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGuardarNombre(); if (e.key === 'Escape') { setEditandoNombre(false); setNombreDraft(nombreActual); } }}
                  disabled={guardandoNombre}
                  style={{ flex:1, minWidth:0, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(22px,6vw,30px)', textTransform:'uppercase', color:'var(--t-text)', background:'var(--t-surface2)', border:'1.5px solid var(--t-accent)', borderRadius:8, padding:'2px 8px', outline:'none' }}
                />
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{nombreActual}</span>
                {isAdmin && (
                  <button onClick={() => { setNombreDraft(nombreActual); setEditandoNombre(true); }} aria-label="Editar nombre del grupo"
                    style={{ color:'var(--t-muted)', background:'transparent', border:'none', cursor:'pointer', padding:2, display:'flex', flexShrink:0 }}>
                    <IconEdit />
                  </button>
                )}
              </div>
            )
          }
          titleAction={editandoNombre && (
            <button onClick={handleGuardarNombre} disabled={guardandoNombre}
              style={{ fontSize:12, fontWeight:700, color:'var(--t-accent)', background:'transparent', border:'none', cursor:'pointer', flexShrink:0 }}>
              {guardandoNombre ? '…' : 'Guardar'}
            </button>
          )}
        />
        {errorNombre && (
          <div style={{ margin:'0 20px 10px', fontSize:12, color:'var(--t-danger)' }}>{errorNombre}</div>
        )}
      </div>

      <SubTabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'integrantes' && (
        <TabIntegrantes grupo={{ ...grupo, nombre: nombreActual }} isAdmin={isAdmin} onSalirGrupo={onSalirGrupo} onBorrarGrupo={onBorrarGrupo} />
      )}
      {tab === 'competencias' && (
        <TabCompetencias grupo={{ ...grupo, nombre: nombreActual }} isAdmin={isAdmin} onAbrirCompetencia={setCompetenciaAbierta} />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
