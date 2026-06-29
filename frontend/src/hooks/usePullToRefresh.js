import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 56;
const RESIST    = 0.5;

// Sube por el DOM desde `node` y devuelve el scrollTop acumulado
// de todos los ancestros scrollables. Si cualquiera > 0, el usuario
// no está en el tope.
function getTotalScrollTop(node) {
  let total = 0;
  let cur   = node;
  while (cur && cur.tagName !== 'BODY') {
    total += cur.scrollTop || 0;
    cur    = cur.parentElement;
  }
  return total;
}

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY]           = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY          = useRef(null);
  const scrollAtStart   = useRef(0);   // scrollTop total capturado en touchstart
  const pullYRef        = useRef(0);
  const refreshingRef   = useRef(false);
  const activeGesture   = useRef(false);
  const containerRef    = useRef(null);

  useEffect(() => { pullYRef.current      = pullY;      }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  const handleRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (refreshingRef.current) return;
      const touch  = e.touches[0];
      // Capturar el scroll total bajo el dedo en este instante exacto
      const target = document.elementFromPoint(touch.clientX, touch.clientY) || e.target;
      const total  = getTotalScrollTop(target);
      // Si hay CUALQUIER scroll acumulado en la cadena DOM → no activar PTR
      if (total > 0) return;
      scrollAtStart.current = total;
      startY.current        = touch.clientY;
      activeGesture.current = false;
    }

    function onTouchMove(e) {
      if (refreshingRef.current || startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        // Arrastre hacia arriba — cancelar cualquier PTR iniciado
        if (activeGesture.current) { activeGesture.current = false; setPullY(0); }
        return;
      }
      // Solo activar si el scroll seguía en 0 cuando empezó el gesto
      if (scrollAtStart.current > 0) return;
      activeGesture.current = true;
      const visual = Math.min(THRESHOLD, dy * RESIST);
      setPullY(visual);
      e.preventDefault();
    }

    function onTouchEnd() {
      if (!activeGesture.current) { startY.current = null; return; }
      activeGesture.current = false;
      startY.current        = null;

      if (pullYRef.current >= THRESHOLD * 0.85) {
        setRefreshing(true);
        const started  = Date.now();
        const MIN_SHOW = 1000;
        Promise.resolve(handleRefresh()).finally(() => {
          const wait = Math.max(0, MIN_SHOW - (Date.now() - started));
          setTimeout(() => { setRefreshing(false); setPullY(0); }, wait);
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
