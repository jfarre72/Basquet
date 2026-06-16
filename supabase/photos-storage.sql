-- =============================================================
-- Basquet — Storage setup para la galería de fotos
-- Correr UNA VEZ en Supabase Dashboard → SQL Editor.
-- Idempotente: se puede re-correr sin romper nada.
-- =============================================================

-- 1) Bucket público "photos" (las URLs no requieren firma).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- 2) Policies sobre storage.objects para el bucket "photos":
--    - cualquiera puede leer (las URLs públicas funcionan sin sesión).
--    - sólo usuarios autenticados pueden subir o borrar.

drop policy if exists "photos_public_read"   on storage.objects;
drop policy if exists "photos_authed_upload" on storage.objects;
drop policy if exists "photos_authed_update" on storage.objects;
drop policy if exists "photos_authed_delete" on storage.objects;

create policy "photos_public_read" on storage.objects
  for select to public
  using (bucket_id = 'photos');

create policy "photos_authed_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos');

create policy "photos_authed_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos')
  with check (bucket_id = 'photos');

create policy "photos_authed_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos');
