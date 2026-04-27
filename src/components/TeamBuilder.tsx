import { PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import type { TeamId } from '../types';

export function TeamBuilder() {
  const { state, dispatch } = useGame();
  const { teams, selectedPlayerIds } = state;

  const assigned = new Set([...teams.A.playerIds, ...teams.B.playerIds]);
  const pool = selectedPlayerIds.filter((id) => !assigned.has(id));

  const canStart = teams.A.playerIds.length > 0 && teams.B.playerIds.length > 0;

  return (
    <>
      <div>
        <h1 className="section-title">Armá los equipos</h1>
        <p className="section-subtitle">
          Asigná cada jugador a un equipo. Podés moverlos cuando quieras y
          editar el nombre del equipo.
        </p>
      </div>

      <div className="team-builder">
        <TeamCard team="A" />
        <TeamCard team="B" />

        <div className="team-builder__pool card">
          <div className="team-card__head">
            <strong>Sin asignar</strong>
            <span className="team-card__count">
              {pool.length} jugador{pool.length === 1 ? '' : 'es'}
            </span>
          </div>

          {pool.length === 0 ? (
            <div className="team-card__empty">
              Todos los jugadores ya están en un equipo.
            </div>
          ) : (
            <div className="pool__list">
              {pool.map((id) => (
                <div key={id} className="pool__row">
                  <span className="pool__row-name">
                    {PLAYERS_BY_ID[id]?.name}
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    onClick={() =>
                      dispatch({
                        type: 'ASSIGN_PLAYER_TO_TEAM',
                        playerId: id,
                        team: 'A',
                      })
                    }
                  >
                    → A
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() =>
                      dispatch({
                        type: 'ASSIGN_PLAYER_TO_TEAM',
                        playerId: id,
                        team: 'B',
                      })
                    }
                  >
                    → B
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!canStart && (
        <div className="warning-banner">
          Cada equipo necesita al menos un jugador para empezar el partido.
        </div>
      )}

      <div className="actions-row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => dispatch({ type: 'BACK_TO_SELECTION' })}
        >
          ← Volver a jugadores
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!canStart}
          onClick={() => dispatch({ type: 'START_GAME' })}
        >
          🏀 Empezar partido
        </button>
      </div>
    </>
  );
}

function TeamCard({ team }: { team: TeamId }) {
  const { state, dispatch } = useGame();
  const data = state.teams[team];
  const otherTeam: TeamId = team === 'A' ? 'B' : 'A';
  const otherLabel = state.teams[otherTeam].name;

  return (
    <div className={`card team-card team-card--${team}`}>
      <div className="team-card__head">
        <span className="team-card__badge">Equipo {team}</span>
        <input
          className="team-card__name-input"
          value={data.name}
          maxLength={40}
          aria-label={`Nombre del equipo ${team}`}
          onChange={(e) =>
            dispatch({
              type: 'SET_TEAM_NAME',
              team,
              name: e.target.value,
            })
          }
        />
        <span className="team-card__count">{data.playerIds.length}</span>
      </div>

      {data.playerIds.length === 0 ? (
        <div className="team-card__empty">Todavía no hay jugadores.</div>
      ) : (
        <ul className="team-card__list">
          {data.playerIds.map((id) => (
            <li key={id} className="team-card__row">
              <span className="team-card__row-name">
                {PLAYERS_BY_ID[id]?.name}
              </span>
              <div className="team-card__row-actions">
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() =>
                    dispatch({
                      type: 'ASSIGN_PLAYER_TO_TEAM',
                      playerId: id,
                      team: otherTeam,
                    })
                  }
                  title={`Mover a ${otherLabel}`}
                >
                  → {otherTeam}
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() =>
                    dispatch({ type: 'UNASSIGN_PLAYER', playerId: id })
                  }
                  title="Sacar del equipo"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
