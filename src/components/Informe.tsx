import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS_BY_ID } from '../data/players';
import {
  fetchIndicadoresData,
  type DbMatch,
  type DbMatchPlayer,
  type DbPlay,
} from '../lib/queries';
import { exportElementToPdf } from '../utils/exportElementPdf';
import {
  computeMonthly,
  computePlayerMatches,
  computeSeasonStats,
  isMonthInTournament,
  getMatchMonth,
  getMatchYear,
  listAvailableYears,
  sortSeasonStats,
  type Outcome,
  type PlayerSeasonStat,
  type SortDir,
  type SortKey,
  type Tournament,
} from '../utils/seasonStats';

const TOURNAMENTS: { key: Tournament; label: string; short?: string }[] = [
  { key: 'completo', label: 'Anual' },
  { key: 'apertura', label: 'Apertura', short: 'APE' },
  { key: 'clausura', label: 'Clausura', short: 'CLA' },
];

interface ColumnDef {
  key: SortKey;
  label: string;
  title?: string;
  hl?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Jugador' },
  { key: 'tp', label: 'TP', title: 'Total de partidos desde su debut' },
  { key: 'pj', label: 'PJ', title: 'Partidos jugados' },
  { key: 'pg', label: 'PG', title: 'Partidos ganados' },
  { key: 'pe', label: 'PE', title: 'Partidos empatados' },
  { key: 'pp', label: 'PP', title: 'Partidos perdidos' },
  { key: 'puntaje', label: 'Pje', title: 'Puntaje', hl: true },
  { key: 'presentismo', label: '%P', title: 'Presentismo' },
  { key: 'puntos', label: 'Pts', title: 'Puntos totales' },
  { key: 'dobles', label: '2pt', title: 'Dobles convertidos' },
  { key: 'triples', label: '3pt', title: 'Triples convertidos' },
  { key: 'ptosPorPJ', label: 'P/PJ', title: 'Puntos por partido jugado' },
];

