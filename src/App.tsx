import { useEffect, useState } from 'react';
import { Armado } from './components/Armado';
import { BottomNav } from './components/BottomNav';
import { ContadorEntry } from './components/ContadorEntry';
import { Galeria } from './components/Galeria';
import { GameScreen } from './components/GameScreen';
import { Header } from './components/Header';
import { Indicadores } from './components/Indicadores';
import { Informe } from './components/Informe';
import { Jugadas } from './components/Jugadas';
import { Jugadores } from './components/Jugadores';
import { Leyendas } from './components/Leyendas';
import { LoginScreen } from './components/LoginScreen';
import { PlayerSelection } from './components/PlayerSelection';
import { TeamBuilder } from './components/TeamBuilder';
import { useAuth } from './state/AuthContext';
import { useGame } from './state/GameContext';
import type { Section } from './types';

export default function App() {
  const { status } = useAuth();
  const { state } = useGame();
  const [section, setSection] = useState<Section>('leyendas');

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
      <Header />
      <BottomNav section={section} onChange={setSection} />
      <main className="app__main">
        {section === 'informe' && <Informe />}
        {section === 'indicadores' && <Indicadores />}
        {section === 'leyendas' && <Leyendas />}
        {section === 'jugadores' && <Jugadores />}
        {section === 'armado' && (
          <Armado onStartMatch={() => setSection('contador')} />
        )}
        {section === 'contador' && (
          <ContadorRouter onGoToArmado={() => setSection('armado')} />
        )}
        {section === 'galeria' && <Galeria />}
        {section === 'jugadas' && <Jugadas />}
      </main>
    </div>
  );
}

function ContadorRouter({ onGoToArmado }: { onGoToArmado: () => void }) {
  const { state } = useGame();
  const [manual, setManual] = useState(false);
  const isFreshSelection =
    state.stage === 'selection' && state.selectedPlayerIds.length === 0;

  if (isFreshSelection && !manual) {
    return (
      <ContadorEntry
        onManual={() => setManual(true)}
        onCreateNew={onGoToArmado}
      />
    );
  }
  return (
    <>
      {state.stage === 'selection' && <PlayerSelection />}
      {state.stage === 'teams' && <TeamBuilder />}
      {(state.stage === 'game' || state.stage === 'finished') && <GameScreen />}
    </>
  );
}
