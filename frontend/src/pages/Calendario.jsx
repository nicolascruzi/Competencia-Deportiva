import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getActividades, deleteActividad } from '../api/actividades';
import { SPORT_ICONS } from '../lib/sportIcons';
import { DetallePanel, DaySheet } from '../components/DetalleDiaCalendario';

const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Calendario ───────────────────────────────────────────────────────────────

export default function Calendario() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { year, month } = cursor;

  function prevMonth() {
    setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 });
  }
  function nextMonth() {
    setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 });
  }

  const [acts, setActs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    getActividades().then(data => setActs((Array.isArray(data) ? data : []).filter(Boolean))).finally(() => setLoading(false));
  }, []);

  // Mapa fecha → actividades
  const byDate = {};
  acts.forEach(a => {
    const key = a.fecha.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });

  // Días del mes
  const firstDay  = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  function dayKey(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function handleDayClick(d) {
    if (!d) return;
    const key = dayKey(d);
    if (byDate[key]?.length) {
      setSelectedDate(new Date(year, month, d));
    }
  }

  function handleFotoUploaded(id, url) {
    setActs(prev => prev.map(a => a.id === id ? { ...a, foto_url: url } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url: url } : prev);
  }
  function handleFotoDeleted(id) {
    setActs(prev => prev.map(a => a.id === id ? { ...a, foto_url: null } : a));
    setDetalle(prev => prev?.id === id ? { ...prev, foto_url: null } : prev);
  }
  async function handleDelete(id) {
    await deleteActividad(id);
    setActs(prev => prev.filter(a => a.id !== id));
  }

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`
    : null;
  const selectedActs = selectedKey ? (byDate[selectedKey] || []) : [];

  return (
    <div style={{ paddingBottom:32 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Selector de mes */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px 10px' }}>
        <button onClick={prevMonth} aria-label="Mes anterior"
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:17, textTransform:'uppercase', color:'var(--t-text)' }}>
          {MONTHS_ES[month]} {year}
        </div>
        <button onClick={nextMonth} aria-label="Mes siguiente"
          style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Cabecera días de semana */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', padding:'0 12px', marginBottom:6 }}>
        {DAYS_ES.map(d => (
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)', padding:'4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de días */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0', color:'var(--t-muted)' }}>
          <div style={{ width:18, height:18, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, padding:'0 12px' }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} />;
            const key      = dayKey(d);
            const isToday  = key === todayKey;
            const hasActs  = !!byDate[key]?.length;
            const count    = byDate[key]?.length || 0;
            const isSel    = selectedKey === key;

            // Emojis del día
            const dayActs  = (byDate[key] || []).filter(Boolean);
            const dayCount = dayActs.length;
            const sportIcon = s => SPORT_ICONS[s] || '🏅';
            let emojiNode = null;
            if (dayCount === 1) {
              emojiNode = (
                <span style={{ fontSize: isSel ? 13 : 14, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                  {sportIcon(dayActs[0].deporte_nombre)}
                </span>
              );
            } else if (dayCount === 2) {
              emojiNode = (
                <div style={{ display:'flex', gap:1 }}>
                  {dayActs.slice(0,2).map((a, ei) => (
                    <span key={ei} style={{ fontSize:10, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                      {sportIcon(a.deporte_nombre)}
                    </span>
                  ))}
                </div>
              );
            } else if (dayCount >= 3) {
              // 3+ → deporte con más minutos + badge con el total
              const top = [...dayActs].sort((a,b) => parseFloat(b.minutos) - parseFloat(a.minutos))[0];
              emojiNode = (
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:13, lineHeight:1, filter: isSel ? 'brightness(0) invert(1)' : 'none', opacity: isSel ? 0.85 : 1 }}>
                    {sportIcon(top.deporte_nombre)}
                  </span>
                  <span style={{ position:'absolute', top:-3, right:-6, background: isSel ? 'rgba(255,255,255,0.9)' : 'var(--t-accent)', color: isSel ? 'var(--t-accent)' : 'var(--t-ground)', fontSize:8, fontWeight:800, borderRadius:6, padding:'1px 3px', lineHeight:1.2, fontFamily:"'Barlow Condensed', sans-serif" }}>
                    {dayCount}
                  </span>
                </div>
              );
            }

            return (
              <button key={key} onClick={() => handleDayClick(d)}
                style={{
                  position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  aspectRatio:'1', borderRadius:12, border:'none', cursor: hasActs ? 'pointer' : 'default',
                  background: isSel ? 'var(--t-accent)' : isToday ? 'rgba(var(--t-accent-r),0.12)' : 'transparent',
                  WebkitTapHighlightColor:'transparent', gap:1,
                }}>
                <span style={{
                  fontFamily:"'Barlow Condensed', sans-serif", fontWeight: isToday || isSel ? 900 : 600,
                  fontSize: hasActs ? 13 : 16, lineHeight:1,
                  color: isSel ? 'var(--t-ground)' : isToday ? 'var(--t-accent)' : hasActs ? 'var(--t-text)' : 'var(--t-muted)',
                }}>
                  {d}
                </span>
                {emojiNode}
              </button>
            );
          })}
        </div>
      )}


      {/* Bottom sheet con actividades del día */}
      {selectedDate && !detalle && createPortal(
        <DaySheet
          fecha={selectedDate}
          acts={selectedActs}
          onClose={() => setSelectedDate(null)}
          onSelectAct={a => setDetalle(a)}
        />,
        document.body
      )}

      {/* Detalle de actividad */}
      {detalle && createPortal(
        <DetallePanel
          actividad={detalle}
          onClose={() => setDetalle(null)}
          onDelete={handleDelete}
          onFotoUploaded={handleFotoUploaded}
          onFotoDeleted={handleFotoDeleted}
        />,
        document.body
      )}
    </div>
  );
}
