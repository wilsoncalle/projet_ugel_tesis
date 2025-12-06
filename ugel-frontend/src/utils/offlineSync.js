/**
 * Módulo de sincronización offline
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

import { 
  getPendingVisitas, 
  getPendingSalidas,
  deleteVisitaOffline,
  deleteSalidaOffline,
  updateVisitaStatus,
  updateSalidaVisitaId,
  getPendingIngresosPersonal,
  getPendingSalidasPersonal,
  deleteIngresoPersonalOffline,
  deleteSalidaPersonalOffline
} from './offlineDB';

const API_BASE_URL = '/api';

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
              
              // NUEVO: Verificar si el visitante existente tiene datos incompletos y es DNI de 8 dígitos
              const esDNI = visita.visitanteData.tipoDocumentoCodigo === 'DNI' || 
                           visita.visitanteData.tipoDocumentoId?.toString() === '1';
              const esDNIValido = /^\d{8}$/.test(visita.visitanteData.numeroDocumento);
              const tieneDatosIncompletos = !searchResult.data.nombres || 
                                          !searchResult.data.apellidos ||
                                          searchResult.data.nombres.trim() === '' ||
                                          searchResult.data.apellidos.trim() === '';
              
              console.log('[Sync] 🔍 Verificando si visitante existente necesita actualización RENIEC:', {
                esDNI,
                esDNIValido,
                tieneDatosIncompletos,
                nombresActuales: searchResult.data.nombres,
                apellidosActuales: searchResult.data.apellidos
              });
              
              if (esDNI && esDNIValido && tieneDatosIncompletos) {
                console.log('[Sync] 🔄 Visitante existe pero tiene datos incompletos, consultando RENIEC...');
                try {
                  const reniecResponse = await fetch(`${API_BASE_URL}/visitantes/consultar-dni`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ dni: visita.visitanteData.numeroDocumento })
                  });
                  
                  if (reniecResponse.ok) {
                    const reniecData = await reniecResponse.json();
                    if (reniecData.success && reniecData.data) {
                      console.log('[Sync] ✅ Datos de RENIEC obtenidos para visitante existente:', reniecData.data);
                      
                      // Actualizar el visitante existente con datos de RENIEC
                      const updateResponse = await fetch(`${API_BASE_URL}/visitantes/${visitanteId}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          nombres: reniecData.data.nombres,
                          apellidos: reniecData.data.apellidos
                        })
                      });
                      
                      if (updateResponse.ok) {
                        console.log('[Sync] ✅ Visitante existente actualizado con datos de RENIEC');
                        
                        // Emitir evento para actualizar la UI
                        window.dispatchEvent(new CustomEvent('visitante-actualizado-reniec', {
                          detail: {
                            visitanteId: visitanteId,
                            nombres: reniecData.data.nombres,
                            apellidos: reniecData.data.apellidos,
                            numeroDocumento: visita.visitanteData.numeroDocumento
                          }
                        }));
                      } else {
                        console.warn('[Sync] ⚠️ Error actualizando visitante existente con datos de RENIEC');
                      }
                    }
                  } else {
                    console.warn('[Sync] ⚠️ No se pudieron obtener datos de RENIEC para visitante existente');
                  }
                } catch (reniecError) {
                  console.warn('[Sync] ⚠️ Error consultando RENIEC para visitante existente:', reniecError.message);
                }
              }
            }
          }
          
          // SEGUNDO: Si no existe, crearlo
          if (!visitanteId) {
            console.log('[Sync] 📝 Visitante no existe, creando nuevo...');
            
            // Verificar si es DNI de 8 dígitos para consultar RENIEC
            let visitanteDataToCreate = { ...visita.visitanteData };
            // Verificar si es DNI comparando con el código 'DNI' en lugar del ID
            const esDNI = visita.visitanteData.tipoDocumentoCodigo === 'DNI' || 
                         visita.visitanteData.tipoDocumentoId?.toString() === '1'; // Fallback para compatibilidad
            const esDNIValido = /^\d{8}$/.test(visita.visitanteData.numeroDocumento);
            
            console.log('[Sync] 🔍 Verificando condiciones RENIEC:', {
              tipoDocumentoCodigo: visita.visitanteData.tipoDocumentoCodigo,
              tipoDocumentoId: visita.visitanteData.tipoDocumentoId,
              numeroDocumento: visita.visitanteData.numeroDocumento,
              esDNI,
              esDNIValido,
              visitanteData: visita.visitanteData
            });
            
            if (esDNI && esDNIValido) {
              console.log('[Sync] 🔍 Consultando RENIEC para DNI:', visita.visitanteData.numeroDocumento);
              try {
                const reniecResponse = await fetch(`${API_BASE_URL}/visitantes/consultar-dni`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ dni: visita.visitanteData.numeroDocumento })
                });
                
                if (reniecResponse.ok) {
                  const reniecData = await reniecResponse.json();
                  if (reniecData.success && reniecData.data) {
                    console.log('[Sync] ✅ Datos de RENIEC obtenidos:', reniecData.data);
                    // Usar los datos de RENIEC para crear el visitante
                    visitanteDataToCreate = {
                      ...visitanteDataToCreate,
                      nombres: reniecData.data.nombres,
                      apellidos: reniecData.data.apellidos
                    };
                    console.log('[Sync] 📝 Visitante actualizado con datos de RENIEC');
                  }
                } else {
                  console.warn('[Sync] ⚠️ No se pudieron obtener datos de RENIEC, usando datos originales');
                }
              } catch (reniecError) {
                console.warn('[Sync] ⚠️ Error consultando RENIEC:', reniecError.message);
              }
            }
            
            const visitanteResponse = await fetch(`${API_BASE_URL}/visitantes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(visitanteDataToCreate)
            });

            if (visitanteResponse.ok) {
              const visitanteResult = await visitanteResponse.json();
              if (visitanteResult.success && visitanteResult.data) {
                visitanteId = visitanteResult.data.id;
                console.log(`[Sync] ✅ Visitante creado con ID: ${visitanteId}`);
                
                // Si se actualizaron los datos con RENIEC, notificar para actualizar la UI
                if (visitanteDataToCreate.nombres !== visita.visitanteData.nombres || 
                    visitanteDataToCreate.apellidos !== visita.visitanteData.apellidos) {
                  console.log('[Sync] 🔄 Visitante actualizado con datos de RENIEC, notificando UI...');
                  // Emitir evento para actualizar la UI con los nuevos datos
                  window.dispatchEvent(new CustomEvent('visitante-actualizado-reniec', {
                    detail: {
                      visitanteId: visitanteId,
                      nombres: visitanteDataToCreate.nombres,
                      apellidos: visitanteDataToCreate.apellidos,
                      numeroDocumento: visita.visitanteData.numeroDocumento
                    }
                  }));
                }
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
        horaIngreso: visita.horaIngreso,
        // Flag para silenciar sockets durante sincronización offline
        _isOfflineSync: true
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
        const responseData = await response.json();
        const nuevaVisitaId = responseData.data?.id;
        
        // Éxito: eliminar de IndexedDB
        await deleteVisitaOffline(visita.id);
        results.success.push(visita);
        console.log(`[Sync] Visita ${visita.id} sincronizada correctamente con nuevo ID: ${nuevaVisitaId}`);
        
        // Si se obtuvo un nuevo ID del servidor, actualizar salidas pendientes
        if (nuevaVisitaId) {
          console.log(`[Sync] 🔄 Actualizando salidas pendientes para visita ${visita.id} -> ${nuevaVisitaId}`);
          await actualizarSalidasPendientesConNuevoId(visita.id, nuevaVisitaId);
          console.log(`[Sync] ✅ Salidas pendientes actualizadas para visita ${visita.id}`);
        } else {
          console.warn(`[Sync] ⚠️ No se obtuvo nuevo ID del servidor para visita ${visita.id}`);
        }
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
    console.log(`[Sync] 🔄 Sincronizando ${pendingSalidas.length} salidas pendientes...`);
    console.log(`[Sync] 📋 IDs de visitas en salidas pendientes:`, pendingSalidas.map(s => ({
      salidaId: s.id,
      visitaId: s.visitaId,
      timestamp: s.timestamp
    })));
  }

  for (const salida of pendingSalidas) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Sync] No hay token de autenticación');
        results.failed.push({ salida, error: 'No autenticado' });
        continue;
      }

      // Preparar datos para enviar al backend
      const salidaData = {
        fechaSalida: salida.fechaSalida,
        horaSalida: salida.horaSalida,
        // Flag para silenciar sockets durante sincronización offline
        _isOfflineSync: true
      };
      
      console.log('[Sync] 📋 Datos de salida offline completos:', {
        salidaId: salida.id,
        visitaId: salida.visitaId,
        fechaSalida: salida.fechaSalida,
        horaSalida: salida.horaSalida,
        timestamp: salida.timestamp,
        visitanteData: salida.visitanteData
      });
      
      console.log('[Sync] 📤 Enviando salida con fecha/hora específica:', salidaData);
      console.log('[Sync] 🌐 URL de la petición:', `${API_BASE_URL}/visitas/${salida.visitaId}/salida`);
      
      // Enviar al backend
      const response = await fetch(`${API_BASE_URL}/visitas/${salida.visitaId}/salida`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(salidaData)
      });
      
      console.log('[Sync] 📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
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
        
        // NOTA: No disparar evento offline-salida-sincronizada aquí
        // Esto evita que la visita aparezca momentáneamente en activos
        // La UI se actualizará correctamente via offline-sync-complete
      } else {
        let errorMessage = 'Error del servidor';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('[Sync] ❌ Error del servidor:', errorData);
        } catch (parseError) {
          console.error('[Sync] ❌ Error parseando respuesta de error:', parseError);
          errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error('[Sync] ❌ Fallo en sincronización de salida:', {
          salidaId: salida.id,
          visitaId: salida.visitaId,
          status: response.status,
          statusText: response.statusText,
          errorMessage
        });
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`[Sync] ❌ Error sincronizando salida ${salida.id}:`, error);
      results.failed.push({ salida, error: error.message });
    }
  }

  return results;
}

/**
 * Actualizar salidas pendientes con el nuevo ID de visita del servidor
 */
