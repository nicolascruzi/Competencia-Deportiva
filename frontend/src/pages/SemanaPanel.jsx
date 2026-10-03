import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { completarChallenge, descompletarChallenge, getVotacionSemana, votarDeporteSemana } from '../api/competencias';
import { sportIcon } from '../lib/sportIcons';
import SinCompetencia from '../components/SinCompetencia';
import PageHeader from '../components/PageHeader';

function ChallengeRow({ competenciaId, challenge, onCompletado, readOnly }) {
  const [completando, setCompletando] = useState(false);
  const [error, setError] = useState('');

  async function handleToggle() {
    if (readOnly || completando) return;
    setCompletando(true); setError('');
    try {
      if (challenge.completado) {
        await descompletarChallenge(competenciaId, challenge.id);
        onCompletado?.(challenge.id, false);
      } else {
        await completarChallenge(competenciaId, challenge.id);
        onCompletado?.(challenge.id, true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletando(false);
    }
  }

  return (
    <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, opacity: readOnly ? 0.75 : 1 }}>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--t-text)' }}>{challenge.texto}</div>
      {error && <div style={{ fontSize:12, color:'#F87171' }}>{error}</div>}
      <button onClick={handleToggle} disabled={readOnly || completando}
        style={{
          alignSelf:'flex-start', display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10,
          cursor: (readOnly || completando) ? 'default' : 'pointer',
          fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em',
          border: challenge.completado ? '1.5px solid rgba(var(--t-accent-r),0.4)' : 'none',
          background: challenge.completado ? 'rgba(var(--t-accent-r),0.12)' : (readOnly ? 'var(--t-dim)' : 'var(--t-accent)'),
          color: challenge.completado ? 'var(--t-accent)' : (readOnly ? 'var(--t-muted)' : 'var(--t-ground)'),
          opacity: (completando || readOnly) ? 0.6 : 1,
        }}>
        {challenge.completado && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
        {challenge.completado
          ? (readOnly ? 'Completado' : 'Completado · Tocá para desmarcar')
          : completando ? 'Guardando…' : `Marqué el challenge (+${challenge.puntos ?? 0} pts)`}
      </button>
    </div>
  );
}

