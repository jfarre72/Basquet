import { useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import { fetchAvatars, getAvatarUrl } from '../lib/avatars';
import { fetchSeasonData, type DbMatchPlayer } from '../lib/queries';
import { computeTrophies, type TrophyCount } from '../utils/seasonStats';
import {
  defaultMeta,
  fetchMetaMap,
  handLabel,
  type PlayerMeta,
} from '../lib/playerMeta';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { normalizeText } from '../utils/text';

interface CareerStat {
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  puntos: number;
  dobles: number;
  triples: number;
  ppp: number | null;
  ovr: number;
}

function computeCareer(mps: DbMatchPlayer[]): Map<number, CareerStat> {
  const map = new Map<number, CareerStat>();
  const withPoints = new Map<number, number>();
  for (const mp of mps) {
    const s =
      map.get(mp.player_id) ??
      {
        PJ: 0,
        PG: 0,
        PE: 0,
        PP: 0,
        puntos: 0,
        dobles: 0,
        triples: 0,
        ppp: null,
        ovr: 0,
      };
    s.PJ += 1;
    if (mp.outcome === 'Gana') s.PG += 1;
    else if (mp.outcome === 'Empate') s.PE += 1;
    else if (mp.outcome === 'Pierde') s.PP += 1;
    s.puntos += mp.points ?? 0;
    s.dobles += mp.doubles ?? 0;
    s.triples += mp.triples ?? 0;
    if (mp.points != null) {
      withPoints.set(mp.player_id, (withPoints.get(mp.player_id) ?? 0) + 1);
    }
    map.set(mp.player_id, s);
  }
  for (const [id, s] of map) {
    const n = withPoints.get(id) ?? 0;
    s.ppp = n > 0 ? s.puntos / n : null;
    const winRate = s.PJ > 0 ? s.PG / s.PJ : 0;
    const raw = 52 + (s.ppp ?? 0) * 2.2 + winRate * 30;
    s.ovr = Math.max(40, Math.min(99, Math.round(raw)));
  }
  return map;
}

/** Foto de la tarjeta dorada de respaldo (usa la foto original). */
function FutPhoto({ path, name }: { path: string; name: string }) {
  return (
    <div className="futcard__photo">
      <img
        src={getAvatarUrl(path)}
        alt={name}
        crossOrigin="anonymous"
        loading="lazy"
      />
    </div>
  );
}

interface CardData {
  id: number;
  name: string;
  path: string;
  ovr: number | '—';
  meta: PlayerMeta;
  cups: TrophyCount;
  stats: { label: string; value: string | number }[];
}

const NO_CUPS: TrophyCount = { anual: 0, apertura: 0, clausura: 0 };

function toCard(
  id: number,
  name: string,
  path: string,
  meta: PlayerMeta,
  cups: TrophyCount,
  st?: CareerStat,
): CardData {
  return {
    id,
    name,
    path,
    meta,
    cups,
    ovr: st?.ovr ?? '—',
    stats: [
      { label: 'PJ', value: st?.PJ ?? 0 },
      { label: 'PG', value: st?.PG ?? 0 },
      { label: 'PP', value: st?.PP ?? 0 },
      { label: 'PTS', value: st?.puntos ?? 0 },
      { label: '2P', value: st?.dobles ?? 0 },
      { label: '3P', value: st?.triples ?? 0 },
    ],
  };
}

function FutCard({
  data,
  onClick,
  innerRef,
}: {
  data: CardData;
  onClick?: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`futcard${onClick ? ' futcard--tap' : ''}`}
      ref={innerRef}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? 'Ver tarjeta' : undefined}
    >
      <span className="futcard__facets" aria-hidden />
      <span className="futcard__rays" aria-hidden />

      <div className="futcard__ovr">
        <b>{data.ovr}</b>
        <span>OVR</span>
        <em>{data.meta.position}</em>
      </div>

      <FutPhoto path={data.path} name={data.name} />

      <span className="futcard__shine" aria-hidden />

      <div className="futcard__body">
        <div className="futcard__name">{data.name}</div>
        <div className="futcard__bio">
          {data.meta.heightCm} CM · {handLabel(data.meta.hand)}
        </div>
        <div className="futcard__line" aria-hidden />
        <div className="futcard__stats">
          {data.stats.map((s) => (
            <div className="futcard__stat" key={s.label}>
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
        {data.cups.anual + data.cups.apertura + data.cups.clausura > 0 && (
          <div className="futcard__cups">
            <div className="futcard__cup">
              <b>🏆 {data.cups.anual}</b>
              <span>ANUAL</span>
            </div>
            <div className="futcard__cup">
              <b>🏆 {data.cups.apertura}</b>
              <span>APERT</span>
            </div>
            <div className="futcard__cup">
              <b>🏆 {data.cups.clausura}</b>
              <span>CLAUS</span>
            </div>
          </div>
        )}
        <div className="futcard__club" aria-hidden>
          🏀 BASQUET · MARTES
        </div>
      </div>
    </div>
  );
}

// ===== Tarjeta "Legends" (marco PNG con la ventana del arco) =====
// El marco se coloca en public/legends-frame.png. Si no existe, se usa la
// tarjeta dorada (FutCard) como fallback, así nada se rompe.
const FRAME_SRC = '/legends-frame.png';
let frameStatus: 'unknown' | 'ok' | 'fail' = 'unknown';
const frameListeners = new Set<() => void>();
function probeFrame() {
  if (frameStatus !== 'unknown') return;
  const img = new Image();
  img.onload = () => {
    frameStatus = 'ok';
    frameListeners.forEach((f) => f());
  };
  img.onerror = () => {
    frameStatus = 'fail';
    frameListeners.forEach((f) => f());
  };
  img.src = FRAME_SRC;
}
// Precarga el marco apenas se carga el módulo (al iniciar la app), así para
// cuando se entra a Tarjetas ya suele estar listo y no se ve la tarjeta vieja.
if (typeof window !== 'undefined') probeFrame();
function useFrameStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    probeFrame();
    const cb = () => force((x) => x + 1);
    frameListeners.add(cb);
    return () => {
      frameListeners.delete(cb);
    };
  }, []);
  return frameStatus;
}

