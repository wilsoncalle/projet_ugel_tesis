import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'react-day-picker/dist/style.css';
import { AuthProvider } from './contexts/AuthContext';
import { setupConnectivityListeners } from './utils/offlineSync';
import './index.css';

// Registrar Service Worker para funcionalidad offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Service Worker registrado silenciosamente
        
        // Configurar listeners de conectividad
        setupConnectivityListeners();
        
        // Verificar actualizaciones del Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Nueva versión del Service Worker encontrada');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              console.log('Nueva versión disponible. Recarga la página para actualizar.');
              
              // Opcional: mostrar notificación al usuario
              if (window.confirm('Nueva versión disponible. ¿Deseas actualizar ahora?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('Error al registrar Service Worker:', error);
      });
  });
} else {
  console.warn('Service Workers no están soportados en este navegador');
}

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
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
