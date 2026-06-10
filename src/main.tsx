import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './services/firebase.ts';
import { seedProducts } from './services/seed.ts';

// Testes de conexão e seed só em desenvolvimento
if (import.meta.env.DEV) {
  testConnection().then(() => seedProducts());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
