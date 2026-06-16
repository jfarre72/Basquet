import { useEffect } from 'react';
import { Header } from './components/Header';
import { GameScreen } from './components/GameScreen';
import { LoginScreen } from './components/LoginScreen';
import { PlayerSelection } from './components/PlayerSelection';
import { TeamBuilder } from './components/TeamBuilder';
import { useAuth } from './state/AuthContext';
import { useGame } from './state/GameContext';

export default function App() {
  const { status } = useAuth();
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

  if (status === 'loading') {
    return (
      <div className="app">
        <main className="app__main">
          <div className="empty-state">Cargando...</div>
        </main>
      </div>
    );
  }

  if (status === 'guest') {
    return <LoginScreen />;
  }

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
