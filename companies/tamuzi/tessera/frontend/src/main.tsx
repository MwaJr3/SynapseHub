import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { OfflineBanner, RequestStatus } from "./decor"
import './styles.css';
import './decor/decor.css';

const container = document.getElementById('root');
if (!container) throw new Error('root element missing');

createRoot(container).render(
  <StrictMode>
    <OfflineBanner />
    <RequestStatus />
    <App />
  </StrictMode>,
);
