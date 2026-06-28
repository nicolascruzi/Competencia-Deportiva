import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../api/auth';

export default function Login() {
  const { saveLogin } = useAuth();
  const [tab, setTab]     = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm]       = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ nombre: '', email: '', password: '' });

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(loginForm.email, loginForm.password);
      saveLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await register(registerForm.nombre, registerForm.email, registerForm.password);
      saveLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--t-ground)' }}>
      <div style={{ width: '100%', maxWidth: 360, borderRadius: 20, border: '1px solid var(--t-dim)', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--t-surface)' }}>

        {/* Logo visual */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="27" stroke="var(--t-accent)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
            <path d="M31 14l-10 16h9l-5 12 12-18h-9l3-10z" fill="var(--t-accent)"/>
          </svg>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--t-accent)', lineHeight: 1 }}>
            PURA RACHA
          </div>
          <div style={{ fontSize: 12, color: 'var(--t-muted)', letterSpacing: '0.02em' }}>
            Seguí tu racha
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 rounded-lg p-1 gap-1" style={{ background: 'var(--t-surface2)' }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(''); }}
              className="py-2 rounded-md text-sm font-semibold transition-all"
              style={{
                background: tab === t ? 'var(--t-dim)' : 'transparent',
                color: tab === t ? 'var(--t-text)' : 'var(--t-muted)',
              }}>
              {t === 'login' ? 'Ingresar' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg px-4 py-2 text-sm" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171' }}>
            {error}
          </div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Field label="Email">
              <input type="email" required placeholder="tu@email.com"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Contraseña">
              <input type="password" required placeholder="••••••"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
            <SubmitBtn loading={loading}>Entrar</SubmitBtn>
          </form>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Field label="Nombre">
              <input type="text" required placeholder="Tu nombre"
                value={registerForm.nombre}
                onChange={e => setRegisterForm(f => ({ ...f, nombre: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input type="email" required placeholder="tu@email.com"
                value={registerForm.email}
                onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Contraseña">
              <input type="password" required placeholder="Mínimo 6 caracteres" minLength={6}
                value={registerForm.password}
                onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
            <SubmitBtn loading={loading}>Crear cuenta</SubmitBtn>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t-muted)' }}>{label}</label>
      <div style={{ all: 'unset', display: 'contents' }}>
        {/* clone input with styles */}
        {children && (
          <StyledInput>{children}</StyledInput>
        )}
      </div>
    </div>
  );
}

function StyledInput({ children }) {
  return (
    <div style={{ display: 'contents' }}>
      {/* Apply styles to the child input via CSS injection trick */}
      <style>{`
        .auth-input-wrap input {
          width: 100%;
          background: var(--t-surface2);
          border: 1px solid var(--t-dim);
          color: var(--t-text);
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s;
        }
        .auth-input-wrap input:focus { border-color: var(--t-accent); }
        .auth-input-wrap input::placeholder { color: var(--t-muted); }
      `}</style>
      <div className="auth-input-wrap">{children}</div>
    </div>
  );
}

function SubmitBtn({ children, loading }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full rounded-lg font-bold uppercase tracking-wider transition-opacity mt-1"
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        background: 'var(--t-accent)', color: 'var(--t-ground)',
        opacity: loading ? 0.7 : 1,
        padding: '14px 0',
        fontSize: 16,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
      }}>
      {loading ? 'Cargando…' : children}
    </button>
  );
}
