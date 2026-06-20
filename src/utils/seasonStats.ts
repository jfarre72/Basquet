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
  dobles: number;
  triples: number;
  ptosPorPJ: number | null;
  /** Últimos partidos del torneo (más viejo → más reciente), hasta 7.
   *  null = el jugador no fue a ese partido. */
  form: (Outcome | null)[];
}

export interface MonthBucket {
  /** 0-11 */
  month: number;
  label: string;
  jugados: number;
  pendientes: number;
  /** Cantidad de martes que tiene el mes (máximo posible de partidos). */
  martes: number;
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
  | 'name'
  | 'puntaje'
  | 'pj'
  | 'pg'
  | 'pe'
  | 'pp'
  | 'tp'
  | 'presentismo'
  | 'puntos'
  | 'dobles'
  | 'triples'
  | 'ptosPorPJ';

export type SortDir = 'asc' | 'desc';

const WIN_PTS = 3;
const TIE_PTS = 2;
const LOSS_PTS = 1;

export type Tournament = 'completo' | 'apertura' | 'clausura';

export function isMonthInTournament(month: number, t: Tournament): boolean {
  if (t === 'apertura') return month >= 0 && month <= 5;
  if (t === 'clausura') return month >= 6 && month <= 11;
  return true;
}

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
  tournament: Tournament = 'completo',
): PlayerSeasonStat[] {
  const seasonMatches = allMatches
    .filter(
      (m) =>
        getMatchYear(m) === year &&
        isMonthInTournament(getMatchMonth(m), tournament),
    )
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
    const dobles = mps.reduce((sum, mp) => sum + (mp.doubles ?? 0), 0);
    const triples = mps.reduce((sum, mp) => sum + (mp.triples ?? 0), 0);
    const matchesWithPoints = mps.filter((mp) => mp.points != null).length;
    const ptosPorPJ =
      matchesWithPoints > 0 ? puntos / matchesWithPoints : null;
    const form: (Outcome | null)[] = seasonMatches
      .slice(-7)
      .map((m) => {
        const mp = mps.find((x) => x.match_id === m.id);
        return (mp?.outcome ?? null) as Outcome | null;
      });
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
      dobles,
      triples,
      ptosPorPJ,
      form,
    });
  }

  return out;
}

export interface PlayerMatchDetail {
  matchId: string;
  date: string;
  outcome: Outcome | null;
  points: number | null;
  dobles: number;
  triples: number;
}

/** Detalle de cada partido que jugó un jugador en el año/torneo, del más
 *  reciente al más viejo. */
export function computePlayerMatches(
  playerId: number,
  year: number,
  allMatches: DbMatch[],
  allMatchPlayers: DbMatchPlayer[],
  tournament: Tournament = 'completo',
): PlayerMatchDetail[] {
  const seasonMatches = allMatches.filter(
    (m) =>
      getMatchYear(m) === year &&
      isMonthInTournament(getMatchMonth(m), tournament),
  );
  const dateById = new Map(seasonMatches.map((m) => [m.id, m.played_at]));
  return allMatchPlayers
    .filter((mp) => mp.player_id === playerId && dateById.has(mp.match_id))
    .map((mp) => ({
      matchId: mp.match_id,
      date: dateById.get(mp.match_id) ?? '',
      outcome: mp.outcome,
      points: mp.points,
      dobles: mp.doubles ?? 0,
      triples: mp.triples ?? 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function sortSeasonStats(
  stats: PlayerSeasonStat[],
  key: SortKey,
  dir: SortDir = 'desc',
): PlayerSeasonStat[] {
  const copy = [...stats];
  const mult = dir === 'asc' ? 1 : -1;
  copy.sort((a, b) => {
    if (key === 'name') {
      return a.playerName.localeCompare(b.playerName) * mult;
    }
    const diff = (sortValue(b, key) - sortValue(a, key)) * (mult === 1 ? -1 : 1);
    if (diff !== 0) return diff;
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
    case 'pe':
      return s.PE;
    case 'pp':
      return s.PP;
    case 'tp':
      return s.TP;
    case 'presentismo':
      return s.presentismo;
    case 'puntos':
      return s.puntos;
    case 'dobles':
      return s.dobles;
    case 'triples':
      return s.triples;
    case 'ptosPorPJ':
      return s.ptosPorPJ ?? -1;
    case 'name':
      return 0;
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
  tournament: Tournament = 'completo',
  now: number = Date.now(),
): MonthBucket[] {
  const jugadosByMonth = new Array(12).fill(0);
  for (const m of matches) {
    if (getMatchYear(m) === year) jugadosByMonth[getMatchMonth(m)] += 1;
  }

  const buckets: MonthBucket[] = [];
  for (let month = 0; month < 12; month++) {
    if (!isMonthInTournament(month, tournament)) continue;
    const jugados = jugadosByMonth[month];
    const tuesdays = tuesdaysInMonth(year, month);
    const pendientes = tuesdays.filter((t) => t > now).length;
    buckets.push({
      month,
      label: MONTH_LABELS[month],
      jugados,
      pendientes,
      martes: tuesdays.length,
    });
  }

  if (tournament !== 'completo') return buckets;

  const first = buckets.findIndex((b) => b.jugados > 0 || b.pendientes > 0);
  let last = -1;
  buckets.forEach((b, i) => {
    if (b.jugados > 0 || b.pendientes > 0) last = i;
  });
  if (first === -1) return [];
  return buckets.slice(first, last + 1);
}
