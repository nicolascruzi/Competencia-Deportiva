export default function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', padding:'0 16px', gap:4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding:'7px 16px', borderRadius:'10px 10px 0 0', border:'none', cursor:'pointer', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.05em', WebkitTapHighlightColor:'transparent', transition:'all 0.15s',
            background: active === t.id ? 'var(--t-surface)' : 'transparent',
            color: active === t.id ? 'var(--t-accent)' : 'var(--t-muted)',
            borderBottom: active === t.id ? '2px solid var(--t-accent)' : '2px solid transparent',
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
