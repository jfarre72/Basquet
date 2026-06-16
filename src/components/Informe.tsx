import { useEffect, useMemo, useState } from 'react';
import { fetchSeasonData, type DbMatch, type DbMatchPlayer } from '../lib/queries';
import {
  computeMonthly,
  computeSeasonStats,
  getMatchYear,
  listAvailableYears,
  sortSeasonStats,
  type Outcome,
  type PlayerSeasonStat,
  type SortKey,
} from '../utils/seasonStats';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'puntaje', label: 'Puntaje' },
  { key: 'pj', label: 'PJ' },
  { key: 'pg', label: 'PG' },
  { key: 'presentismo', label: '% Pres.' },
  { key: 'puntos', label: 'Puntos' },
  { key: 'ptosPorPJ', label: 'Pts/PJ' },
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

  const baseStats = useMemo(
    () => (year == null ? [] : computeSeasonStats(year, matches, matchPlayers)),
    [year, matches, matchPlayers],
  );

  const podium = useMemo(
    () => sortSeasonStats(baseStats, 'puntaje').slice(0, 3),
    [baseStats],
  );

  const tableStats = useMemo(
    () => sortSeasonStats(baseStats, sort),
    [baseStats, sort],
  );

  const monthly = useMemo(
    () => (year == null ? [] : computeMonthly(year, matches)),
    [year, matches],
  );

  const totals = useMemo(() => {
    if (year == null) return { TP: 0, jugadores: 0, puntos: 0 };
    const seasonMatches = matches.filter((m) => getMatchYear(m) === year);
    const ids = new Set(seasonMatches.map((m) => m.id));
    const mps = matchPlayers.filter((mp) => ids.has(mp.match_id));
    return {
      TP: seasonMatches.length,
      jugadores: new Set(mps.map((mp) => mp.player_id)).size,
      puntos: mps.reduce((sum, mp) => sum + (mp.points ?? 0), 0),
    };
  }, [year, matches, matchPlayers]);

  return (
    <div className="informe">
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

          {podium.length > 0 && <PodiumBlock podium={podium} />}

          {monthly.length > 0 && <MonthlyChart data={monthly} />}

          <StatsTable
            stats={tableStats}
            sort={sort}
            onSort={setSort}
          />
        </>
      )}
    </div>
  );
}

/* ---------- Podio ---------- */

function PodiumBlock({ podium }: { podium: PlayerSeasonStat[] }) {
  // Orden visual: 2º, 1º, 3º
  const order = [podium[1], podium[0], podium[2]].filter(
    Boolean,
  ) as PlayerSeasonStat[];
  const place = (s: PlayerSeasonStat) => podium.indexOf(s) + 1;
  return (
    <section className="block">
      <h3 className="block__title">🏆 Podio</h3>
      <div className="podium-stage">
        {order.map((s) => {
          const pos = place(s);
          return (
            <div key={s.playerId} className={`podium-col podium-col--${pos}`}>
              <div className="podium-col__name">{s.playerName}</div>
              <div className="podium-col__pts">{s.puntaje}</div>
              <div className="podium-col__bar">
                <span className="podium-col__medal">
                  {pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'}
                </span>
                <span className="podium-col__rank">{pos}º</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Gráfico mensual ---------- */

function MonthlyChart({ data }: { data: ReturnType<typeof computeMonthly> }) {
  const max = Math.max(
    1,
    ...data.map((d) => d.jugados + d.pendientes),
  );
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
          return (
            <div key={d.month} className="month-col">
              <div className="month-col__bars" aria-hidden>
                <div
                  className="month-col__seg month-col__seg--pending"
                  style={{ height: `${(d.pendientes / max) * 100}%` }}
                />
                <div
                  className="month-col__seg month-col__seg--played"
                  style={{ height: `${(d.jugados / max) * 100}%` }}
                />
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
  onSort,
}: {
  stats: PlayerSeasonStat[];
  sort: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Tabla</h3>
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
            onClick={() => onSort(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {stats.length === 0 ? (
        <div className="lb-empty">Sin datos.</div>
      ) : (
        <div className="table-scroll">
          <table className="stats-grid">
            <thead>
              <tr>
                <th className="stats-grid__sticky stats-grid__th-name">
                  Jugador
                </th>
                <th>Últimos 7</th>
                <th title="Total de partidos desde su debut">TP</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PE</th>
                <th>PP</th>
                <th className="stats-grid__hl">Pje</th>
                <th title="Presentismo">%P</th>
                <th>Pts</th>
                <th title="Puntos por partido jugado">P/PJ</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => (
                <tr key={s.playerId}>
                  <td className="stats-grid__sticky stats-grid__name">
                    <span className="stats-grid__rank">{idx + 1}</span>
                    {s.playerName}
                  </td>
                  <td>
                    <FormDots form={s.form} />
                  </td>
                  <td className="stats-grid__muted">{s.TP}</td>
                  <td>{s.PJ}</td>
                  <td className="stats-grid__win">{s.PG}</td>
                  <td>{s.PE}</td>
                  <td className="stats-grid__loss">{s.PP}</td>
                  <td className="stats-grid__hl">{s.puntaje}</td>
                  <td>{Math.round(s.presentismo * 100)}%</td>
                  <td>{s.puntos}</td>
                  <td className="stats-grid__muted">
                    {s.ptosPorPJ == null ? '—' : s.ptosPorPJ.toFixed(1)}
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
