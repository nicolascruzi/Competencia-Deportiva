import { useTheme } from '../context/ThemeContext';

const PALETTE_ORDER = ['tierra', 'ciruela', 'noche'];

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function Configuracion() {
  const { themeId, setTheme, palettes } = useTheme();

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--t-dim)' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:5 }}>
          Ajustes
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:28, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
          Configuración
        </div>
      </div>

      {/* Sección paleta */}
      <div style={{ padding:'20px 20px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-muted)', marginBottom:14 }}>
          Tema de color
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {PALETTE_ORDER.map(id => {
            const p = palettes[id];
            const isActive = themeId === id;
            return (
              <button key={id} onClick={() => setTheme(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: isActive ? 'rgba(var(--t-accent-r), 0.07)' : 'var(--t-surface)',
                  border: isActive ? '1.5px solid var(--t-accent)' : '1.5px solid var(--t-dim)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'border-color 0.18s, background 0.18s',
                  textAlign: 'left',
                }}>

                {/* Muestras de color */}
                <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                  {p.preview.map((hex, i) => (
                    <div key={i} style={{
                      width: i === 5 ? 20 : 12,
                      height: 20,
                      borderRadius: i === 5 ? 10 : 6,
                      background: hex,
                      border: hex === '#FFFFFF' || hex === '#FAFAF8' || hex === '#FDF9FB' || hex === '#F7F8FA' || hex === '#F2F3F2' || hex === '#F5F2ED' || hex === '#F6F1F4' ? '1px solid #ddd' : 'none',
                      flexShrink: 0,
                    }} />
                  ))}
                </div>

                {/* Texto */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1 }}>
                    {p.nombre}
                  </div>
                  <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:3 }}>
                    {p.descripcion}
                  </div>
                </div>

                {/* Check */}
                {isActive && (
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--t-accent)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--t-ground)', flexShrink:0 }}>
                    <IconCheck />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nota */}
      <div style={{ margin:'20px 20px 0', padding:'12px 14px', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12 }}>
        <div style={{ fontSize:12, color:'var(--t-muted)', lineHeight:1.6 }}>
          El tema se guarda en este dispositivo y se aplica a toda la app.
        </div>
      </div>
    </div>
  );
}
