import { useEffect, useState } from 'react';
import { PLAYERS_BY_ID } from '../data/players';
import { fetchDrafts, type DbDraft } from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { useGame } from '../state/GameContext';

interface Props {
  onManual: () => void;
  onCreateNew: () => void;
}

export function ContadorEntry({ onManual, onCreateNew }: Props) {
  const { dispatch } = useGame();
  const [drafts, setDrafts] = useState<DbDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchDrafts()
      .then((d) => {
        if (!cancelled) setDrafts(d);
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

  const loadDraft = (d: DbDraft) => {
    dispatch({
      type: 'LOAD_DRAFT',
      teamAName: d.team_a_name,
      teamBName: d.team_b_name,
      teamAIds: d.team_a_ids,
      teamBIds: d.team_b_ids,
    });
  };

  return (
    <>
      <div>
        <h1 className="section-title">¿Qué partido vas a contar?</h1>
        <p className="section-subtitle">
          Elegí uno de los partidos que creaste, o armá uno en el momento.
        </p>
      </div>

      {error && <div className="warning-banner">No se pudo: {error}</div>}

      {loading ? (
        <div className="lb-loading">Cargando partidos creados...</div>
      ) : drafts.length > 0 ? (
        <div className="drafts">
          {drafts.map((d) => (
            <article key={d.id} className="draft-card">
              <header className="draft-card__head">
                <div>
                  <div className="draft-card__title">
                    {d.name && d.name.trim()
                      ? d.name
                      : `${d.team_a_name} vs ${d.team_b_name}`}
                  </div>
                  <div className="draft-card__sub">
                    {d.team_a_ids.length + d.team_b_ids.length} jugadores
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => loadDraft(d)}
                >
                  Cargar →
                </button>
              </header>
              <div className="draft-card__teams">
                <DraftTeamPreview
                  side="A"
                  name={d.team_a_name}
                  ids={d.team_a_ids}
                />
                <DraftTeamPreview
                  side="B"
                  name={d.team_b_name}
                  ids={d.team_b_ids}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="lb-empty">
          No tenés partidos creados todavía. Andá a "Crear partido" o armalo manual acá.
        </div>
      )}

      <div className="actions-row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCreateNew}
          disabled={!SUPABASE_CONFIGURED}
        >
          + Crear partido nuevo
        </button>
        <button type="button" className="btn btn--blue" onClick={onManual}>
          ⚡ Armar manual
        </button>
      </div>
    </>
  );
}

function DraftTeamPreview({
  side,
  name,
  ids,
}: {
  side: 'A' | 'B';
  name: string;
  ids: number[];
}) {
  return (
    <div className={`draft-team draft-team--${side}`}>
      <div className="draft-team__head">
        <span className="draft-team__badge">{side}</span>
        <span className="draft-team__name">{name}</span>
        <span className="draft-team__count">{ids.length}</span>
      </div>
      <div className="draft-team__list">
        {[...ids]
          .sort((a, b) =>
            (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(
              PLAYERS_BY_ID[b]?.name ?? '',
            ),
          )
          .map((id) => (
            <span key={id} className="draft-team__chip">
              {PLAYERS_BY_ID[id]?.name ?? `#${id}`}
            </span>
          ))}
      </div>
    </div>
  );
}
