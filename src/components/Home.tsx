import type { Section } from '../types';

interface RadialItem {
  id: Section;
  label: string;
  hint: string;
  icon: JSX.Element;
}

const ITEMS: RadialItem[] = [
  {
    id: 'leyendas',
    label: 'Leyendas',
    hint: 'Ranking histórico y récords',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4z" />
        <path d="M17 5h2a2 2 0 0 1 0 4h-2" />
        <path d="M7 5H5a2 2 0 0 0 0 4h2" />
      </svg>
    ),
  },
  {
    id: 'indicadores',
    label: 'Indicadores',
    hint: 'KPIs y métricas generales',
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
    id: 'contador',
    label: 'Contador',
    hint: 'Control y seguimiento de partidos',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2"
          fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
        <text x="7.5" y="14.5" textAnchor="middle" fontSize="6" fontWeight="900"
          fill="currentColor">88</text>
        <text x="16.5" y="14.5" textAnchor="middle" fontSize="6" fontWeight="900"
          fill="currentColor">88</text>
      </svg>
    ),
  },
  {
    id: 'galeria',
    label: 'Galería',
    hint: 'Fotos y recuerdos de la comunidad',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 17l-5-5-9 9" />
      </svg>
    ),
  },
  {
    id: 'jugadores',
    label: 'Jugadores',
    hint: 'Ficha y estadísticas de jugadores',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
  {
    id: 'jugadas',
    label: 'Jugadas',
    hint: 'Jugadas destacadas y análisis',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="9" cy="8" r="1.4" />
        <path d="M9 8l5 3-5 3" />
        <path d="M13 16h3" />
      </svg>
    ),
  },
  {
    id: 'informe',
    label: 'Informe',
    hint: 'Reportes y análisis de partidos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </svg>
    ),
  },
];

// Radio del menú radial, en % del contenedor (deja margen para que el nodo
// superior no se corte).
const RADIUS = 39;

export function Home({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const count = ITEMS.length;
  return (
    <div className="home">
      <div className="home__arena" aria-hidden>
        <span className="home__lights" />
        <div className="home__court">
          <svg className="home__court-lines" viewBox="0 0 400 260"
            preserveAspectRatio="none">
            <line x1="20" y1="0" x2="20" y2="256" />
            <line x1="380" y1="0" x2="380" y2="256" />
            <line x1="20" y1="256" x2="380" y2="256" />
            {/* Llave / pintura */}
            <path d="M160 150 H240 V256" />
            <ellipse cx="200" cy="150" rx="38" ry="38" />
            {/* Línea de tres */}
            <path d="M44 256 V196 A172 168 0 0 0 356 196 V256" />
            {/* Círculo central (al fondo) */}
            <ellipse cx="200" cy="6" rx="46" ry="46" />
          </svg>
        </div>
      </div>

      <div className="home__radial">
        <span className="home__ring" aria-hidden />

        {ITEMS.map((item, i) => {
          // Distribuir uniformemente alrededor de la pelota, empezando arriba.
          const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + RADIUS * Math.cos(angle);
          const y = 50 + RADIUS * Math.sin(angle);
          return (
            <button
              key={item.id}
              type="button"
              className="home-node"
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => onNavigate(item.id)}
              title={item.hint}
              aria-label={`${item.label} — ${item.hint}`}
            >
              <span className="home-node__icon">{item.icon}</span>
              <span className="home-node__label">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="home-ball"
          onClick={() => onNavigate('armado')}
          aria-label="Crear partido"
        >
          <span className="home-ball__glow" aria-hidden />
          <svg className="home-ball__seams" viewBox="0 0 100 100" aria-hidden>
            <line x1="50" y1="2" x2="50" y2="98" />
            <line x1="2" y1="50" x2="98" y2="50" />
            <path d="M30 5 Q1 50 30 95" />
            <path d="M70 5 Q99 50 70 95" />
          </svg>
          <span className="home-ball__text">
            <span>CREAR</span>
            <strong>PARTIDO</strong>
          </span>
          <svg className="home-ball__hoop" viewBox="0 0 100 70" aria-hidden>
            {/* Aro */}
            <ellipse className="hoop-rim" cx="50" cy="15" rx="30" ry="7" />
            {/* Red: malla horizontal */}
            <ellipse className="hoop-net" cx="50" cy="29" rx="25" ry="5" />
            <ellipse className="hoop-net" cx="50" cy="41" rx="19" ry="4" />
            <ellipse className="hoop-net" cx="50" cy="51" rx="14" ry="3" />
            <ellipse className="hoop-net" cx="50" cy="59" rx="9" ry="2.4" />
            {/* Red: hilos verticales */}
            <path className="hoop-net" d="M22 17 L41 60" />
            <path className="hoop-net" d="M31 18 L45 60" />
            <path className="hoop-net" d="M41 19 L48 60" />
            <path className="hoop-net" d="M50 19 L50 60" />
            <path className="hoop-net" d="M59 19 L52 60" />
            <path className="hoop-net" d="M69 18 L55 60" />
            <path className="hoop-net" d="M78 17 L59 60" />
          </svg>
        </button>
      </div>

      <p className="home__slogan">
        El básquet nos une. Los martes nos definen.
      </p>
    </div>
  );
}
