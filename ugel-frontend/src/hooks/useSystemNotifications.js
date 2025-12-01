import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { enviarNotificacionSistema, setAppBadge } from '../utils/notificationUtils';
import { visitasService } from '../services/api';

export const useSystemNotifications = () => {
  const { user } = useAuth();
  const personalId = user?.personal_id || user?.personalId;

  useEffect(() => {
    if (!personalId) return;

    let socket;

    // Función para actualizar el contador de notificaciones (badge)
    // Se basa en el número de visitas PENDIENTES
    const actualizarContadorVisitas = async () => {
      try {
        const response = await visitasService.getMisVisitas({ 
          estados: 'PENDIENTE',
          limit: 1 // Solo necesitamos saber el total
        });
        
        if (response.data && typeof response.data.total !== 'undefined') {
          const count = response.data.total;
          console.log('[SystemNotifications] Actualizando badge a:', count);
          setAppBadge(count);
          localStorage.setItem('notification_count', String(count));
        }
      } catch (error) {
        console.error('[SystemNotifications] Error actualizando contador:', error);
      }
    };

    const initializeSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        // Usar variable de entorno si existe, sino dejar que socket.io infiera (usará el proxy en dev)
        const socketURL = import.meta.env.VITE_SOCKET_URL;
        const token = localStorage.getItem('token');

        socket = io(socketURL, {
          transports: ['websocket'],
          reconnection: true,
          auth: {
            token: token
          }
        });

        socket.on('connect', () => {
          console.log('[SystemNotifications] Socket connected');
          // Actualizar contador al conectar
          actualizarContadorVisitas();
        });

        // 1. Nueva Visita
        socket.on('nueva_visita_registrada', (visita) => {
          console.log('[SystemNotifications] Evento nueva_visita_registrada recibido:', visita);
          const visitadoId = visita.personal_visitado_id ?? visita.personalVisitadoId;
          
          if (visitadoId && parseInt(visitadoId, 10) === parseInt(personalId, 10)) {
             console.log('[SystemNotifications] IDs coinciden, enviando notificación...');
             
             // Actualizar contador
             actualizarContadorVisitas();

             enviarNotificacionSistema(
               'Nueva Visita', 
               `Motivo: ${visita.nombre_motivo || 'General'} - Visitante: ${visita.nombres_visitante || 'Alguien'}`,
               '/img/icono_ugel.png'
             );
          }
        });

        // 2. Visita Delegada
        socket.on('visita_delegada', (data) => {
           const visitadoId = data.personal_visitado_id ?? data.personalVisitadoId;
           if (visitadoId && parseInt(visitadoId, 10) === parseInt(personalId, 10)) {
             actualizarContadorVisitas();
             enviarNotificacionSistema(
               'Visita Delegada', 
               `Te han delegado una visita de ${data.nombres_visitante || 'Alguien'}`,
               '/img/icono_ugel.png'
             );
           }
        });

        // 3. Justificación Actualizada
        socket.on('justificacion_actualizada', (justificacion) => {
           const empleadoId = justificacion.personal_id ?? justificacion.personalId;
           if (empleadoId && parseInt(empleadoId, 10) === parseInt(personalId, 10)) {
             const estado = justificacion.estado;
             let mensaje = `Tu justificación ha sido actualizada a: ${estado}`;
             if (estado === 'APROBADO') mensaje = '¡Tu justificación ha sido aprobada!';
             if (estado === 'RECHAZADO') mensaje = 'Tu justificación ha sido rechazada.';

             enviarNotificacionSistema(
               'Estado de Justificación', 
               mensaje,
               '/img/icono_ugel.png'
             );
           }
        });

        // 4. Estado de Visita Actualizado (Aceptada/Rechazada/Finalizada)
        // Escuchar este evento para bajar el contador si la visita deja de estar pendiente
        socket.on('estado_visita_actualizado', (data) => {
           // Verificar si la visita era para este usuario (o si fue delegada a él)
           // Como es difícil saberlo solo con el ID de visita sin consultar, 
           // simplemente actualizamos el contador por seguridad si el evento llega.
           // Idealmente el backend envía el personalId afectado, pero si no, refrescamos igual.
           console.log('[SystemNotifications] Estado actualizado, refrescando badge...');
           actualizarContadorVisitas();
        });

      } catch (error) {
        console.error('[SystemNotifications] Error initializing socket:', error);
      }
    };

    initializeSocket();
    // Carga inicial del contador
    actualizarContadorVisitas();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [personalId]);
};

