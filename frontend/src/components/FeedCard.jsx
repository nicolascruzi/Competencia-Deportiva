import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getComentarios, createComentario, deleteComentario, getLikes, toggleLike, darLike, getLikers, getMencionables } from '../api/competencias';

// ─── Estado de likes compartido entre el botón de corazón y el doble-tap en la foto ──────────────

function useLikeState(actividadId) {
  const [liked,  setLiked]  = useState(false);
  const [total,  setTotal]  = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy,   setBusy]   = useState(false);

  useEffect(() => {
    getLikes(actividadId).then(d => {
      setLiked(d.liked);
      setTotal(d.total);
      setLoaded(true);
    });
  }, [actividadId]);

  async function toggle() {
    if (busy) return;
    const prevLiked = liked, prevTotal = total;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setTotal(nextLiked ? total + 1 : total - 1);
    setBusy(true);
    try {
      const d = await toggleLike(actividadId);
      setLiked(d.liked);
      setTotal(d.total);
    } catch {
      setLiked(prevLiked);
      setTotal(prevTotal);
    } finally {
      setBusy(false);
    }
  }

  // Solo da like, nunca lo quita — para el doble-tap en la foto, estilo Instagram. No hace nada
  // (ni falla) si ya tenía like; devuelve si el tap efectivamente agregó un like nuevo, para que el
  // caller decida si mostrar la animación de corazón (Instagram la muestra siempre, con o sin like
  // previo, pero acá la usamos solo quedó útil para no duplicar el request si ya estaba likeado).
  async function like() {
    if (liked) return;
    const prevTotal = total;
    setLiked(true);
    setTotal(total + 1);
    try {
      const d = await darLike(actividadId);
      setLiked(d.liked);
      setTotal(d.total);
    } catch {
      setLiked(false);
      setTotal(prevTotal);
    }
  }

  return { liked, total, loaded, busy, toggle, like };
}

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

