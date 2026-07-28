import type { DbMatchPlayer } from '../lib/queries';
import { defaultMeta, type PlayerMeta } from '../lib/playerMeta';

/**
 * Rating de un jugador usado para armar equipos parejos. Los tres ejes son los
 * que pidió el usuario: OVR, altura y puntos por partido.
 */
export interface PlayerRating {
  /** OVR 40–99, mismo cálculo que las tarjetas. */
  ovr: number;
  /** Puntos por partido (promedio); 0 si nunca anotó / sin datos. */
  ppp: number;
  /** Altura en cm. */
  heightCm: number;
}

const BASE_OVR = 52; // raw = 52 con 0 ppp y 0% de victorias → OVR base

/**
 * Calcula el rating (OVR + ppp + altura) de cada jugador a partir de las
 * jugadas históricas y la ficha (altura). El OVR replica la fórmula de las
 * tarjetas (`computeCareer` en Tarjetas.tsx): 52 + ppp*2.2 + winRate*30.
 */
export function computeRatings(
  mps: DbMatchPlayer[],
  metaById: Record<number, PlayerMeta>,
): Map<number, PlayerRating> {
  const agg = new Map<
    number,
    { PJ: number; PG: number; puntos: number; withPoints: number }
  >();
  for (const mp of mps) {
    const s =
      agg.get(mp.player_id) ?? { PJ: 0, PG: 0, puntos: 0, withPoints: 0 };
    s.PJ += 1;
    if (mp.outcome === 'Gana') s.PG += 1;
    s.puntos += mp.points ?? 0;
    if (mp.points != null) s.withPoints += 1;
    agg.set(mp.player_id, s);
  }
  const out = new Map<number, PlayerRating>();
  for (const [id, s] of agg) {
    const ppp = s.withPoints > 0 ? s.puntos / s.withPoints : 0;
    const winRate = s.PJ > 0 ? s.PG / s.PJ : 0;
    const raw = BASE_OVR + ppp * 2.2 + winRate * 30;
    const ovr = Math.max(40, Math.min(99, Math.round(raw)));
    const heightCm = metaById[id]?.heightCm ?? defaultMeta(id).heightCm;
    out.set(id, { ovr, ppp, heightCm });
  }
  return out;
}

/** Rating con fallback para un jugador sin historial (recién sumado). */
export function ratingOf(
  id: number,
  ratingById: Map<number, PlayerRating>,
  metaById?: Record<number, PlayerMeta>,
): PlayerRating {
  return (
    ratingById.get(id) ?? {
      ovr: BASE_OVR,
      ppp: 0,
      heightCm: metaById?.[id]?.heightCm ?? defaultMeta(id).heightCm,
    }
  );
}

export interface BalanceResult {
  teamA: number[];
  teamB: number[];
}

// Peso de cada eje en la "fuerza" con la que se equilibra. El OVR manda porque
// ya resume puntos + victorias; la altura y los puntos afinan el reparto.
const W_OVR = 0.55;
const W_PPP = 0.2;
const W_HEIGHT = 0.25;

/**
 * Reparte `ids` en dos equipos lo más parejos posible según OVR, altura y
 * puntos. Cada eje se normaliza dentro del grupo elegido (para que convivan
 * escalas distintas: OVR ~40–99, altura ~168–200, ppp ~0–15) y se combinan en
 * un puntaje de fuerza. Primero un reparto greedy balanceado por tamaño y luego
 * una mejora por intercambios de a pares. Es determinístico (a diferencia de
 * "Sortear", que es al azar).
 */
export function balanceTeams(
  ids: number[],
  ratingById: Map<number, PlayerRating>,
  metaById?: Record<number, PlayerMeta>,
): BalanceResult {
  if (ids.length <= 1) return { teamA: ids.slice(0, 1), teamB: [] };

  const players = ids.map((id) => ({
    id,
    r: ratingOf(id, ratingById, metaById),
  }));

  const normalizer = (sel: (r: PlayerRating) => number) => {
    const vals = players.map((p) => sel(p.r));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min;
    return (v: number) => (span === 0 ? 0.5 : (v - min) / span);
  };
  const nOvr = normalizer((r) => r.ovr);
  const nPpp = normalizer((r) => r.ppp);
  const nHeight = normalizer((r) => r.heightCm);

  const strength = (r: PlayerRating) =>
    W_OVR * nOvr(r.ovr) + W_PPP * nPpp(r.ppp) + W_HEIGHT * nHeight(r.heightCm);

  const scored = players
    .map((p) => ({ id: p.id, s: strength(p.r) }))
    .sort((a, b) => b.s - a.s);

  const maxA = Math.ceil(scored.length / 2);
  const maxB = scored.length - maxA;
  const A: { id: number; s: number }[] = [];
  const B: { id: number; s: number }[] = [];
  let sumA = 0;
  let sumB = 0;
  // Greedy: cada jugador va al equipo más débil que todavía tenga lugar.
  for (const p of scored) {
    const canA = A.length < maxA;
    const canB = B.length < maxB;
    const putA = canA && (!canB || sumA <= sumB);
    if (putA) {
      A.push(p);
      sumA += p.s;
    } else {
      B.push(p);
      sumB += p.s;
    }
  }

  // Mejora local: intercambiar un jugador de cada equipo si acerca las fuerzas.
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < B.length; j++) {
        const cur = Math.abs(sumA - sumB);
        const nextA = sumA - A[i].s + B[j].s;
        const nextB = sumB - B[j].s + A[i].s;
        if (Math.abs(nextA - nextB) < cur - 1e-9) {
          const tmp = A[i];
          A[i] = B[j];
          B[j] = tmp;
          sumA = nextA;
          sumB = nextB;
          improved = true;
        }
      }
    }
  }

  return { teamA: A.map((p) => p.id), teamB: B.map((p) => p.id) };
}

export interface TeamSummary {
  ovr: number; // suma de OVR
  heightAvg: number; // altura promedio (cm)
  ppp: number; // suma de puntos por partido
}

/** Totales por equipo para mostrar qué tan parejo quedó el reparto. */
export function summarize(
  ids: number[],
  ratingById: Map<number, PlayerRating>,
  metaById?: Record<number, PlayerMeta>,
): TeamSummary {
  if (ids.length === 0) return { ovr: 0, heightAvg: 0, ppp: 0 };
  let ovr = 0;
  let height = 0;
  let ppp = 0;
  for (const id of ids) {
    const r = ratingOf(id, ratingById, metaById);
    ovr += r.ovr;
    height += r.heightCm;
    ppp += r.ppp;
  }
  return {
    ovr,
    heightAvg: height / ids.length,
    ppp,
  };
}
