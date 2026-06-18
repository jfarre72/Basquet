-- =============================================================
-- Basquet — match_drafts: agregar fecha del partido
-- Idempotente. Correr UNA vez en Supabase Dashboard → SQL Editor.
-- =============================================================

alter table public.match_drafts
  add column if not exists play_date timestamptz;
