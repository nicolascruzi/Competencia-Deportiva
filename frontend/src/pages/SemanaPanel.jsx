import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { completarChallenge, descompletarChallenge, getVotacionSemana, votarDeporteSemana } from '../api/competencias';
import { sportIcon } from '../lib/sportIcons';
import SinCompetencia from '../components/SinCompetencia';
import PageHeader from '../components/PageHeader';

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Rango legible sin año (ej. "28 sep al 4 oct", o "1 al 4 oct" si caen en el mismo mes).
function formatearRangoSemana(fechaInicioISO, fechaFinISO) {
  const [, mi, di] = fechaInicioISO.split('-').map(Number);
  const [, mf, df] = fechaFinISO.split('-').map(Number);
  const inicio = `${di} ${MESES_CORTOS[mi - 1]}`;
  if (mi === mf) return `${di} al ${df} ${MESES_CORTOS[mf - 1]}`;
  return `${inicio} al ${df} ${MESES_CORTOS[mf - 1]}`;
}

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

  const checkbox = (
    <div style={{
      width:20, height:20, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
      border: challenge.completado ? 'none' : '1.5px solid var(--t-dim2)',
      background: challenge.completado ? 'var(--t-accent)' : 'transparent',
      transition:'background 0.15s',
    }}>
      {challenge.completado && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t-ground)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      )}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <button onClick={handleToggle} disabled={readOnly || completando}
        style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:12, width:'100%', textAlign:'left',
          cursor: (readOnly || completando) ? 'default' : 'pointer',
          border:'1px solid var(--t-dim)',
          background: challenge.completado ? 'rgba(var(--t-accent-r),0.08)' : 'var(--t-surface)',
          opacity: (completando || readOnly) ? 0.75 : 1, WebkitTapHighlightColor:'transparent',
        }}>
        {checkbox}
        <span style={{
          flex:1, minWidth:0, fontSize:13.5, fontWeight:500, lineHeight:1.3,
          color: challenge.completado ? 'var(--t-muted)' : 'var(--t-text)',
        }}>
          {completando ? 'Guardando…' : challenge.texto}
        </span>
        <span style={{ fontSize:11.5, fontWeight:700, color: challenge.completado ? 'var(--t-accent)' : 'var(--t-muted)', flexShrink:0, fontVariantNumeric:'tabular-nums' }}>
          +{Math.round(challenge.puntos ?? 0)}
        </span>
      </button>
      {error && <div style={{ fontSize:11, color:'#F87171', paddingLeft:12 }}>{error}</div>}
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

// categoria: 'tranquilo' (ponderador <= 1) o 'extremo' (ponderador > 1) — cada una vota y resuelve
// su propio ganador, de forma independiente de la otra categoría.
const ETIQUETA_CATEGORIA = { tranquilo: 'tranquilo', extremo: 'extremo' };

function VotacionDeporte({ competenciaId, semanaId, categoria }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votando, setVotando] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    getVotacionSemana(competenciaId, semanaId, categoria)
      .then(res => { if (!cancelado) setData(res); })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [competenciaId, semanaId, categoria]);

  async function handleVotar(deporteId) {
    if (votando || data?.cerrada) return;
    setVotando(deporteId); setError('');
    try {
      await votarDeporteSemana(competenciaId, semanaId, deporteId);
      const fresh = await getVotacionSemana(competenciaId, semanaId, categoria);
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
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Elegido por votación · {ETIQUETA_CATEGORIA[categoria]}</div>
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
          Votación: deporte {ETIQUETA_CATEGORIA[categoria]} de esta semana
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
            <span>Ya votaste por <span style={{ color:'var(--t-text)', fontWeight:600 }}>{miVoto?.nombre}</span> — toca otra opción si quieres cambiarlo.</span>
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

// CTA que abre el sheet de votación — consulta ambas categorías de antemano para mostrar un resumen
// combinado ("Ya votaste" solo si votó en las dos; si falta alguna, invita a completarla).
function VotacionCTA({ competenciaId, semanaId, seVotaTranquilo, seVotaExtremo, onOpen }) {
  const [miVotoTranquilo, setMiVotoTranquilo] = useState(undefined);
  const [miVotoExtremo, setMiVotoExtremo] = useState(undefined);

  useEffect(() => {
    let cancelado = false;
    if (seVotaTranquilo) {
      setMiVotoTranquilo(undefined);
      getVotacionSemana(competenciaId, semanaId, 'tranquilo')
        .then(res => { if (!cancelado) setMiVotoTranquilo(res.mi_voto_deporte_id != null); })
        .catch(() => { if (!cancelado) setMiVotoTranquilo(false); });
    } else {
      setMiVotoTranquilo(null);
    }
    return () => { cancelado = true; };
  }, [competenciaId, semanaId, seVotaTranquilo]);

  useEffect(() => {
    let cancelado = false;
    if (seVotaExtremo) {
      setMiVotoExtremo(undefined);
      getVotacionSemana(competenciaId, semanaId, 'extremo')
        .then(res => { if (!cancelado) setMiVotoExtremo(res.mi_voto_deporte_id != null); })
        .catch(() => { if (!cancelado) setMiVotoExtremo(false); });
    } else {
      setMiVotoExtremo(null);
    }
    return () => { cancelado = true; };
  }, [competenciaId, semanaId, seVotaExtremo]);

  const cargando = miVotoTranquilo === undefined || miVotoExtremo === undefined;
  const faltaTranquilo = seVotaTranquilo && !miVotoTranquilo;
  const faltaExtremo = seVotaExtremo && !miVotoExtremo;
  const faltaAlguna = faltaTranquilo || faltaExtremo;

  return (
    <button onClick={onOpen} disabled={cargando}
      style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:14, textAlign:'left',
        border:'1.5px dashed rgba(var(--t-accent-r),0.45)', background:'rgba(var(--t-accent-r),0.08)',
        cursor: cargando ? 'default' : 'pointer', WebkitTapHighlightColor:'transparent', width:'100%',
        opacity: cargando ? 0.6 : 1,
      }}>
      <div style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>
        {cargando
          ? <div style={{ width:16, height:16, border:'2px solid rgba(var(--t-accent-r),0.25)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          : (faltaAlguna ? '🗳️' : '✓')
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2 }}>
          {cargando ? 'Cargando votación…' : (faltaAlguna ? 'Vota por el deporte de la semana' : 'Ya votaste')}
        </div>
        {!cargando && (
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:2 }}>
            {faltaAlguna ? 'Toca para elegir tranquilo y extremo' : 'Toca para cambiar tu voto'}
          </div>
        )}
      </div>
      {!cargando && <div style={{ fontSize:18, color:'var(--t-accent)', flexShrink:0 }}>›</div>}
    </button>
  );
}

