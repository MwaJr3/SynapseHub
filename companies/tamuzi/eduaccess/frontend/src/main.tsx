import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { OfflineBanner } from "./decor"
import './styles.css';
import './decor/decor.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OfflineBanner />
    <App />
  </React.StrictMode>,
);
