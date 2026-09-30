export default function PageHeader({ eyebrow, title, titleAction, meta }) {
  return (
    <div style={{
      position:'relative', overflow:'hidden', padding:'20px 20px 18px',
      background:'linear-gradient(180deg, rgba(var(--t-accent-r),0.14) 0%, rgba(var(--t-accent-r),0.03) 60%, transparent 100%)',
    }}>
      <div style={{ position:'absolute', top:-60, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, rgba(var(--t-accent-r),0.2) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'relative' }}>
        {eyebrow && (
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {eyebrow}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(26px,7vw,36px)', textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
            {title}
          </div>
          {titleAction}
        </div>
        {meta && <div style={{ fontSize:12, color:'var(--t-muted)', marginTop:4 }}>{meta}</div>}
      </div>
    </div>
  );
}
