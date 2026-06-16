import { useGame } from '../state/GameContext';
import { getPlayerStats } from '../utils/stats';
import type { TeamId } from '../types';

export function PlayerStats() {
  const { state } = useGame();
  const stats = getPlayerStats(state);

  if (stats.length === 0) {
    return (
      <div className="empty-state">
        Aún no hay jugadores en los equipos.
      </div>
    );
  }

  return (
    <div className="stats-table">
      {(['A', 'B'] as const).map((team) => {
        const teamStats = stats
          .filter((s) => s.team === team)
          .sort((a, b) => b.totalPoints - a.totalPoints);
        if (teamStats.length === 0) return null;
        return (
          <div className="stats-team" key={team}>
            <div className="stats-team__head">
              <span>{state.teams[team].name}</span>
              <span>{totalForTeam(stats, team)} pts</span>
            </div>
            <div className="stats-head">
              <span>Jugador</span>
              <span>2pt</span>
              <span>3pt</span>
              <span>Tot.</span>
            </div>
            {teamStats.map((s) => (
              <div className="stats-row" key={s.playerId}>
                <span className="stats-row__name">{s.playerName}</span>
                <span className="stats-row__cell">{s.doubles}</span>
                <span className="stats-row__cell">{s.triples}</span>
                <span className="stats-row__cell stats-row__cell--total">
                  {s.totalPoints}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function totalForTeam(
  stats: ReturnType<typeof getPlayerStats>,
  team: TeamId,
): number {
  return stats
    .filter((s) => s.team === team)
    .reduce((sum, s) => sum + s.totalPoints, 0);
}
