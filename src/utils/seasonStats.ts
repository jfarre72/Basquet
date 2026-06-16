import { PLAYERS_BY_ID } from '../data/players';
import type { DbMatch, DbMatchPlayer } from '../lib/queries';

export type Outcome = 'Gana' | 'Pierde' | 'Empate';

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
  /** Últimos partidos (más viejo → más reciente), hasta 7. */
  form: Outcome[];
}

export interface MonthBucket {
  /** 0-11 */
  month: number;
  label: string;
  jugados: number;
  pendientes: number;
}

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

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

export function getMatchMonth(match: DbMatch): number {
  return new Date(match.played_at).getUTCMonth();
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
    const form = [...mps]
      .filter((mp) => mp.outcome != null)
      .sort((a, b) =>
        (matchDateById.get(a.match_id) ?? '').localeCompare(
          matchDateById.get(b.match_id) ?? '',
        ),
      )
      .slice(-7)
      .map((mp) => mp.outcome as Outcome);
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
      form,
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

/** Martes (días) de un mes dado, como timestamps en ms. */
function tuesdaysInMonth(year: number, month: number): number[] {
  const out: number[] = [];
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCMonth() === month) {
    if (d.getUTCDay() === 2) out.push(d.getTime());
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/**
 * Partidos jugados vs. pendientes por mes del año filtrado.
 * - jugados: partidos efectivamente registrados ese mes.
 * - pendientes: martes futuros (posteriores a hoy) todavía sin jugar.
 * Devuelve sólo el rango de meses con actividad o pendientes.
 */
export function computeMonthly(
  year: number,
  matches: DbMatch[],
  now: number = Date.now(),
): MonthBucket[] {
  const jugadosByMonth = new Array(12).fill(0);
  for (const m of matches) {
    if (getMatchYear(m) === year) jugadosByMonth[getMatchMonth(m)] += 1;
  }

  const buckets: MonthBucket[] = [];
  for (let month = 0; month < 12; month++) {
    const jugados = jugadosByMonth[month];
    const pendientes = tuesdaysInMonth(year, month).filter(
      (t) => t > now,
    ).length;
    buckets.push({ month, label: MONTH_LABELS[month], jugados, pendientes });
  }

  const first = buckets.findIndex((b) => b.jugados > 0 || b.pendientes > 0);
  let last = -1;
  buckets.forEach((b, i) => {
    if (b.jugados > 0 || b.pendientes > 0) last = i;
  });
  if (first === -1) return [];
  return buckets.slice(first, last + 1);
}
