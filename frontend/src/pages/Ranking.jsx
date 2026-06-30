import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRanking } from '../api/ranking';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Paleta de avatares determinista por índice
const AVATAR_COLORS = ['#C25E2A','#5E83A6','#B08534','#7E6BB0','#3F9B86','#C07D3F','#4A7C59','#A6455E'];
function avatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

// Mini sparkline SVG con área rellena — datos simulados proporcionales a puntos
function Spark({ pts, maxPts, accent }) {
  const W = 48, H = 18, PAD = 1.5;
  const N = 8;
  // Generar puntos pseudo-aleatorios deterministas basados en pts
  const seed = Math.round(pts);
  const raw = Array.from({ length: N }, (_, i) => {
    const v = ((seed * (i + 3) * 2654435761) >>> 0) % 100;
    return v / 100;
  });
  // Último punto siempre el más alto (tendencia ascendente si lidera)
  const sorted = [...raw].sort((a, b) => a - b);
  const normalized = raw.map(v => (v - sorted[0]) / Math.max(sorted[sorted.length - 1] - sorted[0], 0.01));
  const xs = Array.from({ length: N }, (_, i) => PAD + (i / (N - 1)) * (W - PAD * 2));
  const ys = normalized.map(v => H - PAD - v * (H - PAD * 2));
  const linePoints = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const areaPoints = `${xs[0]},${H} ${linePoints} ${xs[N - 1]},${H}`;
  const lastX = xs[N - 1], lastY = ys[N - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={areaPoints} fill={accent} fillOpacity="0.09" stroke="none" />
      <polyline points={linePoints} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.4" fill={accent} stroke="var(--t-ground)" strokeWidth="1" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 24 24" style={{ display:'block' }}>
      <path d="M12 23a7 7 0 0 0 7-7c0-2.5-1.2-4.6-3.2-6.8.2 1.7-.6 2.8-1.6 3.3.5-2.2-.6-4.9-2.7-6.5.1 3-1.9 4.2-3.4 6.7A7 7 0 0 0 12 23z" fill="var(--t-accent)" />
    </svg>
  );
}

export default function Ranking() {
  const { user } = useAuth();
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAcumulado = month === -1;
  const mesVal = isAcumulado ? '' : `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    getRanking(mesVal).then(setRanking).finally(() => setLoading(false));
  }, [mesVal]);

  const maxPts = ranking[0]?.puntos || 1;

  function prev() {
    if (isAcumulado) { setYear(now.getFullYear()); setMonth(now.getMonth()); return; }
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (year === now.getFullYear() && month === now.getMonth()) { setMonth(-1); return; }
    if (isAcumulado) return;
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const canNext = !isAcumulado;
  const label   = isAcumulado ? 'Acumulado' : MONTHS_ES[month].toUpperCase();
  const sublabel = isAcumulado ? 'todos los tiempos' : String(year);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rk-row { background: transparent; transition: background 0.15s; }
        .rk-row:active { background: rgba(0,0,0,0.04); }
      `}</style>

      {/* ---- Cabecera mes ---- */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--t-ground)',
        borderBottom: '1px solid var(--t-dim)',
      }}>
        {/* Selector de mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px' }}>
          <button onClick={prev} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--t-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, letterSpacing: '0.04em', color: 'var(--t-text)', lineHeight: 1 }}>
              {label}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', marginTop: 2 }}>{sublabel}</div>
          </div>
          <button onClick={next} disabled={!canNext} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', color: canNext ? 'var(--t-muted)' : 'var(--t-dim)', cursor: canNext ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>

      {/* ---- Hoja de filas ---- */}
      <div style={{
        background: 'var(--t-surface)',
        borderRadius: '20px 20px 0 0',
        marginTop: 8,
        paddingBottom: 24,
        flex: 1,
      }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '80px 20px', color: 'var(--t-muted)', fontSize: 14 }}>
            <div style={{ width: 18, height: 18, border: '2px solid var(--t-dim)', borderTopColor: 'var(--t-accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Cargando…
          </div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--t-muted)' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, textTransform: 'uppercase', color: 'var(--t-text)', marginBottom: 6 }}>Sin registros</div>
            <div style={{ fontSize: 14 }}>Cargá actividades para ver el ranking.</div>
          </div>
        ) : (
          ranking.map((p, i) => {
            const displayName = p.nombre_display || p.nombre;
            const isMe = p.id === user?.id;
            const color = avatarColor(i);
            const horas = Math.round(p.minutos / 60);

            return (
              <div
                key={p.id}
                className="rk-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--t-dim)',
                  background: isMe ? 'rgba(var(--t-accent-r), 0.06)' : 'transparent',
                }}
              >
                {/* Posición */}
                <div style={{
                  width: 22, textAlign: 'center', flexShrink: 0,
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                  fontSize: 22, lineHeight: 1,
                  color: i === 0 ? 'var(--t-accent)' : 'var(--t-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                }}>
                  {p.foto_perfil_url
                    ? <img src={p.foto_perfil_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: '#fff' }}>
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                  }
                </div>

                {/* Nombre + stats */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                      fontSize: 17, color: 'var(--t-text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {displayName}
                    </span>
                    {isMe && (
                      <span style={{
                        background: 'var(--t-accent)', color: '#fff',
                        fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
                        padding: '2px 6px', borderRadius: 5, flexShrink: 0,
                      }}>TÚ</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                    <FireIcon />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-accent)' }}>
                      {p.actividades}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t-dim2)', opacity: 0.5 }}>·</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)' }}>{p.actividades} ses</span>
                    <span style={{ fontSize: 11, color: 'var(--t-dim2)', opacity: 0.5 }}>·</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-muted)' }}>{horas}h</span>
                  </div>
                </div>

                {/* Sparkline */}
                <div style={{ flexShrink: 0 }}>
                  <Spark pts={p.puntos} maxPts={maxPts} accent="var(--t-accent)" />
                </div>

                {/* Puntos */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 40 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                    fontSize: 26, lineHeight: 0.9,
                    color: 'var(--t-text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {Math.round(p.puntos).toLocaleString('es')}
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--t-muted)', marginTop: 2 }}>
                    PTS
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
