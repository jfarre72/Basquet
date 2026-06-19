import { useEffect, useMemo, useState } from 'react';
import {
  fetchSeasonData,
  type DbMatch,
  type DbMatchPlayer,
} from '../lib/queries';
import {
  computeSeasonStats,
  listAvailableYears,
  type PlayerSeasonStat,
  type Tournament,
} from '../utils/seasonStats';

interface Award {
  label: string;
  icon: string;
  player: string;
  primary: string;
  secondary?: string;
}

interface HofData {
  hasData: boolean;
  matchCount: number;
  awards: Award[];
}

const TOURNAMENTS: { key: Tournament; label: string }[] = [
  { key: 'completo', label: 'Anual' },
  { key: 'apertura', label: 'Apertura' },
  { key: 'clausura', label: 'Clausura' },
];

export function Leyendas() {
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSeasonData()
      .then((data) => {
        if (cancelled) return;
        setMatches(data.matches);
        setMatchPlayers(data.matchPlayers);
        const years = listAvailableYears(data.matches);
        const currentYear = new Date().getFullYear();
        setYear(years.includes(currentYear) ? currentYear : (years[0] ?? null));
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(() => listAvailableYears(matches), [matches]);

  const hofByTournament = useMemo(() => {
    if (year == null) return null;
    const out: Record<Tournament, HofData> = {
      completo: emptyHof(),
      apertura: emptyHof(),
      clausura: emptyHof(),
    };
    for (const t of TOURNAMENTS) {
      const stats = computeSeasonStats(year, matches, matchPlayers, t.key);
      out[t.key] = computeAwards(stats, year, matches, t.key);
    }
    return out;
  }, [year, matches, matchPlayers]);

  return (
    <div className="informe leyendas">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🏆 Leyendas</h2>
          <p className="section-head__subtitle">
            Hall of Fame del básquet de los martes.
          </p>
        </div>
      </div>

      {years.length > 0 && (
        <div className="filters">
          <div className="pill-group" role="tablist" aria-label="Año">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={y === year}
                className={`pill${y === year ? ' pill--active' : ''}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="warning-banner">
          No se pudo cargar la información: {error}
        </div>
      )}

      {loading ? (
        <div className="lb-loading">Cargando leyendas...</div>
      ) : year == null || !hofByTournament ? (
        <div className="lb-empty">
          Todavía no hay datos para mostrar.
        </div>
      ) : (
        <>
          <HofCard
            tournament="completo"
            label="Anual"
            year={year}
            data={hofByTournament.completo}
            featured
          />
          <div className="hof-grid-two">
            <HofCard
              tournament="apertura"
              label="Apertura"
              year={year}
              data={hofByTournament.apertura}
            />
            <HofCard
              tournament="clausura"
              label="Clausura"
              year={year}
              data={hofByTournament.clausura}
            />
          </div>
        </>
      )}
    </div>
  );
}

function emptyHof(): HofData {
  return { hasData: false, matchCount: 0, awards: [] };
}

function computeAwards(
  stats: PlayerSeasonStat[],
  year: number,
  matches: DbMatch[],
  tournament: Tournament,
): HofData {
  const seasonMatches = matches.filter((m) => {
    const d = new Date(m.played_at);
    if (d.getUTCFullYear() !== year) return false;
    const month = d.getUTCMonth();
    if (tournament === 'apertura') return month >= 0 && month <= 5;
    if (tournament === 'clausura') return month >= 6 && month <= 11;
    return true;
  });
  const matchCount = seasonMatches.length;
  if (matchCount === 0 || stats.length === 0) {
    return { hasData: false, matchCount, awards: [] };
  }

  const champion = [...stats].sort(
    (a, b) => b.puntaje - a.puntaje || a.playerName.localeCompare(b.playerName),
  )[0];
  const mostPlayed = [...stats].sort(
    (a, b) => b.PJ - a.PJ || a.playerName.localeCompare(b.playerName),
  )[0];
  const topScorer = [...stats]
    .filter((s) => s.puntos > 0 || s.dobles > 0 || s.triples > 0)
    .sort(
      (a, b) => b.puntos - a.puntos || a.playerName.localeCompare(b.playerName),
    )[0];

  const awards: Award[] = [
    {
      label: 'Campeón',
      icon: '👑',
      player: champion.playerName,
      primary: `${champion.puntaje} pts`,
      secondary: `${champion.PG}G · ${champion.PE}E · ${champion.PP}P`,
    },
    {
      label: 'Más partidos jugados',
      icon: '📅',
      player: mostPlayed.playerName,
      primary: `${mostPlayed.PJ} PJ`,
      secondary: `${Math.round(mostPlayed.presentismo * 100)}% presentismo`,
    },
  ];
  if (topScorer) {
    awards.push({
      label: 'Top goleador',
      icon: '🎯',
      player: topScorer.playerName,
      primary: `${topScorer.puntos} pts`,
      secondary: `${topScorer.dobles}× 2pt · ${topScorer.triples}× 3pt`,
    });
  }

  return { hasData: true, matchCount, awards };
}

const HONOR_VARIANTS = ['gold', 'silver', 'bronze'] as const;

function HofCard({
  tournament,
  label,
  year,
  data,
  featured,
}: {
  tournament: Tournament;
  label: string;
  year: number;
  data: HofData;
  featured?: boolean;
}) {
  return (
    <article
      className={`hof-card hof-card--${tournament}${
        featured ? ' hof-card--featured' : ''
      }`}
    >
      <header className="hof-card__head">
        <span className="hof-card__crest" aria-hidden>
          🏆
        </span>
        <div className="hof-card__titles">
          <div className="hof-card__label">{label}</div>
          <div className="hof-card__year">{year}</div>
        </div>
        {data.hasData && (
          <span className="hof-card__matches">{data.matchCount} partidos</span>
        )}
      </header>
      {!data.hasData ? (
        <div className="hof-card__empty">Sin partidos en este torneo.</div>
      ) : (
        <div className="hof-honorees">
          {data.awards.map((a, idx) => (
            <div
              key={a.label}
              className={`hof-honoree hof-honoree--${HONOR_VARIANTS[idx] ?? 'bronze'}`}
            >
              <span className="hof-honoree__icon">{a.icon}</span>
              <div className="hof-honoree__main">
                <span className="hof-honoree__label">{a.label}</span>
                <span className="hof-honoree__name">{a.player}</span>
                {a.secondary && (
                  <span className="hof-honoree__sub">{a.secondary}</span>
                )}
              </div>
              <span className="hof-honoree__stat">{a.primary}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