async function actualizarSalidasPendientesConNuevoId(visitaIdOffline, nuevaVisitaId) {
  try {
    console.log(`[Sync] 🔄 Actualizando salidas pendientes: ${visitaIdOffline} -> ${nuevaVisitaId}`);
    
    // Obtener todas las salidas pendientes
    const salidasPendientes = await getPendingSalidas();
    console.log(`[Sync] 📋 Total de salidas pendientes: ${salidasPendientes.length}`);
    
    // Buscar salidas que correspondan a esta visita offline
    // Normalizar visitaId a número para comparación, manejando tanto datos antiguos (string) como nuevos (number)
    const salidasParaActualizar = salidasPendientes.filter(salida => 
      Number(salida.visitaId) === visitaIdOffline
    );
    
    console.log(`[Sync] 🔍 Salidas encontradas para actualizar: ${salidasParaActualizar.length}`);
    console.log(`[Sync] 📝 Detalles de salidas a actualizar:`, salidasParaActualizar.map(s => ({
      id: s.id,
      visitaId: s.visitaId,
      timestamp: s.timestamp
    })));
    
    if (salidasParaActualizar.length > 0) {
      console.log(`[Sync] ✅ Encontradas ${salidasParaActualizar.length} salidas para actualizar`);
      
      // Actualizar cada salida con el nuevo ID
      for (const salida of salidasParaActualizar) {
        try {
          await updateSalidaVisitaId(salida.id, nuevaVisitaId);
          console.log(`[Sync] ✅ Salida ${salida.id} actualizada con nuevo visitaId: ${nuevaVisitaId}`);
        } catch (updateError) {
          console.error(`[Sync] ❌ Error actualizando salida ${salida.id}:`, updateError);
        }
      }
      
      // Verificar que las actualizaciones se aplicaron correctamente
      const salidasActualizadas = await getPendingSalidas();
      const salidasVerificadas = salidasActualizadas.filter(s => s.visitaId === nuevaVisitaId);
      console.log(`[Sync] ✅ Verificación: ${salidasVerificadas.length} salidas ahora tienen el nuevo ID`);
    } else {
      console.log(`[Sync] ⚠️ No se encontraron salidas para actualizar con visitaId: ${visitaIdOffline}`);
    }
  } catch (error) {
    console.error('[Sync] ❌ Error actualizando salidas pendientes:', error);
  }
}

