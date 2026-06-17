import { useEffect, useMemo, useState } from 'react';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import {
  createDraft,
  deleteDraft,
  fetchDrafts,
  fetchHistoricos,
  updateDraft,
  type DbDraft,
  type DbHistoric,
  type DraftInput,
} from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { useGame } from '../state/GameContext';
import { normalizeText } from '../utils/text';

type View = 'list' | 'edit';
type Tab = 'pendientes' | 'historicos';
type TeamSide = 'A' | 'B' | null;

export function Armado({ onStartMatch }: { onStartMatch: () => void }) {
  const { dispatch } = useGame();
  const [drafts, setDrafts] = useState<DbDraft[]>([]);
  const [historicos, setHistoricos] = useState<DbHistoric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<Tab>('pendientes');
  const [editing, setEditing] = useState<DbDraft | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([fetchDrafts(), fetchHistoricos()])
      .then(([d, h]) => {
        if (cancelled) return;
        setDrafts(d);
        setHistoricos(h);
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

  const startMatch = (d: DbDraft) => {
    dispatch({
      type: 'LOAD_DRAFT',
      teamAName: d.team_a_name,
      teamBName: d.team_b_name,
      teamAIds: d.team_a_ids,
      teamBIds: d.team_b_ids,
    });
    onStartMatch();
  };

  const handleDelete = async (d: DbDraft) => {
    if (!window.confirm(`¿Borrar el armado "${draftLabel(d)}"?`)) return;
    try {
      await deleteDraft(d.id);
      setDrafts((arr) => arr.filter((x) => x.id !== d.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleSaved = (d: DbDraft, isNew: boolean) => {
    setDrafts((arr) =>
      isNew ? [d, ...arr] : arr.map((x) => (x.id === d.id ? d : x)),
    );
    setView('list');
    setEditing(null);
  };

  return (
    <div className="armado">
      <div className="section-head">
        <div>
          <h2 className="section-head__title">Crear partido</h2>
          <p className="section-head__subtitle">
            Armá los equipos antes del partido y revisá lo jugado después.
          </p>
        </div>
      </div>

      {!SUPABASE_CONFIGURED && (
        <div className="warning-banner">
          Conectá Supabase para guardar partidos.
        </div>
      )}
      {error && <div className="warning-banner">No se pudo: {error}</div>}

      {view === 'list' ? (
        <>
          <div className="pill-group" role="tablist" aria-label="Vista">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'pendientes'}
              className={`pill${tab === 'pendientes' ? ' pill--active' : ''}`}
              onClick={() => setTab('pendientes')}
            >
              Pendientes ({drafts.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'historicos'}
              className={`pill${tab === 'historicos' ? ' pill--active' : ''}`}
              onClick={() => setTab('historicos')}
            >
              Históricos ({historicos.length})
            </button>
          </div>

          {tab === 'pendientes' ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => {
                  setEditing(null);
                  setView('edit');
                }}
                disabled={!SUPABASE_CONFIGURED}
              >
                + Crear partido nuevo
              </button>

              {loading ? (
                <div className="lb-loading">Cargando...</div>
              ) : drafts.length === 0 ? (
                <div className="lb-empty">
                  No tenés partidos pendientes. Creá uno para arrancar.
                </div>
              ) : (
                <div className="drafts">
                  {drafts.map((d) => (
                    <DraftCard
                      key={d.id}
                      draft={d}
                      onStart={() => startMatch(d)}
                      onEdit={() => {
                        setEditing(d);
                        setView('edit');
                      }}
                      onDelete={() => void handleDelete(d)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <HistoricosList loading={loading} matches={historicos} />
          )}
        </>
      ) : (
        <DraftEditor
          initial={editing}
          onCancel={() => {
            setView('list');
            setEditing(null);
          }}
          onSaved={handleSaved}
          onSavedAndStart={(d) => {
            handleSaved(d, !editing);
            startMatch(d);
          }}
        />
      )}
    </div>
  );
}

/* ---------- Draft card ---------- */

function DraftCard({
  draft,
  onStart,
  onEdit,
  onDelete,
}: {
  draft: DbDraft;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="draft-card">
      <header className="draft-card__head">
        <div>
          <div className="draft-card__title">{draftLabel(draft)}</div>
          <div className="draft-card__sub">
            {draft.team_a_ids.length + draft.team_b_ids.length} jugadores ·{' '}
            {formatDraftDate(draft.created_at)}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={onStart}
        >
          🏀 Jugar
        </button>
      </header>
      <div className="draft-card__teams">
        <DraftTeam name={draft.team_a_name} ids={draft.team_a_ids} side="A" />
        <DraftTeam name={draft.team_b_name} ids={draft.team_b_ids} side="B" />
      </div>
      <footer className="draft-card__foot">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
          Editar
        </button>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={onDelete}
        >
          Borrar
        </button>
      </footer>
    </article>
  );
}

function DraftTeam({
  name,
  ids,
  side,
}: {
  name: string;
  ids: number[];
  side: 'A' | 'B';
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

/* ---------- Editor ---------- */

function DraftEditor({
  initial,
  onCancel,
  onSaved,
  onSavedAndStart,
}: {
  initial: DbDraft | null;
  onCancel: () => void;
  onSaved: (d: DbDraft, isNew: boolean) => void;
  onSavedAndStart: (d: DbDraft) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [teamAName, setTeamAName] = useState(initial?.team_a_name ?? 'Negro');
  const [teamBName, setTeamBName] = useState(initial?.team_b_name ?? 'Blanco');
  const [assignments, setAssignments] = useState<Map<number, TeamSide>>(() => {
    const map = new Map<number, TeamSide>();
    initial?.team_a_ids.forEach((id) => map.set(id, 'A'));
    initial?.team_b_ids.forEach((id) => map.set(id, 'B'));
    return map;
  });
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return PLAYERS_SORTED;
    return PLAYERS_SORTED.filter((p) => normalizeText(p.name).includes(q));
  }, [query]);

  const teamAIds = useMemo(
    () =>
      [...assignments.entries()].filter(([, s]) => s === 'A').map(([id]) => id),
    [assignments],
  );
  const teamBIds = useMemo(
    () =>
      [...assignments.entries()].filter(([, s]) => s === 'B').map(([id]) => id),
    [assignments],
  );

  const cycle = (id: number) => {
    setAssignments((prev) => {
      const next = new Map(prev);
      const cur = prev.get(id) ?? null;
      const nx: TeamSide = cur === null ? 'A' : cur === 'A' ? 'B' : null;
      if (nx === null) next.delete(id);
      else next.set(id, nx);
      return next;
    });
  };

  const canSave =
    !saving && teamAIds.length > 0 && teamBIds.length > 0;

  const save = async (alsoStart: boolean) => {
    setSaving(true);
    setErr(null);
    const payload: DraftInput = {
      name: name.trim() || null,
      team_a_name: teamAName.trim() || 'Negro',
      team_b_name: teamBName.trim() || 'Blanco',
      team_a_ids: teamAIds,
      team_b_ids: teamBIds,
    };
    try {
      const saved = initial
        ? await updateDraft(initial.id, payload)
        : await createDraft(payload);
      if (alsoStart) onSavedAndStart(saved);
      else onSaved(saved, !initial);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="armado-editor">
      <div className="armado-editor__head">
        <input
          className="armado-editor__name"
          placeholder="Nombre del armado (ej: Martes 25/06)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </div>

      <div className="armado-editor__teams">
        <TeamHeader side="A" name={teamAName} count={teamAIds.length} onChange={setTeamAName} />
        <TeamHeader side="B" name={teamBName} count={teamBIds.length} onChange={setTeamBName} />
      </div>

      <div className="search">
        <span className="search__icon" aria-hidden>🔎</span>
        <input
          inputMode="search"
          placeholder="Buscar jugador..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar jugador"
        />
      </div>

      <p className="armado-hint">
        Tocá un nombre para mandarlo al equipo A. Tocalo de nuevo para mandarlo al B. Una vez más para sacarlo.
      </p>

      <div className="armado-grid">
        {filtered.map((p) => {
          const side = assignments.get(p.id) ?? null;
          return (
            <button
              key={p.id}
              type="button"
              className={`armado-chip${side ? ` armado-chip--${side}` : ''}`}
              onClick={() => cycle(p.id)}
            >
              <span className="armado-chip__name">{p.name}</span>
              {side && <span className="armado-chip__tag">{side}</span>}
            </button>
          );
        })}
      </div>

      {err && <div className="warning-banner">{err}</div>}

      <div className="actions-row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
          disabled={saving}
        >
          ← Cancelar
        </button>
        <button
          type="button"
          className="btn btn--blue"
          onClick={() => void save(false)}
          disabled={!canSave}
        >
          💾 {saving ? 'Guardando...' : 'Guardar armado'}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void save(true)}
          disabled={!canSave}
        >
          🏀 Guardar y jugar
        </button>
      </div>
    </div>
  );
}

function TeamHeader({
  side,
  name,
  count,
  onChange,
}: {
  side: 'A' | 'B';
  name: string;
  count: number;
  onChange: (s: string) => void;
}) {
  return (
    <div className={`team-card team-card--${side}`}>
      <div className="team-card__head">
        <span className="team-card__badge">Equipo {side}</span>
        <input
          className="team-card__name-input"
          value={name}
          maxLength={40}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Nombre del equipo ${side}`}
        />
        <span className="team-card__count">{count}</span>
      </div>
    </div>
  );
}

/* ---------- Históricos ---------- */

function HistoricosList({
  loading,
  matches,
}: {
  loading: boolean;
  matches: DbHistoric[];
}) {
  if (loading) return <div className="lb-loading">Cargando históricos...</div>;
  if (matches.length === 0) {
    return (
      <div className="lb-empty">
        Cuando termines un partido en el Contador, va a aparecer acá.
      </div>
    );
  }
  return (
    <div className="historicos">
      {matches.map((m) => (
        <HistoricCard key={m.id} match={m} />
      ))}
    </div>
  );
}

function HistoricCard({ match }: { match: DbHistoric }) {
  const hasScore = match.score_a != null && match.score_b != null;
  const aWon = match.winner === 'A';
  const bWon = match.winner === 'B';
  const isTie = match.winner === 'tie';
  return (
    <article className="historic-card">
      <header className="historic-card__head">
        <div className="historic-card__date">{formatHistoricDate(match.played_at)}</div>
        {match.partial ? (
          <span className="historic-card__tag historic-card__tag--partial">Histórico</span>
        ) : (
          <span className="historic-card__tag">Completo</span>
        )}
      </header>
      <div className="historic-card__body">
        <div className={`historic-team${aWon ? ' historic-team--won' : ''}`}>
          <span className="historic-team__name">{match.team_a_name}</span>
          <span className="historic-team__score">
            {hasScore ? match.score_a : '—'}
          </span>
        </div>
        <div className="historic-card__vs">vs</div>
        <div className={`historic-team${bWon ? ' historic-team--won' : ''}`}>
          <span className="historic-team__score">
            {hasScore ? match.score_b : '—'}
          </span>
          <span className="historic-team__name">{match.team_b_name}</span>
        </div>
      </div>
      {match.winner && (
        <footer className="historic-card__foot">
          {isTie
            ? '🤝 Empate'
            : `🏆 Ganó ${aWon ? match.team_a_name : match.team_b_name}`}
        </footer>
      )}
    </article>
  );
}

/* ---------- helpers ---------- */

function draftLabel(d: DbDraft): string {
  if (d.name && d.name.trim()) return d.name;
  const dt = new Date(d.created_at);
  return `Armado · ${dt.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  })}`;
}

function formatDraftDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatHistoricDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
