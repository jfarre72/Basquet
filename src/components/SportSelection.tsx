import { useGame } from '../state/GameContext';
import type { Sport } from '../types';

export function SportSelection() {
  const { dispatch } = useGame();

  const select = (sport: Sport) => {
    dispatch({ type: 'SELECT_SPORT', sport });
  };

  return (
    <>
      <div>
        <h1 className="section-title">¿Qué jugamos hoy?</h1>
        <p className="section-subtitle">
          Elegí el deporte para empezar a armar el partido.
        </p>
      </div>

      <div className="sport-grid">
        <button
          type="button"
          className="sport-card sport-card--basquet"
          onClick={() => select('basquet')}
        >
          <span className="sport-card__icon" aria-hidden>
            🏀
          </span>
          <span className="sport-card__name">Básquet</span>
          <span className="sport-card__meta">Tiros de 2 y 3 puntos</span>
        </button>

        <button
          type="button"
          className="sport-card sport-card--futbol"
          onClick={() => select('mundialito')}
        >
          <span className="sport-card__icon" aria-hidden>
            ⚽
          </span>
          <span className="sport-card__name">Mundialito</span>
          <span className="sport-card__meta">Goles de a 1</span>
        </button>
      </div>
    </>
  );
}
