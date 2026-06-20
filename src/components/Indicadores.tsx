import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_SORTED } from '../data/players';
import {
  fetchIndicadoresData,
  type DbMatch,
  type DbMatchPlayer,
  type DbPlay,
} from '../lib/queries';

interface TeamBattle {
  negro: number;
  blanco: number;
  empates: number;
  otrosA: number;
  otrosB: number;
}

interface QuarterBin {
  label: string;
  range: string;
  points: number;
}

interface MatchBreakdown {
  matchId: string;
  date: string;
  dateLabel: string;
  doublesPts: number;
  triplesPts: number;
  total: number;
}

interface MatchDiff {
  matchId: string;
  date: string;
  dateLabel: string;
  diff: number;
  winnerName: string;
}

export function Indicadores() {
  const [matches, setMatches] = useState<DbMatch[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [plays, setPlays] = useState<DbPlay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<number | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIndicadoresData()
      .then((data) => {
        if (cancelled) return;
        setMatches(data.matches);
        setMatchPlayers(data.matchPlayers);
        setPlays(data.plays);
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

  const playersWithPlays = useMemo(() => {
    const ids = new Set(plays.map((p) => p.player_id));
    return PLAYERS_SORTED.filter((p) => ids.has(p.id));
  }, [plays]);

  const teamBattle = useMemo(
    () => computeTeamBattle(matches, matchPlayers),
    [matches, matchPlayers],
  );

  const quarterSeries = useMemo(() => {
    const filtered =
      player === 'all' ? plays : plays.filter((p) => p.player_id === player);
    return groupByQuarter(filtered);
  }, [plays, player]);

  const quarterTotal = useMemo(
    () => quarterSeries.reduce((s, b) => s + b.points, 0),
    [quarterSeries],
  );

  const breakdown = useMemo(
    () => computeMatchBreakdown(matches, plays),
    [matches, plays],
  );

  const diffs = useMemo(
    () => computeMatchDiffs(matches),
    [matches],
  );

  return (
    <div className="informe">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Indicadores</h2>
          <p className="section-head__subtitle">
            Cómo se distribuyen los puntos y quiénes definen.
          </p>
        </div>
      </div>

      {error && (
        <div className="warning-banner">
          No se pudo cargar la información: {error}
        </div>
      )}

      {loading ? (
        <div className="lb-loading">Cargando indicadores...</div>
      ) : (
        <>
          <TeamBattleBlock battle={teamBattle} />

          {breakdown.length > 0 && <PuntosPorFechaChart data={breakdown} />}

          {diffs.length > 0 && <DiferenciaChart data={diffs} />}

          <section className="block">
            <div className="block__head">
              <h3 className="block__title">Puntos por cuarto</h3>
              <div className="block__hint">{quarterTotal} pts</div>
            </div>
            <div className="filters">
              <div
                className="pill-group pill-group--hide-mobile"
                role="tablist"
                aria-label="Jugador"
              >
                <button
                  type="button"
                  className={`pill${player === 'all' ? ' pill--active' : ''}`}
                  onClick={() => setPlayer('all')}
                >
                  Todos
                </button>
                {playersWithPlays.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`pill${player === p.id ? ' pill--active' : ''}`}
                    onClick={() => setPlayer(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              {playersWithPlays.length > 0 && (
                <select
                  className="player-select"
                  value={player}
                  onChange={(e) =>
                    setPlayer(
                      e.target.value === 'all' ? 'all' : Number(e.target.value),
                    )
                  }
                  aria-label="Filtrar por jugador"
                >
                  <option value="all">Todos los jugadores</option>
                  {playersWithPlays.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <QuarterChart data={quarterSeries} />
          </section>
        </>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function groupByQuarter(plays: DbPlay[]): QuarterBin[] {
  const bins: QuarterBin[] = [
    { label: 'Q1', range: "0-14'", points: 0 },
    { label: 'Q2', range: "15-29'", points: 0 },
    { label: 'Q3', range: "30-44'", points: 0 },
    { label: 'Q4', range: "45'+", points: 0 },
  ];
  for (const p of plays) {
    const q = Math.min(3, Math.max(0, Math.floor(p.minute / 15)));
    bins[q].points += p.points;
  }
  return bins;
}

function computeMatchBreakdown(
  matches: DbMatch[],
  plays: DbPlay[],
): MatchBreakdown[] {
  const byMatch = new Map<string, { doubles: number; triples: number }>();
  for (const p of plays) {
    const cur = byMatch.get(p.match_id) ?? { doubles: 0, triples: 0 };
    if (p.shot_type === 'double') cur.doubles += p.points;
    else cur.triples += p.points;
    byMatch.set(p.match_id, cur);
  }
  const matchById = new Map(matches.map((m) => [m.id, m]));
  return [...byMatch.entries()]
    .map(([id, v]) => {
      const m = matchById.get(id);
      const date = m?.played_at ?? '';
      return {
        matchId: id,
        date,
        dateLabel: date ? formatShortDate(date) : '',
        doublesPts: v.doubles,
        triplesPts: v.triples,
        total: v.doubles + v.triples,
      };
    })
    .filter((b) => b.total > 0 && b.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeMatchDiffs(matches: DbMatch[]): MatchDiff[] {
  return matches
    .filter(
      (m) =>
        m.score_a != null &&
        m.score_b != null &&
        (m.winner === 'A' || m.winner === 'B' || m.winner === 'tie'),
    )
    .map((m) => {
      const a = m.score_a ?? 0;
      const b = m.score_b ?? 0;
      const diff = Math.abs(a - b);
      const winnerName =
        m.winner === 'tie'
          ? 'Empate'
          : m.winner === 'A'
            ? m.team_a_name ?? 'A'
            : m.team_b_name ?? 'B';
      return {
        matchId: m.id,
        date: m.played_at,
        dateLabel: formatShortDate(m.played_at),
        diff,
        winnerName,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

function computeTeamBattle(
  matches: DbMatch[],
  mps: DbMatchPlayer[],
): TeamBattle {
  const mpsByMatch = new Map<string, DbMatchPlayer[]>();
  for (const mp of mps) {
    const arr = mpsByMatch.get(mp.match_id);
    if (arr) arr.push(mp);
    else mpsByMatch.set(mp.match_id, [mp]);
  }
  const battle: TeamBattle = {
    negro: 0,
    blanco: 0,
    empates: 0,
    otrosA: 0,
    otrosB: 0,
  };
  for (const m of matches) {
    const w = resolveWinner(m, mpsByMatch.get(m.id) ?? []);
    if (!w) continue;
    if (w === 'tie') {
      battle.empates += 1;
      continue;
    }
    const name = (w === 'A' ? m.team_a_name : m.team_b_name) ?? '';
    const isNegro = name.toLowerCase() === 'negro';
    const isBlanco = name.toLowerCase() === 'blanco';
    if (isNegro) battle.negro += 1;
    else if (isBlanco) battle.blanco += 1;
    else if (w === 'A') battle.otrosA += 1;
    else battle.otrosB += 1;
  }
  return battle;
}

function resolveWinner(
  match: DbMatch,
  mps: DbMatchPlayer[],
): 'A' | 'B' | 'tie' | null {
  if (match.winner) return match.winner;
  const withTeam = mps.filter((mp) => mp.team != null && mp.outcome != null);
  if (withTeam.length === 0) return null;
  const aWon = withTeam.some(
    (mp) => mp.team === 'A' && mp.outcome === 'Gana',
  );
  const bWon = withTeam.some(
    (mp) => mp.team === 'B' && mp.outcome === 'Gana',
  );
  if (aWon) return 'A';
  if (bWon) return 'B';
  const allTie = withTeam.every((mp) => mp.outcome === 'Empate');
  return allTie ? 'tie' : null;
}

/* ---------- TeamBattle widget ---------- */

function TeamBattleBlock({ battle }: { battle: TeamBattle }) {
  const total =
    battle.negro + battle.blanco + battle.empates + battle.otrosA + battle.otrosB;
  if (total === 0) {
    return (
      <section className="block">
        <h3 className="block__title">Negro vs Blanco</h3>
        <div className="lb-empty">Sin partidos con equipo asignado.</div>
      </section>
    );
  }
  const negro = battle.negro;
  const blanco = battle.blanco;
  const totalDecisivos = negro + blanco;
  const pctNegro =
    totalDecisivos > 0 ? Math.round((negro / totalDecisivos) * 100) : 50;
  const pctBlanco = 100 - pctNegro;
  return (
    <section className="block">
      <h3 className="block__title">Negro vs Blanco</h3>
      <div className="battle-card">
        <div className="battle-side battle-side--negro">
          <span className="battle-side__name">Negro</span>
          <span className="battle-side__count">{negro}</span>
          <span className="battle-side__pct">{pctNegro}%</span>
        </div>
        <div
          className="battle-bar"
          aria-label={`Negro ${pctNegro}% vs Blanco ${pctBlanco}%`}
        >
          <span
            className="battle-bar__negro"
            style={{ width: `${pctNegro}%` }}
          />
          <span
            className="battle-bar__blanco"
            style={{ width: `${pctBlanco}%` }}
          />
        </div>
        <div className="battle-side battle-side--blanco">
          <span className="battle-side__name">Blanco</span>
          <span className="battle-side__count">{blanco}</span>
          <span className="battle-side__pct">{pctBlanco}%</span>
        </div>
      </div>
      <div className="battle-meta">
        {battle.empates > 0 && <span>{battle.empates} empates</span>}
        {battle.otrosA + battle.otrosB > 0 && (
          <span>{battle.otrosA + battle.otrosB} con otros nombres</span>
        )}
      </div>
    </section>
  );
}

/* ---------- Quarter chart (bars) ---------- */

function QuarterChart({ data }: { data: QuarterBin[] }) {
  const max = Math.max(1, ...data.map((d) => d.points));
  return (
    <div className="quarter-chart">
      {data.map((q) => {
        const heightPct = (q.points / max) * 100;
        return (
          <div key={q.label} className="quarter-col">
            <div className="quarter-col__num">{q.points}</div>
            <div className="quarter-col__bar-wrap">
              <div
                className="quarter-col__bar"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <div className="quarter-col__label">{q.label}</div>
            <div className="quarter-col__range">{q.range}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Puntos por fecha (stacked dobles + triples) ---------- */

function PuntosPorFechaChart({ data }: { data: MatchBreakdown[] }) {
  const max = Math.max(1, ...data.map((d) => d.total));
  const totalDobles = data.reduce((s, d) => s + d.doublesPts, 0);
  const totalTriples = data.reduce((s, d) => s + d.triplesPts, 0);
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Puntos por fecha</h3>
        <div className="legend">
          <span className="legend__item">
            <i className="legend__dot legend__dot--played" /> Dobles ({totalDobles})
          </span>
          <span className="legend__item">
            <i className="legend__dot legend__dot--triple" /> Triples ({totalTriples})
          </span>
        </div>
      </div>
      <div className="bar-chart">
        {data.map((d) => {
          const heightPct = (d.total / max) * 100;
          const doblePart = d.total > 0 ? (d.doublesPts / d.total) * 100 : 0;
          const triplePart = d.total > 0 ? (d.triplesPts / d.total) * 100 : 0;
          return (
            <div key={d.matchId} className="bar-col">
              <div className="bar-col__total">{d.total}</div>
              <div className="bar-col__bar-wrap">
                <div
                  className="bar-col__stack"
                  style={{ height: `${heightPct}%` }}
                >
                  {d.triplesPts > 0 && (
                    <div
                      className="bar-col__seg bar-col__seg--triple"
                      style={{ height: `${triplePart}%` }}
                      title={`Triples: ${d.triplesPts}`}
                    />
                  )}
                  {d.doublesPts > 0 && (
                    <div
                      className="bar-col__seg bar-col__seg--double"
                      style={{ height: `${doblePart}%` }}
                      title={`Dobles: ${d.doublesPts}`}
                    />
                  )}
                </div>
              </div>
              <div className="bar-col__label">{d.dateLabel}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Diferencia por fecha ---------- */

function DiferenciaChart({ data }: { data: MatchDiff[] }) {
  const max = Math.max(1, ...data.map((d) => d.diff));
  const avg = data.reduce((s, d) => s + d.diff, 0) / data.length;
  return (
    <section className="block">
      <div className="block__head">
        <h3 className="block__title">Diferencia de resultado</h3>
        <div className="block__hint">Promedio: {avg.toFixed(1)} pts</div>
      </div>
      <div className="bar-chart">
        {data.map((d) => {
          const heightPct = d.diff === 0 ? 4 : (d.diff / max) * 100;
          return (
            <div key={d.matchId} className="bar-col" title={`${d.dateLabel} · Ganó ${d.winnerName} por ${d.diff}`}>
              <div className="bar-col__total">{d.diff}</div>
              <div className="bar-col__bar-wrap">
                <div
                  className="bar-col__stack bar-col__stack--diff"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div className="bar-col__label">{d.dateLabel}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
