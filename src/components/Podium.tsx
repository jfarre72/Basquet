import { useGame } from '../state/GameContext';
import { getPlayerStats, getPodium } from '../utils/stats';

export function Podium() {
  const { state } = useGame();
  const podium = getPodium(getPlayerStats(state));

  if (podium.length === 0) {
    return (
      <div className="empty-state">
        Sin goleadores todavía. Registrá puntos para armar el podio.
      </div>
    );
  }

  return (
    <div className="podium">
      {podium.map((s, idx) => (
        <div
          key={s.playerId}
          className={`podium__item podium__item--${idx + 1}`}
        >
          <div className="podium__pos">#{idx + 1}</div>
          <div>
            <div className="podium__name">{s.playerName}</div>
            <div className="podium__team">{s.teamName}</div>
          </div>
          <div className="podium__pts">{s.totalPoints}</div>
        </div>
      ))}
    </div>
  );
}