export function Informe() {
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [plays, setPlays] = useState<DbPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [tournament, setTournament] = useState<Tournament>('completo');
  const [sort, setSort] = useState<SortKey>('puntaje');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSort(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIndicadoresData()
      .then((data) => {
        if (cancelled) return;
        setMatches(data.matches);
        setMatchPlayers(data.matchPlayers);
        setPlays(data.plays);
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

  const baseStats = useMemo(
    () =>
      year == null
        ? []
        : computeSeasonStats(year, matches, matchPlayers, tournament),
    [year, matches, matchPlayers, tournament],
  );

  const podium = useMemo(
    () => sortSeasonStats(baseStats, 'puntaje', 'desc').slice(0, 3),
    [baseStats],
  );

  const tableStats = useMemo(
    () => sortSeasonStats(baseStats, sort, sortDir),
    [baseStats, sort, sortDir],
  );

  const monthly = useMemo(
    () => (year == null ? [] : computeMonthly(year, matches, tournament)),
    [year, matches, tournament],
  );

  const seasonMatchIds = useMemo(() => {
    if (year == null) return new Set<string>();
    return new Set(
      matches
        .filter(
          (m) =>
            getMatchYear(m) === year &&
            isMonthInTournament(getMatchMonth(m), tournament),
        )
        .map((m) => m.id),
    );
  }, [year, matches, tournament]);

  const seasonPlays = useMemo(
    () => plays.filter((p) => seasonMatchIds.has(p.match_id)),
    [plays, seasonMatchIds],
  );

  const pointsRanking = useMemo(
    () =>
      sortSeasonStats(baseStats, 'puntos', 'desc')
        .filter((s) => s.puntos > 0)
        .slice(0, 3),
    [baseStats],
  );

  const topTriples = useMemo(
    () => topShots(seasonPlays, 'triple'),
    [seasonPlays],
  );
  const topDobles = useMemo(
    () => topShots(seasonPlays, 'double'),
    [seasonPlays],
  );

  const totals = useMemo(() => {
    if (year == null) return { jugados: 0, faltantes: 0 };
    const seasonMatches = matches.filter(
      (m) =>
        getMatchYear(m) === year &&
        isMonthInTournament(getMatchMonth(m), tournament),
    );
    const faltantes = monthly.reduce((s, m) => s + m.pendientes, 0);
    return { jugados: seasonMatches.length, faltantes };
  }, [year, matches, monthly, tournament]);

  const captureRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!captureRef.current || year == null) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        captureRef.current,
        `informe-basquet-${year}-${tournament}.pdf`,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="informe" ref={captureRef}>
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Informe</h2>
          <p className="section-head__subtitle">
            Estadísticas por jugador. Martes de básquet.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm pdf-button"
          onClick={() => void handleExportPdf()}
          disabled={year == null || tableStats.length === 0 || exporting}
        >
          {exporting ? 'Generando…' : '📄 PDF'}
        </button>
      </div>
      <div className="filters">
        {years.length > 0 && (
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
        )}
        <div className="pill-group" role="tablist" aria-label="Torneo">
          {TOURNAMENTS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === tournament}
              className={`pill${t.key === tournament ? ' pill--active' : ''}`}
              onClick={() => setTournament(t.key)}
            >
              <span className="pill__label-full">{t.label}</span>
              {t.short && (
                <span className="pill__label-short">{t.short}</span>
              )}
            </button>
          ))}
        </div>
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
          <div className="kpis kpis--2">
            <div className="kpi">
              <span className="kpi__label">Partidos jugados</span>
              <span className="kpi__value">{totals.jugados}</span>
            </div>
            <div className="kpi">
              <span className="kpi__label">Partidos faltantes</span>
              <span className="kpi__value kpi__value--accent">
                {totals.faltantes}
              </span>
            </div>
          </div>

          {monthly.length > 0 && <MonthlyChart data={monthly} />}

          {podium.length > 0 && <PodiumBlock podium={podium} />}

          {(pointsRanking.length > 0 ||
            topTriples.length > 0 ||
            topDobles.length > 0) && (
            <div className="podio-grid podio-grid--3">
              <PointsTableBlock data={pointsRanking} />
              <ShotPodiumBlock title="🏀 Podio de Dobles" data={topDobles} />
              <ShotPodiumBlock title="🎯 Podio de Triples" data={topTriples} />
            </div>
          )}

          <StatsTable
            stats={tableStats}
            sort={sort}
            sortDir={sortDir}
            onSort={handleSort}
            year={year}
            matches={matches}
            matchPlayers={matchPlayers}
            tournament={tournament}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Podio ---------- */

const MEDAL = ['🥇', '🥈', '🥉'];

