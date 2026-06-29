const THRESHOLD = 56;
const SIZE = 28;

export default function PullToRefreshIndicator({ pullY, refreshing, closing }) {
  const visible = pullY > 2 || refreshing || closing;
  if (!visible) return null;

  const progress     = (refreshing || closing) ? 1 : Math.min(1, pullY / THRESHOLD);
  const space        = (refreshing || closing) ? THRESHOLD : pullY;
  const centerOffset = Math.max(0, (space - SIZE) / 2);
  const scale        = Math.min(1, 0.45 + progress * 0.55);
  const rotateDeg    = (refreshing || closing) ? undefined : `rotate(${progress * 720}deg)`;

  return (
    <>
      <style>{`@keyframes ptr-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 52px)',
        left: 0, right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 45,
        pointerEvents: 'none',
        transform: `translateY(${centerOffset}px)`,
        transition: closing ? 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.38s ease' : 'none',
        opacity: closing ? 0 : 1,
      }}>
        <div style={{
          width: SIZE,
          height: SIZE,
          borderRadius: '50%',
          borderTop: `3px solid var(--t-accent)`,
          borderRight: '3px solid transparent',
          borderBottom: '3px solid transparent',
          borderLeft: '3px solid transparent',
          boxSizing: 'border-box',
          background: 'transparent',
          animation: (refreshing || closing) ? 'ptr-spin 0.7s linear infinite' : 'none',
          transform: `scale(${scale})${rotateDeg ? ` ${rotateDeg}` : ''}`,
        }} />
      </div>
    </>
  );
}
