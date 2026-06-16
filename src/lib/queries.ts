import { supabase } from './supabase';

export interface DbMatch {
  id: string;
  played_at: string;
}

export interface DbMatchPlayer {
  match_id: string;
  player_id: number;
  outcome: 'Gana' | 'Pierde' | 'Empate' | null;
  points: number | null;
  doubles: number | null;
  triples: number | null;
}

export async function fetchSeasonData(): Promise<{
  matches: DbMatch[];
  matchPlayers: DbMatchPlayer[];
}> {
  if (!supabase) {
    return { matches: [], matchPlayers: [] };
  }
  const [matchesRes, mpRes] = await Promise.all([
    supabase.from('matches').select('id, played_at'),
    supabase
      .from('match_players')
      .select('match_id, player_id, outcome, points, doubles, triples'),
  ]);
  if (matchesRes.error) throw matchesRes.error;
  if (mpRes.error) throw mpRes.error;
  return {
    matches: (matchesRes.data ?? []) as DbMatch[],
    matchPlayers: (mpRes.data ?? []) as DbMatchPlayer[],
  };
}
