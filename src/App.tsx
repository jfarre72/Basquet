import { Header } from './components/Header';
import { GameScreen } from './components/GameScreen';
import { PlayerSelection } from './components/PlayerSelection';
import { TeamBuilder } from './components/TeamBuilder';
import { useGame } from './state/GameContext';

export default function App() {
  const { state } = useGame();
  return (
    <div className="app">
      <Header stage={state.stage} />
      <main className="app__main">
        {state.stage === 'selection' && <PlayerSelection />}
        {state.stage === 'teams' && <TeamBuilder />}
        {(state.stage === 'game' || state.stage === 'finished') && (
          <GameScreen />
        )}
      </main>
      <footer className="footer-note">
        Hecho para nuestros básquet de los Martes 🏀
      </footer>
    </div>
  );
}
