import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../api/auth';

export default function Login() {
  const { saveLogin } = useAuth();
  const [tab, setTab]     = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm]       = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ nombre: '', apellido: '', email: '', password: '' });

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
      const data = await register(registerForm.nombre, registerForm.apellido, registerForm.email, registerForm.password);
      saveLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      background: 'var(--t-ground)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <svg width="64" height="64" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="var(--t-accent)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)"/>
            <path d="M31 14l-10 16h9l-5 12 12-18h-9l3-10z" fill="var(--t-accent)"/>
          </svg>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--t-accent)', lineHeight: 1 }}>
            PURA RACHA
          </div>
          <div style={{ fontSize: 13, color: 'var(--t-muted)', letterSpacing: '0.03em' }}>
            Seguí tu racha deportiva
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--t-surface)',
          border: '1px solid var(--t-dim)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--t-surface2)', borderBottom: '1px solid var(--t-dim)' }}>
            {[{ id: 'login', label: 'Ingresar' }, { id: 'register', label: 'Registrarse' }].map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setError(''); }}
                style={{
                  padding: '14px 0',
                  border: 'none',
                  borderBottom: tab === t.id ? '2px solid var(--t-accent)' : '2px solid transparent',
                  background: tab === t.id ? 'var(--t-surface)' : 'transparent',
                  color: tab === t.id ? 'var(--t-accent)' : 'var(--t-muted)',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s, background 0.15s',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px 24px 28px' }}>
            {/* Error */}
            {error && (
              <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', fontSize: 13, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Field label="Email">
                  <input
                    type="email" required placeholder="tu@email.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Contraseña">
                  <input
                    type="password" required placeholder="••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  />
                </Field>
                <SubmitBtn loading={loading}>Entrar</SubmitBtn>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Nombre">
                    <input
                      type="text" required placeholder="Tu nombre"
                      value={registerForm.nombre}
                      onChange={e => setRegisterForm(f => ({ ...f, nombre: e.target.value }))}
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      type="text" placeholder="Apellido"
                      value={registerForm.apellido}
                      onChange={e => setRegisterForm(f => ({ ...f, apellido: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <input
                    type="email" required placeholder="tu@email.com"
                    value={registerForm.email}
                    onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Contraseña">
                  <input
                    type="password" required placeholder="Mínimo 6 caracteres" minLength={6}
                    value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                  />
                </Field>
                <SubmitBtn loading={loading}>Crear cuenta</SubmitBtn>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .auth-field input {
          width: 100%;
          box-sizing: border-box;
          background: var(--t-surface2);
          border: 1.5px solid var(--t-dim);
          color: var(--t-text);
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.15s;
          -webkit-appearance: none;
        }
        .auth-field input:focus {
          border-color: var(--t-accent);
        }
        .auth-field input::placeholder {
          color: var(--t-muted);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        color: 'var(--t-muted)',
      }}>
        {label}
      </label>
      <div className="auth-field">{children}</div>
    </div>
  );
}

function SubmitBtn({ children, loading }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '15px 0',
        borderRadius: 14,
        border: 'none',
        background: 'var(--t-accent)',
        color: 'var(--t-ground)',
        fontFamily: "'Barlow Condensed', sans-serif",
        fontWeight: 800,
        fontSize: 17,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        marginTop: 4,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? 'Cargando…' : children}
    </button>
  );
}
