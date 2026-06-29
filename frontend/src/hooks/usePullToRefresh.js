import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 56;
const RESIST    = 0.5;

// Devuelve true si ALGÚN ancestro del nodo tiene contenido scrolleado
function isScrolledDown(node) {
  let cur = node;
  while (cur && cur !== document.documentElement) {
    if ((cur.scrollTop || 0) > 0) return true;
    cur = cur.parentElement;
  }
  return false;
}

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Todas las refs — nunca causan re-renders
  const startY        = useRef(null);   // clientY del touchstart, null = no hay gesto
  const locked        = useRef(false);  // true = este gesto NO activa PTR
  const pullYRef      = useRef(0);
  const refreshingRef = useRef(false);
  const mountedRef    = useRef(true);
  const containerRef  = useRef(null);

  useEffect(() => { pullYRef.current = pullY; }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Reset inmediato al desactivar (cambio de pestaña)
  useEffect(() => {
    if (!enabled) {
      startY.current = null;
      locked.current = false;
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
      // Resetear estado por si el gesto anterior no terminó limpio
      startY.current = null;
      locked.current = false;

      if (refreshingRef.current) return;

      const touch  = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY) || e.target;

      // Bloquear si ya hay scroll en cualquier ancestro
      if (isScrolledDown(target)) {
        locked.current = true;
        return;
      }

      startY.current = touch.clientY;
    }

    function onTouchMove(e) {
      if (refreshingRef.current) return;
      if (locked.current || startY.current === null) return;

      const dy = e.touches[0].clientY - startY.current;

      // Dedo va hacia arriba o es scroll normal — bloquear el gesto completo
      if (dy <= 0) {
        locked.current = true;
        if (pullYRef.current > 0) setPullY(0);
        return;
      }

      // PTR activo: prevenir scroll nativo y mover el contenido
      e.preventDefault();
      const visual = Math.min(THRESHOLD, dy * RESIST);
      setPullY(visual);
    }

    function onTouchEnd() {
      const current = pullYRef.current;
      startY.current = null;
      locked.current = false;

      if (current < 2) return; // no hubo gesto real

      if (current >= THRESHOLD * 0.85) {
        setRefreshing(true);
        const started  = Date.now();
        const MIN_SHOW = 1000;
        Promise.resolve(handleRefresh()).finally(() => {
          const wait = Math.max(0, MIN_SHOW - (Date.now() - started));
          setTimeout(() => {
            if (!mountedRef.current) return;
            setRefreshing(false);
            setPullY(0);
          }, wait);
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
