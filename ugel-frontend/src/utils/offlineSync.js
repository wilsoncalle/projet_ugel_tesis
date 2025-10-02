/**
 * Módulo de sincronización offline
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

import { 
  getPendingVisitas, 
  getPendingSalidas,
  deleteVisitaOffline,
  deleteSalidaOffline,
  updateVisitaStatus
} from './offlineDB';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Registra un evento de sincronización en el Service Worker
 */
export function registerBackgroundSync(tag = 'offline-sync') {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register(tag);
    }).then(() => {
      console.log('[Sync] Background sync registrado:', tag);
    }).catch((error) => {
      console.warn('[Sync] Background sync no disponible:', error);
      // Fallback: intentar sincronizar inmediatamente
      syncPendingData();
    });
  } else {
    console.warn('[Sync] Background Sync API no disponible, usando fallback');
    // Intentar sincronizar inmediatamente
    syncPendingData();
  }
}

/**
 * Sincroniza todas las visitas pendientes
 */
async function syncPendingVisitas() {
  const pendingVisitas = await getPendingVisitas();
  const results = {
    success: [],
    failed: []
  };

  // Log solo si hay visitas para sincronizar
  if (pendingVisitas.length > 0) {
    console.log(`[Sync] Sincronizando ${pendingVisitas.length} visitas pendientes...`);
  }

  for (const visita of pendingVisitas) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Sync] No hay token de autenticación');
        results.failed.push({ visita, error: 'No autenticado' });
        continue;
      }

      let visitanteId = visita.visitanteId;

      // Si necesita crear el visitante primero
      if (visita.needsVisitanteCreation && visita.visitanteData) {
        console.log('[Sync] 🔍 Buscando visitante por DNI primero...');
        
        try {
          // PRIMERO: Buscar si ya existe
          const searchResponse = await fetch(
            `${API_BASE_URL}/visitantes/documento/${visita.visitanteData.tipoDocumentoId}/${visita.visitanteData.numeroDocumento}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            if (searchResult.success && searchResult.data) {
              visitanteId = searchResult.data.id;
              console.log(`[Sync] ✅ Visitante encontrado con ID: ${visitanteId}`);
            }
          }
          
          // SEGUNDO: Si no existe, crearlo
          if (!visitanteId) {
            console.log('[Sync] 📝 Visitante no existe, creando nuevo...');
            const visitanteResponse = await fetch(`${API_BASE_URL}/visitantes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(visita.visitanteData)
            });

            if (visitanteResponse.ok) {
              const visitanteResult = await visitanteResponse.json();
              if (visitanteResult.success && visitanteResult.data) {
                visitanteId = visitanteResult.data.id;
                console.log(`[Sync] ✅ Visitante creado con ID: ${visitanteId}`);
              }
            } else {
              const errorData = await visitanteResponse.json().catch(() => ({message: 'Unknown'}));
              throw new Error(`Error al crear visitante: ${errorData.message}`);
            }
          }
        } catch (visitanteError) {
          console.error('[Sync] ❌ Error creando/buscando visitante:', visitanteError);
          throw new Error('No se pudo crear o encontrar el visitante: ' + visitanteError.message);
        }
      }

      // Preparar datos para el backend
      const visitaPayload = {
        visitanteId: visitanteId,
        personalVisitadoId: visita.personalVisitadoId,
        motivoVisitaId: visita.motivoVisitaId,
        areaDestinoId: visita.areaDestinoId,
        usuarioIngresoId: visita.usuarioIngresoId,
        // Preservar la fecha y hora originales del evento offline
        fechaIngreso: visita.fechaIngreso,
        horaIngreso: visita.horaIngreso
      };

      console.log('[Sync] 🕐 Enviando datos con hora original:', {
        fechaIngreso: visitaPayload.fechaIngreso,
        horaIngreso: visitaPayload.horaIngreso,
        timestamp: visita.timestamp
      });

      // Enviar al backend
      const response = await fetch(`${API_BASE_URL}/visitas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(visitaPayload)
      });

      if (response.ok) {
        // Éxito: eliminar de IndexedDB
        await deleteVisitaOffline(visita.id);
        results.success.push(visita);
        console.log(`[Sync] Visita ${visita.id} sincronizada correctamente`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error del servidor');
      }
    } catch (error) {
      console.error(`[Sync] Error sincronizando visita ${visita.id}:`, error);
      results.failed.push({ visita, error: error.message });
      
      // Actualizar intentos de sincronización
      try {
        await updateVisitaStatus(visita.id, 'failed');
      } catch (updateError) {
        console.error('[Sync] Error actualizando estado:', updateError);
      }
    }
  }

  return results;
}

/**
 * Sincroniza todas las salidas pendientes
 */
async function syncPendingSalidas() {
  const pendingSalidas = await getPendingSalidas();
  const results = {
    success: [],
    failed: []
  };

  // Log solo si hay salidas para sincronizar
  if (pendingSalidas.length > 0) {
    console.log(`[Sync] Sincronizando ${pendingSalidas.length} salidas pendientes...`);
  }

  for (const salida of pendingSalidas) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Sync] No hay token de autenticación');
        results.failed.push({ salida, error: 'No autenticado' });
        continue;
      }

      // Enviar al backend
      const response = await fetch(`${API_BASE_URL}/visitas/${salida.visitaId}/salida`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // Éxito: eliminar de IndexedDB
        await deleteSalidaOffline(salida.id);
        results.success.push({ 
          ...salida, 
          responseData: responseData.data // Incluir datos de respuesta para actualización UI
        });
        console.log(`[Sync] ✅ Salida ${salida.id} sincronizada correctamente`);
        
        // Notificar a la UI sobre la salida sincronizada
        window.dispatchEvent(new CustomEvent('offline-salida-sincronizada', {
          detail: { 
            salidaId: salida.id,
            visitaId: salida.visitaId,
            responseData: responseData.data
          }
        }));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error del servidor');
      }
    } catch (error) {
      console.error(`[Sync] ❌ Error sincronizando salida ${salida.id}:`, error);
      results.failed.push({ salida, error: error.message });
    }
  }

  return results;
}

/**
 * Sincroniza todos los datos pendientes
 */
export async function syncPendingData() {
  // Log solo si hay datos para sincronizar
  const pendingVisitas = await getPendingVisitas();
  const pendingSalidas = await getPendingSalidas();
  if (pendingVisitas.length > 0 || pendingSalidas.length > 0) {
    console.log('[Sync] 🔄 Iniciando sincronización de datos pendientes...');
  }

  try {
    // Sincronizar visitas y salidas
    const [visitasResults, salidasResults] = await Promise.all([
      syncPendingVisitas(),
      syncPendingSalidas()
    ]);

    const totalSuccess = visitasResults.success.length + salidasResults.success.length;
    const totalFailed = visitasResults.failed.length + salidasResults.failed.length;

    console.log(`[Sync] ✅ Sincronización completada: ${totalSuccess} éxitos, ${totalFailed} fallos`);

    // Notificar a la UI sobre la sincronización completada
    if (totalSuccess > 0) {
      notifySyncComplete(totalSuccess, totalFailed);
    }

    return {
      success: totalSuccess,
      failed: totalFailed,
      visitas: visitasResults,
      salidas: salidasResults
    };
  } catch (error) {
    console.error('[Sync] ❌ Error general de sincronización:', error);
    return {
      success: 0,
      failed: 0,
      error: error.message
    };
  }
}

/**
 * Notifica a la UI sobre la sincronización completada
 */
function notifySyncComplete(successCount, failedCount) {
  // Enviar evento personalizado para que la UI pueda escucharlo
  window.dispatchEvent(new CustomEvent('offline-sync-complete', {
    detail: { successCount, failedCount }
  }));

  // Mostrar notificación del navegador si está disponible
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sincronización completada', {
      body: `${successCount} registro(s) sincronizado(s) correctamente.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });
  }
}

/**
 * Verifica el estado de la conexión
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Configura listeners para detectar cambios en la conectividad
 */
export function setupConnectivityListeners() {
  window.addEventListener('online', () => {
    console.log('[Sync] Conexión restaurada, sincronizando...');
    // Esperar un momento para asegurar que la conexión es estable
    setTimeout(() => {
      registerBackgroundSync();
    }, 1000);
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] Sin conexión a internet');
    window.dispatchEvent(new CustomEvent('connection-status-changed', {
      detail: { online: false }
    }));
  });

  // Escuchar mensajes del Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_REQUESTED') {
        console.log('[Sync] Service Worker solicitó sincronización');
        syncPendingData();
      }
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        console.log('[Sync] Service Worker completó sincronización');
      }
    });
  }

  // Verificar conectividad al cargar
  if (isOnline()) {
    // Intentar sincronizar datos pendientes al iniciar
    setTimeout(() => {
      syncPendingData();
    }, 2000);
  }
}

