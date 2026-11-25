import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/app.css';
import './decor/decor.css';
import { App } from './App';
import { OfflineBanner, RequestStatus } from "./decor"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <OfflineBanner />
      <RequestStatus />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
