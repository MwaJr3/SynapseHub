import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { OfflineBanner, RequestStatus } from "./decor"
import './styles.css';
import './decor/decor.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <OfflineBanner />
    <RequestStatus />
    <App />
  </StrictMode>,
);
