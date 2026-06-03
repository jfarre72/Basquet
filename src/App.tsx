import { useEffect } from 'react';
import { Header } from './components/Header';
import { GameScreen } from './components/GameScreen';
import { PlayerSelection } from './components/PlayerSelection';
import { SportSelection } from './components/SportSelection';
import { TeamBuilder } from './components/TeamBuilder';
import { useGame } from './state/GameContext';

export default function App() {
  const { state } = useGame();

  useEffect(() => {
    if (state.stage === 'game' || (state.stage === 'finished' && state.plays.length > 0)) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [state.stage, state.plays.length]);

  const footerText =
    state.sport === 'mundialito'
      ? 'Hecho para nuestro Mundialito ⚽'
      : 'Hecho para nuestros básquet de los Martes 🏀';

  return (
    <div className="app">
      <Header stage={state.stage} sport={state.sport} />
      <main className="app__main">
        {state.stage === 'sport' && <SportSelection />}
        {state.stage === 'selection' && <PlayerSelection />}
        {state.stage === 'teams' && <TeamBuilder />}
        {(state.stage === 'game' || state.stage === 'finished') && (
          <GameScreen />
        )}
      </main>
      <footer className="footer-note">{footerText}</footer>
    </div>
  );
}
