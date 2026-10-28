import { supabase } from './supabase';

const PAGE_SIZE = 1000;

/** Supabase devuelve como máximo 1000 filas por consulta: pagina hasta traer
 *  todas para que las estadísticas no queden cortadas. */
async function fetchAllRows<T>(
  table: string,
  columns: string,
  order: { column: string; ascending?: boolean }[] = [
    { column: 'match_id' },
    { column: 'player_id' },
  ],
): Promise<T[]> {
  if (!supabase) return [];
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(columns);
    for (const o of order) {
      query = query.order(o.column, { ascending: o.ascending ?? true });
    }
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
}

export interface DbMatch {
  id: string;
  played_at: string;
  team_a_name?: string | null;
  team_b_name?: string | null;
  score_a?: number | null;
  score_b?: number | null;
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
    fetchAllRows<DbMatchPlayer>(
      'match_players',
      'match_id, player_id, outcome, points, doubles, triples',
    ),
  ]);
  if (matchesRes.error) throw matchesRes.error;
  return {
    matches: (matchesRes.data ?? []) as DbMatch[],
    matchPlayers: mpRes,
  };
}

export interface DbDraft {
  id: string;
  name: string | null;
  team_a_name: string;
  team_b_name: string;
  team_a_ids: number[];
  team_b_ids: number[];
  play_date: string | null;
  created_at: string;
}

export interface DraftInput {
  name: string | null;
  team_a_name: string;
  team_b_name: string;
  team_a_ids: number[];
  team_b_ids: number[];
  play_date: string | null;
}

export async function fetchDrafts(): Promise<DbDraft[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('match_drafts')
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, play_date, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbDraft[];
}

export async function createDraft(input: DraftInput): Promise<DbDraft> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { data, error } = await supabase
    .from('match_drafts')
    .insert(input)
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, play_date, created_at')
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
    .select('id, name, team_a_name, team_b_name, team_a_ids, team_b_ids, play_date, created_at')
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

export async function fetchAllPlays(): Promise<{
  plays: DbPlay[];
  matches: DbMatch[];
}> {
  if (!supabase) return { plays: [], matches: [] };
  const [pRes, mRes] = await Promise.all([
    fetchAllRows<DbPlay>(
      'plays',
      'match_id, ts, minute, team, player_id, shot_type, points',
      [{ column: 'ts', ascending: false }, { column: 'id' }],
    ),
    supabase
      .from('matches')
      .select('id, played_at, team_a_name, team_b_name'),
  ]);
  if (mRes.error) throw mRes.error;
  return {
    plays: pRes,
    matches: (mRes.data ?? []) as DbMatch[],
  };
}

export async function fetchResultados(): Promise<{
  matches: DbHistoric[];
  matchPlayers: DbMatchPlayer[];
}> {
  if (!supabase) return { matches: [], matchPlayers: [] };
  const [mRes, mpRes] = await Promise.all([
    supabase
      .from('matches')
      .select(
        'id, played_at, finished_at, team_a_name, team_b_name, score_a, score_b, winner, partial',
      )
      .order('played_at', { ascending: false }),
    fetchAllRows<DbMatchPlayer>(
      'match_players',
      'match_id, player_id, team, outcome, points, doubles, triples',
    ),
  ]);
  if (mRes.error) throw mRes.error;
  return {
    matches: (mRes.data ?? []) as DbHistoric[],
    matchPlayers: mpRes,
  };
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

// ===== Caja (movimientos de plata) =====

export interface DbCajaMovimiento {
  id: string;
  fecha: string;
  jugadores: number;
  precio: number;
  recaudado: number;
  pagado: number;
  created_at: string;
}

export interface CajaMovimientoInput {
  fecha: string;
  jugadores: number;
  precio: number;
  recaudado: number;
  pagado: number;
}

/** Saldo inicial seteado desde la base (por defecto $15000). */
export async function fetchSaldoInicial(): Promise<number> {
  if (!supabase) return 15000;
  const { data, error } = await supabase
    .from('caja_config')
    .select('saldo_inicial')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.saldo_inicial ?? 15000);
}

export async function fetchCajaMovimientos(): Promise<DbCajaMovimiento[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('caja_movimientos')
    .select('id, fecha, jugadores, precio, recaudado, pagado, created_at')
    .order('fecha', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => {
    const row = m as DbCajaMovimiento;
    return {
      ...row,
      jugadores: Number(row.jugadores),
      precio: Number(row.precio),
      recaudado: Number(row.recaudado),
      pagado: Number(row.pagado),
    };
  });
}

export async function addCajaMovimiento(
  input: CajaMovimientoInput,
): Promise<DbCajaMovimiento> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { data, error } = await supabase
    .from('caja_movimientos')
    .insert(input)
    .select('id, fecha, jugadores, precio, recaudado, pagado, created_at')
    .single();
  if (error) throw error;
  const row = data as DbCajaMovimiento;
  return {
    ...row,
    jugadores: Number(row.jugadores),
    precio: Number(row.precio),
    recaudado: Number(row.recaudado),
    pagado: Number(row.pagado),
  };
}

export async function deleteCajaMovimiento(id: string): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { error } = await supabase.from('caja_movimientos').delete().eq('id', id);
  if (error) throw error;
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
      .select('id, played_at, team_a_name, team_b_name, score_a, score_b, winner, partial'),
    fetchAllRows<DbMatchPlayer>(
      'match_players',
      'match_id, player_id, team, outcome, points, doubles, triples',
    ),
    fetchAllRows<DbPlay>(
      'plays',
      'match_id, ts, minute, team, player_id, shot_type, points',
      [{ column: 'id' }],
    ),
  ]);
  if (matchesRes.error) throw matchesRes.error;
  return {
    matches: (matchesRes.data ?? []) as DbMatch[],
    matchPlayers: mpRes,
    plays: playsRes,
  };
}
