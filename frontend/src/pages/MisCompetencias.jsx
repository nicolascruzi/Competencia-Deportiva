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
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{ background: '#0D1B2A' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#38BDF8' }}>
          Portal
        </div>
        <div className="font-bold uppercase leading-none"
             style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 'clamp(26px,7vw,38px)' }}>
          Mis competencias
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setCrearOpen(true)}
            className="flex-1 py-3 rounded-2xl font-bold text-base uppercase tracking-wide"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A' }}>
            + Crear
          </button>
          <button
            onClick={() => setUnirseOpen(true)}
            className="flex-1 py-3 rounded-2xl font-bold text-base uppercase tracking-wide border"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", borderColor: '#38BDF8', color: '#38BDF8', background: 'transparent' }}>
            Unirse con PIN
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pb-6 flex flex-col gap-3 pt-4">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-sm" style={{ color: '#7A9BBF' }}>
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#243D57', borderTopColor: '#38BDF8' }} />
            Cargando…
          </div>
        ) : competencias.length === 0 ? (
          <div className="text-center py-24" style={{ color: '#7A9BBF' }}>
            <div className="text-5xl mb-4">🏆</div>
            <div className="font-bold text-xl uppercase mb-2" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
              Sin competencias
            </div>
            <div className="text-sm">Creá una nueva o unite con un PIN.</div>
          </div>
        ) : (
          competencias.map(c => (
            <button key={c.id}
              onClick={() => onSelect(c)}
              className="w-full rounded-2xl border p-4 text-left flex items-center gap-4 active:scale-[0.98] transition-transform"
              style={{ background: '#132236', borderColor: '#243D57' }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                   style={{ background: 'rgba(56,189,248,0.1)' }}>
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg uppercase leading-tight truncate"
                     style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#E8F0FE' }}>
                  {c.nombre}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#7A9BBF' }}>
                  {c.participantes} participante{c.participantes !== 1 ? 's' : ''} · Creada por {c.creador_nombre}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#243D57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))
        )}
      </div>

      <CrearCompetenciaModal open={crearOpen} onClose={() => setCrearOpen(false)} onCreated={load} />
      <UnirseCompetenciaModal open={unirseOpen} onClose={() => setUnirseOpen(false)} onJoined={load} />
    </div>
  );
}
