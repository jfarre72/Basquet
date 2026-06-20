import { useEffect, useMemo, useState } from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PLAYERS_BY_ID, PLAYERS_SORTED } from '../data/players';
import {
  createDraft,
  deleteDraft,
  fetchDrafts,
  fetchHistoricos,
  fetchSeasonData,
  updateDraft,
  type DbDraft,
  type DbHistoric,
  type DbMatch,
  type DbMatchPlayer,
  type DraftInput,
} from '../lib/queries';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import { useGame } from '../state/GameContext';
import { normalizeText } from '../utils/text';
import { FlyerModal } from './FlyerModal';

type View = 'list' | 'edit';
type Tab = 'pendientes' | 'historicos';

export function Armado({ onStartMatch }: { onStartMatch: () => void }) {
  const { dispatch } = useGame();
  const [drafts, setDrafts] = useState<DbDraft[]>([]);
  const [historicos, setHistoricos] = useState<DbHistoric[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<DbMatchPlayer[]>([]);
  const [seasonMatches, setSeasonMatches] = useState<DbMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<Tab>('pendientes');
  const [editing, setEditing] = useState<DbDraft | null>(null);
  const [flyer, setFlyer] = useState<DbDraft | null>(null);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([fetchDrafts(), fetchHistoricos(), fetchSeasonData()])
      .then(([d, h, season]) => {
        if (cancelled) return;
        setDrafts(d);
        setHistoricos(h);
        setSeasonMatches(season.matches);
        setMatchPlayers(season.matchPlayers);
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

  /** Jugadores que estuvieron en alguno de los últimos 10 partidos. */
  const recentPlayerIds = useMemo(() => {
    const sorted = [...seasonMatches]
      .filter((m) => m.played_at)
      .sort((a, b) => b.played_at.localeCompare(a.played_at))
      .slice(0, 10);
    const ids = new Set<number>();
    const lastIds = new Set(sorted.map((m) => m.id));
    for (const mp of matchPlayers) {
      if (lastIds.has(mp.match_id)) ids.add(mp.player_id);
    }
    return ids;
  }, [seasonMatches, matchPlayers]);

  /** Detecta drafts cuyos jugadores ya aparecieron en un partido jugado
   *  después de la creación del draft → ese armado ya se usó. */
  const pendingDrafts = useMemo(() => {
    if (drafts.length === 0) return drafts;
    const mpsByMatch = new Map<string, Set<number>>();
    for (const mp of matchPlayers) {
      const set = mpsByMatch.get(mp.match_id) ?? new Set<number>();
      set.add(mp.player_id);
      mpsByMatch.set(mp.match_id, set);
    }
    return drafts.filter((d) => {
      const allDraftIds = [...d.team_a_ids, ...d.team_b_ids];
      if (allDraftIds.length === 0) return true;
      for (const m of seasonMatches) {
        if (m.played_at <= d.created_at) continue;
        const players = mpsByMatch.get(m.id);
        if (!players) continue;
        const allPresent = allDraftIds.every((id) => players.has(id));
        if (allPresent) return false;
      }
      return true;
    });
  }, [drafts, matchPlayers, seasonMatches]);

  const startMatch = (d: DbDraft) => {
    dispatch({
      type: 'LOAD_DRAFT',
      draftId: d.id,
      teamAName: d.team_a_name,
      teamBName: d.team_b_name,
      teamAIds: d.team_a_ids,
      teamBIds: d.team_b_ids,
      playDate: d.play_date,
    });
    onStartMatch();
  };

  const handleDelete = async (d: DbDraft) => {
    if (
      !window.confirm(
        `¿Borrar el armado "${draftLabel(d)}"?\n\nSe elimina solo la plantilla de equipos prearmada. No afecta los partidos ya jugados ni sus estadísticas.`,
      )
    )
      return;
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
              Pendientes ({pendingDrafts.length})
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
              ) : pendingDrafts.length === 0 ? (
                <div className="lb-empty">
                  No tenés partidos pendientes. Creá uno para arrancar.
                </div>
              ) : (
                <div className="drafts">
                  {pendingDrafts.map((d) => (
                    <DraftCard
                      key={d.id}
                      draft={d}
                      onStart={() => startMatch(d)}
                      onEdit={() => {
                        setEditing(d);
                        setView('edit');
                      }}
                      onDelete={() => void handleDelete(d)}
                      onFlyer={() => setFlyer(d)}
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
          recentIds={recentPlayerIds}
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

      {flyer && <FlyerModal draft={flyer} onClose={() => setFlyer(null)} />}
    </div>
  );
}

/* ---------- Draft card ---------- */

function DraftCard({
  draft,
  onStart,
  onEdit,
  onDelete,
  onFlyer,
}: {
  draft: DbDraft;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFlyer: () => void;
}) {
  return (
    <article className="draft-card">
      <header className="draft-card__head">
        <div>
          <div className="draft-card__title">{draftLabel(draft)}</div>
          <div className="draft-card__sub">
            {draft.team_a_ids.length + draft.team_b_ids.length} jugadores ·{' '}
            {formatDraftDate(draft.play_date ?? draft.created_at)}
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
        <button type="button" className="btn btn--blue btn--sm" onClick={onFlyer}>
          📲 Flyer
        </button>
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
              <PlayerAvatar id={id} />
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
  recentIds,
  onCancel,
  onSaved,
  onSavedAndStart,
}: {
  initial: DbDraft | null;
  recentIds: Set<number>;
  onCancel: () => void;
  onSaved: (d: DbDraft, isNew: boolean) => void;
  onSavedAndStart: (d: DbDraft) => void;
}) {
  const initialSelected = useMemo(() => {
    const set = new Set<number>();
    initial?.team_a_ids.forEach((id) => set.add(id));
    initial?.team_b_ids.forEach((id) => set.add(id));
    return set;
  }, [initial]);

  const [name, setName] = useState(initial?.name ?? '');
  const [playDate, setPlayDate] = useState<string>(() =>
    initial?.play_date ? initial.play_date.slice(0, 10) : isoToday(),
  );
  const [teamAName, setTeamAName] = useState(initial?.team_a_name ?? 'Negro');
  const [teamBName, setTeamBName] = useState(initial?.team_b_name ?? 'Blanco');
  const [selected, setSelected] = useState<Set<number>>(initialSelected);
  const [teamA, setTeamA] = useState<number[]>(initial?.team_a_ids ?? []);
  const [teamB, setTeamB] = useState<number[]>(initial?.team_b_ids ?? []);
  const [step, setStep] = useState<'select' | 'teams'>(
    initialSelected.size > 0 ? 'teams' : 'select',
  );
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const playersFiltered = useMemo(() => {
    const q = normalizeText(query.trim());
    return PLAYERS_SORTED.filter((p) =>
      !q ? true : normalizeText(p.name).includes(q),
    );
  }, [query]);

  // Frecuentes / Otros
  const frecuentes = useMemo(
    () => playersFiltered.filter((p) => recentIds.has(p.id)),
    [playersFiltered, recentIds],
  );
  const otros = useMemo(
    () => playersFiltered.filter((p) => !recentIds.has(p.id)),
    [playersFiltered, recentIds],
  );

  const togglePlayer = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setTeamA((arr) => arr.filter((x) => x !== id));
        setTeamB((arr) => arr.filter((x) => x !== id));
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const pool = useMemo(
    () =>
      [...selected].filter((id) => !teamA.includes(id) && !teamB.includes(id)),
    [selected, teamA, teamB],
  );

  const assign = (id: number, side: 'A' | 'B') => {
    if (side === 'A') {
      setTeamA((arr) => (arr.includes(id) ? arr : [...arr, id]));
      setTeamB((arr) => arr.filter((x) => x !== id));
    } else {
      setTeamB((arr) => (arr.includes(id) ? arr : [...arr, id]));
      setTeamA((arr) => arr.filter((x) => x !== id));
    }
  };

  const unassign = (id: number) => {
    setTeamA((arr) => arr.filter((x) => x !== id));
    setTeamB((arr) => arr.filter((x) => x !== id));
  };

  const shuffle = () => {
    const arr = [...selected];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const half = Math.ceil(arr.length / 2);
    setTeamA(arr.slice(0, half));
    setTeamB(arr.slice(half));
  };

  const canSave = !saving && teamA.length > 0 && teamB.length > 0;
  const canContinue = selected.size >= 2;

  const save = async (alsoStart: boolean) => {
    setSaving(true);
    setErr(null);
    const payload: DraftInput = {
      name: name.trim() || null,
      team_a_name: teamAName.trim() || 'Negro',
      team_b_name: teamBName.trim() || 'Blanco',
      team_a_ids: teamA,
      team_b_ids: teamB,
      play_date: playDate
        ? new Date(`${playDate}T20:00:00`).toISOString()
        : null,
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
        <input
          className="armado-editor__date"
          type="date"
          value={playDate}
          onChange={(e) => setPlayDate(e.target.value)}
          aria-label="Fecha del partido"
        />
      </div>

      <div className="step-tabs" role="tablist" aria-label="Paso">
        <button
          type="button"
          role="tab"
          aria-selected={step === 'select'}
          className={`step-tab${step === 'select' ? ' step-tab--active' : ''}`}
          onClick={() => setStep('select')}
        >
          1. Jugadores ({selected.size})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={step === 'teams'}
          className={`step-tab${step === 'teams' ? ' step-tab--active' : ''}`}
          onClick={() => canContinue && setStep('teams')}
          disabled={!canContinue}
        >
          2. Equipos ({teamA.length}–{teamB.length})
        </button>
      </div>

      {step === 'select' ? (
        <>
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

          {frecuentes.length > 0 && (
            <section>
              <div className="armado-section-title">
                ⭐ Habituales (últimos 10 partidos)
              </div>
              <div className="players-grid">
                {frecuentes.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-chip${isSel ? ' player-chip--selected' : ''}`}
                      onClick={() => togglePlayer(p.id)}
                      aria-pressed={isSel}
                    >
                      <PlayerAvatar id={p.id} />
                      <span className="player-chip__name">{p.name}</span>
                      {isSel && <span className="player-chip__check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {otros.length > 0 && (
            <section>
              <div className="armado-section-title">Otros</div>
              <div className="players-grid">
                {otros.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`player-chip${isSel ? ' player-chip--selected' : ''}`}
                      onClick={() => togglePlayer(p.id)}
                      aria-pressed={isSel}
                    >
                      <PlayerAvatar id={p.id} />
                      <span className="player-chip__name">{p.name}</span>
                      {isSel && <span className="player-chip__check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div className="armado-editor__teams">
            <TeamPanel
              side="A"
              name={teamAName}
              ids={teamA}
              onName={setTeamAName}
              onMove={(id) => assign(id, 'B')}
              onRemove={unassign}
            />
            <TeamPanel
              side="B"
              name={teamBName}
              ids={teamB}
              onName={setTeamBName}
              onMove={(id) => assign(id, 'A')}
              onRemove={unassign}
            />
          </div>

          <div className="page-head__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={shuffle}
              disabled={selected.size < 2}
            >
              🎲 Sortear
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setTeamA([]);
                setTeamB([]);
              }}
              disabled={teamA.length + teamB.length === 0}
            >
              Limpiar equipos
            </button>
          </div>

          <section className={`pool-section${pool.length === 0 ? ' is-empty' : ''}`}>
            <div className="pool-section__head">
              <span className="pool-section__title">Sin asignar</span>
              <span className="pool-section__count">
                {pool.length} jugador{pool.length === 1 ? '' : 'es'}
              </span>
            </div>
            {pool.length === 0 ? (
              <div className="pool-section__empty">
                ✓ Todos los jugadores ya están en un equipo.
              </div>
            ) : (
              <div className="pool-grid">
                {[...pool]
                  .sort((a, b) =>
                    (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(
                      PLAYERS_BY_ID[b]?.name ?? '',
                    ),
                  )
                  .map((id) => (
                    <div key={id} className="pool-card">
                      <span className="pool-card__name">
                        <PlayerAvatar id={id} />
                        {PLAYERS_BY_ID[id]?.name}
                      </span>
                      <div className="pool-card__actions">
                        <button
                          type="button"
                          className="assign-btn assign-btn--A"
                          onClick={() => assign(id, 'A')}
                        >
                          {teamAName}
                        </button>
                        <button
                          type="button"
                          className="assign-btn assign-btn--B"
                          onClick={() => assign(id, 'B')}
                        >
                          {teamBName}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

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

function TeamPanel({
  side,
  name,
  ids,
  onName,
  onMove,
  onRemove,
}: {
  side: 'A' | 'B';
  name: string;
  ids: number[];
  onName: (s: string) => void;
  onMove: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  const otherSide = side === 'A' ? 'B' : 'A';
  const sorted = [...ids].sort((a, b) =>
    (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(PLAYERS_BY_ID[b]?.name ?? ''),
  );
  return (
    <div className={`team-card team-card--${side}`}>
      <div className="team-card__head">
        <span className="team-card__badge">Equipo {side}</span>
        <input
          className="team-card__name-input"
          value={name}
          maxLength={40}
          onChange={(e) => onName(e.target.value)}
          aria-label={`Nombre del equipo ${side}`}
        />
        <span className="team-card__count">{ids.length}</span>
      </div>
      {ids.length === 0 ? (
        <div className="team-card__empty">Sin jugadores.</div>
      ) : (
        <ul className="team-card__list">
          {sorted.map((id) => (
            <li key={id} className="team-pill">
              <span className="team-pill__name">
                <PlayerAvatar id={id} />
                {PLAYERS_BY_ID[id]?.name}
              </span>
              <button
                type="button"
                className="team-pill__icon"
                onClick={() => onMove(id)}
                title={`Mover al equipo ${otherSide}`}
                aria-label={`Mover al equipo ${otherSide}`}
              >
                ↔
              </button>
              <button
                type="button"
                className="team-pill__icon team-pill__icon--danger"
                onClick={() => onRemove(id)}
                title="Sacar del equipo"
                aria-label="Sacar del equipo"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
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

function isoToday(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
