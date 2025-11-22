import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';
import 'react-day-picker/dist/style.css';
import { AuthProvider } from './contexts/AuthContext';
import { setupConnectivityListeners } from './utils/offlineSync';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';

import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para funcionalidad offline
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Deseas actualizar ahora?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App lista para trabajar offline');
  },
});

// Configurar listeners de conectividad
setupConnectivityListeners();

// Solicitar permiso para notificaciones
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Permisos de notificación concedidos');
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <MantineProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </MantineProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
