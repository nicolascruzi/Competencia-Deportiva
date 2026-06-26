import { useEffect, useState } from 'react';
import { getDeportes, createActividad } from '../api/actividades';

export default function ActivityModal({ open, onClose, onCreated }) {
  const [deportes, setDeportes]   = useState([]);
  const [form, setForm]           = useState({ deporte_nombre: '', minutos: '', ponderador: '', fecha: '', notas: '' });
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    getDeportes().then(setDeportes).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(f => ({ ...f, fecha: today, notas: '' }));
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (deportes.length && !form.deporte_nombre) {
      const first = deportes[0];
      setForm(f => ({ ...f, deporte_nombre: first.nombre, ponderador: first.ponderador_default }));
    }
  }, [deportes]);

  function onDeporteChange(nombre) {
    const dep = deportes.find(d => d.nombre === nombre);
    setForm(f => ({ ...f, deporte_nombre: nombre, ponderador: dep?.ponderador_default ?? f.ponderador }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await createActividad({
        deporte_nombre: form.deporte_nombre,
        minutos:        parseFloat(form.minutos),
        ponderador:     parseFloat(form.ponderador),
        fecha:          form.fecha,
        notas:          form.notas || null,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(5,12,20,0.85)', backdropFilter: 'blur(4px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl border p-7 flex flex-col gap-5"
           style={{ background: '#132236', borderColor: '#243D57' }}>

        <div className="font-bold text-2xl uppercase tracking-wider"
             style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          Nueva actividad
        </div>

        {error && (
          <div className="rounded-lg px-4 py-2 text-sm" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Deporte">
            <Select value={form.deporte_nombre} onChange={e => onDeporteChange(e.target.value)}>
              {deportes.map(d => (
                <option key={d.id} value={d.nombre}>{d.icono} {d.nombre}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Minutos">
              <Input type="number" min="1" required placeholder="60"
                value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} />
            </Field>
            <Field label="Ponderador">
              <Input type="number" min="0.1" step="0.1" required
                value={form.ponderador} onChange={e => setForm(f => ({ ...f, ponderador: e.target.value }))} />
            </Field>
          </div>

          <Field label="Fecha">
            <Input type="date" required
              value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          </Field>

          <Field label="Notas (opcional)">
            <Input type="text" placeholder="Descripción breve…"
              value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </Field>

          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#243D57', color: '#7A9BBF' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wide transition-opacity"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: '#1A2E45', border: '1px solid #243D57',
  color: '#E8F0FE', padding: '9px 12px', borderRadius: '8px',
  fontSize: '14px', outline: 'none',
};

function Input(props) {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props}
      style={{ ...inputStyle, borderColor: focused ? '#38BDF8' : '#243D57' }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );
}

function Select({ children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select {...props}
      style={{ ...inputStyle, borderColor: focused ? '#38BDF8' : '#243D57', appearance: 'none', cursor: 'pointer' }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      {children}
    </select>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9BBF' }}>{label}</label>
      {children}
    </div>
  );
}