// Centros X (en % del marco) medidos sobre el PNG.
const NUM_X = [16.5, 31, 46, 60, 73, 85.4];
const CUP_X = [30, 56, 81];

function LegendCard({
  data,
  onClick,
  innerRef,
}: {
  data: CardData;
  onClick?: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`legcard${onClick ? ' legcard--tap' : ''}`}
      ref={innerRef}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? 'Ver tarjeta' : undefined}
    >
      <img
        className="legcard__photo"
        src={getAvatarUrl(data.path)}
        alt={data.name}
        crossOrigin="anonymous"
        loading="lazy"
      />
      <img className="legcard__frame" src={FRAME_SRC} alt="" aria-hidden />
      <div className="legcard__ovr">{data.ovr}</div>
      <div className="legcard__pos">{data.meta.position}</div>
      <div className="legcard__name">{data.name}</div>
      <div className="legcard__h">{data.meta.heightCm}</div>
      <div className="legcard__hand">{handLabel(data.meta.hand)}</div>
      {data.stats.map((s, i) => (
        <span
          key={s.label}
          className="legcard__num"
          style={{ left: `${NUM_X[i]}%` }}
        >
          {s.value}
        </span>
      ))}
      {[data.cups.anual, data.cups.apertura, data.cups.clausura].map((v, i) => (
        <span
          key={i}
          className="legcard__cup"
          style={{ left: `${CUP_X[i]}%` }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

function PlayerCard(props: {
  data: CardData;
  onClick?: () => void;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const status = useFrameStatus();
  // Optimista: mostramos la tarjeta Legends salvo que el marco falle de verdad.
  // Así nunca se ve la tarjeta dorada vieja mientras carga el marco.
  return status === 'fail' ? <FutCard {...props} /> : <LegendCard {...props} />;
}

export function Tarjetas() {
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [career, setCareer] = useState<Map<number, CareerStat>>(new Map());
  const [metas, setMetas] = useState<Record<number, PlayerMeta>>({});
  const [trophies, setTrophies] = useState<Map<number, TrophyCount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CardData | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAvatars(), fetchSeasonData()])
      .then(async ([av, season]) => {
        if (cancelled) return;
        setAvatars(av);
        setCareer(computeCareer(season.matchPlayers));
        setTrophies(computeTrophies(season.matches, season.matchPlayers));
        setError(null);
        // Ficha (posición/altura/mano) desde la tabla players.
        const map = await fetchMetaMap();
        if (!cancelled) setMetas(map);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Solo jugadores que ya cargaron su foto; se suman a medida que la suben.
  const cards = useMemo(() => {
    const q = normalizeText(search.trim());
    return PLAYERS_SORTED.filter((p) => avatars[p.id]).filter((p) =>
      !q ? true : normalizeText(PLAYERS_BY_ID[p.id]?.name ?? p.name).includes(q),
    );
  }, [avatars, search]);

  const totalConFoto = Object.keys(avatars).length;

  const cardDatas = useMemo(
    () =>
      cards.map((p) =>
        toCard(
          p.id,
          PLAYERS_BY_ID[p.id]?.name ?? p.name,
          avatars[p.id],
          metas[p.id] ?? defaultMeta(p.id),
          trophies.get(p.id) ?? NO_CUPS,
          career.get(p.id),
        ),
      ),
    [cards, avatars, metas, trophies, career],
  );

  // ----- Carrusel -----
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const rafRef = useRef(0);

  const recomputeActive = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestD = Infinity;
    Array.from(el.children).forEach((ch, i) => {
      const c = (ch as HTMLElement).offsetLeft + (ch as HTMLElement).offsetWidth / 2;
      const d = Math.abs(c - center);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setActive(best);
  };

  const onScroll = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(recomputeActive);
  };

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const n = el.children.length;
    const idx = Math.max(0, Math.min(n - 1, i));
    const ch = el.children[idx] as HTMLElement | undefined;
    if (!ch) return;
    el.scrollTo({
      left: ch.offsetLeft - (el.clientWidth - ch.offsetWidth) / 2,
      behavior: 'smooth',
    });
  };

  // Al cambiar el filtro/lista, volvemos al inicio.
  useEffect(() => {
    setActive(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [search, cardDatas.length]);

  return (
    <div className="tarjetas">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🃏 Tarjetas</h2>
          <p className="section-head__subtitle">
            Tocá una tarjeta para verla en grande.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para ver las tarjetas.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      <div className="players-search">
        <input
          type="search"
          className="players-search__input"
          placeholder="Filtrar por jugador…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Filtrar jugador"
        />
      </div>

      {loading ? (
        <div className="lb-loading">Cargando tarjetas…</div>
      ) : cards.length === 0 ? (
        <div className="lb-empty">
          {totalConFoto === 0
            ? 'Todavía no hay fotos cargadas. Subí la tuya en la sección Jugadores.'
            : 'Ningún jugador coincide con el filtro.'}
        </div>
      ) : (
        <div className="tcar-wrap">
          <button
            type="button"
            className="tcar__nav tcar__nav--prev"
            onClick={() => scrollToIndex(active - 1)}
            disabled={active === 0}
            aria-label="Anterior"
          >
            ‹
          </button>

          <div className="tcar" ref={scrollerRef} onScroll={onScroll}>
            {cardDatas.map((data, i) => (
              <div
                key={data.id}
                className={`tcar__slide${i === active ? ' is-active' : ''}`}
              >
                <PlayerCard data={data} onClick={() => setSelected(data)} />
                {data.meta.frase && (
                  <p className="card-phrase">“{data.meta.frase}”</p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="tcar__nav tcar__nav--next"
            onClick={() => scrollToIndex(active + 1)}
            disabled={active >= cardDatas.length - 1}
            aria-label="Siguiente"
          >
            ›
          </button>

          <div className="tcar__counter">
            {active + 1} / {cardDatas.length}
          </div>
        </div>
      )}

      {selected && (
        <div
          className="modal-backdrop modal-backdrop--center"
          onClick={() => setSelected(null)}
        >
          <div className="tarjeta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tarjeta-modal__card">
              <PlayerCard data={selected} />
            </div>
            {selected.meta.frase && (
              <p className="card-phrase card-phrase--modal">
                “{selected.meta.frase}”
              </p>
            )}
            <div className="tarjeta-modal__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelected(null)}
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
