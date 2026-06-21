-- =============================================================
-- Basquet — Almacenamiento para la sección "Tarjetas"
-- Siluetas sin fondo -> avatars/cutouts/player-<id>.png
--
-- (La ficha del jugador —posición/altura/mano— se guarda en la tabla
--  players; ver supabase/player-ficha.sql.)
--
-- Correr UNA VEZ en Supabase Dashboard -> SQL Editor.
-- Idempotente: se puede re-correr sin romper nada.
-- =============================================================

-- 1) Bucket público "avatars" (lectura por URL pública).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- 2) Policies sobre storage.objects para el bucket "avatars":
--    - cualquiera puede leer (URLs públicas / HEAD para chequear existencia).
--    - sólo usuarios autenticados pueden subir / actualizar / borrar
--      (incluye las subcarpetas cutouts/ y cards/).

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
