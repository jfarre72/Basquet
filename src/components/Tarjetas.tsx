import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import { fetchAvatars, getAvatarUrl, getCutoutUrl } from '../lib/avatars';
import { getCutout } from '../lib/cutout';
import { fetchSeasonData, type DbMatchPlayer } from '../lib/queries';
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

/**
 * Foto de la tarjeta: usa la silueta sin fondo guardada al subir la foto.
 * Si todavía no existe (fotos viejas), la recorta en el cliente en silencio;
 * si todo falla, muestra la foto original.
 */
function FutPhoto({ path, name }: { path: string; name: string }) {
  const [src, setSrc] = useState(() => getCutoutUrl(path));
  const [stage, setStage] = useState<'stored' | 'client' | 'original'>(
    'stored',
  );

  const handleError = async () => {
    if (stage === 'stored') {
      setStage('client');
      try {
        setSrc(await getCutout(path, getAvatarUrl(path)));
      } catch {
        setStage('original');
        setSrc(getAvatarUrl(path));
      }
    } else if (stage === 'client') {
      setStage('original');
      setSrc(getAvatarUrl(path));
    }
  };

  return (
    <div className={`futcard__photo${stage === 'original' ? '' : ' is-cut'}`}>
      <img src={src} alt={name} loading="lazy" onError={() => void handleError()} />
    </div>
  );
}

export function Tarjetas() {
  const [avatars, setAvatars] = useState<Record<number, string>>({});
  const [career, setCareer] = useState<Map<number, CareerStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchAvatars(), fetchSeasonData()])
      .then(([av, season]) => {
        if (cancelled) return;
        setAvatars(av);
        setCareer(computeCareer(season.matchPlayers));
        setError(null);
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

  return (
    <div className="tarjetas">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🃏 Tarjetas</h2>
          <p className="section-head__subtitle">
            Las tarjetas de los jugadores que ya subieron su foto.
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
        <div className="pcard-grid">
          {cards.map((p) => {
            const name = PLAYERS_BY_ID[p.id]?.name ?? p.name;
            const st = career.get(p.id);
            const stats: { label: string; value: string | number }[] = [
              { label: 'PJ', value: st?.PJ ?? 0 },
              { label: 'PG', value: st?.PG ?? 0 },
              { label: 'PP', value: st?.PP ?? 0 },
              { label: 'PTS', value: st?.puntos ?? 0 },
              { label: '2P', value: st?.dobles ?? 0 },
              { label: '3P', value: st?.triples ?? 0 },
            ];
            return (
              <article className="futcard" key={p.id}>
                <span className="futcard__facets" aria-hidden />
                <span className="futcard__rays" aria-hidden />

                <div className="futcard__ovr">
                  <b>{st?.ovr ?? '—'}</b>
                  <span>OVR</span>
                  <i aria-hidden>🏀</i>
                </div>

                <FutPhoto path={avatars[p.id]} name={name} />

                <span className="futcard__shine" aria-hidden />

                <div className="futcard__body">
                  <div className="futcard__name">{name}</div>
                  <div className="futcard__line" aria-hidden />
                  <div className="futcard__stats">
                    {stats.map((s) => (
                      <div className="futcard__stat" key={s.label}>
                        <b>{s.value}</b>
                        <span>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="futcard__club" aria-hidden>
                    🏀 BASQUET · MARTES
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
