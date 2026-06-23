-- =============================================================
-- Basquet tracker — Caja (control de plata)
-- Copiá y pegá este archivo en Supabase Dashboard → SQL Editor.
-- Idempotente: se puede correr varias veces sin romper nada.
-- =============================================================

-- Configuración de la caja: un único row con el saldo inicial.
create table if not exists public.caja_config (
    id            integer primary key default 1,
    saldo_inicial numeric not null default 15000,
    constraint caja_config_singleton check (id = 1)
);

-- Seteamos desde la base un saldo inicial de $15000.
insert into public.caja_config (id, saldo_inicial)
values (1, 15000)
on conflict (id) do nothing;

-- Movimientos: un registro por partido/día.
-- Cada registro guarda cuántos fuimos, lo recaudado y lo pagado (gasto);
-- el neto (recaudado - pagado) suma o resta al saldo acumulado.
-- recaudado = jugadores * precio (se calcula en la app y se guarda).
create table if not exists public.caja_movimientos (
    id         uuid primary key default gen_random_uuid(),
    fecha      date not null default current_date,
    jugadores  integer not null default 0,
    precio     numeric not null default 0 check (precio >= 0),
    recaudado  numeric not null default 0 check (recaudado >= 0),
    pagado     numeric not null default 0 check (pagado >= 0),
    created_at timestamptz not null default now()
);
create index if not exists idx_caja_mov_fecha on public.caja_movimientos(fecha);

-- Compat: si la tabla venía del esquema viejo (tipo/monto), adaptarla.
alter table public.caja_movimientos
    add column if not exists jugadores integer not null default 0,
    add column if not exists precio    numeric not null default 0,
    add column if not exists recaudado numeric not null default 0,
    add column if not exists pagado    numeric not null default 0;
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'caja_movimientos'
          and column_name = 'monto'
    ) then
        alter table public.caja_movimientos alter column monto drop not null;
    end if;
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'caja_movimientos'
          and column_name = 'tipo'
    ) then
        alter table public.caja_movimientos alter column tipo drop not null;
    end if;
end $$;

-- =============================================================
-- Row Level Security: cualquier user autenticado lee y escribe.
-- =============================================================

alter table public.caja_config      enable row level security;
alter table public.caja_movimientos enable row level security;

do $$
declare
    t text;
begin
    foreach t in array array['caja_config','caja_movimientos']
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
