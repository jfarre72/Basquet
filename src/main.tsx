import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import { GameProvider } from './state/GameContext';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('No #root element found in index.html');

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </AuthProvider>
  </StrictMode>,
);
