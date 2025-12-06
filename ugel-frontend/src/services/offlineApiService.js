/**
 * Wrapper del servicio API con soporte offline
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

import { 
  saveVisitaOffline, 
  saveSalidaOffline,
  saveIngresoPersonalOffline,
  saveSalidaPersonalOffline
} from '../utils/offlineDB';
import { registerBackgroundSync, isOnline } from '../utils/offlineSync';

function isNetworkError(error) {
  return (
    !error.response ||
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.response?.status === 503 ||
    error.response?.status === 0 ||
    (error.response?.status >= 500 && error.response?.status < 600)
  );
}

/**
 * Crea una visita con soporte offline
 * Si hay conexión, envía al backend
 * Si no hay conexión, guarda en IndexedDB
 * @param {Object} visitaData - Datos de la visita
 * @param {Object} visitanteData - Datos del visitante (si es nuevo)
 * @param {Function} originalCreateFn - Función original del servicio
 */
export async function createVisitaWithOfflineSupport(visitaData, visitanteData = null, originalCreateFn) {
  console.log('[Offline API] Iniciando createVisitaWithOfflineSupport');
  console.log('[Offline API] navigator.onLine:', navigator.onLine);
  console.log('[Offline API] isOnline():', isOnline());
  console.log('[Offline API] visitaData:', visitaData);
  console.log('[Offline API] visitanteData:', visitanteData);
  
  // Verificar si estamos online
  if (!isOnline()) {
    console.log('[Offline API] Sin conexión, guardando visita localmente...');
    
    try {
      // Guardar en IndexedDB con datos del visitante si es necesario
      const savedData = await saveVisitaOffline(visitaData, visitanteData);
      console.log('[Offline API] Visita guardada offline correctamente:', savedData);
      
      // Registrar para Background Sync
      registerBackgroundSync('offline-sync');
      
      // Devolver respuesta simulando éxito offline
      return {
        data: {
          success: true,
          offline: true,
          message: 'Visita guardada localmente. Se sincronizará cuando vuelva la conexión.',
          data: {
            id: savedData.id,
            ...visitaData,
            offlineId: savedData.id,
            timestamp: savedData.timestamp
          }
        }
      };
    } catch (error) {
      console.error('[Offline API] Error guardando visita offline:', error);
      throw new Error('No se pudo guardar la visita offline: ' + error.message);
    }
  }

  // Si estamos online, intentar enviar al backend
  try {
    console.log('[Offline API] Online detectado, enviando al backend...');
    const response = await originalCreateFn(visitaData);
    console.log('[Offline API] Respuesta del backend exitosa:', response);
    return response;
  } catch (error) {
    console.error('[Offline API] Error al enviar al backend:', error);
    console.error('[Offline API] Detalles:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Detectar si es un error de red o servicio no disponible
    const isNetworkError = 
      !error.response || // Sin respuesta = error de red
      error.message === 'Network Error' || 
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.response?.status === 503 || // Service Unavailable
      error.response?.status === 0 || // Network error
      (error.response?.status >= 500 && error.response?.status < 600); // Errores de servidor
    
    if (isNetworkError) {
      console.log('[Offline API] Error de red/servidor detectado, activando modo offline...');
      
      try {
        const savedData = await saveVisitaOffline(visitaData, visitanteData);
        console.log('[Offline API] Guardado offline después de fallo:', savedData);
        registerBackgroundSync('offline-sync');
        
        return {
          data: {
            success: true,
            offline: true,
            message: 'Sin conexión. Visita guardada localmente y se sincronizará automáticamente.',
            data: {
              id: savedData.id,
              ...visitaData,
              offlineId: savedData.id,
              timestamp: savedData.timestamp
            }
          }
        };
      } catch (offlineError) {
        console.error('[Offline API] Error guardando offline:', offlineError);
        throw new Error('No se pudo guardar offline: ' + offlineError.message);
      }
    }
    
    // Si es otro tipo de error (400, 401, 404, etc.), lanzarlo para que lo maneje la UI
    console.error('[Offline API] Error NO es de red (código ' + error.response?.status + '), lanzando error');
    throw error;
  }
}

/**
 * Registra un ingreso de personal con soporte offline
 */
export async function registrarIngresoPersonalWithOfflineSupport(personalData, originalFn) {
  if (!isOnline()) {
    console.log('[Offline API] Sin conexión, guardando ingreso personal localmente...');
    try {
      const savedData = await saveIngresoPersonalOffline(personalData);
      registerBackgroundSync('offline-sync');

      window.dispatchEvent(new CustomEvent('offline-personal-ingreso', {
        detail: savedData
      }));

      return {
        data: {
          success: true,
          offline: true,
          message: savedData.alreadyRegistered
            ? 'El personal ya tiene asistencia registrada hoy (offline).'
            : 'Ingreso guardado localmente (Offline).',
          data: savedData
        }
      };
    } catch (error) {
      throw new Error('No se pudo guardar offline: ' + error.message);
    }
  }

  try {
    return await originalFn(personalData.value || personalData.id);
  } catch (error) {
    if (isNetworkError(error)) {
      const savedData = await saveIngresoPersonalOffline(personalData);
      registerBackgroundSync('offline-sync');
      return {
        data: { 
          success: true, 
          offline: true, 
          message: savedData.alreadyRegistered
            ? 'El personal ya tiene asistencia registrada hoy (offline).'
            : 'Conexión perdida. Guardado localmente.', 
          data: savedData 
        }
      };
    }
    throw error;
  }
}

/**
 * Registra una salida de personal con soporte offline
 */
export async function registrarSalidaPersonalWithOfflineSupport(personalId, originalFn) {
  if (!isOnline()) {
    console.log('[Offline API] Sin conexión, guardando salida personal localmente...');
    try {
      const savedData = await saveSalidaPersonalOffline(personalId);
      registerBackgroundSync('offline-sync');

      window.dispatchEvent(new CustomEvent('offline-personal-salida', {
        detail: savedData
      }));

      return {
        data: {
          success: true,
          offline: true,
          message: 'Salida guardada localmente (Offline).',
          data: savedData
        }
      };
    } catch (error) {
      throw new Error('No se pudo guardar la salida offline: ' + error.message);
    }
  }

  try {
    return await originalFn(personalId);
  } catch (error) {
    if (isNetworkError(error)) {
      const savedData = await saveSalidaPersonalOffline(personalId);
      registerBackgroundSync('offline-sync');
      return {
        data: { success: true, offline: true, message: 'Conexión perdida. Guardado localmente.', data: savedData }
      };
    }
    throw error;
  }
}

/**
 * Registra una salida con soporte offline
 */
export async function registrarSalidaWithOfflineSupport(visitaId, originalSalidaFn, visitanteData = null) {
  // Verificar si estamos online
  if (!isOnline()) {
    console.log('[Offline API] Sin conexión, guardando salida localmente...');
    
    try {
      // Guardar en IndexedDB con datos del visitante
      const savedData = await saveSalidaOffline(visitaId, visitanteData);
      
      // Registrar para Background Sync
      registerBackgroundSync('offline-sync');
      
      // Notificar inmediatamente a la UI para actualizar la interfaz
      window.dispatchEvent(new CustomEvent('offline-salida-registrada', {
        detail: { 
          salidaId: savedData.id,
          visitaId: visitaId,
          timestamp: savedData.timestamp,
          visitanteData: visitanteData
        }
      }));
      
      return {
        data: {
          success: true,
          offline: true,
          message: 'Salida guardada localmente. Se sincronizará cuando vuelva la conexión.',
          data: {
            id: savedData.id,
            visitaId,
            offlineId: savedData.id,
            timestamp: savedData.timestamp
          }
        }
      };
    } catch (error) {
      console.error('[Offline API] Error guardando salida offline:', error);
      throw new Error('No se pudo guardar la salida offline');
    }
  }

  // Si estamos online, intentar enviar al backend
  try {
    console.log('[Offline API] Online, enviando salida al backend...');
    const response = await originalSalidaFn(visitaId);
    return response;
  } catch (error) {
    // Si falla la conexión, guardar offline
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.log('[Offline API] Conexión perdida durante petición de salida, guardando offline...');
      
      try {
        const savedData = await saveSalidaOffline(visitaId, visitanteData);
        registerBackgroundSync('offline-sync');
        
        // Notificar inmediatamente a la UI para actualizar la interfaz
        window.dispatchEvent(new CustomEvent('offline-salida-registrada', {
          detail: { 
            salidaId: savedData.id,
            visitaId: visitaId,
            timestamp: savedData.timestamp,
            visitanteData: visitanteData
          }
        }));
        
        return {
          data: {
            success: true,
            offline: true,
            message: 'Conexión perdida. Salida guardada localmente.',
            data: {
              id: savedData.id,
              visitaId,
              offlineId: savedData.id,
              timestamp: savedData.timestamp
            }
          }
        };
      } catch (offlineError) {
        console.error('[Offline API] Error guardando salida offline:', offlineError);
        throw error;
      }
    }
    
    throw error;
  }
}

/**
 * Verifica si una respuesta es offline
 */
export function isOfflineResponse(response) {
  return response?.data?.offline === true;
}

/**
 * Muestra un mensaje apropiado según el tipo de respuesta
 */
export function getResponseMessage(response) {
  if (isOfflineResponse(response)) {
    return {
      type: 'warning',
      title: 'Modo Offline',
      message: response.data.message || 'Datos guardados localmente. Se sincronizarán automáticamente.'
    };
  }
  
  return {
    type: 'success',
    title: 'Éxito',
    message: response.data.message || 'Operación completada correctamente.'
  };
}