function PodiumBlock({ podium }: { podium: PlayerSeasonStat[] }) {
  return (
    <section className="block">
      <h3 className="block__title">🏆 Podio</h3>
      <div className="podium-list">
        {podium.map((s, idx) => (
          <article key={s.playerId} className={`podium-row podium-row--${idx + 1}`}>
            <div className="podium-row__rank podium-row__rank--simple">
              <span className="podium-row__medal">{MEDAL[idx]}</span>
            </div>
            <div className="podium-row__main">
              <div className="podium-row__name">{s.playerName}</div>
              <div className="podium-row__meta">
                {s.PG}G · {s.PE}E · {s.PP}P
              </div>
            </div>
            <div className="podium-row__pts">
              <span className="podium-row__pts-num">{s.puntaje}</span>
              <span className="podium-row__pts-label">pts</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Gráfico mensual ---------- */

function MonthlyChart({ data }: { data: ReturnType<typeof computeMonthly> }) {
  // Escala fija: el máximo de martes que puede tener un mes es 5.
  const scale = Math.max(5, ...data.map((d) => d.martes));
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Partidos por mes</h3>
        <div className="legend">
          <span className="legend__item">
            <i className="legend__dot legend__dot--played" /> Jugados
          </span>
          <span className="legend__item">
            <i className="legend__dot legend__dot--pending" /> Martes del mes
          </span>
        </div>
      </div>
      <div className="month-chart">
        {data.map((d) => {
          const martesPct = (d.martes / scale) * 100;
          return (
            <div key={d.month} className="month-col">
              <div className="month-col__bars">
                <div
                  className="month-col__track"
                  style={{ height: `${martesPct}%` }}
                  title={`${d.martes} martes`}
                >
                  <div
                    className="month-col__fill"
                    style={{ height: `${d.martes > 0 ? (d.jugados / d.martes) * 100 : 0}%` }}
                  >
                    {d.jugados > 0 && (
                      <span className="month-col__inline">{d.jugados}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="month-col__label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Podios de tiros ---------- */

interface ShotPodiumItem {
  playerId: number;
  playerName: string;
  count: number;
}

function topShots(plays: DbPlay[], shot: 'double' | 'triple'): ShotPodiumItem[] {
  const counts = new Map<number, number>();
  for (const p of plays) {
    if (p.shot_type !== shot) continue;
    counts.set(p.player_id, (counts.get(p.player_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([playerId, count]) => ({
      playerId,
      playerName: PLAYERS_BY_ID[playerId]?.name ?? `#${playerId}`,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.playerName.localeCompare(b.playerName))
    .slice(0, 3);
}

function PointsTableBlock({ data }: { data: PlayerSeasonStat[] }) {
  return (
    <section className="block">
      <h3 className="block__title">🏀 Podio de Puntos</h3>
      {data.length === 0 ? (
        <div className="lb-empty">Sin datos.</div>
      ) : (
        <div className="podium-list">
          {data.map((s, idx) => (
            <article
              key={s.playerId}
              className={`podium-row podium-row--${idx + 1}`}
            >
              <div className="podium-row__rank podium-row__rank--simple">
                <span className="podium-row__medal">{MEDAL[idx]}</span>
              </div>
              <div className="podium-row__main">
                <div className="podium-row__name">{s.playerName}</div>
              </div>
              <div className="podium-row__pts">
                <span className="podium-row__pts-num">{s.puntos}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ShotPodiumBlock({
  title,
  data,
}: {
  title: string;
  data: ShotPodiumItem[];
}) {
  return (
    <section className="block">
      <h3 className="block__title">{title}</h3>
      {data.length === 0 ? (
        <div className="lb-empty">Sin datos.</div>
      ) : (
        <div className="podium-list">
          {data.map((s, idx) => (
            <article
              key={s.playerId}
              className={`podium-row podium-row--${idx + 1}`}
            >
              <div className="podium-row__rank podium-row__rank--simple">
                <span className="podium-row__medal">{MEDAL[idx]}</span>
              </div>
              <div className="podium-row__main">
                <div className="podium-row__name">{s.playerName}</div>
              </div>
              <div className="podium-row__pts">
                <span className="podium-row__pts-num">{s.count}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Racha últimos 7 ---------- */

function FormDots({ form }: { form: (Outcome | null)[] }) {
  if (form.length === 0) return <span className="form-dots__empty">—</span>;
  return (
    <span className="form-dots" title="Últimos 7 partidos (izq → der)">
      {form.map((o, i) => {
        const cls =
          o === 'Gana'
            ? 'win'
            : o === 'Pierde'
              ? 'loss'
              : o === 'Empate'
                ? 'tie'
                : 'none';
        const txt =
          o === 'Gana' ? '✓' : o === 'Pierde' ? '✕' : o === 'Empate' ? '–' : '';
        return (
          <span
            key={i}
            className={`form-dot form-dot--${cls}`}
            title={o ?? 'No jugó'}
          >
            {txt}
          </span>
        );
      })}
    </span>
  );
}

/* ---------- Tabla en columnas ---------- */

function StatsTable({
  stats,
  sort,
  sortDir,
  onSort,
  year,
  matches,
  matchPlayers,
  tournament,
}: {
  stats: PlayerSeasonStat[];
  sort: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  year: number;
  matches: DbMatch[];
  matchPlayers: DbMatchPlayer[];
  tournament: Tournament;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const colSpan = COLUMNS.length + 1;
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Tabla</h3>
        <span className="block__hint">
          Tocá una columna para ordenar · tocá un jugador para ver sus partidos
        </span>
      </div>

      {stats.length === 0 ? (
        <div className="lb-empty">Sin datos.</div>
      ) : (
        <div className="table-scroll">
          <table className="stats-grid">
            <thead>
              <tr>
                {COLUMNS.map((col) => {
                  const active = sort === col.key;
                  const isName = col.key === 'name';
                  return (
                    <th
                      key={col.key}
                      title={col.title}
                      className={[
                        isName ? 'stats-grid__sticky stats-grid__th-name' : '',
                        col.hl ? 'stats-grid__hl' : '',
                        active ? 'stats-grid__th--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-sort={
                        active
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        type="button"
                        className="stats-grid__sort"
                        onClick={() => onSort(col.key)}
                      >
                        <span>{col.label}</span>
                        <span
                          className="stats-grid__arrow"
                          aria-hidden
                        >
                          {active ? (sortDir === 'asc' ? '▲' : '▼') : '·'}
                        </span>
                      </button>
                    </th>
                  );
                })}
                <th>Últimos 7</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => {
                const isOpen = expanded === s.playerId;
                return (
                  <Fragment key={s.playerId}>
                    <tr
                      className={`stats-grid__row${isOpen ? ' stats-grid__row--open' : ''}`}
                      onClick={() =>
                        setExpanded((cur) =>
                          cur === s.playerId ? null : s.playerId,
                        )
                      }
                    >
                      <td className="stats-grid__sticky stats-grid__name">
                        <span className="stats-grid__rank">{idx + 1}</span>
                        <span className="stats-grid__caret" aria-hidden>
                          {isOpen ? '▾' : '▸'}
                        </span>
                        {s.playerName}
                      </td>
                      <td className="stats-grid__muted">{s.TP}</td>
                      <td>{s.PJ}</td>
                      <td className="stats-grid__win">{s.PG}</td>
                      <td>{s.PE}</td>
                      <td className="stats-grid__loss">{s.PP}</td>
                      <td className="stats-grid__hl">{s.puntaje}</td>
                      <td className={attendanceClass(s.presentismo)}>
                        {Math.round(s.presentismo * 100)}%
                      </td>
                      <td>{s.puntos}</td>
                      <td>{s.dobles}</td>
                      <td className="stats-grid__hl">{s.triples}</td>
                      <td className="stats-grid__muted">
                        {s.ptosPorPJ == null ? '—' : s.ptosPorPJ.toFixed(1)}
                      </td>
                      <td>
                        <FormDots form={s.form} />
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="stats-grid__detail-row">
                        <td colSpan={colSpan} className="stats-grid__detail-cell">
                          <PlayerMatchesDetail
                            playerId={s.playerId}
                            year={year}
                            matches={matches}
                            matchPlayers={matchPlayers}
                            tournament={tournament}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- Detalle de partidos por jugador ---------- */

function PlayerMatchesDetail({
  playerId,
  year,
  matches,
  matchPlayers,
  tournament,
}: {
  playerId: number;
  year: number;
  matches: DbMatch[];
  matchPlayers: DbMatchPlayer[];
  tournament: Tournament;
}) {
  const detail = useMemo(
    () =>
      computePlayerMatches(playerId, year, matches, matchPlayers, tournament),
    [playerId, year, matches, matchPlayers, tournament],
  );

  if (detail.length === 0) {
    return <div className="lb-empty">Sin partidos jugados.</div>;
  }

  return (
    <div className="player-matches">
      {detail.map((d) => {
        const cls =
          d.outcome === 'Gana'
            ? 'win'
            : d.outcome === 'Pierde'
              ? 'loss'
              : d.outcome === 'Empate'
                ? 'tie'
                : 'none';
        const mark =
          d.outcome === 'Gana'
            ? '✓'
            : d.outcome === 'Pierde'
              ? '✕'
              : '–';
        return (
          <div key={d.matchId} className={`pmatch pmatch--${cls}`}>
            <span
              className={`form-dot form-dot--${cls}`}
              aria-hidden
            >
              {mark}
            </span>
            <span className="pmatch__date">{formatMatchDate(d.date)}</span>
            <span className="pmatch__outcome">{d.outcome ?? '—'}</span>
            <span className="pmatch__stats">
              {d.points != null && <span>{d.points} pts</span>}
              <span>{d.dobles}× 2pt</span>
              <span>{d.triples}× 3pt</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatMatchDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function attendanceClass(p: number): string {
  if (p >= 0.75) return 'stats-grid__attend stats-grid__attend--good';
  if (p >= 0.5) return 'stats-grid__attend stats-grid__attend--mid';
  return 'stats-grid__attend stats-grid__attend--bad';
}
