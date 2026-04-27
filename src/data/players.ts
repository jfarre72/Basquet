import type { Player } from '../types';

/**
 * Listado fijo de jugadores. Los IDs son estables (se mantienen entre
 * partidos para que los exports sean comparables) y el orden es el que
 * usamos para mostrarlos en pantalla.
 */
export const PLAYERS: Player[] = [
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
];

export const PLAYERS_BY_ID: Record<number, Player> = Object.fromEntries(
  PLAYERS.map((p) => [p.id, p]),
);
