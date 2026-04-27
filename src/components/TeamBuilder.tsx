import { PLAYERS_BY_ID } from '../data/players';
import { useGame } from '../state/GameContext';
import type { TeamId } from '../types';

export function TeamBuilder() {
  const { state, dispatch } = useGame();
  const { teams, selectedPlayerIds } = state;

  const assigned = new Set([...teams.A.playerIds, ...teams.B.playerIds]);
  const pool = selectedPlayerIds.filter((id) => !assigned.has(id));

  const canStart = teams.A.playerIds.length > 0 && teams.B.playerIds.length > 0;
  const allAssigned = pool.length === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="section-title">Armá los equipos</h1>
          <p className="section-subtitle">
            Tocá un jugador y mandalo a un equipo. También podés sortear o
            limpiar para volver a empezar.
          </p>
        </div>
        <div className="page-head__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => dispatch({ type: 'SHUFFLE_TEAMS' })}
            disabled={selectedPlayerIds.length < 2}
            title="Repartir aleatoriamente"
          >
            🎲 Sortear
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => dispatch({ type: 'CLEAR_TEAMS' })}
            disabled={assigned.size === 0}
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="team-grid">
        <TeamCard team="A" />
        <TeamCard team="B" />
      </div>

      <section className={`pool-section${allAssigned ? ' is-empty' : ''}`}>
        <div className="pool-section__head">
          <span className="pool-section__title">Sin asignar</span>
          <span className="pool-section__count">
            {pool.length} jugador{pool.length === 1 ? '' : 'es'}
          </span>
        </div>
        {allAssigned ? (
          <div className="pool-section__empty">
            ✓ Todos los jugadores ya están en un equipo.
          </div>
        ) : (
          <div className="pool-grid">
            {pool.map((id) => (
              <div key={id} className="pool-card">
                <span className="pool-card__name">
                  {PLAYERS_BY_ID[id]?.name}
                </span>
                <div className="pool-card__actions">
                  <button
                    type="button"
                    className="assign-btn assign-btn--A"
                    onClick={() =>
                      dispatch({
                        type: 'ASSIGN_PLAYER_TO_TEAM',
                        playerId: id,
                        team: 'A',
                      })
                    }
                    aria-label={`Asignar a ${state.teams.A.name}`}
                  >
                    {state.teams.A.name}
                  </button>
                  <button
                    type="button"
                    className="assign-btn assign-btn--B"
                    onClick={() =>
                      dispatch({
                        type: 'ASSIGN_PLAYER_TO_TEAM',
                        playerId: id,
                        team: 'B',
                      })
                    }
                    aria-label={`Asignar a ${state.teams.B.name}`}
                  >
                    {state.teams.B.name}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
  const otherName = state.teams[otherTeam].name;

  return (
    <div className={`team-card team-card--${team}`}>
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
        <div className="team-card__empty">
          Sin jugadores. Asignalos desde abajo.
        </div>
      ) : (
        <ul className="team-card__list">
          {data.playerIds.map((id) => (
            <li key={id} className="team-pill">
              <span className="team-pill__name">
                {PLAYERS_BY_ID[id]?.name}
              </span>
              <button
                type="button"
                className="team-pill__icon"
                onClick={() =>
                  dispatch({
                    type: 'ASSIGN_PLAYER_TO_TEAM',
                    playerId: id,
                    team: otherTeam,
                  })
                }
                title={`Mover a ${otherName}`}
                aria-label={`Mover a ${otherName}`}
              >
                ↔
              </button>
              <button
                type="button"
                className="team-pill__icon team-pill__icon--danger"
                onClick={() =>
                  dispatch({ type: 'UNASSIGN_PLAYER', playerId: id })
                }
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
