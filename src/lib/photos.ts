import { supabase } from './supabase';

export interface DbPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
  match_id: string | null;
}

const BUCKET = 'photos';

export function getPhotoUrl(path: string): string {
  if (!supabase) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function listPhotos(): Promise<DbPhoto[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, caption, uploaded_at, match_id')
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbPhoto[];
}

export async function uploadPhoto(file: File): Promise<DbPhoto> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (up.error) throw up.error;
  const ins = await supabase
    .from('photos')
    .insert({ storage_path: path })
    .select('id, storage_path, caption, uploaded_at, match_id')
    .single();
  if (ins.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw ins.error;
  }
  return ins.data as DbPhoto;
}

export async function deletePhoto(photo: DbPhoto): Promise<void> {
  if (!supabase) throw new Error('Sin conexión a Supabase.');
  await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
}
