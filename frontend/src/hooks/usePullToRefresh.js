import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 56;   // px de arrastre real para disparar (corto, como Instagram)
const RESIST    = 0.5;  // resistencia: el círculo recorre la mitad del dedo

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0);   // 0..THRESHOLD (visual)
  const [refreshing, setRefreshing] = useState(false);

  const startY        = useRef(null);
  const pullYRef      = useRef(0);
  const refreshingRef = useRef(false);
  const activeGesture = useRef(false);
  const containerRef  = useRef(null);

  useEffect(() => { pullYRef.current      = pullY;      }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  const handleRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (refreshingRef.current) return;
      if (el.scrollTop > 0) return;
      startY.current    = e.touches[0].clientY;
      activeGesture.current = false;
    }

    function onTouchMove(e) {
      if (refreshingRef.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { activeGesture.current = false; return; }
      if (el.scrollTop > 0) { startY.current = null; return; }

      activeGesture.current = true;
      // Resistencia tipo Instagram: el círculo se mueve menos que el dedo
      const visual = Math.min(THRESHOLD, dy * RESIST);
      setPullY(visual);
      e.preventDefault(); // evitar bounce nativo
    }

    function onTouchEnd() {
      if (!activeGesture.current) { startY.current = null; return; }
      activeGesture.current = false;
      startY.current = null;

      if (pullYRef.current >= THRESHOLD * 0.85) {
        // Disparar refresh — fijar círculo y hacer girar
        setRefreshing(true);
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
    el.addEventListener('touchcancel',onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
      el.removeEventListener('touchcancel',onTouchEnd);
    };
  }, [enabled, handleRefresh]);

  return { containerRef, pullY, refreshing };
}
