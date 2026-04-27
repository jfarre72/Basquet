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

  return (
    <section className="scoreboard" aria-label="Marcador">
      <div className="scoreboard__clock" aria-label="Tiempo de partido">
        ⏱ {formatClock(elapsedMs)}
      </div>
      <div className="scoreboard__teams">
        <TeamPanel
          team="A"
          name={state.teams.A.name}
          score={scoreA}
          onPick={onPickPlayer}
          disabled={disabled}
        />
        <TeamPanel
          team="B"
          name={state.teams.B.name}
          score={scoreB}
          onPick={onPickPlayer}
          disabled={disabled}
        />
      </div>
    </section>
  );
}

function TeamPanel({
  team,
  name,
  score,
  onPick,
  disabled,
}: {
  team: TeamId;
  name: string;
  score: number;
  onPick: (team: TeamId, shot: ShotType) => void;
  disabled: boolean;
}) {
  return (
    <div className={`scoreboard__team scoreboard__team--${team}`}>
      <div className="scoreboard__name">{name || `Equipo ${team}`}</div>
      <div
        className="scoreboard__points"
        aria-label={`Puntos ${name}: ${score}`}
      >
        {score}
      </div>
      <div className="scoreboard__buttons">
        <button
          type="button"
          className="score-btn"
          onClick={() => onPick(team, 'double')}
          disabled={disabled}
        >
          +2
        </button>
        <button
          type="button"
          className="score-btn score-btn--3"
          onClick={() => onPick(team, 'triple')}
          disabled={disabled}
        >
          +3
        </button>
      </div>
    </div>
  );
}
