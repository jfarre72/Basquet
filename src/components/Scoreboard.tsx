import { useEffect, useState } from 'react';
import { useGame } from '../state/GameContext';
import { getScore } from '../utils/stats';
import { formatClock } from '../utils/format';
import type { ShotType, TeamId } from '../types';

interface Props {
  onPickPlayer: (team: TeamId, shot: ShotType) => void;
  liveClock: boolean;
}

export function Scoreboard({ onPickPlayer, liveClock }: Props) {
  const { state } = useGame();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!liveClock || state.startTime == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [liveClock, state.startTime]);

  const referenceTime = liveClock
    ? now
    : state.endTime ?? state.startTime ?? now;
  const elapsedMs =
    state.startTime == null ? 0 : referenceTime - state.startTime;

  const scoreA = getScore(state.plays, 'A');
  const scoreB = getScore(state.plays, 'B');
  const disabled = state.stage === 'finished';
  const isFutbol = state.sport === 'mundialito';

  return (
    <section className="scoreboard" aria-label="Marcador">
      <div className="scoreboard__bar">
        <span className="scoreboard__live">
          <span className="scoreboard__live-dot" aria-hidden />
          {disabled ? 'Final' : 'En vivo'}
        </span>
        <span
          className="scoreboard__clock"
          aria-label="Tiempo de partido"
        >
          {formatClock(elapsedMs)}
        </span>
        <span className="scoreboard__period">{isFutbol ? 'T1' : 'Q1'}</span>
      </div>

      <div className="scoreboard__teams">
        <TeamPanel
          team="A"
          name={state.teams.A.name}
          score={scoreA}
          opponentScore={scoreB}
          onPick={onPickPlayer}
          disabled={disabled}
          isFutbol={isFutbol}
        />
        <div className="scoreboard__divider" aria-hidden>
          VS
        </div>
        <TeamPanel
          team="B"
          name={state.teams.B.name}
          score={scoreB}
          opponentScore={scoreA}
          onPick={onPickPlayer}
          disabled={disabled}
          isFutbol={isFutbol}
        />
      </div>
    </section>
  );
}

function TeamPanel({
  team,
  name,
  score,
  opponentScore,
  onPick,
  disabled,
  isFutbol,
}: {
  team: TeamId;
  name: string;
  score: number;
  opponentScore: number;
  onPick: (team: TeamId, shot: ShotType) => void;
  disabled: boolean;
  isFutbol: boolean;
}) {
  const leading = score > opponentScore;

  return (
    <div className={`scoreboard__team scoreboard__team--${team}`}>
      <div className="scoreboard__team-head">
        <span className="scoreboard__team-name">
          {name || `Equipo ${team}`}
        </span>
        {leading && score > 0 && (
          <span className="scoreboard__team-flag">↑ Lead</span>
        )}
      </div>
      <div
        className="scoreboard__points"
        aria-label={`Puntos ${name}: ${score}`}
      >
        {score}
      </div>
      <div className="scoreboard__buttons">
        {isFutbol ? (
          <button
            type="button"
            className="score-btn score-btn--goal"
            onClick={() => onPick(team, 'goal')}
            disabled={disabled}
          >
            <span className="score-btn__sign">+</span>
            <span className="score-btn__num">1</span>
            <span className="score-btn__label">GOL</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className="score-btn score-btn--2"
              onClick={() => onPick(team, 'double')}
              disabled={disabled}
            >
              <span className="score-btn__sign">+</span>
              <span className="score-btn__num">2</span>
            </button>
            <button
              type="button"
              className="score-btn score-btn--3"
              onClick={() => onPick(team, 'triple')}
              disabled={disabled}
            >
              <span className="score-btn__sign">+</span>
              <span className="score-btn__num">3</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
