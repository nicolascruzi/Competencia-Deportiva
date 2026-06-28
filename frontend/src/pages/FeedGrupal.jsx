import { useEffect, useRef, useState } from 'react';
import { getActividadesComp, getComentarios, createComentario, deleteComentario } from '../api/competencias';
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

// ─── Burbuja individual de comentario ────────────────────────────────────────

function BurbujaComentario({ c, user, onDelete }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.1)', border:'1.5px solid rgba(var(--t-accent-r),0.18)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
        {c.foto_perfil_url
          ? <img src={c.foto_perfil_url} alt={c.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:12, color:'var(--t-accent)' }}>{c.nombre?.charAt(0).toUpperCase()}</span>
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ background:'var(--t-surface2)', borderRadius:'4px 12px 12px 12px', padding:'8px 10px' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, textTransform:'uppercase', letterSpacing:'0.03em', color:'var(--t-text)', lineHeight:1, marginBottom:4 }}>
            {c.nombre}
          </div>
          <div style={{ fontSize:14, color:'var(--t-text)', lineHeight:1.5, wordBreak:'break-word' }}>
            {c.contenido}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, paddingLeft:2 }}>
          <span style={{ fontSize:11, color:'var(--t-muted)' }}>{timeAgo(c.created_at)}</span>
          {c.user_id === user?.id && (
            <button onClick={() => onDelete(c.id)}
              style={{ fontSize:11, color:'var(--t-muted)', background:'transparent', border:'none', cursor:'pointer', padding:0, WebkitTapHighlightColor:'transparent' }}>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Input para escribir comentario ──────────────────────────────────────────

function ComentarioInput({ user, onSend, inputRef }) {
  const [texto, setTexto]   = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    if (!texto.trim() || sending) return;
    setSending(true);
    try { await onSend(texto.trim()); setTexto(''); }
    catch (err) { console.error(err); }
    finally { setSending(false); }
  }

  return (
    <form onSubmit={handleSend} style={{ display:'flex', gap:8, alignItems:'center' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.1)', border:'1.5px solid rgba(var(--t-accent-r),0.18)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
        {user?.foto_perfil_url
          ? <img src={user.foto_perfil_url} alt={user.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:12, color:'var(--t-accent)' }}>{user?.nombre?.charAt(0).toUpperCase()}</span>
        }
      </div>
      <input
        ref={inputRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Escribí un comentario…"
        style={{ flex:1, padding:'8px 12px', borderRadius:20, border:'1.5px solid var(--t-dim)', background:'var(--t-surface2)', color:'var(--t-text)', fontSize:14, outline:'none', minWidth:0 }}
      />
      <button type="submit" disabled={!texto.trim() || sending}
        style={{ width:32, height:32, borderRadius:'50%', border:'none', background: texto.trim() ? 'var(--t-accent)' : 'var(--t-dim)', color: texto.trim() ? 'var(--t-ground)' : 'var(--t-muted)', cursor: texto.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.15s' }}>
        {sending
          ? <div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.35)', borderTopColor:'var(--t-ground)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        }
      </button>
    </form>
  );
}

// ─── Popup con todos los comentarios ─────────────────────────────────────────

function TodosPopup({ comentarios, user, onDelete, onSend, onClose }) {
  const inputRef  = useRef(null);
  const startY    = useRef(null);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 250);
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }} />
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'75dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 12px)' }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>
            {comentarios.length} comentario{comentarios.length !== 1 ? 's' : ''}
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>
        {/* Lista scrollable */}
        <div style={{ overflowY:'auto', flex:1, padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {comentarios.map(c => (
            <BurbujaComentario key={c.id} c={c} user={user} onDelete={onDelete} />
          ))}
        </div>
        {/* Input fijo abajo */}
        <div style={{ padding:'10px 16px 0', borderTop:'1px solid var(--t-dim)', flexShrink:0 }}>
          <ComentarioInput user={user} onSend={onSend} inputRef={inputRef} />
        </div>
      </div>
    </>
  );
}

