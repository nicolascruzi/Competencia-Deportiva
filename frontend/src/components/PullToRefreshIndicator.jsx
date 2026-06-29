// pullY: 0..100 — cuánto se arrastró
// refreshing: bool — true mientras carga
export default function PullToRefreshIndicator({ pullY, refreshing }) {
  const THRESHOLD = 72;
  const visible = pullY > 4 || refreshing;
  if (!visible) return null;

  const progress = Math.min(1, pullY / THRESHOLD);
  const size = 36;
  const r    = 13;
  const circ = 2 * Math.PI * r;
  const dash = circ * progress;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 40,
      pointerEvents: 'none',
      // Sigue el dedo hacia abajo, se frena al llegar a THRESHOLD
      transform: `translateY(${Math.min(pullY, THRESHOLD) - size}px)`,
      transition: refreshing ? 'none' : 'transform 0.05s linear',
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--t-surface)',
        border: '1px solid var(--t-dim)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: Math.max(0.3, progress),
        transition: 'opacity 0.1s',
      }}>
        {refreshing ? (
          // Spinner que gira
          <svg width={size - 8} height={size - 8} viewBox="0 0 28 28">
            <circle cx="14" cy="14" r={r} fill="none"
              stroke="var(--t-dim)" strokeWidth="2.5" />
            <circle cx="14" cy="14" r={r} fill="none"
              stroke="var(--t-accent)" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${circ * 0.25} ${circ * 0.75}`}
              style={{ transformOrigin:'14px 14px', animation:'ptr-spin 0.7s linear infinite' }} />
          </svg>
        ) : (
          // Arco de progreso — flecha girada según progreso
          <svg width={size - 8} height={size - 8} viewBox="0 0 28 28"
            style={{ transform: `rotate(${progress * 180}deg)`, transition:'transform 0.1s linear' }}>
            <circle cx="14" cy="14" r={r} fill="none"
              stroke="var(--t-dim)" strokeWidth="2.5" />
            <circle cx="14" cy="14" r={r} fill="none"
              stroke="var(--t-accent)" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ * 0.25}
            />
            {/* Punta de flecha */}
            <path d="M14 6 L11 10 L14 9 L17 10 Z"
              fill="var(--t-accent)"
              opacity={progress} />
          </svg>
        )}
      </div>
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
