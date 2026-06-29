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

    // Recorre el DOM desde `node` hacia arriba buscando cualquier
    // ancestro scrollable (overflowY auto/scroll) con contenido desplazado.
    // Devuelve true si alguno tiene scrollTop > 0.
    function anyAncestorScrolled(node) {
      let cur = node;
      while (cur && cur !== document.body) {
        const st = cur.scrollTop;
        if (st > 0) return true;
        // También revisar scrollTop del elemento si tiene overflow scroll/auto
        const style = window.getComputedStyle(cur);
        const oy = style.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && cur.scrollHeight > cur.clientHeight && st > 0) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    }

    function onTouchStart(e) {
      if (refreshingRef.current) return;
      const touch = e.touches[0];
      // Elemento real bajo el dedo
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (anyAncestorScrolled(target)) return;
      startY.current        = touch.clientY;
      activeGesture.current = false;
    }

    function onTouchMove(e) {
      if (refreshingRef.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { activeGesture.current = false; return; }
      // Re-verificar en cada frame: si el usuario scrolleó mientras arrastraba, cancelar
      const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
      if (anyAncestorScrolled(target)) {
        startY.current = null;
        setPullY(0);
        return;
      }
      activeGesture.current = true;
      const visual = Math.min(THRESHOLD, dy * RESIST);
      setPullY(visual);
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!activeGesture.current) { startY.current = null; return; }
      activeGesture.current = false;
      startY.current = null;

      if (pullYRef.current >= THRESHOLD * 0.85) {
        setRefreshing(true);
        const started = Date.now();
        const MIN_SHOW = 1000; // mínimo 1 segundo girando, como Instagram
        Promise.resolve(handleRefresh()).finally(() => {
          const elapsed = Date.now() - started;
          const wait = Math.max(0, MIN_SHOW - elapsed);
          setTimeout(() => {
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
