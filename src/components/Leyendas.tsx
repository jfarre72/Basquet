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

interface YearVitrina {
  year: number;
  totalMatches: number;
  byTournament: Record<Tournament, HofData>;
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSeasonData()
      .then((data) => {
        if (cancelled) return;
        setMatches(data.matches);
        setMatchPlayers(data.matchPlayers);
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

  const vitrinas: YearVitrina[] = useMemo(() => {
    return years.map((year) => {
      const seasonMatches = matches.filter(
        (m) => new Date(m.played_at).getUTCFullYear() === year,
      );
      const byTournament: Record<Tournament, HofData> = {
        completo: { hasData: false, matchCount: 0, awards: [] },
        apertura: { hasData: false, matchCount: 0, awards: [] },
        clausura: { hasData: false, matchCount: 0, awards: [] },
      };
      for (const t of TOURNAMENTS) {
        const stats = computeSeasonStats(
          year,
          matches,
          matchPlayers,
          t.key,
        );
        byTournament[t.key] = computeAwards(stats, year, matches, t.key);
      }
      return { year, totalMatches: seasonMatches.length, byTournament };
    });
  }, [years, matches, matchPlayers]);

  return (
    <div className="informe leyendas">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🏆 Leyendas</h2>
          <p className="section-head__subtitle">
            Vitrina del básquet de los martes.
          </p>
        </div>
      </div>

      {error && (
        <div className="warning-banner">
          No se pudo cargar la información: {error}
        </div>
      )}

      {loading ? (
        <div className="lb-loading">Cargando leyendas...</div>
      ) : vitrinas.length === 0 ? (
        <div className="lb-empty">
          Todavía no hay datos para mostrar.
        </div>
      ) : (
        <div className="vitrina">
          {vitrinas.map((v) => (
            <YearShowcase key={v.year} vitrina={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function YearShowcase({ vitrina }: { vitrina: YearVitrina }) {
  const { year, totalMatches, byTournament } = vitrina;
  return (
    <section className="vitrina-year">
      <header className="vitrina-year__head">
        <span className="vitrina-year__line" />
        <span className="vitrina-year__num">{year}</span>
        <span className="vitrina-year__line" />
      </header>
      <div className="vitrina-year__meta">
        {totalMatches} partidos jugados
      </div>
      <div className="vitrina-cards">
        {TOURNAMENTS.map((t) => (
          <HofCard
            key={t.key}
            tournament={t.key}
            label={t.label}
            data={byTournament[t.key]}
          />
        ))}
      </div>
    </section>
  );
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
      label: 'Más partidos',
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

  const topTriples = [...stats]
    .filter((s) => s.triples > 0)
    .sort(
      (a, b) => b.triples - a.triples || a.playerName.localeCompare(b.playerName),
    )[0];
  if (topTriples) {
    awards.push({
      label: 'Primero en triples',
      icon: '🎯',
      player: topTriples.playerName,
      primary: `${topTriples.triples}× 3pt`,
    });
  }

  const topDobles = [...stats]
    .filter((s) => s.dobles > 0)
    .sort(
      (a, b) => b.dobles - a.dobles || a.playerName.localeCompare(b.playerName),
    )[0];
  if (topDobles) {
    awards.push({
      label: 'Primero en dobles',
      icon: '🏀',
      player: topDobles.playerName,
      primary: `${topDobles.dobles}× 2pt`,
    });
  }

  return { hasData: true, matchCount, awards };
}

const HONOR_VARIANTS = ['gold', 'silver', 'bronze'] as const;

function HofCard({
  tournament,
  label,
  data,
}: {
  tournament: Tournament;
  label: string;
  data: HofData;
}) {
  return (
    <article className={`hof-card hof-card--${tournament}`}>
      <header className="hof-card__head">
        <span className="hof-card__crest" aria-hidden>
          🏆
        </span>
        <div className="hof-card__titles">
          <div className="hof-card__label">{label}</div>
          {data.hasData && (
            <div className="hof-card__matches">{data.matchCount} partidos</div>
          )}
        </div>
      </header>
      {!data.hasData ? (
        <div className="hof-card__empty">Sin partidos.</div>
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
