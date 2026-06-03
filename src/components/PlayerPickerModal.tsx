import { PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import type { ShotType, TeamId } from '../types';

interface Props {
  team: TeamId;
  shot: ShotType;
  onClose: () => void;
}

function pointsForShot(shot: ShotType): 1 | 2 | 3 {
  if (shot === 'triple') return 3;
  if (shot === 'goal') return 1;
  return 2;
}

export function PlayerPickerModal({ team, shot, onClose }: Props) {
  const { state, dispatch } = useGame();
  const teamData = state.teams[team];
  const points = pointsForShot(shot);
  const isFutbol = state.sport === 'mundialito';
  const headline = isFutbol
    ? `Gol para ${teamData.name}`
    : `+${points} para ${teamData.name}`;
  const subtitle = isFutbol ? '¿Quién la metió?' : '¿Quién anotó?';

  const select = (playerId: number) => {
    dispatch({ type: 'ADD_PLAY', team, playerId, shotType: shot });
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">
            {headline}
            <small>{subtitle}</small>
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
              {teamData.playerIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="modal__player-btn"
                  onClick={() => select(id)}
                >
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
