import { PLAYERS_BY_ID } from '../data/players';
import type { GameState, Play, TeamId } from '../types';

export interface PlayerStat {
  playerId: number;
  playerName: string;
  team: TeamId;
  teamName: string;
  totalPoints: number;
  doubles: number;
  triples: number;
}

export function getScore(plays: Play[], team: TeamId): number {
  return plays
    .filter((p) => p.team === team)
    .reduce((sum, p) => sum + p.points, 0);
}

export function getPlayerStats(state: GameState): PlayerStat[] {
  const out: PlayerStat[] = [];
  (['A', 'B'] as const).forEach((teamId) => {
    const team = state.teams[teamId];
    team.playerIds.forEach((playerId) => {
      const plays = state.plays.filter(
        (p) => p.team === teamId && p.playerId === playerId,
      );
      const doubles = plays.filter((p) => p.shotType === 'double').length;
      const triples = plays.filter((p) => p.shotType === 'triple').length;
      out.push({
        playerId,
        playerName: PLAYERS_BY_ID[playerId]?.name ?? `Jugador #${playerId}`,
        team: teamId,
        teamName: team.name,
        totalPoints: doubles * 2 + triples * 3,
        doubles,
        triples,
      });
    });
  });
  return out;
}

export function getPodium(stats: PlayerStat[], size = 3): PlayerStat[] {
  return [...stats]
    .filter((s) => s.totalPoints > 0)
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.triples !== a.triples) return b.triples - a.triples;
      return a.playerName.localeCompare(b.playerName);
    })
    .slice(0, size);
}

export function getWinner(state: GameState): {
  winner: TeamId | 'tie';
  scoreA: number;
  scoreB: number;
} {
  const scoreA = getScore(state.plays, 'A');
  const scoreB = getScore(state.plays, 'B');
  let winner: TeamId | 'tie' = 'tie';
  if (scoreA > scoreB) winner = 'A';
  else if (scoreB > scoreA) winner = 'B';
  return { winner, scoreA, scoreB };
}

export type TeamOutcome = 'Gana' | 'Pierde' | 'Empate';

export function getTeamOutcome(
  state: GameState,
  team: TeamId,
): TeamOutcome {
  const { winner } = getWinner(state);
  if (winner === 'tie') return 'Empate';
  return winner === team ? 'Gana' : 'Pierde';
}
