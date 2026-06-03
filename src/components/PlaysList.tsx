import { useState } from 'react';
import { PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import { formatTime } from '../utils/format';
import type { Play, ShotType } from '../types';

export function PlaysList() {
  const { state, dispatch } = useGame();
  const [editing, setEditing] = useState<Play | null>(null);
  const isFutbol = state.sport === 'mundialito';

  const sorted = [...state.plays].sort((a, b) => b.timestamp - a.timestamp);

  if (sorted.length === 0) {
    return (
      <div className="empty-state">
        {isFutbol
          ? 'Todavía no hay goles registrados. Tocá +1 para sumar el primero.'
          : 'Todavía no hay jugadas registradas. Tocá +2 o +3 para sumar la primera.'}
      </div>
    );
  }

  const shotLabel = (shot: Play['shotType']): string => {
    if (shot === 'goal') return 'Gol';
    return shot === 'triple' ? 'Triple' : 'Doble';
  };

  return (
    <>
      <div className="plays-list">
        {sorted.map((play) => {
          const player = PLAYERS_BY_ID[play.playerId];
          const teamName = state.teams[play.team].name;
          return (
            <div key={play.id} className="play-row">
              <span className="play-row__minute">{play.minute}'</span>
              <div className="play-row__main">
                <span className="play-row__player">
                  {player?.name ?? `Jugador #${play.playerId}`}
                </span>
                <span className="play-row__meta">
                  {teamName} · {formatTime(play.timestamp)} ·{' '}
                  {shotLabel(play.shotType)}
                </span>
              </div>
              <span
                className={`play-row__pts${
                  play.shotType === 'triple' ? ' play-row__pts--3' : ''
                }`}
              >
                +{play.points}
              </span>
              <div className="play-row__actions">
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setEditing(play)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--danger"
                  onClick={() => {
                    if (
                      window.confirm('¿Eliminar esta jugada del registro?')
                    ) {
                      dispatch({ type: 'DELETE_PLAY', playId: play.id });
                    }
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EditPlayModal
          play={editing}
          onClose={() => setEditing(null)}
          onSave={(playerId, shotType) => {
            dispatch({
              type: 'EDIT_PLAY',
              playId: editing.id,
              updates: { playerId, shotType },
            });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

interface EditModalProps {
  play: Play;
  onClose: () => void;
  onSave: (playerId: number, shotType: ShotType) => void;
}

function EditPlayModal({ play, onClose, onSave }: EditModalProps) {
  const { state } = useGame();
  const teamPlayers = state.teams[play.team].playerIds;
  const [playerId, setPlayerId] = useState<number>(play.playerId);
  const [shotType, setShotType] = useState<ShotType>(play.shotType);
  const isFutbol = state.sport === 'mundialito';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal">
        <div className="modal__head">
          <div className="modal__title">
            {isFutbol ? 'Editar gol' : 'Editar jugada'}
            <small>{state.teams[play.team].name}</small>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="modal__body">
          <div className="modal__field">
            <label htmlFor="edit-player">Jugador</label>
            <select
              id="edit-player"
              value={playerId}
              onChange={(e) => setPlayerId(Number(e.target.value))}
            >
              {teamPlayers.map((id) => (
                <option key={id} value={id}>
                  {PLAYERS_BY_ID[id]?.name ?? `#${id}`}
                </option>
              ))}
            </select>
          </div>

          {!isFutbol && (
            <div className="modal__field">
              <label>Tipo de tiro</label>
              <div className="shot-toggle">
                <button
                  type="button"
                  className={shotType === 'double' ? 'is-active' : ''}
                  onClick={() => setShotType('double')}
                >
                  Doble (+2)
                </button>
                <button
                  type="button"
                  className={`shot-toggle--3 ${
                    shotType === 'triple' ? 'is-active' : ''
                  }`}
                  onClick={() => setShotType('triple')}
                >
                  Triple (+3)
                </button>
              </div>
            </div>
          )}

          <div className="actions-row">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onSave(playerId, shotType)}
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
