import { useAuth } from '../state/AuthContext';

export function Header() {
  const { signOut, configured } = useAuth();
  return (
    <header className="app__header">
      <div className="app__brand">
        <div className="brand__ball" aria-hidden />
        <div>
          <div className="brand__name">
            Bas<span>quet</span>
          </div>
          <div className="stage-label">Martes</div>
        </div>
      </div>
      <div className="app__header-actions">
        {configured && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => signOut()}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="M10 17l-5-5 5-5" />
              <path d="M5 12h12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
