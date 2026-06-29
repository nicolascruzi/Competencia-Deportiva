const THRESHOLD = 56;
const SIZE = 38;
const R    = 14;
const CIRC = 2 * Math.PI * R;

export default function PullToRefreshIndicator({ pullY, refreshing }) {
  const visible = pullY > 0 || refreshing;
  if (!visible) return null;

  // 0..1 mientras el dedo baja. Al soltar y entrar en refreshing queda en 1.
  const progress = refreshing ? 1 : Math.min(1, pullY / THRESHOLD);

  // El círculo empieza justo pegado al borde inferior de la navbar
  // y baja hasta THRESHOLD px. Empieza escondido (translateY negativo de su propio tamaño).
  const travel = refreshing ? THRESHOLD : pullY;

  return (
    <>
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 45,
        pointerEvents: 'none',
        // El contenedor sigue el dedo — empieza a -SIZE (oculto bajo navbar)
        // y viaja hacia abajo hasta THRESHOLD
        transform: `translateY(${travel - SIZE}px)`,
        transition: refreshing ? 'none' : 'transform 0.04s linear',
        willChange: 'transform',
      }}>
        {/* Fondo del círculo */}
        <div style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-dim)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Escala de 0.4 a 1 mientras baja (aparece creciendo)
          transform: `scale(${0.4 + progress * 0.6})`,
          transition: refreshing ? 'none' : 'transform 0.04s linear',
        }}>
          <svg
            width={SIZE - 10}
            height={SIZE - 10}
            viewBox="0 0 28 28"
            style={refreshing ? {
              animation: 'ptr-spin 0.75s linear infinite',
              transformOrigin: '14px 14px',
            } : {
              // Mientras se arrastra, rota según progreso (0→360°)
              transform: `rotate(${progress * 360}deg)`,
              transition: 'transform 0.04s linear',
              transformOrigin: '14px 14px',
            }}
          >
            {/* Track gris */}
            <circle cx="14" cy="14" r={R} fill="none"
              stroke="var(--t-dim)" strokeWidth="2.5" />
            {/* Arco naranja que crece con el progreso */}
            <circle cx="14" cy="14" r={R} fill="none"
              stroke="var(--t-accent)" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${CIRC * (refreshing ? 0.25 : progress * 0.85)} ${CIRC}`}
              strokeDashoffset={CIRC * 0.25}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
