import { useEffect, useState } from 'react';
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
          alignSelf:'flex-start', padding:'8px 16px', borderRadius:10, border:'none', cursor: (readOnly || completando) ? 'default' : 'pointer',
          fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em',
          background: challenge.completado ? 'var(--t-surface2)' : (readOnly ? 'var(--t-dim)' : 'var(--t-accent)'),
          color: challenge.completado ? 'var(--t-muted)' : (readOnly ? 'var(--t-muted)' : 'var(--t-ground)'),
          opacity: (completando || readOnly) ? 0.6 : 1,
        }}>
        {challenge.completado
          ? (readOnly ? '✓ Completado' : '✓ Completado · Tocá para desmarcar')
          : completando ? 'Guardando…' : `Marqué el challenge (+${challenge.puntos ?? 0} pts)`}
      </button>
    </div>
  );
}

function WeekNav({ prev, next, canPrev, canNext }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2 }}>
      <button onClick={prev} disabled={!canPrev}
        style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color: canPrev ? 'var(--t-muted)' : 'var(--t-dim)', cursor: canPrev ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent', flexShrink:0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button onClick={next} disabled={!canNext}
        style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color: canNext ? 'var(--t-muted)' : 'var(--t-dim)', cursor: canNext ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', WebkitTapHighlightColor:'transparent', flexShrink:0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>
          Votación: deporte de esta semana
        </div>
        <div style={{ fontSize:11, color:'var(--t-muted)' }}>{totalVotos} voto{totalVotos === 1 ? '' : 's'}</div>
      </div>
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
              <div style={{ position:'relative', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>{d.icono}</span>
                <span style={{ flex:1, fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{d.nombre}</span>
                {esMiVoto && <span style={{ fontSize:11, color:'var(--t-accent)', fontWeight:700 }}>Tu voto</span>}
                <span style={{ fontSize:13, fontWeight:700, color:'var(--t-muted)', minWidth:28, textAlign:'right' }}>{d.votos}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SemanaPanel({ competencia, onOpenSelector }) {
  const [challenges, setChallenges] = useState(competencia?.challenges || []);
  const [viewingSemanaId, setViewingSemanaId] = useState(competencia?.semana_actual_id ?? null);

  useEffect(() => {
    setChallenges(competencia?.challenges || []);
    setViewingSemanaId(competencia?.semana_actual_id ?? null);
  }, [competencia]);

  if (!competencia) return <SinCompetencia onOpen={onOpenSelector} />;

  const semanasOrdenadas = [...(competencia.semanas || [])].sort((a, b) => a.numero_semana - b.numero_semana);
  const viewingIndex = semanasOrdenadas.findIndex(s => s.id === viewingSemanaId);
  const semanaVista = viewingIndex >= 0 ? semanasOrdenadas[viewingIndex] : null;
  const esSemanaActual = viewingSemanaId === competencia.semana_actual_id;

  function goPrev() { if (viewingIndex > 0) setViewingSemanaId(semanasOrdenadas[viewingIndex - 1].id); }
  function goNext() { if (viewingIndex < semanasOrdenadas.length - 1) setViewingSemanaId(semanasOrdenadas[viewingIndex + 1].id); }

  const vigentes = challenges.filter(ch => ch.semana_id == null || ch.semana_id === viewingSemanaId);
  const tieneDeporte = !!semanaVista?.deporte_semana_nombre;
  const seVota = !!semanaVista && semanaVista.numero_semana > 1 && !tieneDeporte;

  function handleCompletado(challengeId, nuevoValor) {
    setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, completado: nuevoValor } : ch));
  }

  return (
    <div style={{ paddingBottom:32 }}>

      <PageHeader
        eyebrow={competencia.nombre}
        title={<>
          {semanaVista ? `Semana ${semanaVista.numero_semana}` : 'Semana'}
          {esSemanaActual && semanaVista && <span style={{ color:'var(--t-accent)' }}> · actual</span>}
        </>}
        titleAction={semanasOrdenadas.length > 1 && (
          <WeekNav prev={goPrev} next={goNext} canPrev={viewingIndex > 0} canNext={viewingIndex < semanasOrdenadas.length - 1} />
        )}
        meta={semanaVista && `${semanaVista.fecha_inicio} al ${semanaVista.fecha_fin}`}
      />

      <div style={{ padding:'16px 20px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Deporte de la semana destacado */}
        {tieneDeporte && (
          <div style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
            background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
            border:'1.5px solid rgba(var(--t-accent-r),0.3)',
          }}>
            <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(semanaVista.deporte_semana_nombre)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte de la semana</div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
                {semanaVista.deporte_semana_nombre}
              </div>
              <div style={{ fontSize:12, color:'var(--t-accent)', fontWeight:700, marginTop:2 }}>
                ×{semanaVista.deporte_semana_ponderador_extra} puntos esta semana
              </div>
            </div>
          </div>
        )}

        {/* Votación del deporte de la semana (semana 2+, hasta que cierre) */}
        {seVota && <VotacionDeporte competenciaId={competencia.id} semanaId={semanaVista.id} />}

        {/* Challenges */}
        {vigentes.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {vigentes.map(ch => (
                <ChallengeRow key={ch.id} competenciaId={competencia.id} challenge={ch} onCompletado={handleCompletado} readOnly={!esSemanaActual} />
              ))}
            </div>
          </div>
        ) : !tieneDeporte && !seVota && (
          <div style={{ textAlign:'center', padding:'60px 24px', color:'var(--t-muted)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:18, textTransform:'uppercase', color:'var(--t-text)', marginBottom:6 }}>
              Sin challenges todavía
            </div>
            <div style={{ fontSize:13, lineHeight:1.6 }}>
              Esta competencia no tiene challenges ni deporte de la semana configurado todavía.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
