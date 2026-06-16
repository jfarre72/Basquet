import type { Stage } from '../types';

const STAGE_LABEL: Record<Stage, string> = {
  selection: 'Jugadores',
  teams: 'Equipos',
  game: 'En vivo',
  finished: 'Finalizado',
};

export function Header({ stage }: { stage: Stage }) {
  return (
    <header className="app__header">
      <div className="app__brand">
        <div className="brand__ball" aria-hidden />
        <div>
          <div className="brand__name">
            Bas<span>quet</span>
          </div>
          <div className="stage-label">{STAGE_LABEL[stage]}</div>
        </div>
      </div>
    </header>
  );
}
