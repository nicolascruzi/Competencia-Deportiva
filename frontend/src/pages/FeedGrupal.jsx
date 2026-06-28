import { useEffect, useState } from 'react';
import { getActividadesComp } from '../api/competencias';
import { useAuth } from '../context/AuthContext';

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'Ahora';
  if (min < 60) return `Hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `Hace ${d}d`;
  return new Date(isoStr).toLocaleDateString('es', { day:'numeric', month:'short' });
}

function FeedCard({ act, onLightbox }) {
  return (
    <div style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-surface2)' }}>

      {/* Header de la tarjeta */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px 10px' }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'1.5px solid rgba(var(--t-accent-r),0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'var(--t-accent)', flexShrink:0, overflow:'hidden' }}>
          {act.foto_perfil_url
            ? <img src={act.foto_perfil_url} alt={act.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : act.nombre.charAt(0).toUpperCase()
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1 }}>
            {act.nombre}
          </div>
          <div style={{ fontSize:12, color:'var(--t-muted2)', marginTop:2 }}>
            {act.deporte_nombre}
          </div>
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted2)', flexShrink:0 }}>
          {timeAgo(act.created_at || act.fecha)}
        </div>
      </div>

      {/* Foto (si existe) */}
      {act.foto_url && (
        <div style={{ position:'relative', cursor:'pointer' }} onClick={() => onLightbox(act.foto_url)}>
          <img src={act.foto_url} alt={act.deporte_nombre}
            style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
        </div>
      )}

      {/* Stats: puntos + minutos */}
      <div style={{ display:'flex', alignItems:'center', gap:0, padding:'10px 14px 4px' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:20, color:'var(--t-accent)', lineHeight:1 }}>
            {Math.round(act.puntos)}
          </span>
          <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>pts</span>
        </div>
        <div style={{ width:1, height:16, background:'var(--t-surface2)', margin:'0 12px' }} />
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, fontSize:16, color:'var(--t-muted)', lineHeight:1 }}>
            {Math.round(parseFloat(act.minutos))}
          </span>
          <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>min</span>
        </div>
        {/* Fecha de la actividad */}
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--t-muted2)' }}>
          {new Date(act.fecha + 'T12:00:00').toLocaleDateString('es', { weekday:'short', day:'numeric', month:'short' })}
        </div>
      </div>

      {/* Notas */}
      {act.notas && (
        <div style={{ padding:'4px 14px 12px', fontSize:14, color:'var(--t-muted)', lineHeight:1.5 }}>
          {act.notas}
        </div>
      )}

      {!act.notas && <div style={{ height:12 }} />}
    </div>
  );
}

export default function FeedGrupal({ competencia }) {
  const { user } = useAuth();
  const [acts, setActs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!competencia) return;
    setLoading(true);
    // sin filtro de mes → todas las actividades
    getActividadesComp(competencia.id)
      .then(data => {
        // ordenar de más nueva a más antigua por created_at o fecha
        const sorted = [...data].sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.fecha + 'T12:00:00').getTime();
          const tB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.fecha + 'T12:00:00').getTime();
          return tB - tA;
        });
        setActs(sorted);
      })
      .finally(() => setLoading(false));
  }, [competencia?.id]);


  if (!competencia) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', color:'var(--t-muted)', textAlign:'center', gap:12 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.4 }}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>Sin competencia activa</div>
        <div style={{ fontSize:14, lineHeight:1.6 }}>Seleccioná una competencia para ver el feed del grupo.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'80px 20px', color:'var(--t-muted)' }}>
        <div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <span style={{ fontSize:14 }}>Cargando feed…</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!acts.length) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', color:'var(--t-muted)', textAlign:'center', gap:12 }}>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>Sin actividades</div>
        <div style={{ fontSize:14 }}>El grupo todavía no registró actividades.</div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <button onClick={() => setLightbox(null)}
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,0.85)', border:'none', color:'var(--t-text)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:12, objectFit:'contain' }} />
        </div>
      )}

      {/* Header fijo del feed */}
      <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid var(--t-surface2)' }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--t-accent)', marginBottom:4 }}>
          {competencia.nombre}
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
          Feed del grupo
        </div>
        <div style={{ fontSize:12, color:'var(--t-muted2)', marginTop:4 }}>
          {acts.length} actividades
        </div>
      </div>

      {/* Lista de tarjetas */}
      <div style={{ paddingBottom:24 }}>
        {acts.map(act => (
          <FeedCard
            key={act.id}
            act={act}
            onLightbox={url => setLightbox(url)}
          />
        ))}
      </div>
    </>
  );
}
