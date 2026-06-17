import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonData, type DbMatch, type DbMatchPlayer } from '../lib/queries';
import {
  computeMonthly,
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

const TOURNAMENTS: { key: Tournament; label: string }[] = [
  { key: 'completo', label: 'Anual' },
  { key: 'apertura', label: 'Apertura' },
  { key: 'clausura', label: 'Clausura' },
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
  { key: 'ptosPorPJ', label: 'P/PJ', title: 'Puntos por partido jugado' },
];

export function Informe() {
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
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

  return (
    <div className="informe">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Informe</h2>
          <p className="section-head__subtitle">
            Estadísticas por jugador. Martes de básquet.
          </p>
        </div>
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
              {t.label}
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

          {podium.length > 0 && <PodiumBlock podium={podium} />}

          {monthly.length > 0 && <MonthlyChart data={monthly} />}

          <StatsTable
            stats={tableStats}
            sort={sort}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Podio ---------- */

const MEDAL = ['🥇', '🥈', '🥉'];
const POS_LABEL = ['1°', '2°', '3°'];

function PodiumBlock({ podium }: { podium: PlayerSeasonStat[] }) {
  return (
    <section className="block">
      <h3 className="block__title">🏆 Podio</h3>
      <div className="podium-list">
        {podium.map((s, idx) => (
          <article key={s.playerId} className={`podium-row podium-row--${idx + 1}`}>
            <div className="podium-row__rank">
              <span className="podium-row__medal">{MEDAL[idx]}</span>
              <span className="podium-row__pos">{POS_LABEL[idx]}</span>
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
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Partidos por mes</h3>
        <div className="legend">
          <span className="legend__item">
            <i className="legend__dot legend__dot--played" /> Jugados
          </span>
          <span className="legend__item">
            <i className="legend__dot legend__dot--pending" /> Pendientes
          </span>
        </div>
      </div>
      <div className="month-chart">
        {data.map((d) => {
          const total = d.jugados + d.pendientes;
          const playedPct = total > 0 ? (d.jugados / total) * 100 : 0;
          const pendingPct = total > 0 ? (d.pendientes / total) * 100 : 0;
          return (
            <div key={d.month} className="month-col">
              <div className="month-col__bars">
                {d.pendientes > 0 && (
                  <div
                    className="month-col__seg month-col__seg--pending"
                    style={{ height: `${pendingPct}%` }}
                  >
                    <span className="month-col__inline">{d.pendientes}</span>
                  </div>
                )}
                {d.jugados > 0 && (
                  <div
                    className="month-col__seg month-col__seg--played"
                    style={{ height: `${playedPct}%` }}
                  >
                    <span className="month-col__inline">{d.jugados}</span>
                  </div>
                )}
              </div>
              <span className="month-col__total">{total || ''}</span>
              <span className="month-col__label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Racha últimos 7 ---------- */

function FormDots({ form }: { form: Outcome[] }) {
  if (form.length === 0) return <span className="form-dots__empty">—</span>;
  return (
    <span className="form-dots" title="Últimos partidos (izq → der)">
      {form.map((o, i) => (
        <span
          key={i}
          className={`form-dot form-dot--${
            o === 'Gana' ? 'win' : o === 'Pierde' ? 'loss' : 'tie'
          }`}
          title={o}
        >
          {o === 'Gana' ? '✓' : o === 'Pierde' ? '✕' : '–'}
        </span>
      ))}
    </span>
  );
}

/* ---------- Tabla en columnas ---------- */

function StatsTable({
  stats,
  sort,
  sortDir,
  onSort,
}: {
  stats: PlayerSeasonStat[];
  sort: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Tabla</h3>
        <span className="block__hint">Tocá una columna para ordenar</span>
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
              {stats.map((s, idx) => (
                <tr key={s.playerId}>
                  <td className="stats-grid__sticky stats-grid__name">
                    <span className="stats-grid__rank">{idx + 1}</span>
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
                  <td className="stats-grid__muted">
                    {s.ptosPorPJ == null ? '—' : s.ptosPorPJ.toFixed(1)}
                  </td>
                  <td>
                    <FormDots form={s.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function attendanceClass(p: number): string {
  if (p >= 0.75) return 'stats-grid__attend stats-grid__attend--good';
  if (p >= 0.5) return 'stats-grid__attend stats-grid__attend--mid';
  return 'stats-grid__attend stats-grid__attend--bad';
}
