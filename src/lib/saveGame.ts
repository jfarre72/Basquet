import type { GameState, TeamId } from '../types';
import { getPlayerStats, getWinner } from '../utils/stats';
import { supabase } from './supabase';

/**
 * Persiste un partido terminado en Supabase: crea el `match`, los
 * `match_players` (con resultado y conversiones por jugador) y todas las
 * `plays`. Devuelve el id del match creado.
 */
export async function saveGameToSupabase(state: GameState): Promise<string> {
  if (!supabase) {
    throw new Error('La app no está conectada a Supabase.');
  }

  const { winner, scoreA, scoreB } = getWinner(state);
  const winnerDb = winner === 'A' ? 'A' : winner === 'B' ? 'B' : 'tie';
  const startedAt = new Date(state.startTime ?? Date.now()).toISOString();
  const finishedAt = new Date(state.endTime ?? Date.now()).toISOString();

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .insert({
      played_at: startedAt,
      finished_at: finishedAt,
      team_a_name: state.teams.A.name,
      team_b_name: state.teams.B.name,
      score_a: scoreA,
      score_b: scoreB,
      winner: winnerDb,
      partial: false,
    })
    .select('id')
    .single();
  if (matchErr) throw matchErr;
  const matchId = match.id as string;

  const stats = getPlayerStats(state);
  const playerRows = (['A', 'B'] as const).flatMap((teamId: TeamId) => {
    const outcome =
      winner === 'tie' ? 'Empate' : winner === teamId ? 'Gana' : 'Pierde';
    return state.teams[teamId].playerIds.map((playerId) => {
      const st = stats.find(
        (s) => s.team === teamId && s.playerId === playerId,
      );
      return {
        match_id: matchId,
        player_id: playerId,
        team: teamId,
        outcome,
        points: st?.totalPoints ?? 0,
        doubles: st?.doubles ?? 0,
        triples: st?.triples ?? 0,
      };
    });
  });

  if (playerRows.length > 0) {
    const { error: mpErr } = await supabase
      .from('match_players')
      .insert(playerRows);
    if (mpErr) throw mpErr;
  }

  if (state.plays.length > 0) {
    const playRows = state.plays.map((p) => ({
      match_id: matchId,
      ts: new Date(p.timestamp).toISOString(),
      minute: p.minute,
      team: p.team,
      player_id: p.playerId,
      shot_type: p.shotType,
      points: p.points,
    }));
    const { error: playsErr } = await supabase.from('plays').insert(playRows);
    if (playsErr) throw playsErr;
  }

  return matchId;
}