// Resalta las @menciones dentro del texto de un comentario — es puramente visual (no valida contra
// una lista de usuarios reales), ya que el texto ya viene con los @Nombre insertados tal cual se
// mandaron al backend.
function renderConMenciones(texto) {
  const partes = texto.split(/(@[^\s@]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/g);
  return partes.map((parte, i) =>
    parte.startsWith('@')
      ? <span key={i} style={{ color:'var(--t-accent)', fontWeight:700 }}>{parte}</span>
      : <span key={i}>{parte}</span>
  );
}

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
            {renderConMenciones(c.contenido)}
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

// Detecta si el cursor está justo después de un "@palabra" sin espacios — devuelve el texto
// buscado (puede ser '') o null si el cursor no está dentro de una mención en curso.
function detectarMencionEnCurso(texto, cursorPos) {
  const hastaCursor = texto.slice(0, cursorPos);
  const match = hastaCursor.match(/(?:^|\s)@([^\s@]*)$/);
  return match ? match[1] : null;
}

function ComentarioInput({ user, onSend, inputRef, mencionables = [] }) {
  const [texto, setTexto]   = useState('');
  const [sending, setSending] = useState(false);
  // Mapa nombre_mostrado (en minúsculas) -> id, de las personas efectivamente insertadas como @mención
  // en el texto actual — se arma al elegir una sugerencia y se resuelve contra el texto al enviar.
  const [mencionesElegidas, setMencionesElegidas] = useState({});
  const [busqueda, setBusqueda] = useState(null); // string en curso tras el @, o null si no hay dropdown abierto

  const sugerencias = busqueda !== null
    ? mencionables.filter(m => m.nombre_display.toLowerCase().startsWith(busqueda.toLowerCase())).slice(0, 5)
    : [];

  function handleChange(e) {
    const value = e.target.value;
    setTexto(value);
    setBusqueda(detectarMencionEnCurso(value, e.target.selectionStart ?? value.length));
  }

  function elegirMencion(persona) {
    const cursorPos = inputRef.current?.selectionStart ?? texto.length;
    const hastaCursor = texto.slice(0, cursorPos);
    const desdeCursor = texto.slice(cursorPos);
    const inicioArroba = hastaCursor.lastIndexOf('@');
    const nuevoTexto = texto.slice(0, inicioArroba) + `@${persona.nombre_display} ` + desdeCursor;
    setTexto(nuevoTexto);
    setMencionesElegidas(prev => ({ ...prev, [persona.nombre_display.toLowerCase()]: persona.id }));
    setBusqueda(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Resuelve qué @menciones elegidas por el picker siguen presentes literalmente en el texto final
  // (si la persona borró el @Nombre después de insertarlo, no se manda esa mención).
  function resolverMentionIds(textoFinal) {
    return Object.entries(mencionesElegidas)
      .filter(([nombre]) => textoFinal.toLowerCase().includes(`@${nombre}`))
      .map(([, id]) => id);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!texto.trim() || sending) return;
    setSending(true);
    const textoFinal = texto.trim();
    try {
      await onSend(textoFinal, resolverMentionIds(textoFinal));
      setTexto('');
      setMencionesElegidas({});
      setBusqueda(null);
    }
    catch (err) { console.error(err); }
    finally { setSending(false); }
  }

  return (
    <div style={{ position:'relative' }}>
      {sugerencias.length > 0 && (
        <div style={{ position:'absolute', bottom:'100%', left:0, right:0, marginBottom:6, background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 16px rgba(0,0,0,0.25)' }}>
          {sugerencias.map(persona => (
            <button key={persona.id} onClick={() => elegirMencion(persona)} type="button"
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 12px', border:'none', background:'transparent', cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent' }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.1)', border:'1.5px solid rgba(var(--t-accent-r),0.18)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {persona.foto_perfil_url
                  ? <img src={persona.foto_perfil_url} alt={persona.nombre_display} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:10, color:'var(--t-accent)' }}>{persona.nombre_display?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--t-text)' }}>{persona.nombre_display}</span>
            </button>
          ))}
        </div>
      )}
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
          onChange={handleChange}
          onKeyUp={e => setBusqueda(detectarMencionEnCurso(e.target.value, e.target.selectionStart ?? e.target.value.length))}
          placeholder="Escribe un comentario… usa @ para etiquetar"
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
    </div>
  );
}

// ─── Popup con todos los comentarios ─────────────────────────────────────────

function TodosPopup({ comentarios, user, onDelete, onSend, onOpen, mencionables, onClose }) {
  const inputRef  = useRef(null);
  const startY    = useRef(null);

  function onTouchStart(e) { startY.current = e.touches[0].clientY; }
  function onTouchEnd(e) {
    if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  }

  useEffect(() => {
    onOpen?.();
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
          <ComentarioInput user={user} onSend={onSend} inputRef={inputRef} mencionables={mencionables} />
        </div>
      </div>
    </>
  );
}

// ─── Sección de comentarios ───────────────────────────────────────────────────

function ComentariosSection({ actividadId, user, likeState }) {
  const [comentarios, setComentarios] = useState([]);
  const [popupOpen, setPopupOpen]     = useState(false);
  const [likersOpen, setLikersOpen]   = useState(false);
  const [inputOpen, setInputOpen]     = useState(false);
  const [mencionables, setMencionables] = useState([]);
  const inputRef = useRef(null);

  // Carga automática al montar
  useEffect(() => {
    getComentarios(actividadId)
      .then(setComentarios)
      .catch(() => {});
  }, [actividadId]);

  // Compañeros de grupo para el autocompletado de @menciones — se cargan solo al abrir el input,
  // no en cada FeedCard al montar (evita N requests innecesarios en un feed largo).
  function cargarMencionables() {
    if (mencionables.length === 0) getMencionables().then(setMencionables).catch(() => {});
  }

  async function handleSend(texto, mentionIds) {
    const nuevo = await createComentario(actividadId, texto, mentionIds);
    setComentarios(prev => [...prev, nuevo]);
  }

  async function handleDelete(id) {
    try {
      await deleteComentario(id);
      setComentarios(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  }

  function handleComentar() {
    setInputOpen(true);
    cargarMencionables();
    setTimeout(() => inputRef.current?.focus(), 150);
  }

  const count   = comentarios.length;
  // Mostrar siempre el último comentario; si hay más de 1 mostrar también "Ver todos"
  const preview = count > 0 ? comentarios[count - 1] : null;
  const hidden  = count - 1; // cuántos quedan ocultos (el preview ya muestra 1)

  return (
    <div style={{ borderTop:'1px solid var(--t-surface2)' }}>

      {/* Fila acciones: Like · Comentar */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 14px 6px' }}>
        <LikeButton likeState={likeState} onShowLikers={() => setLikersOpen(true)} />
        <button onClick={handleComentar}
          style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', cursor:'pointer', color:'var(--t-muted)', fontSize:13, fontWeight:600, WebkitTapHighlightColor:'transparent', padding:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Comentar
        </button>
      </div>

      {/* "Ver todos (N)" si hay más de 1 comentario */}
      {hidden > 0 && (
        <div style={{ padding:'0 14px 6px' }}>
          <button onClick={() => setPopupOpen(true)}
            style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--t-muted)', fontSize:12, fontWeight:600, WebkitTapHighlightColor:'transparent', padding:0 }}>
            Ver los {count} comentarios
          </button>
        </div>
      )}

      {/* Preview: último comentario siempre visible */}
      {preview && (
        <div style={{ padding:'0 14px 8px' }}>
          <BurbujaComentario c={preview} user={user} onDelete={handleDelete} />
        </div>
      )}

      {/* Input inline */}
      {inputOpen && (
        <div style={{ padding:'0 14px 12px' }}>
          <ComentarioInput user={user} onSend={handleSend} inputRef={inputRef} mencionables={mencionables} />
        </div>
      )}

      {/* Popup con todos los comentarios */}
      {popupOpen && createPortal(
        <TodosPopup
          comentarios={comentarios}
          user={user}
          onDelete={handleDelete}
          onSend={handleSend}
          onOpen={cargarMencionables}
          mencionables={mencionables}
          onClose={() => setPopupOpen(false)}
        />,
        document.body
      )}

      {/* Popup con quién dio like */}
      {likersOpen && createPortal(
        <LikersPopup actividadId={actividadId} onClose={() => setLikersOpen(false)} />,
        document.body
      )}
    </div>
  );
}

// ─── Botón de like ────────────────────────────────────────────────────────────

function LikeButton({ likeState, onShowLikers }) {
  const { liked, total, loaded, busy, toggle } = likeState;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <button onClick={toggle}
        style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', border:'none', cursor:'pointer', padding:'0', WebkitTapHighlightColor:'transparent', color: liked ? 'var(--t-accent)' : 'var(--t-muted)', transition:'color 0.15s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24"
          fill={liked ? 'var(--t-accent)' : 'none'}
          stroke={liked ? 'var(--t-accent)' : 'currentColor'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transition:'fill 0.15s, stroke 0.15s, transform 0.1s', transform: busy ? 'scale(0.88)' : 'scale(1)' }}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
        </svg>
      </button>
      {loaded && total > 0 && (
        <button onClick={onShowLikers}
          style={{ background:'transparent', border:'none', cursor:'pointer', padding:0, WebkitTapHighlightColor:'transparent', fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums', color:'var(--t-muted)' }}>
          {total}
        </button>
      )}
    </div>
  );
}

// ─── Popup con la lista de quién dio like ────────────────────────────────────

function LikersPopup({ actividadId, onClose }) {
  const [likers, setLikers] = useState(null); // null = cargando

  useEffect(() => {
    getLikers(actividadId).then(setLikers).catch(() => setLikers([]));
  }, [actividadId]);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:250, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:251, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', maxHeight:'60dvh', display:'flex', flexDirection:'column', paddingBottom:'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'var(--t-dim)' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 18px 12px', borderBottom:'1px solid var(--t-dim)', flexShrink:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:18, textTransform:'uppercase', color:'var(--t-text)' }}>
            Me gusta
          </div>
          <button onClick={onClose}
            style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ overflowY:'auto', flex:1, padding:'8px 16px', display:'flex', flexDirection:'column', gap:4 }}>
          {likers === null && (
            <div style={{ display:'flex', justifyContent:'center', padding:'30px 0' }}>
              <div style={{ width:16, height:16, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
            </div>
          )}
          {likers?.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px 0', color:'var(--t-muted)', fontSize:13 }}>Nadie dio like todavía.</div>
          )}
          {likers?.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0' }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.1)', border:'1.5px solid rgba(var(--t-accent-r),0.18)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {u.foto_perfil_url
                  ? <img src={u.foto_perfil_url} alt={u.nombre_display} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:13, color:'var(--t-accent)' }}>{u.nombre_display?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <span style={{ fontSize:14, fontWeight:600, color:'var(--t-text)' }}>{u.nombre_display}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

// ─── Foto con doble-tap para dar like (estilo Instagram) ─────────────────────

function FotoActividad({ act, onLightbox, likeState }) {
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);

  function handleTap() {
    const now = Date.now();
    const esDobleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;
    if (esDobleTap) {
      likeState.like();
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    } else {
      // Esperar a ver si viene un segundo tap antes de abrir el lightbox con el primero.
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= 300) onLightbox(act.foto_url);
      }, 300);
    }
  }

  return (
    <div style={{ position:'relative', cursor:'pointer' }} onClick={handleTap}>
      <img src={act.foto_url} alt={act.deporte_nombre}
        style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', display:'block' }} />
      {heartBurst && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <svg width="90" height="90" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1"
            style={{ animation:'heartBurst 0.7s ease-out', filter:'drop-shadow(0 2px 10px rgba(0,0,0,0.35))' }}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
        </div>
      )}
      <style>{`
        @keyframes heartBurst {
          0%   { opacity: 0; transform: scale(0.4); }
          25%  { opacity: 1; transform: scale(1.15); }
          40%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export function FeedCard({ act, user, onLightbox, onOpenProfile }) {
  const likeState = useLikeState(act.id);

  return (
    <div style={{ background:'var(--t-surface)', borderBottom:'1px solid var(--t-surface2)', marginBottom:8, borderRadius:0 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px 10px' }}>
        <div onClick={() => onOpenProfile?.(act)}
          style={{ width:36, height:36, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'1.5px solid rgba(var(--t-accent-r),0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:16, color:'var(--t-accent)', flexShrink:0, overflow:'hidden', cursor: onOpenProfile ? 'pointer' : 'default' }}>
          {act.foto_perfil_url
            ? <img src={act.foto_perfil_url} alt={act.nombre} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : act.nombre.charAt(0).toUpperCase()
          }
        </div>
        <div onClick={() => onOpenProfile?.(act)} style={{ flex:1, minWidth:0, cursor: onOpenProfile ? 'pointer' : 'default' }}>
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
        <FotoActividad act={act} onLightbox={onLightbox} likeState={likeState} />
      )}

      {/* Stats */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px 4px', flexWrap:'wrap' }}>
        {act.puntos != null && (
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:20, color:'var(--t-accent)', lineHeight:1 }}>
              {Math.round(parseFloat(act.puntos))}
            </span>
            <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>pts</span>
          </div>
        )}
        <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
          <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize: act.puntos != null ? 15 : 20, color: act.puntos != null ? 'var(--t-text)' : 'var(--t-accent)', lineHeight:1 }}>
            {Math.round(parseFloat(act.minutos))}
          </span>
          <span style={{ fontSize:11, color:'var(--t-muted2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>min</span>
        </div>
        {act.cantidad_companeros > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
            <span style={{ fontSize:12, lineHeight:1 }}>👥</span>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:12, color:'var(--t-muted2)', lineHeight:1 }}>
              {act.cantidad_companeros >= 3 ? '3+' : act.cantidad_companeros}
            </span>
          </div>
        )}
        <div style={{ marginLeft:'auto' }}>
          <span style={{ fontSize:12, color:'var(--t-muted2)' }}>
            {new Date(act.fecha + 'T12:00:00').toLocaleDateString('es', { weekday:'short', day:'numeric', month:'short' })}
          </span>
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
      <ComentariosSection actividadId={act.id} user={user} likeState={likeState} />
    </div>
  );
}
