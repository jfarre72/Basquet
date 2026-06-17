import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import {
  fetchIndicadoresData,
  type DbMatch,
  type DbMatchPlayer,
  type DbPlay,
} from '../lib/queries';
import { exportIndicadoresToPdf } from '../utils/exportIndicadoresPdf';

interface ShotPodium {
  playerId: number;
  playerName: string;
  count: number;
}

interface TeamBattle {
  negro: number;
  blanco: number;
  empates: number;
  otrosA: number;
  otrosB: number;
}

interface MinuteBin {
  minute: number;
  points: number;
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

  const dobles = useMemo(
    () => topShots(plays, 'double'),
    [plays],
  );
  const triples = useMemo(
    () => topShots(plays, 'triple'),
    [plays],
  );

  const teamBattle = useMemo(
    () => computeTeamBattle(matches, matchPlayers),
    [matches, matchPlayers],
  );

  const minuteSeries = useMemo(() => {
    const filtered =
      player === 'all' ? plays : plays.filter((p) => p.player_id === player);
    return groupByMinute(filtered);
  }, [plays, player]);

  const minuteTotal = useMemo(
    () => minuteSeries.reduce((s, b) => s + b.points, 0),
    [minuteSeries],
  );

  const topScorers = useMemo(() => {
    const map = new Map<number, { points: number; doubles: number; triples: number }>();
    for (const p of plays) {
      const cur = map.get(p.player_id) ?? { points: 0, doubles: 0, triples: 0 };
      cur.points += p.points;
      if (p.shot_type === 'double') cur.doubles += 1;
      else cur.triples += 1;
      map.set(p.player_id, cur);
    }
    return [...map.entries()]
      .map(([playerId, v]) => ({
        playerName: PLAYERS_BY_ID[playerId]?.name ?? `#${playerId}`,
        ...v,
      }))
      .sort((a, b) => b.points - a.points || a.playerName.localeCompare(b.playerName))
      .slice(0, 15);
  }, [plays]);

  const exportPdf = () => {
    const playerLabel =
      player === 'all'
        ? 'Todos'
        : PLAYERS_BY_ID[player as number]?.name ?? `#${player}`;
    exportIndicadoresToPdf({
      battle: {
        negro: teamBattle.negro,
        blanco: teamBattle.blanco,
        empates: teamBattle.empates,
        otros: teamBattle.otrosA + teamBattle.otrosB,
      },
      triples,
      dobles,
      topScorers,
      minuteSeries: minuteSeries.filter((b) => b.points > 0),
      playerFilterLabel: playerLabel,
    });
  };