function ChevronDown({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink:0, transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function VotacionDeporte({ competenciaId, semanaId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    getVotacionSemana(competenciaId, semanaId)
      .then(res => { if (!cancelado) setData(res); })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [competenciaId, semanaId]);

  async function handleVotar(deporteId) {
    if (votando || data?.cerrada) return;
    setVotando(deporteId); setError('');
    try {
      await votarDeporteSemana(competenciaId, semanaId, deporteId);
      const fresh = await getVotacionSemana(competenciaId, semanaId);
      setData(fresh);
    } catch (err) {
      setError(err.message);
    } finally {
      setVotando(null);
    }
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'40px 20px', color:'var(--t-muted)' }}>
        <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <span style={{ fontSize:13 }}>Cargando votación…</span>
      </div>
    );
  }
  if (!data) return null;

  const ganador = data.cerrada && data.ganador_deporte_id
    ? data.deportes.find(d => d.id === data.ganador_deporte_id)
    : null;

  if (ganador) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
        background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
        border:'1.5px solid rgba(var(--t-accent-r),0.3)',
      }}>
        <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(ganador.nombre)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Elegido por votación</div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
            {ganador.nombre}
          </div>
        </div>
      </div>
    );
  }

  const ordenados = [...data.deportes].sort((a, b) => b.votos - a.votos || a.nombre.localeCompare(b.nombre));
  const totalVotos = data.deportes.reduce((sum, d) => sum + d.votos, 0);
  // Líder actual: solo tiene sentido mostrarlo si hay al menos un voto, y solo si no hay empate en
  // primer lugar (un empate no tiene "el más votado" todavía).
  const lider = totalVotos > 0 && ordenados[0].votos > (ordenados[1]?.votos ?? -1) ? ordenados[0] : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>
          Votación: deporte de esta semana
        </div>
        <div style={{ fontSize:11, color:'var(--t-muted)' }}>{totalVotos} voto{totalVotos === 1 ? '' : 's'}</div>
      </div>
      {lider && !data.cerrada && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(var(--t-accent-r),0.1)', border:'1px solid rgba(var(--t-accent-r),0.3)' }}>
          <span style={{ fontSize:20 }}>{lider.icono}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--t-accent)' }}>Va ganando</div>
            <div style={{ fontSize:14, fontWeight:700, color:'var(--t-text)' }}>{lider.nombre}</div>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--t-accent)' }}>{lider.votos} voto{lider.votos === 1 ? '' : 's'}</div>
        </div>
      )}
      {!data.cerrada && data.mi_voto_deporte_id != null && (() => {
        const miVoto = data.deportes.find(d => d.id === data.mi_voto_deporte_id);
        return (
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--t-muted)' }}>
            <span style={{ color:'var(--t-accent)' }}>✓</span>
            <span>Ya votaste por <span style={{ color:'var(--t-text)', fontWeight:600 }}>{miVoto?.nombre}</span> — tocá otra opción si querés cambiarlo.</span>
          </div>
        );
      })()}
      {data.cerrada && (
        <div style={{ fontSize:12, color:'var(--t-muted)' }}>La votación ya cerró y nadie votó — el admin puede asignarlo manualmente.</div>
      )}
      {error && <div style={{ fontSize:12, color:'#F87171' }}>{error}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {ordenados.map(d => {
          const esMiVoto = data.mi_voto_deporte_id === d.id;
          const pct = totalVotos ? Math.round((d.votos / totalVotos) * 100) : 0;
          return (
            <button key={d.id} onClick={() => handleVotar(d.id)} disabled={data.cerrada || votando != null}
              style={{
                position:'relative', overflow:'hidden', textAlign:'left', padding:'10px 14px', borderRadius:12,
                border: esMiVoto ? '1.5px solid var(--t-accent)' : '1px solid var(--t-dim)',
                background:'var(--t-surface)', cursor: data.cerrada ? 'default' : 'pointer',
                opacity: votando != null && votando !== d.id ? 0.6 : 1, WebkitTapHighlightColor:'transparent',
              }}>
              <div style={{ position:'absolute', inset:0, width:`${pct}%`, background:'rgba(var(--t-accent-r),0.12)', transition:'width 0.3s' }} />
              <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:2 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{d.icono}</span>
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{d.nombre}</span>
                  {esMiVoto && <span style={{ fontSize:11, color:'var(--t-accent)', fontWeight:700 }}>Tu voto</span>}
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--t-muted)', minWidth:28, textAlign:'right' }}>{d.votos}</span>
                </div>
                {d.votantes?.length > 0 && (
                  <div style={{ fontSize:11, color:'var(--t-muted)', paddingLeft:30, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.votantes.join(', ')}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// CTA que abre el sheet de votación — se entera de antemano si el usuario ya votó, para mostrarlo
// ("Ya votaste por X") sin que haga falta abrir el sheet primero.
function VotacionCTA({ competenciaId, semanaId, onOpen }) {
  const [miVoto, setMiVoto] = useState(undefined); // undefined = cargando, null = sin voto, {nombre} = votó

  useEffect(() => {
    let cancelado = false;
    setMiVoto(undefined);
    getVotacionSemana(competenciaId, semanaId)
      .then(res => {
        if (cancelado) return;
        const dep = res.mi_voto_deporte_id != null ? res.deportes.find(d => d.id === res.mi_voto_deporte_id) : null;
        setMiVoto(dep ?? null);
      })
      .catch(() => { if (!cancelado) setMiVoto(null); });
    return () => { cancelado = true; };
  }, [competenciaId, semanaId]);

  return (
    <button onClick={onOpen}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:14, textAlign:'left',
        border:'1.5px dashed rgba(var(--t-accent-r),0.45)', background:'rgba(var(--t-accent-r),0.08)',
        cursor:'pointer', WebkitTapHighlightColor:'transparent', width:'100%',
      }}>
      <div style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{miVoto ? '✓' : '🗳️'}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2 }}>
          {miVoto ? <>Ya votaste por {miVoto.nombre}</> : 'Votá por el deporte de la semana'}
        </div>
        {miVoto && <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>Tocá para cambiar tu voto</div>}
      </div>
      <div style={{ fontSize:18, color:'var(--t-accent)', flexShrink:0 }}>›</div>
    </button>
  );
}

// Bottom sheet que aparece parcialmente desde abajo con el listado de votación — en vez de
// desplegar la lista completa de deportes inline en la página (empujaba todo el resto del contenido).
function VotacionSheet({ competenciaId, semanaId, onClose }) {
  const startY = useRef(null);
  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'78dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ display:'flex', justifyContent:'center', padding:'14px 0 10px', flexShrink:0, cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        <div style={{ overflowY:'auto', padding:'0 18px 8px' }}>
          <VotacionDeporte competenciaId={competenciaId} semanaId={semanaId} />
        </div>
      </div>
    </>
  );
}

function AvisoVotacionPendiente({ competenciaId, proximaSemana, onIrAVotar }) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setMostrar(false);
    getVotacionSemana(competenciaId, proximaSemana.id)
      .then(res => { if (!cancelado) setMostrar(!res.cerrada && res.mi_voto_deporte_id == null); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [competenciaId, proximaSemana.id]);

  if (!mostrar) return null; // ya votó, la votación cerró, o todavía está cargando

  return (
    <button onClick={onIrAVotar}
      style={{
        display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:14, textAlign:'left',
        border:'1.5px dashed rgba(var(--t-accent-r),0.45)', background:'rgba(var(--t-accent-r),0.08)',
        cursor:'pointer', WebkitTapHighlightColor:'transparent', width:'100%',
      }}>
      <div style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>🗳️</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2 }}>
          Todavía no votaste el deporte de la semana {proximaSemana.numero_semana}
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>Tocá para ir a votar</div>
      </div>
      <div style={{ fontSize:18, color:'var(--t-accent)', flexShrink:0 }}>›</div>
    </button>
  );
}

