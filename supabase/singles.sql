-- =============================================================
-- Libres (1 punto): habilita registrar tiros de 1 punto.
-- Copiá y pegá en Supabase Dashboard → SQL Editor. Idempotente.
-- =============================================================

-- Cantidad de libres convertidos por jugador en cada partido.
alter table public.match_players
    add column if not exists singles integer;

-- Jugadas: permitir shot_type 'single' y points = 1.
alter table public.plays drop constraint if exists plays_shot_type_check;
alter table public.plays
    add constraint plays_shot_type_check
    check (shot_type in ('single','double','triple'));

alter table public.plays drop constraint if exists plays_points_check;
alter table public.plays
    add constraint plays_points_check
    check (points in (1,2,3));
