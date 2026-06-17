import type { Section } from '../types';

interface Tab {
  id: Section;
  label: string;
  icon: JSX.Element;
}

const TABS: Tab[] = [
  {
    id: 'informe',
    label: 'Informe',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </svg>
    ),
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="4" height="16" rx="1" />
        <rect x="10" y="9" width="4" height="11" rx="1" />
        <rect x="17" y="14" width="4" height="6" rx="1" />
      </svg>
    ),
  },
  {
    id: 'armado',
    label: 'Armado',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M3 19a5 5 0 0 1 10 0" />
        <path d="M11 19a5 5 0 0 1 10 0" />
      </svg>
    ),
  },
  {
    id: 'contador',
    label: 'Contador',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect
          x="3" y="6" width="18" height="12" rx="2"
          fill="none" stroke="currentColor" strokeWidth="2"
        />
        <line
          x1="12" y1="6" x2="12" y2="18"
          stroke="currentColor" strokeWidth="2"
        />
        <text
          x="7.5" y="14.5" textAnchor="middle"
          fontSize="6" fontWeight="900" fill="currentColor"
        >
          88
        </text>
        <text
          x="16.5" y="14.5" textAnchor="middle"
          fontSize="6" fontWeight="900" fill="currentColor"
        >
          88
        </text>
      </svg>
    ),
  },
  {
    id: 'galeria',
    label: 'Galería',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 17l-5-5-9 9" />
      </svg>
    ),
  },
];

export function BottomNav({
  section,
  onChange,
}: {
  section: Section;
  onChange: (s: Section) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Secciones">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-current={section === t.id ? 'page' : undefined}
          className={`bottom-nav__tab${
            section === t.id ? ' bottom-nav__tab--active' : ''
          }`}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
