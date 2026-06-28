import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testConnection } from './services/firebase.ts';
import { seedProducts } from './services/seed.ts';
import { installGlobalErrorHandlers } from './services/errorReporting.ts';
import { getConsent } from './lib/consent.ts';
import { initAnalytics } from './lib/analytics.ts';

// Captura global de erros não tratados → relata ao backend (Firestore + Telegram).
installGlobalErrorHandlers();

// Se o usuário já consentiu antes, carrega analytics no boot (antes do render,
// para os page_views por rota não perderem o disparo inicial).
if (getConsent() === 'accepted') initAnalytics();

// Testes de conexão e seed só em desenvolvimento
if (import.meta.env.DEV) {
  testConnection().then(() => seedProducts());
}

// Após um deploy, os arquivos lazy (ex: ProductDetail-xxxx.js) mudam de nome e
// os antigos somem do servidor. Se uma aba aberta tentar carregar um chunk antigo,
// o Vite dispara 'vite:preloadError'. Recarregamos uma vez (com trava anti-loop)
// para o navegador pegar o index.html novo com os nomes de arquivo corretos.
window.addEventListener('vite:preloadError', () => {
  const last = Number(sessionStorage.getItem('preload-reload-ts') || 0);
  if (Date.now() - last > 10000) {
    sessionStorage.setItem('preload-reload-ts', String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
