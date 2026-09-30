import { useEffect, useState } from 'react';
import { completarChallenge } from '../api/competencias';
import { sportIcon } from '../lib/sportIcons';
import SinCompetencia from '../components/SinCompetencia';

function ChallengeRow({ competenciaId, challenge, onCompletado }) {
  const [completando, setCompletando] = useState(false);
  const [error, setError] = useState('');

  async function handleCompletar() {
    if (challenge.completado || completando) return;
    setCompletando(true); setError('');
    try {
      await completarChallenge(competenciaId, challenge.id);
      onCompletado?.(challenge.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletando(false);
    }
  }

  return (
    <div style={{ background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ fontSize:15, fontWeight:600, color:'var(--t-text)' }}>{challenge.texto}</div>
      {error && <div style={{ fontSize:12, color:'#F87171' }}>{error}</div>}
      <button onClick={handleCompletar} disabled={challenge.completado || completando}
        style={{
          alignSelf:'flex-start', padding:'8px 16px', borderRadius:10, border:'none', cursor: challenge.completado ? 'default' : 'pointer',
          fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em',
          background: challenge.completado ? 'var(--t-surface2)' : 'var(--t-accent)',
          color: challenge.completado ? 'var(--t-muted)' : 'var(--t-ground)',
          opacity: completando ? 0.7 : 1,
        }}>
        {challenge.completado ? '✓ Completado' : completando ? 'Guardando…' : `Marqué el challenge (+${challenge.puntos ?? 0} pts)`}
      </button>
    </div>
  );
}

export default function SemanaPanel({ competencia, onOpenSelector }) {
  const [challenges, setChallenges] = useState(competencia?.challenges || []);

  useEffect(() => { setChallenges(competencia?.challenges || []); }, [competencia]);

  if (!competencia) return <SinCompetencia onOpen={onOpenSelector} />;

  const semanaActual = competencia.semanas?.find(s => s.id === competencia.semana_actual_id);
  const vigentes = challenges.filter(ch => ch.semana_id == null || ch.semana_id === competencia.semana_actual_id);
  const tieneDeporte = !!semanaActual?.deporte_semana_nombre;

  function handleCompletado(challengeId) {
    setChallenges(prev => prev.map(ch => ch.id === challengeId ? { ...ch, completado: true } : ch));
  }

  return (
    <div style={{ paddingBottom:32 }}>

      {/* Header */}
      <div style={{
        position:'relative', overflow:'hidden', padding:'20px 20px 18px',
        background:'linear-gradient(180deg, rgba(var(--t-accent-r),0.14) 0%, rgba(var(--t-accent-r),0.03) 60%, transparent 100%)',
      }}>
        <div style={{ position:'absolute', top:-60, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(var(--t-accent-r),0.2) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {competencia.nombre}
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(26px,7vw,36px)', textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
            {semanaActual ? `Semana ${semanaActual.numero_semana}` : 'Semana'}
          </div>
          {semanaActual && (
            <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:4 }}>
              {semanaActual.fecha_inicio} al {semanaActual.fecha_fin}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'16px 20px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Deporte de la semana destacado */}
        {tieneDeporte && (
          <div style={{
            display:'flex', alignItems:'center', gap:14, padding:'16px 18px', borderRadius:16,
            background:'linear-gradient(135deg, rgba(var(--t-accent-r),0.14), rgba(var(--t-accent-r),0.04))',
            border:'1.5px solid rgba(var(--t-accent-r),0.3)',
          }}>
            <div style={{ fontSize:40, lineHeight:1 }}>{sportIcon(semanaActual.deporte_semana_nombre)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Deporte de la semana</div>
              <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', lineHeight:1.2, marginTop:2 }}>
                {semanaActual.deporte_semana_nombre}
              </div>
              <div style={{ fontSize:12, color:'var(--t-accent)', fontWeight:700, marginTop:2 }}>
                ×{semanaActual.deporte_semana_ponderador_extra} puntos esta semana
              </div>
            </div>
          </div>
        )}

        {/* Challenges */}
        {vigentes.length > 0 ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--t-muted)' }}>Challenges</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {vigentes.map(ch => (
                <ChallengeRow key={ch.id} competenciaId={competencia.id} challenge={ch} onCompletado={handleCompletado} />
              ))}
            </div>
          </div>
        ) : !tieneDeporte && (
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
