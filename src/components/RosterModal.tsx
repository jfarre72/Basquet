import { useState } from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { PLAYERS, PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import type { TeamId } from '../types';

interface Props {
  onClose: () => void;
}

const byName = (a: number, b: number) =>
  (PLAYERS_BY_ID[a]?.name ?? '').localeCompare(PLAYERS_BY_ID[b]?.name ?? '');

/**
 * Permite agregar o quitar jugadores mientras el partido está en juego. Al
 * quitar a un jugador se borran sus jugadas para que no le cuenten goles ni
 * el resultado (útil cuando alguien termina faltando).
 */
export function RosterModal({ onClose }: Props) {
  const { state, dispatch } = useGame();
  const [addTeam, setAddTeam] = useState<TeamId>('A');

  const inGame = new Set([
    ...state.teams.A.playerIds,
    ...state.teams.B.playerIds,
  ]);
  const available = PLAYERS.map((p) => p.id)
    .filter((id) => !inGame.has(id))
    .sort(byName);

  const playsByPlayer = (playerId: number) =>
    state.plays.filter((p) => p.playerId === playerId).length;

  const remove = (playerId: number) => {
    const count = playsByPlayer(playerId);
    const name = PLAYERS_BY_ID[playerId]?.name ?? 'el jugador';
    const msg =
      count > 0
        ? `¿Quitar a ${name} del partido? Se borrarán sus ${count} ${
            count === 1 ? 'jugada' : 'jugadas'
          } y no se le contará el resultado.`
        : `¿Quitar a ${name} del partido? No se le contará el resultado.`;
    if (window.confirm(msg)) {
      dispatch({ type: 'REMOVE_PLAYER_FROM_GAME', playerId });
    }
  };

  const add = (playerId: number) => {
    dispatch({ type: 'ADD_PLAYER_TO_GAME', playerId, team: addTeam });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div className="modal__title">
            Jugadores del partido
            <small>Agregá o quitá jugadores en pleno juego</small>
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
          {(['A', 'B'] as const).map((team) => (
            <div key={team} className="roster-group">
              <h4 className="roster-group__title">
                {state.teams[team].name || `Equipo ${team}`}
              </h4>
              {state.teams[team].playerIds.length === 0 ? (
                <div className="empty-state">Sin jugadores.</div>
              ) : (
                <ul className="roster-list">
                  {[...state.teams[team].playerIds].sort(byName).map((id) => (
                    <li key={id} className="roster-list__row">
                      <span className="roster-list__player">
                        <PlayerAvatar id={id} />
                        {PLAYERS_BY_ID[id]?.name}
                        {playsByPlayer(id) > 0 && (
                          <small className="roster-list__plays">
                            {playsByPlayer(id)}{' '}
                            {playsByPlayer(id) === 1 ? 'jugada' : 'jugadas'}
                          </small>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => remove(id)}
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="roster-add">
            <h4 className="roster-group__title">Agregar jugador</h4>
            <div className="roster-add__team-pick">
              {(['A', 'B'] as const).map((team) => (
                <button
                  key={team}
                  type="button"
                  className={`tab${addTeam === team ? ' tab--active' : ''}`}
                  onClick={() => setAddTeam(team)}
                >
                  {state.teams[team].name || `Equipo ${team}`}
                </button>
              ))}
            </div>
            {available.length === 0 ? (
              <div className="empty-state">
                Todos los jugadores ya están en el partido.
              </div>
            ) : (
              <div className="modal__player-list">
                {available.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="modal__player-btn"
                    onClick={() => add(id)}
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
    </div>
  );
}
