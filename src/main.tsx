import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initAuth } from './cloud/client';
import { takeStartupSnapshot } from './utils/localSnapshots';

// Antes de conectar la cuenta: copia de seguridad de lo que hay en este navegador.
takeStartupSnapshot();
// Firebase se descarga aparte, mientras ya se ve la app.
void initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
