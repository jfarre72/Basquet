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

-- Movimientos: cada vez que se recauda o se paga plata.
create table if not exists public.caja_movimientos (
    id         uuid primary key default gen_random_uuid(),
    fecha      date not null default current_date,
    tipo       text not null check (tipo in ('recaudado','pagado')),
    concepto   text,
    monto      numeric not null check (monto >= 0),
    created_at timestamptz not null default now()
);
create index if not exists idx_caja_mov_fecha on public.caja_movimientos(fecha);

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
