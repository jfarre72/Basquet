-- =============================================================
-- Basquet — Avatares de jugadores (sección Jugadores)
-- Correr UNA VEZ en Supabase Dashboard → SQL Editor.
-- Idempotente: se puede re-correr sin romper nada.
-- =============================================================

-- 1) Columna avatar_path en players (ruta dentro del bucket "avatars").
alter table public.players
    add column if not exists avatar_path text;

-- 2) Bucket público "avatars".
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 3) Policies sobre storage.objects para el bucket "avatars":
--    - cualquiera puede leer (URLs públicas).
--    - sólo usuarios autenticados pueden subir / actualizar / borrar.

drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_authed_upload" on storage.objects;
drop policy if exists "avatars_authed_update" on storage.objects;
drop policy if exists "avatars_authed_delete" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

create policy "avatars_authed_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "avatars_authed_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "avatars_authed_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars');
