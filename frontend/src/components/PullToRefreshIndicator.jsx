const THRESHOLD = 56;
const SIZE = 36;

export default function PullToRefreshIndicator({ pullY, refreshing, closing }) {
  const visible = pullY > 2 || refreshing || closing;
  if (!visible) return null;

  const progress    = (refreshing || closing) ? 1 : Math.min(1, pullY / THRESHOLD);
  const space       = (refreshing || closing) ? THRESHOLD : pullY;
  const centerOffset = Math.max(0, (space - SIZE) / 2);

  // Cuánto del borde naranja se muestra (0 → 1 durante el pull; 1 cuando gira)
  const arcFraction = refreshing ? 1 : Math.max(0.08, progress * 0.85);

  return (
    <>
      <style>{`
        @keyframes ptr-spin { to { transform: rotate(360deg); } }
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
        transform: `translateY(${centerOffset}px)`,
        transition: closing
          ? 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease'
          : 'none',
        opacity: closing ? 0 : 1,
      }}>
        {/* Círculo contenedor */}
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
          transform: `scale(${Math.min(1, 0.45 + progress * 0.55)})`,
        }}>
          {/* Spinner — idéntico al del LoadingContext pero más pequeño */}
          <div style={{
            width: SIZE - 12,
            height: SIZE - 12,
            borderRadius: '50%',
            border: `2.5px solid var(--t-dim)`,
            borderTopColor: 'var(--t-accent)',
            // Durante el pull: ángulo proporcional al arco. Al soltar: gira libre.
            animation: (refreshing || closing) ? 'ptr-spin 0.7s linear infinite' : 'none',
            transform: (refreshing || closing)
              ? undefined
              : `rotate(${arcFraction * 360 * 2}deg)`,
            transition: 'none',
          }} />
        </div>
      </div>
    </>
  );
}
