import { supabase } from './supabase';

const BUCKET = 'avatars';

export interface DbPlayerAvatar {
  id: number;
  name: string;
  avatar_path: string | null;
}

export function getAvatarUrl(path: string): string {
  if (!supabase) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Mapa playerId -> avatar_path para los jugadores que tienen avatar. */
export async function fetchAvatars(): Promise<Record<number, string>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('players')
    .select('id, avatar_path')
    .not('avatar_path', 'is', null);
  if (error) throw error;
  const map: Record<number, string> = {};
  for (const row of (data ?? []) as { id: number; avatar_path: string }[]) {
    map[row.id] = row.avatar_path;
  }
  return map;
}

/** Sube la selfie de un jugador y guarda la ruta en la tabla players. */
export async function uploadAvatar(
  playerId: number,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `player-${playerId}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (up.error) throw up.error;
  const { error } = await supabase
    .from('players')
    .update({ avatar_path: path })
    .eq('id', playerId);
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return path;
}
