import { useEffect, useMemo, useState } from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PLAYERS_BY_ID } from '../data/players';
import {
  fetchResultados,
  type DbHistoric,
  type DbMatchPlayer,
} from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

function formatMatchDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export function Resultados() {
  const [matches, setMatches] = useState<DbHistoric[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchResultados()
      .then((d) => {
        if (cancelled) return;
        setMatches(d.matches);
        setMatchPlayers(d.matchPlayers);
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

  // Solo partidos con resultado real (no parciales del histórico viejo).
  const rows = useMemo(() => matches.filter((m) => !m.partial), [matches]);

  const playersByMatch = useMemo(() => {
    const map = new Map<string, DbMatchPlayer[]>();
    for (const mp of matchPlayers) {
      const arr = map.get(mp.match_id) ?? [];
      arr.push(mp);
      map.set(mp.match_id, arr);
    }
    return map;
  }, [matchPlayers]);

  return (
    <div className="resultados">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🏀 Resultados</h2>
          <p className="section-head__subtitle">
            Tocá un partido para ver el detalle y el podio.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para ver los resultados.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      {loading ? (
        <div className="lb-loading">Cargando partidos…</div>
      ) : rows.length === 0 ? (
        <div className="lb-empty">Todavía no hay partidos jugados.</div>
      ) : (
        <div className="result-list">
          {rows.map((m) => {
            const aWin = m.winner === 'A';
            const bWin = m.winner === 'B';
            const isOpen = expanded === m.id;
            return (
              <article
                key={m.id}
                className={`result-card${isOpen ? ' result-card--open' : ''}`}
              >
                <button
                  type="button"
                  className="result-card__btn"
                  onClick={() => setExpanded((cur) => (cur === m.id ? null : m.id))}
                  aria-expanded={isOpen}
                >
                  <div className="result-card__date">
                    {formatMatchDate(m.played_at)}
                    <span className="result-card__caret" aria-hidden>
                      {isOpen ? '▾' : '▸'}
                    </span>
                  </div>
                  <div className="result-card__score">
                    <span
                      className={`result-card__team${aWin ? ' result-card__team--win' : ''}`}
                    >
                      <span className="result-card__name">{m.team_a_name}</span>
                      <span className="result-card__pts">{m.score_a ?? '—'}</span>
                    </span>
                    <span className="result-card__vs">vs</span>
                    <span
                      className={`result-card__team${bWin ? ' result-card__team--win' : ''}`}
                    >
                      <span className="result-card__pts">{m.score_b ?? '—'}</span>
                      <span className="result-card__name">{m.team_b_name}</span>
                    </span>
                  </div>
                  <div className="result-card__tag">
                    {m.winner === 'tie'
                      ? 'Empate'
                      : aWin
                        ? `Ganó ${m.team_a_name}`
                        : bWin
                          ? `Ganó ${m.team_b_name}`
                          : 'Sin resultado'}
                  </div>
                </button>

                {isOpen && (
                  <MatchDetail
                    match={m}
                    players={playersByMatch.get(m.id) ?? []}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function playerName(id: number): string {
  return PLAYERS_BY_ID[id]?.name ?? `#${id}`;
}

function MatchDetail({
  match,
  players,
}: {
  match: DbHistoric;
  players: DbMatchPlayer[];
}) {
  const podium = useMemo(
    () =>
      [...players]
        .filter((p) => (p.points ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.points ?? 0) - (a.points ?? 0) ||
            playerName(a.player_id).localeCompare(playerName(b.player_id)),
        )
        .slice(0, 3),
    [players],
  );

  if (players.length === 0) {
    return (
      <div className="result-detail">
        <div className="lb-empty">Sin detalle de jugadores.</div>
      </div>
    );
  }

  return (
    <div className="result-detail">
      {podium.length > 0 && (
        <section className="result-podium">
          <h4 className="result-podium__title">🏆 Podio del partido</h4>
          <div className="result-podium__list">
            {podium.map((p, idx) => (
              <div key={p.player_id} className="result-podium__row">
                <span className="result-podium__medal">{MEDAL[idx]}</span>
                <PlayerAvatar id={p.player_id} />
                <span className="result-podium__name">
                  {playerName(p.player_id)}
                </span>
                <span className="result-podium__pts">{p.points ?? 0} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="result-teams">
        <TeamColumn
          title={match.team_a_name}
          side="A"
          players={players.filter((p) => p.team === 'A')}
        />
        <TeamColumn
          title={match.team_b_name}
          side="B"
          players={players.filter((p) => p.team === 'B')}
        />
      </div>
    </div>
  );
}

function TeamColumn({
  title,
  side,
  players,
}: {
  title: string;
  side: 'A' | 'B';
  players: DbMatchPlayer[];
}) {
  const sorted = useMemo(
    () =>
      [...players].sort(
        (a, b) =>
          (b.points ?? 0) - (a.points ?? 0) ||
          playerName(a.player_id).localeCompare(playerName(b.player_id)),
      ),
    [players],
  );

  return (
    <div className={`result-team result-team--${side}`}>
      <div className="result-team__head">
        <span className="result-team__badge">{side}</span>
        <span className="result-team__name">{title}</span>
      </div>
      {sorted.length === 0 ? (
        <div className="lb-empty">Sin jugadores.</div>
      ) : (
        <table className="result-team__table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Pts</th>
              <th>2pt</th>
              <th>3pt</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.player_id}>
                <td className="result-team__player">
                  <PlayerAvatar id={p.player_id} />
                  {playerName(p.player_id)}
                </td>
                <td className="result-team__hl">{p.points ?? 0}</td>
                <td>{p.doubles ?? 0}</td>
                <td>{p.triples ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
