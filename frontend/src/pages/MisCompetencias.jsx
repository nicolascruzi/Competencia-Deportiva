import { useEffect, useState } from 'react';
import { getCompetencias } from '../api/competencias';
import CrearCompetenciaModal from '../components/CrearCompetenciaModal';
import UnirseCompetenciaModal from '../components/UnirseCompetenciaModal';

export default function MisCompetencias({ onSelect }) {
  const [competencias, setCompetencias] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [crearOpen, setCrearOpen]       = useState(false);
  const [unirseOpen, setUnirseOpen]     = useState(false);

  async function load() {
    setLoading(true);
    try { setCompetencias(await getCompetencias()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column' }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div style={{ padding:'24px 20px 20px', background:'linear-gradient(180deg, #0D1B2A 0%, #0A1520 100%)', borderBottom:'1px solid #1A2E45' }}>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'#38BDF8', marginBottom:6 }}>
          Portal
        </div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:'clamp(28px,8vw,42px)', textTransform:'uppercase', lineHeight:1, color:'#E8F0FE', marginBottom:4 }}>
          Mis competencias
        </div>
        <div style={{ fontSize:13, color:'#7A9BBF' }}>
          {competencias.length > 0 ? `${competencias.length} competencia${competencias.length>1?'s':''}` : 'Creá o unite a una competencia'}
        </div>

        {/* Botones de acción */}
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button
            onClick={() => setCrearOpen(true)}
            style={{ flex:1, padding:'14px 0', borderRadius:14, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.04em', background:'#38BDF8', color:'#0D1B2A', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(56,189,248,0.35)', WebkitTapHighlightColor:'transparent' }}
            onTouchStart={e => e.currentTarget.style.transform='scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>
            + Crear
          </button>
          <button
            onClick={() => setUnirseOpen(true)}
            style={{ flex:1, padding:'14px 0', borderRadius:14, fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', letterSpacing:'0.04em', background:'transparent', color:'#38BDF8', border:'1.5px solid #38BDF8', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}
            onTouchStart={e => e.currentTarget.style.transform='scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}>
            Unirse · PIN
          </button>
        </div>
      </div>

      {/* ── LISTA ───────────────────────────────────────────── */}
      <div style={{ padding:'16px 20px 40px', display:'flex', flexDirection:'column', gap:12 }}>
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, paddingTop:80, paddingBottom:80, color:'#7A9BBF', fontSize:14 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #243D57', borderTopColor:'#38BDF8', animation:'spin 0.7s linear infinite' }} />
            Cargando…
          </div>
        ) : competencias.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 16px', color:'#7A9BBF' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🏆</div>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:22, textTransform:'uppercase', color:'#E8F0FE', marginBottom:8 }}>
              Sin competencias
            </div>
            <div style={{ fontSize:14, lineHeight:1.6 }}>
              Creá una nueva o unite con un PIN compartido.
            </div>
          </div>
        ) : (
          competencias.map(c => (
            <button key={c.id}
              onClick={() => onSelect(c)}
              style={{ width:'100%', textAlign:'left', background:'#132236', border:'1px solid #243D57', borderRadius:18, padding:'16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', WebkitTapHighlightColor:'transparent', transition:'transform 0.1s, border-color 0.15s' }}
              onTouchStart={e => { e.currentTarget.style.transform='scale(0.97)'; e.currentTarget.style.borderColor='#38BDF8'; }}
              onTouchEnd={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.borderColor='#243D57'; }}>

              {/* Icono */}
              <div style={{ width:50, height:50, borderRadius:14, background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>
                🏆
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:20, textTransform:'uppercase', letterSpacing:'0.03em', color:'#E8F0FE', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>
                  {c.nombre}
                </div>
                <div style={{ fontSize:12, color:'#7A9BBF', marginTop:4, display:'flex', alignItems:'center', gap:8 }}>
                  <span>{c.participantes} participante{c.participantes !== 1 ? 's' : ''}</span>
                  <span style={{ color:'#243D57' }}>·</span>
                  <span>por {c.creador_nombre}</span>
                </div>
                {/* PIN */}
                <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:5, background:'rgba(56,189,248,0.06)', border:'1px solid rgba(56,189,248,0.15)', borderRadius:8, padding:'3px 8px' }}>
                  <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#7A9BBF' }}>PIN</span>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, fontSize:13, color:'#38BDF8', letterSpacing:'0.12em' }}>{c.pin}</span>
                </div>
              </div>

              {/* Flecha */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A7A9B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>

      <CrearCompetenciaModal open={crearOpen} onClose={() => setCrearOpen(false)} onCreated={load} />
      <UnirseCompetenciaModal open={unirseOpen} onClose={() => setUnirseOpen(false)} onJoined={load} />
    </div>
  );
}
