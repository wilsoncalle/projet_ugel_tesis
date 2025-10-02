/**
 * Módulo de IndexedDB para almacenamiento offline
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const DB_NAME = 'ugel-offline-db';
const DB_VERSION = 1;

// Nombres de las tablas (object stores)
const STORES = {
  PENDING_VISITAS: 'pending_visitas',
  PENDING_SALIDAS: 'pending_salidas',
  SYNC_QUEUE: 'sync_queue'
};

/**
 * Abre la base de datos IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Error al abrir la base de datos offline'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Crear tabla para visitas pendientes
      if (!db.objectStoreNames.contains(STORES.PENDING_VISITAS)) {
        const visitasStore = db.createObjectStore(STORES.PENDING_VISITAS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        visitasStore.createIndex('timestamp', 'timestamp', { unique: false });
        visitasStore.createIndex('status', 'status', { unique: false });
      }

      // Crear tabla para salidas pendientes
      if (!db.objectStoreNames.contains(STORES.PENDING_SALIDAS)) {
        const salidasStore = db.createObjectStore(STORES.PENDING_SALIDAS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        salidasStore.createIndex('visitaId', 'visitaId', { unique: false });
        salidasStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Crear tabla para cola de sincronización genérica
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
      }

      console.log('[IndexedDB] Base de datos creada/actualizada correctamente');
    };
  });
}

/**
 * Guarda una visita pendiente en IndexedDB
 * Incluye datos del visitante para crear en sincronización
 */
export async function saveVisitaOffline(visitaData, visitanteData = null) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_VISITAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_VISITAS);

    const visitaOffline = {
      ...visitaData,
      // Incluir datos del visitante si es nuevo
      visitanteData: visitanteData ? {
        tipoDocumentoId: visitanteData.tipoDocumentoId,
        numeroDocumento: visitanteData.numeroDocumento,
        nombres: visitanteData.nombres,
        apellidos: visitanteData.apellidos,
        // ID temporal para referencia, al sincronizar se buscará por DNI
        _tempId: `temp_${Date.now()}_${visitanteData.numeroDocumento}`
      } : null,
      needsVisitanteCreation: !!visitanteData, // Flag para saber si necesita crear visitante
      // Preservar datos adicionales para la UI offline
      personal_nombres: visitaData.personal_nombres || '',
      personal_apellidos: visitaData.personal_apellidos || '',
      personal_cargo: visitaData.personal_cargo || 'Sin cargo',
      nombre_motivo: visitaData.nombre_motivo || 'Pendiente',
      nombre_area: visitaData.nombre_area || 'Pendiente',
      timestamp: Date.now(),
      status: 'pending',
      syncAttempts: 0
    };

    // Log solo en modo desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('[IndexedDB] 📥 Guardando visita offline:', JSON.stringify(visitaOffline, null, 2));
      console.log('[IndexedDB] 🕐 Hora de ingreso a guardar:', visitaData.horaIngreso);
    }

    return new Promise((resolve, reject) => {
      const request = store.add(visitaOffline);

      request.onsuccess = () => {
        const savedData = { id: request.result, ...visitaOffline };
        // Log solo en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('[IndexedDB] ✅ Visita guardada offline con ID:', request.result);
          console.log('[IndexedDB] ✅ Datos completos:', savedData);
        }
        resolve(savedData);
      };

      request.onerror = () => {
        console.error('[IndexedDB] ❌ Error al guardar visita:', {
          name: request.error?.name,
          message: request.error?.message
        });
        reject(new Error(`Error al guardar visita offline: ${request.error?.message || 'Unknown'}`));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    throw error;
  }
}

/**
 * Guarda una salida pendiente en IndexedDB
 */
