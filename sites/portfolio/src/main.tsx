import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './decor/decor.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { OfflineBanner } from "./decor"

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

/* `App` supplies its own BrowserRouter and ThemeProvider — do not wrap it in
   another router here (a nested <Router> throws and renders a blank page). */
createRoot(container).render(
  <StrictMode>
    <OfflineBanner />
    <App />
  </StrictMode>,
);
