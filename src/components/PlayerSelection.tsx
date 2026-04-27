import { useMemo, useState } from 'react';
import { PLAYERS } from '../data/players';
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
          Tocá los nombres para sumarlos al partido. Después armás los equipos.
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
              <span className="player-chip__num">#{player.id}</span>
              <span>{player.name}</span>
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
        {selectedCount > 0 && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
          >
            Limpiar
          </button>
        )}
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
