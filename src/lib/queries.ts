import { supabase } from './supabase';

export interface DbMatch {
  id: string;
  played_at: string;
  team_a_name?: string | null;
  team_b_name?: string | null;
  winner?: 'A' | 'B' | 'tie' | null;
  partial?: boolean | null;
}

export interface DbMatchPlayer {
  match_id: string;
  player_id: number;
  team?: 'A' | 'B' | null;
  outcome: 'Gana' | 'Pierde' | 'Empate' | null;
  points: number | null;
  doubles: number | null;
  triples: number | null;
}

export interface DbPlay {
  match_id: string;
  ts: string;
  minute: number;
  team: 'A' | 'B';
  player_id: number;
  shot_type: 'double' | 'triple';
  points: number;
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

export async function fetchIndicadoresData(): Promise<{
  matches: DbMatch[];
  matchPlayers: DbMatchPlayer[];
  plays: DbPlay[];
}> {
  if (!supabase) return { matches: [], matchPlayers: [], plays: [] };
  const [matchesRes, mpRes, playsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, played_at, team_a_name, team_b_name, winner, partial'),
    supabase
      .from('match_players')
      .select('match_id, player_id, team, outcome, points, doubles, triples'),
    supabase
      .from('plays')
      .select('match_id, ts, minute, team, player_id, shot_type, points'),
  ]);
  if (matchesRes.error) throw matchesRes.error;
  if (mpRes.error) throw mpRes.error;
  if (playsRes.error) throw playsRes.error;
  return {
    matches: (matchesRes.data ?? []) as DbMatch[],
    matchPlayers: (mpRes.data ?? []) as DbMatchPlayer[],
    plays: (playsRes.data ?? []) as DbPlay[],
  };
}
