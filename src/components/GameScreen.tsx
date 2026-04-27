import { useState } from 'react';
import { useGame } from '../state/GameContext';
import { PlayerPickerModal } from './PlayerPickerModal';
import { PlaysList } from './PlaysList';
import { PlayerStats } from './PlayerStats';
import { Podium } from './Podium';
import { Scoreboard } from './Scoreboard';
import { exportGameToExcel } from '../utils/exportExcel';
import { exportGameToPdf } from '../utils/exportPdf';
import { getWinner } from '../utils/stats';
import type { ShotType, TeamId } from '../types';

type Tab = 'plays' | 'stats';

export function GameScreen() {
  const { state, dispatch } = useGame();
  const [picker, setPicker] = useState<{ team: TeamId; shot: ShotType } | null>(
    null,
  );
  const [tab, setTab] = useState<Tab>('plays');
  const finished = state.stage === 'finished';
  const { winner, scoreA, scoreB } = getWinner(state);

  return (
    <>
      <Scoreboard
        liveClock={!finished}
        onPickPlayer={(team, shot) => setPicker({ team, shot })}
      />

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
                  '¿Finalizar el partido? Vas a ver el podio de goleadores.',
                )
              ) {
                dispatch({ type: 'FINISH_GAME' });
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
        <button
          type="button"
          className="btn"
          onClick={() => exportGameToPdf(state)}
          disabled={state.plays.length === 0}
        >
          📄 PDF
        </button>

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
    </>
  );
}