/**
 * Sincroniza ingresos y salidas de personal pendientes
 */
async function syncPendingPersonal() {
  const token = localStorage.getItem('token');
  const ingresos = await getPendingIngresosPersonal();
  const salidas = await getPendingSalidasPersonal();
  const results = { success: [], failed: [] };

  if (!token) {
    console.warn('[Sync] No hay token de autenticación para personal');
    return results;
  }

  if (ingresos.length > 0 || salidas.length > 0) {
    console.log(`[Sync] Sincronizando personal: ${ingresos.length} ingresos y ${salidas.length} salidas pendientes`);
  }

  for (const item of ingresos) {
    try {
      const payload = {
        personalId: item.personalId,
        fecha: item.fecha,
        hora: item.horaIngreso,
        _isOfflineSync: true
      };

      const response = await fetch(`${API_BASE_URL}/asistencia-personal/ingreso`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await deleteIngresoPersonalOffline(item.id);
      results.success.push(item);
    } catch (error) {
      console.error('Error sync ingreso personal', error);
      results.failed.push({ item, error: error.message });
    }
  }

  for (const item of salidas) {
    try {
      const payload = {
        personalId: item.personalId,
        fecha: item.fecha,
        hora: item.horaSalida,
        _isOfflineSync: true
      };

      const response = await fetch(`${API_BASE_URL}/asistencia-personal/salida`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      await deleteSalidaPersonalOffline(item.id);
      results.success.push(item);
    } catch (error) {
      console.error('Error sync salida personal', error);
      results.failed.push({ item, error: error.message });
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
  const pendingIngresosPersonal = await getPendingIngresosPersonal();
  const pendingSalidasPersonal = await getPendingSalidasPersonal();
  if (pendingVisitas.length > 0 || pendingSalidas.length > 0 || pendingIngresosPersonal.length > 0 || pendingSalidasPersonal.length > 0) {
    console.log('[Sync] 🔄 Iniciando sincronización de datos pendientes...');
  }

  try {
    // Sincronizar visitas primero
    console.log('[Sync] 🔄 Sincronizando visitas primero...');
    const visitasResults = await syncPendingVisitas();
    
    // Esperar un momento para que las actualizaciones de ID se completen
    if (visitasResults.success.length > 0) {
      console.log('[Sync] ⏳ Esperando 1 segundo para que se completen las actualizaciones de ID...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Luego sincronizar salidas
    console.log('[Sync] 🔄 Sincronizando salidas...');
    const salidasResults = await syncPendingSalidas();

    // Sincronizar personal
    console.log('[Sync] 🔄 Sincronizando personal...');
    const personalResults = await syncPendingPersonal();

    const totalSuccess = visitasResults.success.length + salidasResults.success.length + personalResults.success.length;
    const totalFailed = visitasResults.failed.length + salidasResults.failed.length + personalResults.failed.length;

    console.log(`[Sync] ✅ Sincronización completada: ${totalSuccess} éxitos, ${totalFailed} fallos`);

    // Notificar a la UI sobre la sincronización completada
    if (totalSuccess > 0) {
      notifySyncComplete(totalSuccess, totalFailed);
    }

    return {
      success: totalSuccess,
      failed: totalFailed,
      visitas: visitasResults,
      salidas: salidasResults,
      personal: personalResults
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
    setTimeout(async () => {
      try {
        console.log('[Sync] Ejecutando sincronización inmediata...');
        const result = await syncPendingData();
        console.log('[Sync] Resultado de sincronización:', result);
      } catch (error) {
        console.error('[Sync] Error en sincronización inmediata:', error);
        // Fallback: intentar con background sync
        registerBackgroundSync();
      }
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

