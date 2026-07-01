import { useEffect, useState } from 'react';
import {
  getAdminStats, getAdminUsers, updateAdminUser, deleteAdminUser,
  getAdminCompetencias, deleteAdminCompetencia,
  getAdminActividades, deleteAdminActividad,
  getAdminDeportes, updateAdminDeporte, deleteAdminDeporte,
} from '../api/admin';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return Number(n).toLocaleString('es'); }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es', { day:'numeric', month:'short', year:'2-digit' });
}

// ─── componentes compartidos ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:64 }}>
      <div style={{ width:20, height:20, border:'2px solid var(--t-dim)', borderTopColor:'var(--t-accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  );
}

function ConfirmBtn({ label, onConfirm, danger = true }) {
  const [step, setStep] = useState(0);
  if (step === 0) return (
    <button onClick={() => setStep(1)}
      style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${danger ? 'rgba(248,113,113,0.4)' : 'var(--t-dim)'}`, background:'transparent', color: danger ? '#F87171' : 'var(--t-muted)', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
      {label}
    </button>
  );
  return (
    <button onClick={() => { setStep(0); onConfirm(); }}
      style={{ padding:'4px 10px', borderRadius:6, border:'1px solid #F87171', background:'rgba(248,113,113,0.15)', color:'#F87171', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>
      ¿Seguro?
    </button>
  );
}

function SectionHeader({ title, count, onRefresh, loading }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 16px 10px' }}>
      <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:22, textTransform:'uppercase', letterSpacing:'0.04em', color:'var(--t-text)', flex:1 }}>
        {title}
      </span>
      {count != null && (
        <span style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:12, color:'var(--t-muted)', fontWeight:600 }}>{fmt(count)}</span>
      )}
      <button onClick={onRefresh} disabled={loading}
        style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loading ? 'none' : undefined, animation: loading ? 'spin 0.7s linear infinite' : 'none' }}>
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>
  );
}

// ─── Stats banner ─────────────────────────────────────────────────────────────

function StatsBanner({ stats }) {
  if (!stats) return null;
  const items = [
    { label:'Usuarios',     val: fmt(stats.usuarios) },
    { label:'Competencias', val: fmt(stats.competencias) },
    { label:'Actividades',  val: fmt(stats.actividades) },
    { label:'Horas',        val: fmt(Math.round(stats.minutos / 60)) },
  ];
  return (
    <div style={{ display:'flex', gap:0, margin:'0 16px 12px', background:'var(--t-surface)', border:'1px solid var(--t-dim)', borderRadius:14, overflow:'hidden' }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ flex:1, padding:'10px 6px', textAlign:'center', borderRight: i < items.length - 1 ? '1px solid var(--t-dim)' : 'none' }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, color:'var(--t-accent)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{it.val}</div>
          <div style={{ fontSize:9, color:'var(--t-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────

function TabUsuarios() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id, nombre, apodo, role }

  function load() {
    setLoading(true);
    getAdminUsers().then(setUsers).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id) {
    await deleteAdminUser(id);
    setUsers(u => u.filter(x => x.id !== id));
  }

  async function handleSave() {
    if (!editing) return;
    const updated = await updateAdminUser(editing.id, {
      nombre: editing.nombre || undefined,
      apodo:  editing.apodo  || undefined,
      role:   editing.role   || undefined,
    });
    setUsers(u => u.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    setEditing(null);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
      <SectionHeader title="Usuarios" count={users.length} onRefresh={load} loading={loading} />
      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {users.map((u, i) => (
            <div key={u.id} style={{ padding:'10px 16px', borderTop: i > 0 ? '1px solid var(--t-surface2)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
              {/* Avatar inicial */}
              <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.12)', border:'1.5px solid rgba(var(--t-accent-r),0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:15, color:'var(--t-accent)' }}>
                  {u.nombre_display?.charAt(0).toUpperCase()}
                </span>
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, color:'var(--t-text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1 }}>
                  {u.nombre_display}
                  {u.role === 'admin' && <span style={{ marginLeft:6, fontSize:9, fontWeight:800, letterSpacing:'0.06em', color:'var(--t-accent)', border:'1px solid var(--t-accent)', padding:'1px 5px', borderRadius:4 }}>ADMIN</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.email}</div>
                <div style={{ fontSize:10, color:'var(--t-dim2)', marginTop:1 }}>
                  {u.actividades} acts · {u.competencias} comp · {fmtDate(u.created_at)}
                </div>
              </div>
              {/* Acciones */}
              <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0, alignItems:'flex-end' }}>
                <button onClick={() => setEditing({ id:u.id, nombre:u.nombre, apodo:u.apodo||'', role:u.role })}
                  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:11, cursor:'pointer' }}>
                  Editar
                </button>
                <ConfirmBtn label="Eliminar" onConfirm={() => handleDelete(u.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal edición */}
      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.5)' }} />
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(env(safe-area-inset-bottom) + 24px)', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', marginBottom:4 }}>Editar usuario</div>
            {[
              { label:'Nombre', key:'nombre' },
              { label:'Apodo',  key:'apodo' },
            ].map(f => (
              <div key={f.key} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>{f.label}</label>
                <input value={editing[f.key] || ''} onChange={e => setEditing(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:10, fontSize:15, outline:'none', boxSizing:'border-box', width:'100%' }} />
              </div>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Rol</label>
              <select value={editing.role || 'user'} onChange={e => setEditing(prev => ({ ...prev, role: e.target.value }))}
                style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:10, fontSize:15, outline:'none', appearance:'none' }}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => setEditing(null)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab: Competencias ────────────────────────────────────────────────────────

function CompRow({ c, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop:'1px solid var(--t-surface2)' }}>
      {/* Fila principal */}
      <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
        {/* Icono trofeo */}
        <div style={{ width:34, height:34, borderRadius:10, background:'rgba(var(--t-accent-r),0.10)', border:'1px solid rgba(var(--t-accent-r),0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 000 5H6"/><path d="M18 9h1.5a2.5 2.5 0 010 5H18"/>
            <path d="M8 9h8"/><path d="M8 15h8"/>
          </svg>
        </div>
        {/* Info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, color:'var(--t-text)', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {c.nombre}
          </div>
          <div style={{ fontSize:11, color:'var(--t-muted)', marginTop:2 }}>
            por <strong>{c.creador_display}</strong>
          </div>
          <div style={{ fontSize:10, color:'var(--t-dim2)', marginTop:1, display:'flex', gap:6, alignItems:'center' }}>
            <button onClick={() => setOpen(o => !o)} style={{ display:'flex', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--t-muted)', fontSize:10 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: open ? 'rotate(90deg)' : 'none', transition:'transform 0.18s' }}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              {c.participantes} jugadores
            </button>
            <span>·</span>
            <span style={{ fontFamily:"'JetBrains Mono', monospace", color:'var(--t-accent)', fontWeight:600 }}>PIN {c.pin}</span>
            <span>·</span>
            <span>{new Date(c.created_at).toLocaleDateString('es',{day:'numeric',month:'short',year:'2-digit'})}</span>
          </div>
        </div>
        <ConfirmBtn label="Eliminar" onConfirm={() => onDelete(c.id)} />
      </div>

      {/* Lista de participantes expandida */}
      {open && (
        <div style={{ margin:'0 16px 10px', background:'var(--t-surface)', borderRadius:12, border:'1px solid var(--t-dim)', overflow:'hidden' }}>
          {(!c.jugadores || c.jugadores.length === 0) ? (
            <div style={{ padding:'12px 14px', fontSize:12, color:'var(--t-muted)' }}>Sin participantes aún</div>
          ) : c.jugadores.map((j, idx) => (
            <div key={j.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderTop: idx > 0 ? '1px solid var(--t-surface2)' : 'none' }}>
              {/* Avatar */}
              <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(var(--t-accent-r),0.10)', border:'1px solid rgba(var(--t-accent-r),0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {j.foto_perfil_url
                  ? <img src={j.foto_perfil_url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
                  : <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:800, fontSize:12, color:'var(--t-accent)' }}>{j.nombre_display?.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:13, color:'var(--t-text)', lineHeight:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {j.nombre_display}
                </div>
                <div style={{ fontSize:10, color:'var(--t-muted)', marginTop:1 }}>
                  {j.actividades} acts · {Math.round(j.minutos)} min
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabCompetencias() {
  const [comps, setComps]     = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    getAdminCompetencias().then(setComps).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id) {
    await deleteAdminCompetencia(id);
    setComps(c => c.filter(x => x.id !== id));
  }

  return (
    <div>
      <SectionHeader title="Competencias" count={comps.length} onRefresh={load} loading={loading} />
      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {comps.map(c => <CompRow key={c.id} c={c} onDelete={handleDelete} />)}
          {comps.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', color:'var(--t-muted)', fontSize:13 }}>Sin competencias</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Actividades ─────────────────────────────────────────────────────────

function TabActividades() {
  const [acts, setActs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  function load() {
    setLoading(true);
    getAdminActividades().then(setActs).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id) {
    await deleteAdminActividad(id);
    setActs(a => a.filter(x => x.id !== id));
  }

  const filtered = search.trim()
    ? acts.filter(a => a.nombre_display?.toLowerCase().includes(search.toLowerCase()) || a.deporte_nombre?.toLowerCase().includes(search.toLowerCase()))
    : acts;

  return (
    <div>
      <SectionHeader title="Actividades" count={acts.length} onRefresh={load} loading={loading} />
      {/* Buscador */}
      <div style={{ padding:'0 16px 10px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por usuario o deporte…"
          style={{ width:'100%', boxSizing:'border-box', background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:10, fontSize:14, outline:'none' }}
        />
      </div>
      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {filtered.map((a, i) => (
            <div key={a.id} style={{ padding:'8px 16px', borderTop: i > 0 ? '1px solid var(--t-surface2)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:14, color:'var(--t-text)' }}>{a.nombre_display}</span>
                  <span style={{ fontSize:11, color:'var(--t-muted)' }}>·</span>
                  <span style={{ fontSize:12, color:'var(--t-muted)' }}>{a.deporte_nombre}</span>
                </div>
                <div style={{ fontSize:10, color:'var(--t-dim2)', marginTop:2, display:'flex', gap:8 }}>
                  <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, color:'var(--t-accent)' }}>{Math.round(a.minutos)} min</span>
                  <span>·</span>
                  <span>×{parseFloat(a.ponderador).toFixed(1)}</span>
                  <span>·</span>
                  <span>{fmtDate(a.fecha)}</span>
                </div>
              </div>
              <ConfirmBtn label="Eliminar" onConfirm={() => handleDelete(a.id)} />
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 24px', color:'var(--t-muted)', fontSize:13 }}>Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Deportes ────────────────────────────────────────────────────────────

function TabDeportes() {
  const [deps, setDeps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  function load() {
    setLoading(true);
    getAdminDeportes().then(setDeps).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleDelete(id) {
    await deleteAdminDeporte(id);
    setDeps(d => d.filter(x => x.id !== id));
  }

  async function handleSave() {
    if (!editing) return;
    const updated = await updateAdminDeporte(editing.id, {
      nombre:            editing.nombre,
      icono:             editing.icono,
      ponderador_default: parseFloat(editing.ponderador_default),
    });
    setDeps(d => d.map(x => x.id === updated.id ? { ...x, ...updated } : x));
    setEditing(null);
  }

  return (
    <div>
      <SectionHeader title="Deportes" count={deps.length} onRefresh={load} loading={loading} />
      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
          {deps.map((d, i) => (
            <div key={d.id} style={{ padding:'10px 16px', borderTop: i > 0 ? '1px solid var(--t-surface2)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:22, flexShrink:0, width:32, textAlign:'center' }}>{d.icono}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, color:'var(--t-text)', lineHeight:1 }}>{d.nombre}</div>
                <div style={{ fontSize:10, color:'var(--t-dim2)', marginTop:2 }}>
                  Pond. default: <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:600, color:'var(--t-accent)' }}>×{parseFloat(d.ponderador_default).toFixed(1)}</span>
                  <span style={{ marginLeft:8 }}>{fmt(d.usos)} usos</span>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                <button onClick={() => setEditing({ id:d.id, nombre:d.nombre, icono:d.icono, ponderador_default:d.ponderador_default })}
                  style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontSize:11, cursor:'pointer' }}>
                  Editar
                </button>
                <ConfirmBtn label="Eliminar" onConfirm={() => handleDelete(d.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <>
          <div onClick={() => setEditing(null)} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.5)' }} />
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, background:'var(--t-surface)', borderRadius:'20px 20px 0 0', padding:'20px 20px calc(env(safe-area-inset-bottom) + 24px)', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:20, textTransform:'uppercase', color:'var(--t-text)', marginBottom:4 }}>Editar deporte</div>
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Emoji</label>
                <input value={editing.icono} onChange={e => setEditing(p => ({ ...p, icono: e.target.value }))} maxLength={4}
                  style={{ width:54, textAlign:'center', fontSize:22, background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 6px', borderRadius:10, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Nombre</label>
                <input value={editing.nombre} onChange={e => setEditing(p => ({ ...p, nombre: e.target.value }))}
                  style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-text)', padding:'9px 12px', borderRadius:10, fontSize:15, outline:'none', boxSizing:'border-box', width:'100%' }} />
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--t-muted)' }}>Ponderador default</label>
              <input type="number" inputMode="decimal" step="0.1" min="0.1"
                value={editing.ponderador_default}
                onChange={e => setEditing(p => ({ ...p, ponderador_default: e.target.value }))}
                style={{ background:'var(--t-surface2)', border:'1px solid var(--t-dim)', color:'var(--t-accent)', padding:'9px 12px', borderRadius:10, fontSize:15, outline:'none', fontFamily:"'JetBrains Mono', monospace", fontWeight:700, boxSizing:'border-box', width:'100%' }} />
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={() => setEditing(null)}
                style={{ flex:1, padding:'12px', borderRadius:12, border:'1px solid var(--t-dim)', background:'transparent', color:'var(--t-muted)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSave}
                style={{ flex:2, padding:'12px', borderRadius:12, border:'none', background:'var(--t-accent)', color:'var(--t-ground)', fontFamily:"'Barlow Condensed', sans-serif", fontWeight:700, fontSize:15, textTransform:'uppercase', cursor:'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── AdminPanel principal ─────────────────────────────────────────────────────

const TAB_LABELS = {
  usuarios: 'Usuarios', competencias: 'Competencias',
  actividades: 'Actividades', deportes: 'Deportes',
};

export default function AdminPanel({ tab = 'usuarios' }) {
  const [stats, setStats] = useState(null);

  useEffect(() => { getAdminStats().then(setStats).catch(() => {}); }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding:'18px 16px 8px', background:'var(--t-ground)', borderBottom:'1px solid var(--t-surface2)', flexShrink:0 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--t-accent)', marginBottom:3 }}>Superadmin</div>
        <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontWeight:900, fontSize:26, textTransform:'uppercase', lineHeight:1, color:'var(--t-text)' }}>
          {TAB_LABELS[tab] ?? 'Panel'}
        </div>
      </div>

      {/* Stats — solo en usuarios */}
      {tab === 'usuarios' && (
        <div style={{ padding:'12px 0 4px', background:'var(--t-ground)', flexShrink:0 }}>
          <StatsBanner stats={stats} />
        </div>
      )}

      {/* Contenido scrollable */}
      <div style={{ flex:1, overflowY:'auto', background:'var(--t-ground)' }}>
        {tab === 'usuarios'     && <TabUsuarios />}
        {tab === 'competencias' && <TabCompetencias />}
        {tab === 'actividades'  && <TabActividades />}
        {tab === 'deportes'     && <TabDeportes />}
      </div>
    </div>
  );
}
