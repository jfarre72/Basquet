import { useCallback, useState } from 'react';
import { useGame } from '../state/GameContext';
import { PlayerPickerModal } from './PlayerPickerModal';
import { RosterModal } from './RosterModal';
import { PlaysList } from './PlaysList';
import { PlayerStats } from './PlayerStats';
import { Podium } from './Podium';
import { Scoreboard } from './Scoreboard';
import { exportGameToExcel } from '../utils/exportExcel';
import { getWinner } from '../utils/stats';
import { saveGameToSupabase } from '../lib/saveGame';
import { SUPABASE_CONFIGURED } from '../lib/supabase';
import type { GameState, ShotType, TeamId } from '../types';

type Tab = 'plays' | 'stats';

export function GameScreen() {
  const { state, dispatch } = useGame();
  const [picker, setPicker] = useState<{ team: TeamId; shot: ShotType } | null>(
    null,
  );
  const [tab, setTab] = useState<Tab>('plays');
  const [rosterOpen, setRosterOpen] = useState(false);
  const finished = state.stage === 'finished';
  const { winner, scoreA, scoreB } = getWinner(state);

  const saveGame = useCallback(
    async (snapshot: GameState) => {
      dispatch({ type: 'SAVE_START' });
      try {
        const matchId = await saveGameToSupabase(snapshot);
        dispatch({ type: 'SAVE_SUCCESS', matchId });
      } catch (e) {
        dispatch({ type: 'SAVE_ERROR', message: (e as Error).message });
      }
    },
    [dispatch],
  );

  const difference = Math.abs(scoreA - scoreB);
  const leadingTeam = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;
  const totalPoints = scoreA + scoreB;

  return (
    <>
      <Scoreboard
        liveClock={!finished}
        onPickPlayer={(team, shot) => setPicker({ team, shot })}
      />

      <div className="score-meta">
        {leadingTeam ? (
          <div className="score-meta__diff">
            Arriba {state.teams[leadingTeam].name} por {difference}{' '}
            {difference === 1 ? 'punto' : 'puntos'}
          </div>
        ) : (
          totalPoints > 0 && (
            <div className="score-meta__diff">Empate</div>
          )
        )}
        <div className="score-meta__total">
          Total del partido: <strong>{totalPoints}</strong>{' '}
          {totalPoints === 1 ? 'punto' : 'puntos'}
        </div>
      </div>

      {finished && (
        <section className="card">
          <h2 className="section-title">
            🏆{' '}
            {winner === 'tie'
              ? '¡Empate!'
              : `Ganó ${state.teams[winner].name}`}
          </h2>
          <p className="section-subtitle">
            Resultado final: {state.teams.A.name} {scoreA} — {scoreB}{' '}
            {state.teams.B.name}
          </p>
          <SaveStatusBanner
            status={state.saveStatus}
            error={state.saveError}
            onRetry={() => void saveGame(state)}
          />
          <Podium />
        </section>
      )}

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'plays'}
          className={`tab${tab === 'plays' ? ' tab--active' : ''}`}
          onClick={() => setTab('plays')}
        >
          Jugadas ({state.plays.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stats'}
          className={`tab${tab === 'stats' ? ' tab--active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Estadísticas
        </button>
      </div>

      <section className="card">
        {tab === 'plays' ? <PlaysList /> : <PlayerStats />}
      </section>

      <div className="toolbar">
        {!finished ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (
                window.confirm(
                  '¿Finalizar el partido? Vas a ver el podio de goleadores.\n\n¿Estás seguro?',
                )
              ) {
                const snapshot = state;
                dispatch({ type: 'FINISH_GAME' });
                if (SUPABASE_CONFIGURED) void saveGame(snapshot);
              }
            }}
          >
            🏁 Finalizar partido
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => dispatch({ type: 'RESET_GAME' })}
          >
            ⟲ Nuevo partido (mismos equipos)
          </button>
        )}

        <button
          type="button"
          className="btn btn--blue"
          onClick={() => exportGameToExcel(state)}
          disabled={state.plays.length === 0}
        >
          📊 Excel
        </button>

        {!finished && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setRosterOpen(true)}
          >
            👥 Jugadores
          </button>
        )}

        {!finished && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              if (
                window.confirm(
                  '¿Resetear partido? Se borran jugadas y marcador, pero quedan los equipos.',
                )
              ) {
                dispatch({ type: 'RESET_GAME' });
              }
            }}
          >
            🗑 Reset
          </button>
        )}
      </div>

      {picker && (
        <PlayerPickerModal
          team={picker.team}
          shot={picker.shot}
          onClose={() => setPicker(null)}
        />
      )}

      {rosterOpen && <RosterModal onClose={() => setRosterOpen(false)} />}
    </>
  );
}

function SaveStatusBanner({
  status,
  error,
  onRetry,
}: {
  status: GameState['saveStatus'];
  error: string | null;
  onRetry: () => void;
}) {
  if (!SUPABASE_CONFIGURED) {
    return (
      <div className="save-banner save-banner--idle">
        Conectá Supabase para guardar el partido en la base.
      </div>
    );
  }
  if (status === 'saving') {
    return (
      <div className="save-banner save-banner--saving">
        <span className="save-banner__spinner" aria-hidden /> Guardando partido
        en la base...
      </div>
    );
  }
  if (status === 'saved') {
    return (
      <div className="save-banner save-banner--saved">
        ✓ Partido guardado. Ya aparece en el Informe.
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="save-banner save-banner--error">
        <span>No se pudo guardar{error ? `: ${error}` : '.'}</span>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  }
  return null;
}