// ─── Sección de comentarios ───────────────────────────────────────────────────

function ComentariosSection({ actividadId, user }) {
  const [comentarios, setComentarios] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [popupOpen, setPopupOpen]     = useState(false);
  const inputRef = useRef(null);

  async function load() {
    setLoading(true);
    try { setComentarios(await getComentarios(actividadId)); }
    finally { setLoading(false); }
  }

  // Carga al primer toque del botón
  async function handleToggle() {
    if (comentarios === null) await load();
    else setComentarios(c => c); // fuerza re-render para mostrar input
    // Mostrar el input inline (sección abierta)
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  async function handleSend(texto) {
    const nuevo = await createComentario(actividadId, texto);
    setComentarios(prev => [...(prev || []), nuevo]);
  }

  async function handleDelete(id) {
    try {
      await deleteComentario(id);
      setComentarios(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  }

  const count  = comentarios?.length ?? 0;
  const ultimo = comentarios?.[count - 1] ?? null;

  return (
    <div style={{ borderTop:'1px solid var(--t-surface2)' }}>

      {/* Botón "Comentar" + spinner */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px' }}>
        <button onClick={handleToggle}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', cursor:'pointer', color:'var(--t-muted)', fontSize:13, fontWeight:600, WebkitTapHighlightColor:'transparent', padding:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Comentar
          {loading && <div style={{ width:11, height:11, border:'1.5px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />}
        </button>

        {/* "Ver todos (N)" si hay más de 1 */}
        {count > 1 && (
          <button onClick={() => setPopupOpen(true)}
            style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--t-accent)', fontSize:12, fontWeight:700, WebkitTapHighlightColor:'transparent', padding:0 }}>
            Ver todos ({count})
          </button>
        )}
      </div>

      {/* Último comentario (si existe) */}
      {ultimo && (
        <div style={{ padding:'0 14px 10px' }}>
          <BurbujaComentario c={ultimo} user={user} onDelete={handleDelete} />
        </div>
      )}

      {/* Input inline (siempre visible una vez cargado) */}
      {comentarios !== null && (
        <div style={{ padding:'0 14px 12px' }}>
          <ComentarioInput user={user} onSend={handleSend} inputRef={inputRef} />
        </div>
      )}

      {/* Popup con todos los comentarios */}
      {popupOpen && (
        <TodosPopup
          comentarios={comentarios}
          user={user}
          onDelete={handleDelete}
          onSend={handleSend}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  );
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

function FeedCard({ act, user, onLightbox }) {
  return (
    <div style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-surface2)', marginBottom:8, borderRadius:0 }}>

      {/* Header */}
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

      {/* Foto */}
      {act.foto_url && (
        <div style={{ position:'relative', cursor:'pointer' }} onClick={() => onLightbox(act.foto_url)}>
          <img src={act.foto_url} alt={act.deporte_nombre}
            style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
        </div>
      )}

      {/* Stats */}
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
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--t-muted2)' }}>
          {new Date(act.fecha + 'T12:00:00').toLocaleDateString('es', { weekday:'short', day:'numeric', month:'short' })}
        </div>
      </div>

      {/* Notas */}
      {act.notas && (
        <div style={{ padding:'4px 14px 10px', fontSize:14, color:'var(--t-muted)', lineHeight:1.5 }}>
          {act.notas}
        </div>
      )}

      {!act.notas && <div style={{ height:8 }} />}

      {/* Comentarios */}
      <ComentariosSection actividadId={act.id} user={user} />
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FeedGrupal({ competencia }) {
  const { user } = useAuth();
  const [acts, setActs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    if (!competencia) return;
    setLoading(true);
    getActividadesComp(competencia.id)
      .then(data => {
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
          <FeedCard
            key={act.id}
            act={act}
            user={user}
            onLightbox={url => setLightbox(url)}
          />
        ))}
      </div>
    </>
  );
}
