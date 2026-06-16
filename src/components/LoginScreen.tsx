import { useState } from 'react';
import { useAuth } from '../state/AuthContext';

export function LoginScreen() {
  const { signIn, error, configured } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    await signIn(password);
    setSubmitting(false);
  };

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="brand__ball" aria-hidden />
          <div>
            <div className="brand__name">
              Bas<span>quet</span>
            </div>
            <div className="stage-label">Acceso</div>
          </div>
        </div>

        <h1 className="section-title">Ingresá la contraseña</h1>
        <p className="section-subtitle">
          Acceso compartido. Una sola contraseña para todos los jugadores.
        </p>

        {!configured && (
          <div className="warning-banner">
            La app no está conectada a la base. Configurá{' '}
            <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>{' '}
            en Vercel.
          </div>
        )}

        <form className="login__form" onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="text"
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Contraseña"
            autoFocus
          />
          {error && <div className="login__error">{error}</div>}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!password || submitting || !configured}
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
