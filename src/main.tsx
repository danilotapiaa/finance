import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.tsx';

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('Serene Finance lista para usarse sin conexión.');
  },
  onRegisterError(error) {
    console.error('Error registrando el service worker:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);