import { useEffect, useRef, useState } from 'react';
import { getDeportes, createActividad } from '../api/actividades';
import { uploadFoto } from '../api/fotos';

export default function ActivityModal({ open, onClose, onCreated }) {
  const [deportes, setDeportes] = useState([]);
  const [form, setForm]         = useState({ deporte_nombre: '', minutos: '', ponderador: '', fecha: '', notas: '' });
  const [foto, setFoto]         = useState(null);       // File object
  const [fotoPreview, setFotoPreview] = useState(null); // data URL para preview
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const fileInputRef            = useRef(null);

  useEffect(() => { getDeportes().then(setDeportes).catch(() => {}); }, []);

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10);
      setForm(f => ({ ...f, fecha: today, notas: '', minutos: '' }));
      setError('');
      setFoto(null);
      setFotoPreview(null);
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

  function handleFotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearFoto() {
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const actividad = await createActividad({
        deporte_nombre: form.deporte_nombre,
        minutos:        parseFloat(form.minutos),
        ponderador:     parseFloat(form.ponderador),
        fecha:          form.fecha,
        notas:          form.notas || null,
      });

      // Si hay foto, subirla a Cloudinary con el id recién creado
      if (foto && actividad.id) {
        await uploadFoto(actividad.id, foto).catch(() => {});
      }

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
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
         style={{ background: 'rgba(5,12,20,0.75)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="w-full rounded-t-3xl flex flex-col"
           style={{ background: '#132236', border: '1px solid #243D57', borderBottom: 'none', maxHeight: '92dvh', overflowY: 'auto' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#243D57' }} />
        </div>

        <div className="px-5 pb-2 pt-3 flex items-center justify-between">
          <div className="font-bold text-2xl uppercase tracking-wide"
               style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            Nueva actividad
          </div>
          <button onClick={onClose} className="text-xl px-2 py-1" style={{ color: '#7A9BBF' }}>✕</button>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl px-4 py-3 text-sm"
               style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 pb-6 flex flex-col gap-4"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

          <Field label="Deporte">
            <Select value={form.deporte_nombre} onChange={e => onDeporteChange(e.target.value)}>
              {deportes.map(d => (
                <option key={d.id} value={d.nombre}>{d.icono} {d.nombre}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Minutos">
              <Input type="number" inputMode="numeric" min="1" required placeholder="60"
                value={form.minutos} onChange={e => setForm(f => ({ ...f, minutos: e.target.value }))} />
            </Field>
            <Field label="Ponderador">
              <Input type="number" inputMode="decimal" min="0.1" step="0.1" required
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

          {/* Foto */}
          <Field label="Foto (opcional)">
            {fotoPreview ? (
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                <button type="button" onClick={clearFoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(5,12,20,0.75)', color: '#F87171', border: '1px solid rgba(248,113,113,0.4)' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed transition-colors"
                style={{ borderColor: '#243D57', color: '#7A9BBF', background: 'transparent' }}>
                <span className="text-3xl">📷</span>
                <span className="text-sm font-semibold">Seleccionar foto o tomar una</span>
                <span className="text-xs">Galería o cámara</span>
              </button>
            )}
            {/* Input oculto — capture="environment" abre cámara trasera en iPhone */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
          </Field>

          {/* Preview puntos */}
          {form.minutos && form.ponderador && (
            <div className="rounded-xl px-4 py-3 text-center"
                 style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <span className="text-sm" style={{ color: '#7A9BBF' }}>Puntos estimados: </span>
              <span className="font-bold text-lg" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8' }}>
                {Math.round(parseFloat(form.minutos || 0) * parseFloat(form.ponderador || 0))}
              </span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-wide transition-opacity mt-1"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", background: '#38BDF8', color: '#0D1B2A', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Guardando…' : 'Guardar actividad'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', background: '#1A2E45', border: '1px solid #243D57',
  color: '#E8F0FE', padding: '12px 14px', borderRadius: '12px',
  fontSize: '16px', outline: 'none',
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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7A9BBF' }}>{label}</label>
      {children}
    </div>
  );
}
