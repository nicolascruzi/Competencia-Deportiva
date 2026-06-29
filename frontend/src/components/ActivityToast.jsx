import { useEffect, useRef, useState } from 'react';

// Muestra un overlay de celebración animado tras guardar una actividad.
// Props:
//   actividad  — la actividad recién creada { deporte_nombre, minutos, ponderador, puntos, fecha }
//   ptsAntes   — puntos acumulados esta semana ANTES de guardar
//   ptsDespues — puntos acumulados esta semana DESPUÉS de guardar
//   onClose    — callback para cerrar
export default function ActivityToast({ actividad, ptsAntes, ptsDespues, onClose }) {
  const [visible, setVisible] = useState(false);
  const [barPct, setBarPct]   = useState(0);
  const [numPts, setNumPts]   = useState(ptsAntes);
  const autoRef = useRef(null);

  const delta      = Math.round(ptsDespues - ptsAntes);
  const ptsDisplay = Math.round(ptsDespues);

  // Animar entrada + barra
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => {
      // barra: muestra cuánto representa ptsDespues respecto a un máximo visual dinámico
      // usamos ptsDespues * 1.3 como techo para que nunca llegue al 100% (da sensación de progreso continuo)
      const pct = Math.min(92, Math.round((ptsDespues / (ptsDespues * 1.35 || 1)) * 100));
      setBarPct(pct);
    }, 120);

    // Animar número de pts desde ptsAntes hasta ptsDespues
    const duration = 900;
    const start = Date.now();
    const from = ptsAntes;
    const to = ptsDespues;
    function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setNumPts(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(tick);
    }
    const t3 = setTimeout(() => requestAnimationFrame(tick), 200);

    // Auto-cerrar a los 4s
    autoRef.current = setTimeout(() => handleClose(), 4200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  function handleClose() {
    clearTimeout(autoRef.current);
    setVisible(false);
    setTimeout(onClose, 300);
  }

  const pts_actividad = parseFloat(actividad?.puntos) || Math.round(parseFloat(actividad?.minutos) * parseFloat(actividad?.ponderador));

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: visible ? 'rgba(5,12,20,0.72)' : 'rgba(5,12,20,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(4px)' : 'none',
        transition: 'background 0.28s, backdrop-filter 0.28s',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: 'var(--t-surface)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--t-dim)',
          borderBottom: 'none',
          padding: '0 0 calc(24px + env(safe-area-inset-bottom))',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 16px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'var(--t-dim)' }} />
        </div>

        {/* Cabecera */}
        <div style={{ padding: '0 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-muted)', marginBottom: 2 }}>
              Actividad registrada
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: 'var(--t-text)', lineHeight: 1 }}>
              {actividad?.deporte_nombre}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 3 }}>
              {actividad?.minutos} min · ×{parseFloat(actividad?.ponderador).toFixed(1)}
            </div>
          </div>

          {/* Delta pts */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 38, color: 'var(--t-accent)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              +{Math.round(pts_actividad)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-muted)' }}>pts</div>
          </div>
        </div>

        {/* Barra de progreso semanal */}
        <div style={{ padding: '0 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--t-muted)' }}>
              Esta semana
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 18, color: 'var(--t-accent)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(numPts).toLocaleString('es')}
              </span>
              <span style={{ fontSize: 10, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>pts</span>
            </div>
          </div>

          {/* Track */}
          <div style={{ height: 10, background: 'var(--t-surface2)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            {/* Tramo anterior (gris más claro) */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: barPct * (ptsAntes / ptsDespues) + '%',
              background: 'var(--t-dim)',
              transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
            }} />
            {/* Tramo nuevo (naranja, arranca desde donde estaba) */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: barPct + '%',
              background: 'linear-gradient(90deg, var(--t-dim) 0%, var(--t-accent) 100%)',
              transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: '2px 0 8px rgba(249,115,22,0.6)',
            }} />
          </div>

          {/* Delta label */}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t-muted)' }}>
            <span style={{ color: '#22C55E', fontWeight: 700 }}>+{delta} pts</span>
            {' '}sumados a tu semana
          </div>
        </div>

        {/* Botón cerrar */}
        <div style={{ padding: '0 20px' }}>
          <button
            onClick={handleClose}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'var(--t-accent)', color: 'var(--t-ground)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
          >
            ¡Listo!
          </button>
        </div>

        <style>{`
          @keyframes toastPulse {
            0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
          }
        `}</style>
      </div>
    </div>
  );
}
