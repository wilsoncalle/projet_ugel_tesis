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

    // Extraer ID numérico si el visitaId tiene prefijo 'offline_'
    let visitaIdToSave = visitaId;
    if (typeof visitaIdToSave === 'string' && visitaIdToSave.startsWith('offline_')) {
      visitaIdToSave = parseInt(visitaIdToSave.split('_')[1], 10);
      console.log(`[IndexedDB] 🔄 Convirtiendo visitaId de string a número: '${visitaId}' -> ${visitaIdToSave}`);
    }

    const now = new Date();
    const fechaSalida = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaSalida = now.toTimeString().substring(0, 8); // HH:MM:SS
    
    console.log('[IndexedDB] Generando datos de salida offline:', {
      now: now.toISOString(),
      fechaSalida,
      horaSalida,
      visitaIdOriginal: visitaId,
      visitaIdToSave,
      tipoVisitaId: typeof visitaIdToSave
    });
    
    const salidaOffline = {
      visitaId: visitaIdToSave,
      timestamp: Date.now(),
      // Guardar la fecha y hora de salida capturada offline
      fechaSalida,
      horaSalida,
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
 * Obtiene todas las visitas activas combinando visitas pendientes con salidas pendientes
 * Esta función es la solución principal para el problema de salidas offline
 */
export async function getVisitasActivasCompletas() {
  try {
    console.log('[IndexedDB] Obteniendo visitas activas completas (visitas + salidas)...');
    
    // Obtener visitas y salidas pendientes en paralelo
    const [visitasPendientes, salidasPendientes] = await Promise.all([
      getPendingVisitas(),
      getPendingSalidas()
    ]);
    
    console.log('[IndexedDB] Datos obtenidos:', {
      visitas: visitasPendientes.length,
      salidas: salidasPendientes.length
    });
    
    // Crear un mapa de salidas por visitaId para acceso rápido
    const salidasPorVisita = new Map();
    salidasPendientes.forEach(salida => {
      salidasPorVisita.set(salida.visitaId, salida);
    });
    
    // Transformar visitas pendientes al formato de visitas activas
    const visitasActivas = visitasPendientes.map(visita => {
      // Buscar salida correspondiente
      const salida = salidasPorVisita.get(visita.id);
      
      // Crear objeto base de visita activa
      const visitaActiva = {
        id: `offline_${visita.id}`,
        visitante_id: visita.visitanteId || 0,
        visitante_nombres: visita.visitanteData?.nombres || '',
        visitante_apellidos: visita.visitanteData?.apellidos || '',
        tipo_documento_codigo: 'DNI',
        numero_documento: visita.visitanteData?.numeroDocumento || '',
        personal_visitado_id: visita.personalVisitadoId,
        personal_nombres: visita.personal_nombres || '',
        personal_apellidos: visita.personal_apellidos || '',
        personal_cargo: visita.personal_cargo || 'Sin cargo',
        motivo_visita_id: visita.motivoVisitaId,
        nombre_motivo: visita.nombre_motivo || 'Pendiente',
        area_destino_id: visita.areaDestinoId,
        nombre_area: visita.nombre_area || 'Pendiente',
        fecha_ingreso: visita.fechaIngreso || '',
        hora_ingreso: visita.horaIngreso || '',
        // Campos específicos para visitas offline
        _isOffline: true,
        _isPending: true,
        _originalId: visita.id,
        _needsVisitanteCreation: visita.needsVisitanteCreation || false,
        visitanteData: visita.visitanteData
      };
      
      // Si hay salida pendiente, aplicarla
      if (salida) {
        console.log('[IndexedDB] Aplicando salida a visita:', {
          visitaId: visita.id,
          salidaId: salida.id,
          fechaSalida: salida.fechaSalida,
          horaSalida: salida.horaSalida
        });
        
        return {
          ...visitaActiva,
          fecha_salida: salida.fechaSalida,
          hora_salida: salida.horaSalida,
          _hasOfflineExit: true,
          _offlineExitId: salida.id
        };
      }
      
      // Si no hay salida, es una visita activa normal
      return {
        ...visitaActiva,
        fecha_salida: null,
        hora_salida: null,
        _hasOfflineExit: false
      };
    });
    
    // Separar visitas activas de las que tienen salida
    const visitasConSalida = visitasActivas.filter(v => v._hasOfflineExit);
    const visitasSinSalida = visitasActivas.filter(v => !v._hasOfflineExit);
    
    console.log('[IndexedDB] Visitas activas completas:', {
      total: visitasActivas.length,
      conSalida: visitasConSalida.length,
      sinSalida: visitasSinSalida.length
    });
    
    return {
      visitasActivas: visitasSinSalida, // Solo las que NO tienen salida
      visitasConSalida: visitasConSalida, // Las que SÍ tienen salida (para historial)
      salidasPendientes: salidasPendientes
    };
    
  } catch (error) {
    console.error('[IndexedDB] Error obteniendo visitas activas completas:', error);
    return {
      visitasActivas: [],
      visitasConSalida: [],
      salidasPendientes: []
    };
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
 * Actualiza el visitaId de una salida pendiente
 */
export async function updateSalidaVisitaId(salidaId, nuevaVisitaId) {
  try {
    console.log(`[IndexedDB] 🔄 Actualizando salida ${salidaId} con nuevo visitaId: ${nuevaVisitaId}`);
    
    const db = await openDB();
    const transaction = db.transaction([STORES.PENDING_SALIDAS], 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SALIDAS);
    
    return new Promise((resolve, reject) => {
      // Primero obtener la salida actual
      const getRequest = store.get(salidaId);
      getRequest.onsuccess = () => {
        const salida = getRequest.result;
        if (salida) {
          console.log(`[IndexedDB] 📋 Salida encontrada:`, {
            id: salida.id,
            visitaId: salida.visitaId,
            timestamp: salida.timestamp
          });
          
          const visitaIdAnterior = salida.visitaId;
          
          // Actualizar el visitaId
          salida.visitaId = nuevaVisitaId;
          
          console.log(`[IndexedDB] 🔄 Cambiando visitaId: ${visitaIdAnterior} -> ${nuevaVisitaId}`);
          
          // Guardar la salida actualizada
          const putRequest = store.put(salida);
          putRequest.onsuccess = () => {
            console.log(`[IndexedDB] ✅ Salida ${salidaId} actualizada exitosamente con nuevo visitaId: ${nuevaVisitaId}`);
            resolve();
          };
          putRequest.onerror = (error) => {
            console.error(`[IndexedDB] ❌ Error al guardar salida actualizada:`, error);
            reject(new Error('Error al actualizar salida offline'));
          };
        } else {
          console.error(`[IndexedDB] ❌ Salida ${salidaId} no encontrada`);
          reject(new Error('Salida no encontrada'));
        }
      };
      getRequest.onerror = (error) => {
        console.error(`[IndexedDB] ❌ Error al obtener salida ${salidaId}:`, error);
        reject(new Error('Error al obtener salida offline'));
      };
    });
  } catch (error) {
    console.error('[IndexedDB] ❌ Error general:', error);
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

