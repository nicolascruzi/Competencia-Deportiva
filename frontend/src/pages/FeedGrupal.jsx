import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActividadesComp } from '../api/competencias';
import { useAuth } from '../context/AuthContext';
import { FeedCard } from '../components/FeedCard';
import { ProfilePanel } from './CompetenciaDetalle';

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FeedGrupal({ competencia, scrollSignal }) {
  const { user } = useAuth();
  const [acts, setActs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [profile, setProfile]   = useState(null);
  const [highlighted, setHighlighted] = useState(null);
  const cardRefs = useRef({});

  // Scroll + highlight cuando llega scrollSignal — usa ts para detectar re-clicks al mismo id
  useEffect(() => {
    if (!scrollSignal?.id) return;
    const id = Number(scrollSignal.id);

    function doScroll() {
      setHighlighted(id);
      const el = cardRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const clearTimer = setTimeout(() => setHighlighted(null), 2500);
      return clearTimer;
    }

    // Si aún está cargando, esperar a que termine
    if (loading) return;

    // Delay pequeño para que React haya pintado los refs
    const scrollTimer = setTimeout(() => {
      const t = doScroll();
      return () => clearTimeout(t);
    }, 120);
    return () => clearTimeout(scrollTimer);
  }, [scrollSignal?.id, scrollSignal?.ts, loading]);

  useEffect(() => {
    if (!competencia) return;
    setLoading(true);
    getActividadesComp(competencia.id)
      .then(data => {
        const safe = (Array.isArray(data) ? data : []).filter(Boolean);
        const sorted = safe.sort((a, b) => {
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
      {lightbox && createPortal(
        <div onClick={() => setLightbox(null)}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,12,20,0.97)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <button onClick={() => setLightbox(null)}
            style={{ position:'absolute', top:20, right:20, width:36, height:36, borderRadius:'50%', background:'rgba(30,30,30,0.85)', border:'none', color:'var(--t-text)', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
          <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth:'100%', maxHeight:'90dvh', borderRadius:12, objectFit:'contain' }} />
        </div>,
        document.body
      )}

      {/* Header */}
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

      {/* Cards */}
      <div style={{ paddingBottom:24 }}>
        {acts.map(act => (
          <div key={act.id} ref={el => { cardRefs.current[act.id] = el; }}
            style={{ transition:'box-shadow 0.3s, outline 0.3s', outline: highlighted === act.id ? '2px solid var(--t-accent)' : '2px solid transparent', borderRadius:0 }}>
            <FeedCard
              act={act}
              user={user}
              onLightbox={url => setLightbox(url)}
              onOpenProfile={a => setProfile({ nombre: a.nombre_display || a.nombre, id: a.user_id })}
            />
          </div>
        ))}
      </div>

      {profile && createPortal(
        <ProfilePanel
          nombre={profile.nombre}
          userId={profile.id}
          competenciaId={competencia.id}
          acts={acts}
          onClose={() => setProfile(null)}
        />,
        document.body
      )}
    </>
  );
}
