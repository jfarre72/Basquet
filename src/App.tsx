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
import { applyPlayerNames } from './data/players';
import { fetchPlayerNames } from './lib/avatars';
import { useAuth } from './state/AuthContext';
import { useGame } from './state/GameContext';
import type { Section } from './types';

export default function App() {
  const { status } = useAuth();
  const { state } = useGame();
  const [section, setSection] = useState<Section>('leyendas');
  const [namesReady, setNamesReady] = useState(false);

  useEffect(() => {
    if (status !== 'authed') return;
    let cancelled = false;
    fetchPlayerNames()
      .then((rows) => {
        if (!cancelled) applyPlayerNames(rows);
      })
      .catch(() => {
        /* si falla, se usa el roster local por defecto */
      })
      .finally(() => {
        if (!cancelled) setNamesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

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

  if (status === 'loading' || (status === 'authed' && !namesReady)) {
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
      <BottomNav section={section} onChange={setSection} />
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
