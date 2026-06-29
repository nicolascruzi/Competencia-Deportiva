const THRESHOLD = 56;
const SIZE = 34;
const R    = 13;
const CIRC = 2 * Math.PI * R;

export default function PullToRefreshIndicator({ pullY, refreshing }) {
  const visible = pullY > 2 || refreshing;
  if (!visible) return null;

  const progress = refreshing ? 1 : Math.min(1, pullY / THRESHOLD);
  // El espacio abierto entre navbar y contenido es `pullY` px (o THRESHOLD cuando refreshing).
  // Centramos el círculo en ese espacio.
  const space = refreshing ? THRESHOLD : pullY;
  const centerOffset = (space - SIZE) / 2; // puede ser negativo al inicio → círculo emerge

  return (
    <>
      <style>{`
        @keyframes ptr-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 45,
        pointerEvents: 'none',
        // El círculo sube/baja para quedar centrado en el espacio abierto
        transform: `translateY(${Math.max(0, centerOffset)}px)`,
        transition: (refreshing || pullY > 0) ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-dim)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Escala de 0.5 a 1 mientras aparece
          transform: `scale(${Math.min(1, 0.5 + progress * 0.5)})`,
          transition: (refreshing || pullY > 0) ? 'none' : 'transform 0.3s ease',
        }}>
          <svg
            width={SIZE - 8}
            height={SIZE - 8}
            viewBox="0 0 26 26"
            style={refreshing ? {
              animation: 'ptr-spin 0.75s linear infinite',
              transformOrigin: '13px 13px',
            } : {
              transform: `rotate(${progress * 300}deg)`,
              transformOrigin: '13px 13px',
              transition: 'none',
            }}
          >
            {/* Track gris tenue */}
            <circle cx="13" cy="13" r={R} fill="none"
              stroke="var(--t-dim)" strokeWidth="2.2" />
            {/* Arco naranja que crece */}
            <circle cx="13" cy="13" r={R} fill="none"
              stroke="var(--t-accent)" strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray={`${CIRC * (refreshing ? 0.25 : Math.max(0.08, progress * 0.8))} ${CIRC}`}
              strokeDashoffset={CIRC * 0.25}
            />
          </svg>
        </div>
      </div>
    </>
  );
}
