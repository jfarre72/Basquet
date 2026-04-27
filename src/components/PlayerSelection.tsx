import { useMemo, useState } from 'react';
import { PLAYERS, PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import { normalizeText } from '../utils/text';

export function PlayerSelection() {
  const { state, dispatch } = useGame();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return PLAYERS;
    return PLAYERS.filter((p) => normalizeText(p.name).includes(q));
  }, [query]);

  const selectedCount = state.selectedPlayerIds.length;
  const canContinue = selectedCount >= 2;

  return (
    <>
      <div>
        <h1 className="section-title">¿Quiénes juegan hoy?</h1>
        <p className="section-subtitle">
          Tocá un nombre para sumarlo. Para sacarlo, tocalo de nuevo o usá la
          ✕ del chip.
        </p>
      </div>

      <div className="search">
        <span className="search__icon" aria-hidden>
          🔎
        </span>
        <input
          inputMode="search"
          placeholder="Buscar jugador..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar jugador"
        />
      </div>

      {selectedCount > 0 && (
        <section className="selected-panel">
          <div className="selected-panel__head">
            <span className="selected-panel__title">
              Seleccionados ({selectedCount})
            </span>
            <button
              type="button"
              className="selected-panel__clear"
              onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
            >
              Limpiar todo
            </button>
          </div>
          <div className="selected-panel__chips">
            {state.selectedPlayerIds.map((id) => (
              <button
                key={id}
                type="button"
                className="selected-chip"
                onClick={() =>
                  dispatch({ type: 'TOGGLE_PLAYER', playerId: id })
                }
                title="Quitar de la selección"
              >
                {PLAYERS_BY_ID[id]?.name}
                <span className="selected-chip__x" aria-hidden>
                  ×
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="players-grid" role="list">
        {filtered.map((player) => {
          const isSelected = state.selectedPlayerIds.includes(player.id);
          return (
            <button
              key={player.id}
              type="button"
              role="listitem"
              className={`player-chip${
                isSelected ? ' player-chip--selected' : ''
              }`}
              onClick={() =>
                dispatch({ type: 'TOGGLE_PLAYER', playerId: player.id })
              }
              aria-pressed={isSelected}
            >
              <span className="player-chip__name">{player.name}</span>
              {isSelected && (
                <span className="player-chip__check" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            No hay jugadores que coincidan con "{query}".
          </div>
        )}
      </div>

      <div className="selected-bar">
        <div className="selected-bar__count">
          {selectedCount}
          <small>seleccionado{selectedCount === 1 ? '' : 's'}</small>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canContinue}
          onClick={() => dispatch({ type: 'GO_TO_TEAMS' })}
        >
          Armar equipos →
        </button>
      </div>
    </>
  );
}
