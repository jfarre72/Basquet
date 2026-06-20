import type { Player } from '../types';

/**
 * Roster oficial con IDs estables. Los IDs no cambian entre partidos para
 * que los exports e (eventualmente) la base de datos sean comparables.
 */
export const PLAYERS: Player[] = [
  { id: 1, name: 'Gabi' },
  { id: 2, name: 'Gabo' },
  { id: 3, name: 'Alejo' },
  { id: 4, name: 'Rodo' },
  { id: 5, name: 'Edu' },
  { id: 6, name: 'Juan' },
  { id: 7, name: 'Fede' },
  { id: 8, name: 'Alan' },
  { id: 9, name: 'Ema' },
  { id: 10, name: 'Nico' },
  { id: 11, name: 'Punga' },
  { id: 12, name: 'Safen' },
  { id: 13, name: 'Kenshi' },
  { id: 14, name: 'Dani' },
  { id: 15, name: 'Fran S' },
  { id: 16, name: 'Facu C' },
  { id: 17, name: 'Marcos' },
  { id: 18, name: 'Facundo' },
  { id: 19, name: 'Fabri' },
  { id: 20, name: 'Walter' },
  { id: 21, name: 'Valentin' },
  { id: 22, name: 'Fran L' },
  { id: 23, name: 'Pick' },
  { id: 24, name: 'Seba' },
  { id: 25, name: 'Facu P' },
  { id: 26, name: 'Seba Jr' },
  { id: 27, name: 'Ger' },
  { id: 28, name: 'Juan R' },
  { id: 29, name: 'Tincho' },
  { id: 30, name: 'Claudio' },
  { id: 31, name: 'Ivan' },
  { id: 32, name: 'Negro' },
  { id: 33, name: 'Nahuel' },
  { id: 34, name: 'Juli C' },
  { id: 35, name: 'Angel' },
  { id: 36, name: 'Mariano' },
  { id: 37, name: 'Lolo' },
  { id: 38, name: 'Emilio' },
  { id: 39, name: 'Nico T' },
  { id: 40, name: 'Ernesto' },
  { id: 41, name: 'Mateo' },
  { id: 42, name: 'Lucas' },
  { id: 43, name: 'Adrian' },
  { id: 44, name: 'Jorge' },
  { id: 45, name: 'Gero' },
  { id: 46, name: 'Facu M' },
  { id: 47, name: 'Bauti' },
];

export const PLAYERS_BY_ID: Record<number, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);

/** Mismo roster pero ordenado alfabéticamente por nombre. */
export const PLAYERS_SORTED: Player[] = [...PLAYERS].sort((a, b) =>
  a.name.localeCompare(b.name),
);

/**
 * Aplica los nombres guardados en la base sobre el roster local. Como
 * PLAYERS, PLAYERS_BY_ID y PLAYERS_SORTED comparten las mismas referencias de
 * objeto, mutar `name` impacta en todas las tablas que usan el roster.
 * Se reordena PLAYERS_SORTED para mantener el orden alfabético.
 */
export function applyPlayerNames(rows: { id: number; name: string }[]): void {
  for (const r of rows) {
    const p = PLAYERS_BY_ID[r.id];
    if (p && r.name && r.name.trim()) p.name = r.name.trim();
  }
  PLAYERS_SORTED.sort((a, b) => a.name.localeCompare(b.name));
}
