import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 60;
const RESIST    = 0.55;

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY      = useRef(null);
  const blocked     = useRef(false); // gesto bloqueado porque empezó con scroll > 0 o fue hacia arriba
  const pullYRef    = useRef(0);
  const mountedRef  = useRef(true);
  const containerRef = useRef(null);

  useEffect(() => { pullYRef.current = pullY; }, [pullY]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Reset completo al desactivar (cambio de pestaña)
  useEffect(() => {
    if (!enabled) {
      startY.current = null;
      blocked.current = false;
      setPullY(0);
      setRefreshing(false);
    }
  }, [enabled]);

  const handleRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      startY.current  = e.touches[0].clientY;
      // Si el contenedor tiene cualquier scroll, bloquear PTR para este gesto
      blocked.current = el.scrollTop > 0;
    }

    function onTouchMove(e) {
      if (startY.current === null) return;
      if (blocked.current) return;

      const dy = e.touches[0].clientY - startY.current;

      // Movimiento hacia arriba → bloquear todo el gesto
      if (dy <= 0) {
        blocked.current = true;
        if (pullYRef.current > 0) setPullY(0);
        return;
      }

      // Si el contenedor se scrolleó desde que empezó el gesto, bloquear
      if (el.scrollTop > 0) {
        blocked.current = true;
        if (pullYRef.current > 0) setPullY(0);
        return;
      }

      e.preventDefault();
      setPullY(Math.min(THRESHOLD, dy * RESIST));
    }

    function onTouchEnd() {
      const current   = pullYRef.current;
      startY.current  = null;
      blocked.current = false;

      if (current >= THRESHOLD * 0.75) {
        setRefreshing(true);
        const started = Date.now();
        Promise.resolve(handleRefresh()).finally(() => {
          const wait = Math.max(0, 1000 - (Date.now() - started));
          setTimeout(() => {
            if (!mountedRef.current) return;
            setRefreshing(false);
            setPullY(0);
          }, wait);
        });
      } else if (current > 0) {
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
