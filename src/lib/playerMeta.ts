import { supabase } from './supabase';

export type Hand = 'derecha' | 'izquierda';

export interface PlayerMeta {
  position: string; // código de 3 letras (BAS, ESC, ALE, ALP, PIV)
  heightCm: number;
  hand: Hand;
}

export const POSITIONS: { code: string; label: string }[] = [
  { code: 'BAS', label: 'Base' },
  { code: 'ESC', label: 'Escolta' },
  { code: 'ALE', label: 'Alero' },
  { code: 'ALP', label: 'Ala-Pívot' },
  { code: 'PIV', label: 'Pívot' },
];

const BUCKET = 'avatars';
const metaPath = (id: number) => `cards/player-${id}.json`;

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
  return { position, heightCm, hand };
}

export function handLabel(hand: Hand): string {
  return hand === 'izquierda' ? 'ZURDO' : 'DIESTRO';
}

function publicUrl(id: number): string {
  if (!supabase) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(metaPath(id)).data.publicUrl;
}

/** Lee el meta guardado de un jugador; si no existe, devuelve el default. */
export async function fetchMeta(id: number): Promise<PlayerMeta> {
  const fallback = defaultMeta(id);
  if (!supabase) return fallback;
  try {
    const res = await fetch(`${publicUrl(id)}?t=${Date.now()}`);
    if (!res.ok) return fallback;
    const json = (await res.json()) as Partial<PlayerMeta>;
    return {
      position: json.position ?? fallback.position,
      heightCm: json.heightCm ?? fallback.heightCm,
      hand: json.hand ?? fallback.hand,
    };
  } catch {
    return fallback;
  }
}

/** ¿El jugador ya tiene meta guardado? (para preguntar solo la primera vez). */
export async function metaExists(id: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const res = await fetch(`${publicUrl(id)}?t=${Date.now()}`, {
      method: 'HEAD',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Guarda el meta del jugador en Supabase. */
export async function saveMeta(id: number, meta: PlayerMeta): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(metaPath(id), blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/json',
    });
  if (error) throw error;
}