export async function saveSalidaOffline(visitaId, visitanteData = null) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_SALIDAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SALIDAS);

    const salidaOffline = {
      visitaId,
      timestamp: Date.now(),
      status: 'pending',
      syncAttempts: 0,
      // Incluir datos del visitante para referencia durante sincronización
      visitanteData: visitanteData ? {
        nombres: visitanteData.visitante_nombres || visitanteData.nombres || '',
        apellidos: visitanteData.visitante_apellidos || visitanteData.apellidos || '',
        numeroDocumento: visitanteData.numero_documento || visitanteData.numeroDocumento || '',
        personal_nombres: visitanteData.personal_nombres || '',
        personal_apellidos: visitanteData.personal_apellidos || '',
        personal_cargo: visitanteData.personal_cargo || '',
        nombre_motivo: visitanteData.nombre_motivo || '',
        nombre_area: visitanteData.nombre_area || ''
      } : null
    };

    return new Promise((resolve, reject) => {
      const request = store.add(salidaOffline);

      request.onsuccess = () => {
        console.log('[IndexedDB] Salida guardada offline con ID:', request.result);
        resolve({ id: request.result, ...salidaOffline });
      };

      request.onerror = () => {
        reject(new Error('Error al guardar salida offline'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    throw error;
  }
}

/**
 * Obtiene todas las visitas pendientes
 */
export async function getPendingVisitas() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_VISITAS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_VISITAS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const pending = request.result.filter(item => item.status === 'pending');
        // Solo mostrar log si hay visitas pendientes
        if (pending.length > 0) {
          console.log('[IndexedDB] Visitas pendientes encontradas:', pending.length);
        }
        resolve(pending);
      };

      request.onerror = () => {
        reject(new Error('Error al obtener visitas pendientes'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    return [];
  }
}

/**
 * Obtiene todas las salidas pendientes
 */
export async function getPendingSalidas() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_SALIDAS], 'readonly');
    const store = transaction.objectStore(STORES.PENDING_SALIDAS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => {
        const pending = request.result.filter(item => item.status === 'pending');
        // Solo mostrar log si hay salidas pendientes
        if (pending.length > 0) {
          console.log('[IndexedDB] Salidas pendientes encontradas:', pending.length);
        }
        resolve(pending);
      };

      request.onerror = () => {
        reject(new Error('Error al obtener salidas pendientes'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    return [];
  }
}

/**
 * Elimina una visita pendiente después de sincronizarla
 */
export async function deleteVisitaOffline(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_VISITAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_VISITAS);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[IndexedDB] Visita offline eliminada:', id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Error al eliminar visita offline'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    throw error;
  }
}

/**
 * Elimina una salida pendiente después de sincronizarla
 */
export async function deleteSalidaOffline(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_SALIDAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SALIDAS);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[IndexedDB] Salida offline eliminada:', id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Error al eliminar salida offline'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de una visita pendiente
 */
export async function updateVisitaStatus(id, status) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_VISITAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_VISITAS);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.status = status;
          data.syncAttempts = (data.syncAttempts || 0) + 1;
          data.lastSyncAttempt = Date.now();

          const updateRequest = store.put(data);
          updateRequest.onsuccess = () => resolve(data);
          updateRequest.onerror = () => reject(new Error('Error al actualizar'));
        } else {
          reject(new Error('Visita no encontrada'));
        }
      };

      getRequest.onerror = () => reject(new Error('Error al obtener visita'));
    });
  } catch (error) {
    console.error('[IndexedDB] Error:', error);
    throw error;
  }
}

/**
 * Obtiene el conteo de registros pendientes
 */
export async function getPendingCount() {
  try {
    const visitas = await getPendingVisitas();
    const salidas = await getPendingSalidas();
    
    return {
      visitas: visitas.length,
      salidas: salidas.length,
      total: visitas.length + salidas.length
    };
  } catch (error) {
    console.error('[IndexedDB] Error obteniendo conteo:', error);
    return { visitas: 0, salidas: 0, total: 0 };
  }
}

/**
 * Limpia todos los registros pendientes (solo usar en desarrollo)
 */
export async function clearAllPending() {
  try {
    const db = await openDB();
    const transaction = db.transaction(
      [STORES.PENDING_VISITAS, STORES.PENDING_SALIDAS], 
      'readwrite'
    );
    
    transaction.objectStore(STORES.PENDING_VISITAS).clear();
    transaction.objectStore(STORES.PENDING_SALIDAS).clear();
    
    console.log('[IndexedDB] Todos los registros pendientes eliminados');
  } catch (error) {
    console.error('[IndexedDB] Error limpiando registros:', error);
  }
}

