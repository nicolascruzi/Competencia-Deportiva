import { useEffect, useRef, useState } from 'react';

// Props:
//   actividad   — la actividad recién creada
//   ptsAntes    — pts acumulados esta semana ANTES de guardar
//   ptsDespues  — pts acumulados esta semana DESPUÉS de guardar
//   onClose     — callback para cerrar
//   onVerEvolucion — callback para navegar a "actividades" subtab "evolucion"
export default function ActivityToast({ actividad, ptsAntes, ptsDespues, onClose, onVerEvolucion }) {
  const [visible, setVisible] = useState(false);
  const [barPct, setBarPct]   = useState(0);
  const [numPts, setNumPts]   = useState(ptsAntes);

  const delta         = Math.round(ptsDespues - ptsAntes);
  const pts_actividad = parseFloat(actividad?.puntos) || Math.round(parseFloat(actividad?.minutos) * parseFloat(actividad?.ponderador));

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);

    // Animar barra: 74% como valor visual fijo para dar sensación de progreso continuo
    const t2 = setTimeout(() => setBarPct(74), 150);

    // Animar contador de pts
    const duration = 900, from = ptsAntes, to = ptsDespues, start = Date.now();
    function tick() {
      const p = Math.min(1, (Date.now() - start) / duration);
      setNumPts(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    }
    const t3 = setTimeout(() => requestAnimationFrame(tick), 200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  function handleVerEvolucion() {
    handleClose();
    setTimeout(() => onVerEvolucion?.(), 280);
  }

  const pctAntes = ptsDespues > 0 ? Math.min(72, (ptsAntes / ptsDespues) * 74) : 0;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        background: visible ? 'rgba(5,12,20,0.72)' : 'rgba(5,12,20,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(4px)' : 'none',
        transition: 'background 0.28s',
        // NO onClick en el fondo — no se cierra al tocar fuera
      }}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--t-surface)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid var(--t-dim)',
          borderBottom: 'none',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
          overflow: 'hidden',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 16px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: 'var(--t-dim)' }} />
        </div>

        {/* Cabecera: deporte + pts */}
        <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--t-muted)', marginBottom: 3 }}>
              Actividad registrada
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 24, textTransform: 'uppercase', color: 'var(--t-text)', lineHeight: 1 }}>
              {actividad?.deporte_nombre}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t-muted)', marginTop: 4 }}>
              {actividad?.minutos} min · ×{parseFloat(actividad?.ponderador).toFixed(1)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 42, color: 'var(--t-accent)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              +{Math.round(pts_actividad)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--t-muted)' }}>pts</div>
          </div>
        </div>

        {/* Barra progreso semanal */}
        <div style={{ padding: '0 20px', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--t-muted)' }}>
              Esta semana
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: 'var(--t-accent)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(numPts).toLocaleString('es')}
              </span>
              <span style={{ fontSize: 10, color: 'var(--t-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>pts</span>
            </div>
          </div>

          {/* Track */}
          <div style={{ height: 12, background: 'var(--t-surface2)', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
            {/* Segmento previo */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: pctAntes + '%',
              background: 'var(--t-dim)',
              transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
            }} />
            {/* Segmento nuevo — arranca desde pctAntes y llega a barPct */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: barPct + '%',
              background: `linear-gradient(90deg, var(--t-dim) 0%, var(--t-dim) ${(pctAntes / barPct) * 100}%, var(--t-accent) 100%)`,
              transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: '3px 0 10px rgba(249,115,22,0.55)',
            }} />
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--t-muted)' }}>
            <span style={{ color: '#22C55E', fontWeight: 700 }}>+{delta} pts</span>
            {' '}sumados a tu semana
          </div>
        </div>

        {/* Botones */}
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleVerEvolucion}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: 'var(--t-accent)', color: 'var(--t-ground)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}
          >
            Ver evolución
          </button>
          <button
            onClick={handleClose}
            style={{ width: '100%', padding: '11px', borderRadius: 14, border: '1px solid var(--t-dim)', background: 'transparent', color: 'var(--t-muted)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
