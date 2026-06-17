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

export interface DbDraft {
  id: string;
  name: string | null;
  team_a_name: string;
  team_b_name: string;
  team_a_ids: number[];
  team_b_ids: number[];
  created_at: string;
}

export interface DraftInput {
  name: string | null;
  team_a_name: string;
  team_b_name: string;
  team_a_ids: number[];
  team_b_ids: number[];
}

export async function fetchDrafts(): Promise<DbDraft[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('match_drafts')
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbDraft[];
}

export async function createDraft(input: DraftInput): Promise<DbDraft> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { data, error } = await supabase
    .from('match_drafts')
    .insert(input)
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, created_at')
    .single();
  if (error) throw error;
  return data as DbDraft;
}

export async function updateDraft(
  id: string,
  input: DraftInput,
): Promise<DbDraft> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { data, error } = await supabase
    .from('match_drafts')
    .update(input)
    .eq('id', id)
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, created_at')
    .single();
  if (error) throw error;
  return data as DbDraft;
}

export async function deleteDraft(id: string): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { error } = await supabase.from('match_drafts').delete().eq('id', id);
  if (error) throw error;
}

export interface DbHistoric {
  id: string;
  played_at: string;
  finished_at: string | null;
  team_a_name: string;
  team_b_name: string;
  score_a: number | null;
  score_b: number | null;
  winner: 'A' | 'B' | 'tie' | null;
  partial: boolean;
}

export async function fetchHistoricos(): Promise<DbHistoric[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, played_at, finished_at, team_a_name, team_b_name, score_a, score_b, winner, partial',
    )
    .order('played_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbHistoric[];
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
