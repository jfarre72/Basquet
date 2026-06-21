import { removeBgBlob } from './cutout';
import { supabase } from './supabase';

const BUCKET = 'avatars';

/** Ruta del recorte sin fondo asociado a una foto de avatar. */
export function cutoutPathFor(avatarPath: string): string {
  const base = avatarPath.replace(/\.[^.]+$/, '');
  return `cutouts/${base}.png`;
}

/** URL pública del recorte sin fondo (puede no existir todavía). */
export function getCutoutUrl(avatarPath: string): string {
  return getAvatarUrl(cutoutPathFor(avatarPath));
}

/**
 * Garantiza que exista la silueta sin fondo guardada en Supabase. Si no
 * existe (fotos viejas), la genera en el cliente UNA vez, la sube y devuelve
 * su URL pública persistida (para reusarla siempre, sin reprocesar).
 */
export async function ensureStoredCutout(avatarPath: string): Promise<string> {
  const blob = await removeBgBlob(getAvatarUrl(avatarPath));
  if (supabase) {
    try {
      await supabase.storage
        .from(BUCKET)
        .upload(cutoutPathFor(avatarPath), blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/png',
        });
      // Persistido: devolvemos la URL pública (con cache-bust para refrescar).
      return `${getCutoutUrl(avatarPath)}?t=${Date.now()}`;
    } catch {
      /* no se pudo persistir (p. ej. policy): mostramos igual esta sesión */
    }
  }
  return URL.createObjectURL(blob);
}

export interface DbPlayerAvatar {
  id: number;
  name: string;
  avatar_path: string | null;
}

export function getAvatarUrl(path: string): string {
  if (!supabase) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Cache global de rutas de avatar por jugador, para que cualquier vista pueda
 *  mostrar la foto al lado del nombre sin volver a consultar. */
const avatarPaths: Record<number, string> = {};

export function setAvatarPaths(map: Record<number, string>): void {
  for (const k of Object.keys(avatarPaths)) delete avatarPaths[Number(k)];
  Object.assign(avatarPaths, map);
}

export function setAvatarPath(id: number, path: string): void {
  avatarPaths[id] = path;
}

/** URL pública del avatar del jugador, o null si no tiene foto cargada. */
export function getPlayerAvatarUrl(id: number): string | null {
  const path = avatarPaths[id];
  return path ? getAvatarUrl(path) : null;
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

/** Nombres guardados en la base (para aplicar overrides al roster local). */
export async function fetchPlayerNames(): Promise<
  { id: number; name: string }[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('players').select('id, name');
  if (error) throw error;
  return (data ?? []) as { id: number; name: string }[];
}

/** Renombra a un jugador. El cambio queda en players.name e impacta en todas
 *  las tablas (que resuelven el nombre desde el roster). */
export async function updatePlayerName(
  id: number,
  name: string,
): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const { error } = await supabase
    .from('players')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
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

  // Genera y guarda automáticamente la versión sin fondo (silueta). Es
  // best-effort: si falla, la foto igual queda subida.
  try {
    const cutout = await removeBgBlob(file);
    await supabase.storage.from(BUCKET).upload(cutoutPathFor(path), cutout, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png',
    });
  } catch {
    /* el recorte se intentará en el cliente al ver la tarjeta */
  }

  return path;
}
