import type { Player, Sport } from '../types';

/**
 * Listado fijo de jugadores. Los IDs son estables (se mantienen entre
 * partidos para que los exports sean comparables) y el orden es el que
 * usamos para mostrarlos en pantalla.
 */
export const PLAYERS_BASQUET: Player[] = [
  { id: 4, name: 'Rodo' },
  { id: 9, name: 'Ema' },
  { id: 35, name: 'Angel P' },
  { id: 40, name: 'Ernesto' },
  { id: 2, name: 'Gabo' },
  { id: 41, name: 'Mateo' },
  { id: 14, name: 'Dani' },
  { id: 39, name: 'Nico T' },
  { id: 42, name: 'Lucas' },
  { id: 28, name: 'Juan R' },
  { id: 25, name: 'Facu P' },
  { id: 6, name: 'Juan' },
  { id: 5, name: 'Edu' },
  { id: 12, name: 'Safen' },
  { id: 1, name: 'Gabi' },
  { id: 16, name: 'Facu C' },
  { id: 29, name: 'Tincho' },
  { id: 24, name: 'Seba' },
  { id: 43, name: 'Adrian' },
  { id: 44, name: 'Jorge' },
  { id: 27, name: 'Ger' },
  { id: 26, name: 'Seba Jr' },
  { id: 23, name: 'Pick' },
  { id: 8, name: 'Alan' },
  { id: 45, name: 'Lolo' },
  { id: 46, name: 'Gero' },
  { id: 47, name: 'Bauti' },
  { id: 48, name: 'Facu M' },
];

export const PLAYERS_FUTBOL: Player[] = [
  { id: 101, name: 'Punga' },
  { id: 102, name: 'Ferrari' },
  { id: 103, name: 'Gonza' },
  { id: 104, name: 'Juan' },
  { id: 105, name: 'Facu' },
  { id: 106, name: 'Tincho Fontana' },
  { id: 107, name: 'Tincho Farré' },
  { id: 108, name: 'Vomba' },
  { id: 109, name: 'Fran' },
  { id: 110, name: 'Kenshi' },
];

/** Legacy export for compatibility. Defaults to basquet roster. */
export const PLAYERS: Player[] = PLAYERS_BASQUET;

export const PLAYERS_BY_ID: Record<number, Player> = Object.fromEntries(
  [...PLAYERS_BASQUET, ...PLAYERS_FUTBOL].map((p) => [p.id, p]),
);

export function getPlayersForSport(sport: Sport | null): Player[] {
  return sport === 'mundialito' ? PLAYERS_FUTBOL : PLAYERS_BASQUET;
}
