import { io } from 'socket.io-client';

// Obtener la URL del servidor desde las variables de entorno
// En producción, usa el origen actual del navegador (window.location.origin)
// En desarrollo, usa localhost:3000 si no hay VITE_API_URL
const getSocketURL = () => {
  // Si hay VITE_API_URL configurada, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '');
  }
  
  // En desarrollo, usar localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  
  // En producción, usar el mismo origen del navegador (relativo)
  // Esto hace que funcione tanto en AWS, como en cualquier dominio
  return window.location.origin;
};

const SOCKET_URL = getSocketURL();

console.log('[Socket] Configuración:', {
  mode: import.meta.env.DEV ? 'DESARROLLO' : 'PRODUCCIÓN',
  socketURL: SOCKET_URL,
  apiURL: import.meta.env.VITE_API_URL || 'No configurada'
});

// Crear instancia de socket
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
  auth: (cb) => {
    // Enviar el token si existe
    const token = localStorage.getItem('token');
    cb({ token });
  }
});

// Log de eventos de conexión (solo en desarrollo)
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('[Socket] Conectado al servidor:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Error de conexión:', error.message);
  });
}

export default socket;
