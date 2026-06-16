import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonData, type DbMatch, type DbMatchPlayer } from '../lib/queries';
import {
  computeSeasonStats,
  getMatchYear,
  listAvailableYears,
  sortSeasonStats,
  type SortKey,
} from '../utils/seasonStats';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'puntaje', label: 'Puntaje' },
  { key: 'pj', label: 'PJ' },
  { key: 'pg', label: 'PG' },
  { key: 'presentismo', label: '% Presentismo' },
  { key: 'puntos', label: 'Puntos' },
  { key: 'ptosPorPJ', label: 'Pts / PJ' },
];

export function Informe() {
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('puntaje');

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

  const stats = useMemo(() => {
    if (year == null) return [];
    return sortSeasonStats(
      computeSeasonStats(year, matches, matchPlayers),
      sort,
    );
  }, [year, matches, matchPlayers, sort]);

  const totals = useMemo(() => {
    if (year == null) return { TP: 0, jugadores: 0, puntos: 0 };
    const seasonMatches = matches.filter((m) => getMatchYear(m) === year);
    const seasonMpIds = new Set(seasonMatches.map((m) => m.id));
    const seasonMps = matchPlayers.filter((mp) => seasonMpIds.has(mp.match_id));
    const puntos = seasonMps.reduce((sum, mp) => sum + (mp.points ?? 0), 0);
    const jugadores = new Set(seasonMps.map((mp) => mp.player_id)).size;
    return { TP: seasonMatches.length, jugadores, puntos };
  }, [year, matches, matchPlayers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Informe</h2>
          <p className="section-head__subtitle">
            Estadísticas por jugador. Martes de básquet.
          </p>
        </div>
        {years.length > 0 && (
          <div className="year-select" role="tablist" aria-label="Año">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={y === year}
                className={`year-select__btn${
                  y === year ? ' year-select__btn--active' : ''
                }`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="warning-banner">
          No se pudo cargar la información: {error}
        </div>
      )}

      {loading ? (
        <div className="lb-loading">Cargando estadísticas...</div>
      ) : year == null ? (
        <div className="lb-empty">
          Todavía no hay partidos cargados en la base.
        </div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span className="kpi__label">Partidos</span>
              <span className="kpi__value">{totals.TP}</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Jugadores</span>
              <span className="kpi__value">{totals.jugadores}</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Puntos</span>
              <span className="kpi__value kpi__value--accent">
                {totals.puntos}
              </span>
            </div>
          </div>

          <div className="sort-bar" role="tablist" aria-label="Ordenar por">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={sort === opt.key}
                className={`sort-pill${
                  sort === opt.key ? ' sort-pill--active' : ''
                }`}
                onClick={() => setSort(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {stats.length === 0 ? (
            <div className="lb-empty">Sin datos para {year}.</div>
          ) : (
            <div className="leaderboard">
              {stats.map((s, idx) => (
                <article
                  key={s.playerId}
                  className={`lb-row${idx === 0 ? ' lb-row--top' : ''}`}
                >
                  <header className="lb-row__head">
                    <span className="lb-row__pos">{idx + 1}</span>
                    <span className="lb-row__name">{s.playerName}</span>
                    <span className="lb-row__score">
                      {s.puntaje}
                      <small>PTS</small>
                    </span>
                  </header>
                  <div className="lb-row__grid">
                    <Cell label="PJ" value={s.PJ} />
                    <Cell label="PG" value={s.PG} />
                    <Cell label="PE" value={s.PE} />
                    <Cell label="PP" value={s.PP} />
                    <Cell label="TP" value={s.TP} muted />
                    <Cell
                      label="%P"
                      value={`${Math.round(s.presentismo * 100)}%`}
                    />
                    <Cell label="Puntos" value={s.puntos} />
                    <Cell
                      label="Pts/PJ"
                      value={
                        s.ptosPorPJ == null ? '—' : s.ptosPorPJ.toFixed(1)
                      }
                      muted={s.ptosPorPJ == null}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  muted,
}: {
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className="lb-cell">
      <span className="lb-cell__label">{label}</span>
      <span
        className={`lb-cell__value${muted ? ' lb-cell__value--muted' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}
