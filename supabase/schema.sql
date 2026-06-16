-- =============================================================
-- Basquet tracker — Schema base
-- Copiá y pegá este archivo en Supabase Dashboard → SQL Editor.
-- Idempotente: se puede correr varias veces sin romper nada.
-- =============================================================

-- Players: roster fijo con IDs estables.
create table if not exists public.players (
    id   integer primary key,
    name text    not null unique
);

-- Matches: un row por partido.
-- `partial = true` indica que el partido viene del histórico viejo y no tiene
-- info de equipo ni scores; solo resultado por jugador.
create table if not exists public.matches (
    id            uuid primary key default gen_random_uuid(),
    played_at     timestamptz not null default now(),
    finished_at   timestamptz,
    team_a_name   text not null default 'Negro',
    team_b_name   text not null default 'Blanco',
    score_a       integer,
    score_b       integer,
    winner        text check (winner in ('A','B','tie')),
    partial       boolean not null default false,
    created_at    timestamptz not null default now()
);
-- Compat: si la tabla ya existía sin la columna `partial`, agregarla.
alter table public.matches
    add column if not exists partial boolean not null default false;
-- Compat: si score_a/score_b eran NOT NULL, ahora deben permitir null.
alter table public.matches alter column score_a drop not null;
alter table public.matches alter column score_b drop not null;

-- Match players: qué jugadores estuvieron en cada equipo. `team` puede ser
-- null para partidos parciales históricos donde no sabemos el equipo.
create table if not exists public.match_players (
    match_id  uuid    not null references public.matches(id) on delete cascade,
    player_id integer not null references public.players(id),
    team      text    check (team in ('A','B')),
    outcome   text    check (outcome in ('Gana','Pierde','Empate')),
    points    integer,
    doubles   integer,
    triples   integer,
    primary key (match_id, player_id)
);
-- Compat con tabla previa
alter table public.match_players alter column team drop not null;
alter table public.match_players
    add column if not exists outcome text check (outcome in ('Gana','Pierde','Empate')),
    add column if not exists points integer,
    add column if not exists doubles integer,
    add column if not exists triples integer;

-- Plays: jugada a jugada.
create table if not exists public.plays (
    id         uuid primary key default gen_random_uuid(),
    match_id   uuid not null references public.matches(id) on delete cascade,
    ts         timestamptz not null default now(),
    minute     integer not null default 0,
    team       text not null check (team in ('A','B')),
    player_id  integer not null references public.players(id),
    shot_type  text not null check (shot_type in ('double','triple')),
    points     integer not null check (points in (2,3))
);
create index if not exists idx_plays_match on public.plays(match_id);
create index if not exists idx_plays_player on public.plays(player_id);

-- Photos: galería (para fase posterior).
create table if not exists public.photos (
    id            uuid primary key default gen_random_uuid(),
    match_id      uuid references public.matches(id) on delete set null,
    storage_path  text not null,
    caption       text,
    uploaded_at   timestamptz not null default now()
);

-- =============================================================
-- Row Level Security
-- Política: cualquier user autenticado puede leer y escribir.
-- Sin sesión (anon) no se ve nada.
-- =============================================================

alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
alter table public.plays         enable row level security;
alter table public.photos        enable row level security;

do $$
declare
    t text;
begin
    foreach t in array array['players','matches','match_players','plays','photos']
    loop
        execute format(
            'drop policy if exists "%s_authed_all" on public.%s', t, t
        );
        execute format(
            'create policy "%s_authed_all" on public.%s for all to authenticated using (true) with check (true)',
            t, t
        );
    end loop;
end $$;

-- =============================================================
-- Seed de jugadores (46) — IDs estables.
-- =============================================================

insert into public.players (id, name) values
    (1,  'Gabi'),
    (2,  'Gabo'),
    (3,  'Alejo'),
    (4,  'Rodo'),
    (5,  'Edu'),
    (6,  'Juan'),
    (7,  'Fede'),
    (8,  'Alan'),
    (9,  'Ema'),
    (10, 'Nico'),
    (11, 'Punga'),
    (12, 'Safen'),
    (13, 'Kenshi'),
    (14, 'Dani'),
    (15, 'Fran S'),
    (16, 'Facu C'),
    (17, 'Marcos'),
    (18, 'Facundo'),
    (19, 'Fabri'),
    (20, 'Walter'),
    (21, 'Valentin'),
    (22, 'Fran L'),
    (23, 'Pick'),
    (24, 'Seba'),
    (25, 'Facu P'),
    (26, 'Seba Jr'),
    (27, 'Ger'),
    (28, 'Juan R'),
    (29, 'Tincho'),
    (30, 'Claudio'),
    (31, 'Ivan'),
    (32, 'Negro'),
    (33, 'Nahuel'),
    (34, 'Juli C'),
    (35, 'Angel'),
    (36, 'Mariano'),
    (37, 'Lolo'),
    (38, 'Emilio'),
    (39, 'Nico T'),
    (40, 'Ernesto'),
    (41, 'Mateo'),
    (42, 'Lucas'),
    (43, 'Adrian'),
    (44, 'Jorge'),
    (45, 'Gero'),
    (46, 'Facu M'),
    (47, 'Bauti')
on conflict (id) do update set name = excluded.name;
