import type { Sport, Stage } from '../types';

const STAGE_LABEL: Record<Stage, string> = {
  sport: 'Elegí deporte',
  selection: 'Jugadores',
  teams: 'Equipos',
  game: 'En vivo',
  finished: 'Finalizado',
};

interface Props {
  stage: Stage;
  sport: Sport | null;
}

export function Header({ stage, sport }: Props) {
  const isFutbol = sport === 'mundialito';
  const brandLeft = isFutbol ? 'Mundi' : 'Bas';
  const brandRight = isFutbol ? 'alito' : 'quet';

  return (
    <header className="app__header">
      <div className="app__brand">
        <div
          className={`brand__ball${isFutbol ? ' brand__ball--futbol' : ''}`}
          aria-hidden
        />
        <div>
          <div className="brand__name">
            {brandLeft}
            <span>{brandRight}</span>
          </div>
          <div className="stage-label">{STAGE_LABEL[stage]}</div>
        </div>
      </div>
    </header>
  );
}
