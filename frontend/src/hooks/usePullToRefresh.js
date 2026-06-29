import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD  = 72;  // px de arrastre para disparar refresh
const MAX_PULL   = 100; // px máximo de arrastre visual

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY       = useRef(null);
  const pullYRef     = useRef(0);   // valor actual sin stale closure
  const pulling      = useRef(false);
  const refreshingRef= useRef(false);
  const containerRef = useRef(null);

  // Mantener refs sincronizadas con state
  useEffect(() => { pullYRef.current = pullY; }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  const handleRefresh = useCallback(onRefresh, []);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function isAtTop() {
      return el.scrollTop <= 0;
    }

    function onTouchStart(e) {
      if (refreshingRef.current) return;
      if (!isAtTop()) return;
      startY.current  = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e) {
      if (refreshingRef.current) return;
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { pulling.current = false; return; }
      if (!isAtTop()) { startY.current = null; setPullY(0); return; }
      pulling.current = true;
      const visual = Math.min(MAX_PULL, dy * 0.45);
      setPullY(visual);
      if (dy > 8) e.preventDefault();
    }

    function onTouchEnd() {
      if (!pulling.current) { startY.current = null; return; }
      const current   = pullYRef.current;
      pulling.current = false;
      startY.current  = null;
      if (current >= THRESHOLD) {
        setRefreshing(true);
        setPullY(THRESHOLD * 0.65);
        Promise.resolve(handleRefresh()).finally(() => {
          setRefreshing(false);
          setPullY(0);
        });
      } else {
        setPullY(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [enabled, handleRefresh]);

  return { containerRef, pullY, refreshing };
}
