import { useState } from 'react';
import type { FormEvent } from 'react';
import { authErrorMessage, resetPassword, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../cloud/auth';

type Mode = 'login' | 'signup' | 'reset';

/** Diálogo para entrar o crear una cuenta (Google o email y contraseña). */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, closeAfter = true) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
      if (closeAfter) onClose();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'reset') {
      void run(async () => {
        await resetPassword(email);
        setInfo('Te mandamos un email para elegir una contraseña nueva. Revisá también el correo no deseado.');
      }, false);
    } else if (mode === 'signup') {
      if (password !== password2) {
        setError('Las contraseñas no coinciden.');
        return;
      }
      void run(() => signUpWithEmail(email, password));
    } else {
      void run(() => signInWithEmail(email, password));
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <h2 id="auth-title">
          {mode === 'signup' ? 'Crear una cuenta' : mode === 'reset' ? 'Recuperar contraseña' : 'Entrar'}
        </h2>
        <p className="muted small">
          Con una cuenta tus planteles, ejercicios y sesiones se guardan en la nube y los ves en cualquier dispositivo.
        </p>

        {mode !== 'reset' && (
          <>
            <button className="google-button" onClick={() => run(signInWithGoogle)} disabled={busy}>
              <GoogleLogo /> Continuar con Google
            </button>
            <div className="divider">
              <span>o con tu email</span>
            </div>
          </>
        )}

        <form onSubmit={submit} className="stack">
          <label className="field">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {mode !== 'reset' && (
            <label className="field">
              Contraseña
              <input
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
          )}
          {mode === 'signup' && (
            <label className="field">
              Repetí la contraseña
              <input
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                minLength={6}
                required
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {info && <p className="form-info">{info}</p>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar email' : 'Entrar'}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <>
              <button className="link" onClick={() => switchMode('reset')}>
                ¿Olvidaste tu contraseña?
              </button>
              <button className="link" onClick={() => switchMode('signup')}>
                No tengo cuenta: crear una
              </button>
            </>
          )}
          {mode !== 'login' && (
            <button className="link" onClick={() => switchMode('login')}>
              Ya tengo cuenta: entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
