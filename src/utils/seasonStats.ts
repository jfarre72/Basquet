import { PLAYERS_BY_ID } from '../data/players';
import type { DbMatch, DbMatchPlayer } from '../lib/queries';

export interface PlayerSeasonStat {
  playerId: number;
  playerName: string;
  TP: number;
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  puntaje: number;
  presentismo: number;
  puntos: number;
  ptosPorPJ: number | null;
}

export type SortKey =
  | 'puntaje'
  | 'pj'
  | 'pg'
  | 'presentismo'
  | 'puntos'
  | 'ptosPorPJ';

const WIN_PTS = 3;
const TIE_PTS = 1;
const LOSS_PTS = 1;

export function getMatchYear(match: DbMatch): number {
  return new Date(match.played_at).getUTCFullYear();
}

export function listAvailableYears(matches: DbMatch[]): number[] {
  const years = new Set<number>();
  for (const m of matches) years.add(getMatchYear(m));
  return [...years].sort((a, b) => b - a);
}

export function computeSeasonStats(
  year: number,
  allMatches: DbMatch[],
  allMatchPlayers: DbMatchPlayer[],
): PlayerSeasonStat[] {
  const seasonMatches = allMatches
    .filter((m) => getMatchYear(m) === year)
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
  const seasonMatchIds = new Set(seasonMatches.map((m) => m.id));
  const matchDateById = new Map(seasonMatches.map((m) => [m.id, m.played_at]));
  const seasonMps = allMatchPlayers.filter((mp) =>
    seasonMatchIds.has(mp.match_id),
  );

  const byPlayer = new Map<number, DbMatchPlayer[]>();
  for (const mp of seasonMps) {
    const arr = byPlayer.get(mp.player_id);
    if (arr) arr.push(mp);
    else byPlayer.set(mp.player_id, [mp]);
  }

  const out: PlayerSeasonStat[] = [];
  for (const [playerId, mps] of byPlayer) {
    const playedDates = mps
      .map((mp) => matchDateById.get(mp.match_id) ?? '')
      .filter(Boolean)
      .sort();
    const firstDate = playedDates[0];
    const TP = firstDate
      ? seasonMatches.filter((m) => m.played_at >= firstDate).length
      : 0;
    const PJ = mps.length;
    const PG = mps.filter((mp) => mp.outcome === 'Gana').length;
    const PE = mps.filter((mp) => mp.outcome === 'Empate').length;
    const PP = mps.filter((mp) => mp.outcome === 'Pierde').length;
    const puntaje = WIN_PTS * PG + TIE_PTS * PE + LOSS_PTS * PP;
    const presentismo = TP > 0 ? PJ / TP : 0;
    const puntos = mps.reduce((sum, mp) => sum + (mp.points ?? 0), 0);
    const matchesWithPoints = mps.filter((mp) => mp.points != null).length;
    const ptosPorPJ =
      matchesWithPoints > 0 ? puntos / matchesWithPoints : null;
    out.push({
      playerId,
      playerName: PLAYERS_BY_ID[playerId]?.name ?? `Jugador #${playerId}`,
      TP,
      PJ,
      PG,
      PE,
      PP,
      puntaje,
      presentismo,
      puntos,
      ptosPorPJ,
    });
  }

  return out;
}

export function sortSeasonStats(
  stats: PlayerSeasonStat[],
  key: SortKey,
): PlayerSeasonStat[] {
  const copy = [...stats];
  copy.sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (bv !== av) return bv - av;
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.playerName.localeCompare(b.playerName);
  });
  return copy;
}

function sortValue(s: PlayerSeasonStat, key: SortKey): number {
  switch (key) {
    case 'puntaje':
      return s.puntaje;
    case 'pj':
      return s.PJ;
    case 'pg':
      return s.PG;
    case 'presentismo':
      return s.presentismo;
    case 'puntos':
      return s.puntos;
    case 'ptosPorPJ':
      return s.ptosPorPJ ?? -1;
  }
}
