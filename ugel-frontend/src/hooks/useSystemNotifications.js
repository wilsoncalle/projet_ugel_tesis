import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { enviarNotificacionSistema, setAppBadge } from '../utils/notificationUtils';
import { visitasService } from '../services/api';

/**
 * Hook centralizado para gestión de notificaciones y badges del sistema.
 * Versión 2.0: DRY, Patrón Estrategia y Corrección de Delegaciones.
 */
export const useSystemNotifications = () => {
  const { user } = useAuth();
  // Normalizar ID a string para comparaciones seguras
  const personalId = user?.personal_id || user?.personalId ? String(user.personal_id || user.personalId) : null;
  const socketRef = useRef(null);

  /**
   * Actualiza el badge (contador rojo) consultando la API.
   * Se debe llamar cada vez que el estado de MIS visitas cambie.
   */
  const actualizarBadge = useCallback(async () => {
    if (!personalId) return;
    
    try {
      // Obtenemos solo el conteo de pendientes
      const response = await visitasService.getMisVisitas({ 
        estados: 'PENDIENTE,DELEGADO,ACEPTADO',
        limit: 1 
      });
      
      const pag = response?.data?.pagination || {};
      const count = typeof pag.total !== 'undefined' ? pag.total : (response?.data?.total ?? 0);
      console.log('[SystemNotifications] Badge actualizado a:', count);
      setAppBadge(count);
      localStorage.setItem('notification_count', String(count));
    } catch (error) {
      console.error('[SystemNotifications] Error sincronizando badge:', error);
    }
  }, [personalId]);

  /**
   * Determina si un evento de socket tiene que ver conmigo.
   * Revisa si soy el destinatario, el nuevo responsable, o quien delegó.
   */
  const esParaMi = useCallback((data) => {
    if (!personalId || !data) return false;

    const myIdStr = String(personalId);

    // Lista de posibles campos donde podría estar mi ID
    const relevantIds = [
      data.personal_visitado_id, // Destinatario normal
      data.personalVisitadoId,   // Variación camelCase
      data.nuevo_personal_id,    // Cuando me delegan a mí
      data.delegado_por_id,      // Cuando YO delego (necesito bajar mi badge)
      data.personal_id,          // Justificaciones
      data.personalId
    ];

    // Comprobamos si alguno de esos IDs soy yo
    return relevantIds.some(id => id && String(id) === myIdStr);
  }, [personalId]);

  useEffect(() => {
    if (!personalId) return;

    // ESTRATEGIAS DE NOTIFICACIÓN
    // Retornar 'true' significa "Actualizar Badge"
    const strategies = {
      
      // 1. Nueva Visita (o reasignación completa)
      'nueva_visita_registrada': (data) => {
        // Solo procesar si es para mí Y NO es el evento duplicado de delegación
        // (El backend ahora manda 'es_delegacion: true' en el evento duplicado)
        if (esParaMi(data)) {
          // Si es una delegación, NO mostramos notificación visual aquí (lo hará 'visita_delegada')
          // PERO sí actualizamos el badge retornando true.
          if (data.es_delegacion) {
            return true; 
          }

          // Notificación visual normal
          enviarNotificacionSistema(
            'Nueva Visita', 
            `Motivo: ${data.nombre_motivo || 'General'} - Visitante: ${data.nombres_visitante || data.visitante_nombres || 'Visitante'}`,
            '/img/icono_ugel.png',
            { incrementBadge: false }
          );
          return true;
        }
        return false;
      },

      // 2. Visita Delegada (Específico)
      'visita_delegada': (data) => {
        // Aquí entramos si soy el NUEVO responsable (me llega la visita)
        if (esParaMi(data)) {
          // Verificamos si soy el destinatario (no el que delegó) para el mensaje
          const soyDestinatario = String(data.personal_visitado_id) === String(personalId);
          
          if (soyDestinatario) {
            const quien = `${data.delegado_por_nombres || ''} ${data.delegado_por_apellidos || ''}`.trim();
            enviarNotificacionSistema(
              'Visita Delegada', 
              `Te han delegado una visita de ${data.nombres_visitante || 'Alguien'}. Delegado por: ${quien || 'Compañero'}.`,
              '/img/icono_ugel.png',
              { incrementBadge: false }
            );
          }
          // En ambos casos (delegador o delegado), actualizamos badge
          return true;
        }
        return false;
      },

      // 3. Cambios de Estado (Aceptado, Rechazado, Finalizado, Delegado)
      // Este evento es CRÍTICO para que el badge baje cuando atiendes la visita.
      'estado_visita_actualizado': (data) => {
        // Ahora el backend envía 'personal_visitado_id' o 'delegado_por_id'.
        // Si soy cualquiera de ellos, mi lista de pendientes cambió.
        if (esParaMi(data)) {
          console.log('[SystemNotifications] Estado actualizado para mí, refrescando badge.');
          return true;
        }
        return false;
      },

      // 4. Justificaciones (RRHH)
      'justificacion_actualizada': (data) => {
        if (esParaMi(data)) {
          const estado = data.estado;
          let mensaje = `Tu justificación ha sido actualizada a: ${estado}`;
          if (estado === 'APROBADO') mensaje = '¡Tu justificación ha sido aprobada!';
          if (estado === 'RECHAZADO') mensaje = 'Tu justificación ha sido rechazada.';

          enviarNotificacionSistema('Estado de Justificación', mensaje, '/img/icono_ugel.png', { incrementBadge: false });
          return false; // No afecta badge de visitas
        }
        return false;
      }
    };

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        // Fallback robusto para la URL del socket
        const socketURL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        const token = localStorage.getItem('token');

        console.log('[SystemNotifications] Conectando socket a:', socketURL);

        socketRef.current = io(socketURL, {
          transports: ['websocket'],
          reconnection: true,
          auth: { token }
        });

        socketRef.current.on('connect', () => {
          console.log('[SystemNotifications] Socket conectado ID:', socketRef.current.id);
          actualizarBadge(); // Sincronización inicial
        });

        // Registrar listeners dinámicamente
        Object.entries(strategies).forEach(([event, handler]) => {
          socketRef.current.on(event, (data) => {
            console.log(`[SystemNotifications] Evento recibido: ${event}`, data);
            const shouldUpdate = handler(data);
            if (shouldUpdate) actualizarBadge();
          });
        });

      } catch (error) {
        console.error('[SystemNotifications] Error socket:', error);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [personalId, actualizarBadge, esParaMi]);
};
