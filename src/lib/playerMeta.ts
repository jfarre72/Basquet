import { supabase } from './supabase';

export type Hand = 'derecha' | 'izquierda';

export interface PlayerMeta {
  position: string; // código de 3 letras (BAS, ESC, ALE, ALP, PIV)
  heightCm: number;
  hand: Hand;
  frase: string; // frase emblemática que va abajo de la tarjeta
}

export const POSITIONS: { code: string; label: string }[] = [
  { code: 'BAS', label: 'Base' },
  { code: 'ESC', label: 'Escolta' },
  { code: 'ALE', label: 'Alero' },
  { code: 'ALP', label: 'Ala-Pívot' },
  { code: 'PIV', label: 'Pívot' },
];

/** PRNG determinístico por id, para defaults estables (no cambian por load). */
function seeded(id: number): () => number {
  let s = (id * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Valores random pero estables para un jugador sin datos cargados. */
export function defaultMeta(id: number): PlayerMeta {
  const r = seeded(id);
  const position = POSITIONS[Math.floor(r() * POSITIONS.length)].code;
  const heightCm = 168 + Math.floor(r() * 33); // 168–200
  const hand: Hand = r() < 0.82 ? 'derecha' : 'izquierda';
  return { position, heightCm, hand, frase: '' };
}

export function handLabel(hand: Hand): string {
  return hand === 'izquierda' ? 'ZURDO' : 'DIESTRO';
}

interface PlayerMetaRow {
  id: number;
  position: string | null;
  height_cm: number | null;
  handed: string | null;
  frase: string | null;
}

function fromRow(row: PlayerMetaRow): PlayerMeta {
  const d = defaultMeta(row.id);
  return {
    position: row.position ?? d.position,
    heightCm: row.height_cm ?? d.heightCm,
    hand: (row.handed as Hand) ?? d.hand,
    frase: row.frase ?? '',
  };
}

/** Lee el meta (posición/altura/mano) de todos los jugadores de una vez. */
export async function fetchMetaMap(): Promise<Record<number, PlayerMeta>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('players')
    .select('id, position, height_cm, handed, frase');
  if (error) throw error;
  const out: Record<number, PlayerMeta> = {};
  for (const row of (data ?? []) as PlayerMetaRow[]) {
    out[row.id] = fromRow(row);
  }
  return out;
}

/** ¿El jugador ya tiene ficha cargada? (para preguntar solo la primera vez). */
export async function metaExists(id: number): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from('players')
    .select('position')
    .eq('id', id)
    .maybeSingle();
  if (error) return false;
  return Boolean((data as { position: string | null } | null)?.position);
}

/** Guarda la ficha del jugador en la tabla players. */
export async function saveMeta(id: number, meta: PlayerMeta): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { error } = await supabase
    .from('players')
    .update({
      position: meta.position,
      height_cm: meta.heightCm,
      handed: meta.hand,
      frase: meta.frase.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;
}
