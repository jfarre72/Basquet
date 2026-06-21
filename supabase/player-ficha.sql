-- =============================================================
-- Basquet — Ficha del jugador para las Tarjetas
-- Columnas en la tabla players: posición, altura y mano hábil.
-- Correr UNA VEZ en Supabase Dashboard -> SQL Editor.
-- Idempotente: se puede re-correr sin romper nada.
-- =============================================================

alter table public.players
    add column if not exists position  text,   -- BAS / ESC / ALE / ALP / PIV
    add column if not exists height_cm integer, -- altura en centímetros
    add column if not exists handed    text;   -- 'derecha' | 'izquierda'

-- Nota: la lectura/escritura usa las policies existentes de la tabla players.
-- Si actualizar la ficha diera error de permisos, asegurate de tener una
-- policy de UPDATE para usuarios autenticados sobre public.players (la misma
-- que ya permite editar el nombre del jugador).
