import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import { fetchAvatars, getAvatarUrl } from '../lib/avatars';
import { fetchSeasonData, type DbMatchPlayer } from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { normalizeText } from '../utils/text';

interface CareerStat {
  PJ: number;
  PG: number;
  PE: number;
  PP: number;
  puntos: number;
  ppp: number | null;
}

function computeCareer(mps: DbMatchPlayer[]): Map<number, CareerStat> {
  const map = new Map<number, CareerStat>();
  const withPoints = new Map<number, number>();
  for (const mp of mps) {
    const s =
      map.get(mp.player_id) ??
      { PJ: 0, PG: 0, PE: 0, PP: 0, puntos: 0, ppp: null };
    s.PJ += 1;
    if (mp.outcome === 'Gana') s.PG += 1;
    else if (mp.outcome === 'Empate') s.PE += 1;
    else if (mp.outcome === 'Pierde') s.PP += 1;
    s.puntos += mp.points ?? 0;
    if (mp.points != null) {
      withPoints.set(mp.player_id, (withPoints.get(mp.player_id) ?? 0) + 1);
    }
    map.set(mp.player_id, s);
  }
  for (const [id, s] of map) {
    const n = withPoints.get(id) ?? 0;
    s.ppp = n > 0 ? s.puntos / n : null;
  }
  return map;
}

export function Avatares() {
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
    <div className="avatares">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🃏 Avatares</h2>
          <p className="section-head__subtitle">
            Las cartas de los jugadores que ya subieron su foto.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para ver los avatares.
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
        <div className="lb-loading">Cargando avatares…</div>
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
            return (
              <article className="pcard" key={p.id}>
                <div className="pcard__photo">
                  <img src={getAvatarUrl(avatars[p.id])} alt={name} loading="lazy" />
                </div>
                <span className="pcard__shine" aria-hidden />
                {st && (
                  <span className="pcard__rec" aria-hidden>
                    {st.PG}-{st.PE}-{st.PP}
                  </span>
                )}
                <div className="pcard__info">
                  <div className="pcard__name">{name}</div>
                  <div className="pcard__stats">
                    <div className="pcard__stat">
                      <b>{st?.PJ ?? 0}</b>
                      <span>PJ</span>
                    </div>
                    <div className="pcard__stat">
                      <b>{st?.puntos ?? 0}</b>
                      <span>PTS</span>
                    </div>
                    <div className="pcard__stat">
                      <b>{st?.ppp != null ? st.ppp.toFixed(1) : '—'}</b>
                      <span>PPP</span>
                    </div>
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