// Una semana del timeline: colapsada muestra solo un resumen (deporte asignado / votación / challenges
// pendientes); expandida muestra el contenido completo (igual que antes mostraba la semana única).
function SemanaCard({
  competencia, semana, challenges, isActual, expanded, onToggle, onCompletado,
  seVota, votacionSheetOpenId, onOpenVotacion, onCloseVotacion, votacionRefreshKey,
  proximaSemana, avisarVotacion, onIrAVotar,
}) {
  const tieneDeporte = !!semana.deporte_semana_nombre;
  const vigentes = challenges.filter(ch =>
    (!ch.fecha_inicio || !ch.fecha_fin) ||
    (ch.fecha_inicio <= semana.fecha_fin && ch.fecha_fin >= semana.fecha_inicio)
  );
  const completados = vigentes.filter(ch => ch.completado).length;

  // Resumen de una línea para el estado colapsado.
  let resumen;
  if (tieneDeporte) {
    resumen = <>{sportIcon(semana.deporte_semana_nombre)} {semana.deporte_semana_nombre}{vigentes.length > 0 && ` · ${completados}/${vigentes.length} challenges`}</>;
  } else if (seVota) {
    resumen = '🗳️ Votación del deporte';
  } else if (vigentes.length > 0) {
    resumen = `${completados}/${vigentes.length} challenges`;
  } else {
    resumen = 'Sin novedades';
  }

  return (
    <div style={{ border:'1px solid var(--t-dim)', borderRadius:16, overflow:'hidden', background:'var(--t-surface)' }}>
      <button onClick={onToggle}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:10, padding:'14px 16px', textAlign:'left',
          background: isActual ? 'rgba(var(--t-accent-r),0.08)' : 'transparent', border:'none', cursor:'pointer', WebkitTapHighlightColor:'transparent',
        }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, textTransform:'uppercase', color:'var(--t-text)' }}>
              Semana {semana.numero_semana}
            </span>
            {isActual && <span style={{ fontSize:11, fontWeight:700, color:'var(--t-accent)', textTransform:'uppercase', letterSpacing:'0.04em' }}>· actual</span>}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:1 }}>{semana.fecha_inicio} al {semana.fecha_fin}</div>
          {!expanded && (
            <div style={{ fontSize:12, color:'var(--t-muted2)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{resumen}</div>
          )}
        </div>
        <ChevronDown open={expanded} />
      </button>

      {expanded && (
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {tieneDeporte && (
            <div style={{
              display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
              background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
              border:'1.5px solid rgba(var(--t-accent-r),0.3)',
            }}>
              <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(semana.deporte_semana_nombre)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte de la semana</div>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
                  {semana.deporte_semana_nombre}
                </div>
                <div style={{ fontSize:12, color:'var(--t-accent)', fontWeight:700, marginTop:2 }}>
                  ×{semana.deporte_semana_ponderador_extra} puntos esta semana
                </div>
              </div>
            </div>
          )}

          {avisarVotacion && (
            <AvisoVotacionPendiente
              competenciaId={competencia.id}
              proximaSemana={proximaSemana}
              onIrAVotar={onIrAVotar}
            />
          )}

          {seVota && (
            <VotacionCTA
              key={votacionRefreshKey}
              competenciaId={competencia.id}
              semanaId={semana.id}
              onOpen={() => onOpenVotacion(semana.id)}
            />
          )}

          {vigentes.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {vigentes.map(ch => (
                  <ChallengeRow key={ch.id} competenciaId={competencia.id} challenge={ch} onCompletado={onCompletado} readOnly={!isActual} />
                ))}
              </div>
            </div>
          ) : !tieneDeporte && !seVota && (
            <div style={{ textAlign:'center', padding:'24px 16px', color:'var(--t-muted)' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🎯</div>
              <div style={{ fontSize:13, lineHeight:1.6 }}>Sin challenges ni deporte asignado para estos días.</div>
            </div>
          )}

          {votacionSheetOpenId === semana.id && seVota && createPortal(
            <VotacionSheet
              competenciaId={competencia.id}
              semanaId={semana.id}
              onClose={onCloseVotacion}
            />,
            document.body
          )}
        </div>
      )}
    </div>
  );
}

export default function SemanaPanel({ competencia, onOpenSelector }) {
  const [challenges, setChallenges] = useState(competencia?.challenges || []);
  const [expandedId, setExpandedId] = useState(competencia?.semana_actual_id ?? null);
  const [votacionSheetOpenId, setVotacionSheetOpenId] = useState(null);
  const [votacionRefreshKey, setVotacionRefreshKey] = useState(0);

  useEffect(() => {
    setChallenges(competencia?.challenges || []);
    setExpandedId(competencia?.semana_actual_id ?? null);
  }, [competencia]);

  if (!competencia) return <SinCompetencia onOpen={onOpenSelector} />;

  const semanasOrdenadas = [...(competencia.semanas || [])].sort((a, b) => a.numero_semana - b.numero_semana);

  function handleCompletado(challengeId, nuevoValor) {
    setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, completado: nuevoValor } : ch));
  }

  function handleToggle(semanaId) {
    setVotacionSheetOpenId(null);
    setExpandedId(prev => prev === semanaId ? null : semanaId);
  }

  return (
    <div style={{ paddingBottom:32 }}>

      <PageHeader eyebrow={competencia.nombre} title="Semana" />

      <div style={{ padding:'16px 20px 0', display:'flex', flexDirection:'column', gap:10 }}>
        {semanasOrdenadas.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--t-muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, textTransform:'uppercase', color:'var(--t-text)', marginBottom:6 }}>
              Sin semanas configuradas
            </div>
            <div style={{ fontSize:13, lineHeight:1.6 }}>
              Esta competencia todavía no tiene fechas, así que no hay semanas para mostrar.
            </div>
          </div>
        )}
        {semanasOrdenadas.map((semana, i) => {
          const isActual = semana.id === competencia.semana_actual_id;
          const tieneDeporte = !!semana.deporte_semana_nombre;
          const seVota = semana.numero_semana > 1 && !tieneDeporte;

          // El aviso de "votación pendiente" se cuelga de la semana actual, apuntando a la próxima.
          const proximaSemana = isActual && i < semanasOrdenadas.length - 1 ? semanasOrdenadas[i + 1] : null;
          const avisarVotacion = !!proximaSemana && !proximaSemana.deporte_semana_nombre;

          return (
            <SemanaCard
              key={semana.id}
              competencia={competencia}
              semana={semana}
              challenges={challenges}
              isActual={isActual}
              expanded={expandedId === semana.id}
              onToggle={() => handleToggle(semana.id)}
              onCompletado={handleCompletado}
              seVota={seVota}
              votacionSheetOpenId={votacionSheetOpenId}
              onOpenVotacion={setVotacionSheetOpenId}
              onCloseVotacion={() => { setVotacionSheetOpenId(null); setVotacionRefreshKey(k => k + 1); }}
              votacionRefreshKey={votacionRefreshKey}
              proximaSemana={proximaSemana}
              avisarVotacion={avisarVotacion}
              onIrAVotar={() => { setExpandedId(proximaSemana.id); setVotacionSheetOpenId(proximaSemana.id); }}
            />
          );
        })}
      </div>
    </div>
  );
}