  return (
    <div className="informe">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Indicadores</h2>
          <p className="section-head__subtitle">
            Cómo se distribuyen los puntos y quiénes definen.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={exportPdf}
          disabled={loading || plays.length === 0}
        >
          📄 PDF
        </button>
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

          <section className="block">
            <div className="block__head">
              <h3 className="block__title">Puntos por minuto</h3>
              <div className="block__hint">
                {minuteTotal} pts · {minuteSeries.length} min
              </div>
            </div>
            <div className="filters">
              <div className="pill-group" role="tablist" aria-label="Jugador">
                <button
                  type="button"
                  className={`pill${player === 'all' ? ' pill--active' : ''}`}
                  onClick={() => setPlayer('all')}
                >
                  Todos
                </button>
                {playersWithPlays.slice(0, 8).map((p) => (
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
            <LineChart data={minuteSeries} />
          </section>

          <div className="podio-grid">
            <ShotPodiumBlock
              title="🎯 Podio de Triples"
              data={triples}
              unit="triples"
            />
            <ShotPodiumBlock
              title="🏀 Podio de Dobles"
              data={dobles}
              unit="dobles"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Helpers ---------- */

function topShots(plays: DbPlay[], shot: 'double' | 'triple'): ShotPodium[] {
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

function groupByMinute(plays: DbPlay[]): MinuteBin[] {
  if (plays.length === 0) return [];
  const map = new Map<number, number>();
  let max = 0;
  for (const p of plays) {
    map.set(p.minute, (map.get(p.minute) ?? 0) + p.points);
    if (p.minute > max) max = p.minute;
  }
  const out: MinuteBin[] = [];
  for (let m = 0; m <= max; m++) {
    out.push({ minute: m, points: map.get(m) ?? 0 });
  }
  return out;
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

/* ---------- ShotPodium ---------- */

const MEDAL = ['🥇', '🥈', '🥉'];

function ShotPodiumBlock({
  title,
  data,
  unit,
}: {
  title: string;
  data: ShotPodium[];
  unit: string;
}) {
  return (
    <section className="block">
      <h3 className="block__title">{title}</h3>
      {data.length === 0 ? (
        <div className="lb-empty">Sin {unit} cargados.</div>
      ) : (
        <div className="podium-list">
          {data.map((s, idx) => (
            <article
              key={s.playerId}
              className={`podium-row podium-row--${idx + 1}`}
            >
              <div className="podium-row__rank">
                <span className="podium-row__medal">{MEDAL[idx]}</span>
                <span className="podium-row__pos">{idx + 1}°</span>
              </div>
              <div className="podium-row__main">
                <div className="podium-row__name">{s.playerName}</div>
                <div className="podium-row__meta">{unit}</div>
              </div>
              <div className="podium-row__pts">
                <span className="podium-row__pts-num">{s.count}</span>
                <span className="podium-row__pts-label">{unit.slice(0, 3)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Line chart ---------- */

function LineChart({ data }: { data: MinuteBin[] }) {
  if (data.length === 0) {
    return (
      <div className="lb-empty">
        Todavía no hay jugadas registradas para mostrar.
      </div>
    );
  }
  const W = 600;
  const H = 180;
  const pad = { top: 14, right: 14, bottom: 28, left: 32 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxY = Math.max(1, ...data.map((d) => d.points));
  const maxX = Math.max(1, data[data.length - 1].minute);
  const x = (m: number) => pad.left + (m / maxX) * innerW;
  const y = (p: number) => pad.top + innerH - (p / maxY) * innerH;
  const path = data.map((d) => `${x(d.minute)},${y(d.points)}`).join(' ');
  const area = `${pad.left},${pad.top + innerH} ${path} ${x(maxX)},${pad.top + innerH}`;
  const gridYs = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = Math.min(6, maxX + 1);
  const tickStep = Math.max(1, Math.round(maxX / (xTicks - 1)));
  const xLabels: number[] = [];
  for (let m = 0; m <= maxX; m += tickStep) xLabels.push(m);
  if (xLabels[xLabels.length - 1] !== maxX) xLabels.push(maxX);

  return (
    <div className="line-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="line-chart"
        preserveAspectRatio="none"
        role="img"
      >
        {gridYs.map((t) => (
          <line
            key={t}
            x1={pad.left}
            x2={W - pad.right}
            y1={pad.top + innerH * (1 - t)}
            y2={pad.top + innerH * (1 - t)}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
        ))}
        <polygon
          points={area}
          fill="var(--accent-dim)"
          stroke="none"
        />
        <polyline
          points={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data
          .filter((d) => d.points > 0)
          .map((d) => (
            <circle
              key={d.minute}
              cx={x(d.minute)}
              cy={y(d.points)}
              r="3"
              fill="var(--accent)"
            />
          ))}
        {gridYs.map((t) => {
          const v = Math.round(maxY * t);
          return (
            <text
              key={`yl-${t}`}
              x={pad.left - 6}
              y={pad.top + innerH * (1 - t) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--text-subtle)"
            >
              {v}
            </text>
          );
        })}
        {xLabels.map((m) => (
          <text
            key={`xl-${m}`}
            x={x(m)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-subtle)"
          >
            {m}'
          </text>
        ))}
      </svg>
    </div>
  );
}