// Bottom sheet que aparece parcialmente desde abajo con el listado de votación — adentro, un selector
// de pestañas deja elegir entre la categoría tranquila y la extrema sin salir del popup.
function VotacionSheet({ competenciaId, semanaId, seVotaTranquilo, seVotaExtremo, categoriaInicial, onClose }) {
  const startY = useRef(null);
  const [categoria, setCategoria] = useState(categoriaInicial);
  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  const mostrarTabs = seVotaTranquilo && seVotaExtremo;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'78dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
          style={{ display:'flex', justifyContent:'center', padding:'14px 0 10px', flexShrink:0, cursor:'grab' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        {mostrarTabs && (
          <div style={{ display:'flex', gap:6, padding:'0 18px 12px', flexShrink:0 }}>
            {['tranquilo', 'extremo'].map(cat => (
              <button key={cat} onClick={() => setCategoria(cat)}
                style={{
                  flex:1, padding:'9px 0', borderRadius:10, textAlign:'center', cursor:'pointer', WebkitTapHighlightColor:'transparent',
                  border: categoria === cat ? '1.5px solid var(--t-accent)' : '1px solid var(--t-dim)',
                  background: categoria === cat ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                  fontSize:12.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em',
                  color: categoria === cat ? 'var(--t-accent)' : 'var(--t-muted)',
                }}>
                {ETIQUETA_CATEGORIA[cat]}
              </button>
            ))}
          </div>
        )}
        <div style={{ overflowY:'auto', padding:'0 18px 8px' }}>
          <VotacionDeporte competenciaId={competenciaId} semanaId={semanaId} categoria={categoria} />
        </div>
      </div>
    </>
  );
}

// Una semana del timeline: colapsada muestra solo un resumen (deporte asignado / votación / challenges
// pendientes); expandida muestra el contenido completo (igual que antes mostraba la semana única).
function SemanaCard({
  competencia, semana, challenges, isActual, expanded, onToggle, onCompletado,
  seVotaTranquilo, seVotaExtremo, votacionSheetOpen, onOpenVotacion, onCloseVotacion, votacionRefreshKey,
}) {
  const tieneDeporteTranquilo = !!semana.deporte_semana_nombre;
  const tieneDeporteExtremo = !!semana.deporte_semana_nombre_2;
  const vigentes = challenges.filter(ch =>
    (!ch.fecha_inicio || !ch.fecha_fin) ||
    (ch.fecha_inicio <= semana.fecha_fin && ch.fecha_fin >= semana.fecha_inicio)
  );
  const completados = vigentes.filter(ch => ch.completado).length;
  const seVota = seVotaTranquilo || seVotaExtremo;
  const tieneDeporte = tieneDeporteTranquilo || tieneDeporteExtremo;

  // Resumen de una línea para el estado colapsado.
  let resumen;
  if (tieneDeporte) {
    const partes = [];
    if (tieneDeporteTranquilo) partes.push(`${sportIcon(semana.deporte_semana_nombre)} ${semana.deporte_semana_nombre}`);
    if (tieneDeporteExtremo) partes.push(`${sportIcon(semana.deporte_semana_nombre_2)} ${semana.deporte_semana_nombre_2}`);
    resumen = <>{partes.join(' · ')}{vigentes.length > 0 && ` · ${completados}/${vigentes.length} challenges`}</>;
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
          <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:1 }}>{formatearRangoSemana(semana.fecha_inicio, semana.fecha_fin)}</div>
          {!expanded && (
            <div style={{ fontSize:12, color:'var(--t-muted2)', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{resumen}</div>
          )}
        </div>
        <ChevronDown open={expanded} />
      </button>

      {expanded && (
        <div style={{ padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>

          {(tieneDeporteTranquilo || tieneDeporteExtremo) && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {tieneDeporteTranquilo && (
                <div style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
                  background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
                  border:'1.5px solid rgba(var(--t-accent-r),0.3)',
                }}>
                  <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(semana.deporte_semana_nombre)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte tranquilo de la semana</div>
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
                      {semana.deporte_semana_nombre}
                    </div>
                    <div style={{ fontSize:12, color:'var(--t-accent)', fontWeight:700, marginTop:2 }}>
                      +{semana.deporte_semana_ponderador_extra} puntos esta semana
                    </div>
                  </div>
                </div>
              )}
              {tieneDeporteExtremo && (
                <div style={{
                  display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
                  background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
                  border:'1.5px solid rgba(var(--t-accent-r),0.3)',
                }}>
                  <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(semana.deporte_semana_nombre_2)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte extremo de la semana</div>
                    <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
                      {semana.deporte_semana_nombre_2}
                    </div>
                    <div style={{ fontSize:12, color:'var(--t-accent)', fontWeight:700, marginTop:2 }}>
                      +{semana.deporte_semana_ponderador_extra} puntos esta semana
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(seVotaTranquilo || seVotaExtremo) && (
            <VotacionCTA
              key={votacionRefreshKey}
              competenciaId={competencia.id}
              semanaId={semana.id}
              seVotaTranquilo={seVotaTranquilo}
              seVotaExtremo={seVotaExtremo}
              onOpen={() => onOpenVotacion(semana.id, seVotaTranquilo ? 'tranquilo' : 'extremo')}
            />
          )}

          {vigentes.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
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

          {votacionSheetOpen?.semanaId === semana.id && createPortal(
            <VotacionSheet
              competenciaId={competencia.id}
              semanaId={semana.id}
              seVotaTranquilo={seVotaTranquilo}
              seVotaExtremo={seVotaExtremo}
              categoriaInicial={votacionSheetOpen.categoria}
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
  const [votacionSheetOpen, setVotacionSheetOpen] = useState(null); // { semanaId, categoria } | null
  const [votacionRefreshKey, setVotacionRefreshKey] = useState(0);

  useEffect(() => {
    setChallenges(competencia?.challenges || []);
    setExpandedId(competencia?.semana_actual_id ?? null);
  }, [competencia]);

  if (!competencia) return <SinCompetencia onOpen={onOpenSelector} />;

  // Orden cronológico real (para calcular "la próxima semana" de forma correcta) vs. orden de
  // visualización: la semana actual siempre va primero, y el resto (pasadas y futuras) debajo,
  // manteniendo entre ellas el orden cronológico.
  const semanasCronologicas = [...(competencia.semanas || [])].sort((a, b) => a.numero_semana - b.numero_semana);
  const semanasOrdenadas = [...semanasCronologicas].sort((a, b) => {
    const aEsActual = a.id === competencia.semana_actual_id;
    const bEsActual = b.id === competencia.semana_actual_id;
    if (aEsActual && !bEsActual) return -1;
    if (bEsActual && !aEsActual) return 1;
    return a.numero_semana - b.numero_semana;
  });

  function handleCompletado(challengeId, nuevoValor) {
    setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, completado: nuevoValor } : ch));
  }

  function handleToggle(semanaId) {
    setVotacionSheetOpen(null);
    setExpandedId(prev => prev === semanaId ? null : semanaId);
  }

  return (
    <div style={{ paddingBottom:32 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
        {semanasOrdenadas.map((semana) => {
          const isActual = semana.id === competencia.semana_actual_id;
          const seVotaTranquilo = semana.numero_semana > 1 && !semana.deporte_semana_nombre;
          const seVotaExtremo = semana.numero_semana > 1 && !semana.deporte_semana_nombre_2;

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
              seVotaTranquilo={seVotaTranquilo}
              seVotaExtremo={seVotaExtremo}
              votacionSheetOpen={votacionSheetOpen}
              onOpenVotacion={(semanaId, categoria) => setVotacionSheetOpen({ semanaId, categoria })}
              onCloseVotacion={() => { setVotacionSheetOpen(null); setVotacionRefreshKey(k => k + 1); }}
              votacionRefreshKey={votacionRefreshKey}
            />
          );
        })}
      </div>
    </div>
  );
}
