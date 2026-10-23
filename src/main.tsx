import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/index.css';
import './styles/portfolio.css';
import './styles/apps.css';

import App from './App';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { validateChallengeManifest } from '@/data/challengeManifest';

const manifestIssues = validateChallengeManifest();
if (import.meta.env.DEV && manifestIssues.length) {
  console.error('[challenge manifest]', manifestIssues);
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root container #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
