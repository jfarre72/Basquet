import { useEffect, useMemo, useState } from 'react';
import { fetchHistoricos, type DbHistoric } from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';

function formatMatchDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

export function Resultados() {
  const [matches, setMatches] = useState<DbHistoric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchHistoricos()
      .then((d) => {
        if (!cancelled) setMatches(d);
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

  // Solo partidos con resultado real (no parciales del histórico viejo).
  const rows = useMemo(
    () => matches.filter((m) => !m.partial),
    [matches],
  );

  return (
    <div className="resultados">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">🏀 Resultados</h2>
          <p className="section-head__subtitle">
            Listado de los partidos jugados.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para ver los resultados.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      {loading ? (
        <div className="lb-loading">Cargando partidos…</div>
      ) : rows.length === 0 ? (
        <div className="lb-empty">Todavía no hay partidos jugados.</div>
      ) : (
        <div className="result-list">
          {rows.map((m) => {
            const aWin = m.winner === 'A';
            const bWin = m.winner === 'B';
            return (
              <article key={m.id} className="result-card">
                <div className="result-card__date">
                  {formatMatchDate(m.played_at)}
                </div>
                <div className="result-card__score">
                  <span
                    className={`result-card__team${aWin ? ' result-card__team--win' : ''}`}
                  >
                    <span className="result-card__name">{m.team_a_name}</span>
                    <span className="result-card__pts">{m.score_a ?? '—'}</span>
                  </span>
                  <span className="result-card__vs">vs</span>
                  <span
                    className={`result-card__team${bWin ? ' result-card__team--win' : ''}`}
                  >
                    <span className="result-card__pts">{m.score_b ?? '—'}</span>
                    <span className="result-card__name">{m.team_b_name}</span>
                  </span>
                </div>
                <div className="result-card__tag">
                  {m.winner === 'tie'
                    ? 'Empate'
                    : aWin
                      ? `Ganó ${m.team_a_name}`
                      : bWin
                        ? `Ganó ${m.team_b_name}`
                        : 'Sin resultado'}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
