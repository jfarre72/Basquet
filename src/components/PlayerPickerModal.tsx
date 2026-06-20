import { PlayerAvatar } from './PlayerAvatar';
import { PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import type { ShotType, TeamId } from '../types';

interface Props {
  team: TeamId;
  shot: ShotType;
  onClose: () => void;
}

export function PlayerPickerModal({ team, shot, onClose }: Props) {
  const { state, dispatch } = useGame();
  const teamData = state.teams[team];
  const points = shot === 'triple' ? 3 : 2;

  const select = (playerId: number) => {
    dispatch({ type: 'ADD_PLAY', team, playerId, shotType: shot });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">
            +{points} para {teamData.name}
            <small>¿Quién anotó?</small>
          </div>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Cancelar"
          >
            ×
          </button>
        </div>
        <div className="modal__body">
          {teamData.playerIds.length === 0 ? (
            <div className="empty-state">No hay jugadores en este equipo.</div>
          ) : (
            <div className="modal__player-list">
              {[...teamData.playerIds]
                .sort((a, b) =>
                  (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(
                    PLAYERS_BY_ID[b]?.name ?? '',
                  ),
                )
                .map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="modal__player-btn"
                    onClick={() => select(id)}
                  >
                    <PlayerAvatar id={id} />
                    {PLAYERS_BY_ID[id]?.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
