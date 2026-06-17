-- =============================================================
-- Basquet — Armado de partidos (drafts)
-- Permite guardar equipos prearmados y cargarlos en el Contador.
-- Correr UNA vez en Supabase Dashboard → SQL Editor.
-- Idempotente.
-- =============================================================

create table if not exists public.match_drafts (
    id            uuid primary key default gen_random_uuid(),
    name          text,
    team_a_name   text    not null default 'Negro',
    team_b_name   text    not null default 'Blanco',
    team_a_ids    integer[] not null default '{}',
    team_b_ids    integer[] not null default '{}',
    created_at    timestamptz not null default now()
);

alter table public.match_drafts enable row level security;

drop policy if exists "match_drafts_authed_all" on public.match_drafts;
create policy "match_drafts_authed_all" on public.match_drafts
  for all to authenticated
  using (true) with check (true);
