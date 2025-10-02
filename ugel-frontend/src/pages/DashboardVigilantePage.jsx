import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from "framer-motion";
import Card from '../components/Card';
import RegistroForm from '../components/vigilante/RegistroForm';
import VisitantesTabla from '../components/vigilante/VisitantesTabla';
import DateRangeFilter from '../components/DateRangeFilter';
import { visitasService, visitantesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { createVisitaWithOfflineSupport, registrarSalidaWithOfflineSupport, isOfflineResponse, getResponseMessage } from '../services/offlineApiService';
import { getPendingVisitas, getPendingSalidas } from '../utils/offlineDB';

// Función para consultar RENIEC
const consultarRENIEC = async (numeroDocumento) => {
  try {
    console.log('[RENIEC] Consultando DNI:', numeroDocumento);
    const response = await fetch(`https://api.reniec.gob.pe/v1/dni/${numeroDocumento}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[RENIEC] Datos obtenidos:', data);
      return {
        success: true,
        data: {
          nombres: data.nombres || '',
          apellidos: data.apellidoPaterno + ' ' + data.apellidoMaterno || '',
          numeroDocumento: numeroDocumento
        }
      };
    } else {
      console.warn('[RENIEC] Error en respuesta:', response.status);
      return { success: false, error: 'DNI no encontrado en RENIEC' };
    }
  } catch (error) {
    console.error('[RENIEC] Error al consultar:', error);
    return { success: false, error: 'Error al consultar RENIEC' };
  }
};

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15, // Escalonado entre hijos
    },
  },
  exit: { opacity: 0 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350, // más alto = más rápido
      damping: 25,    // controla el rebote, más alto = menos rebote
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};


const DashboardVigilantePage = () => {
  // Hook de autenticación
  const { user, isAuthenticated } = useAuth();
  
  
  // Estados principales del dashboard
  const [visitantesEnEspera, setVisitantesEnEspera] = useState([]);
  const [visitantesActivos, setVisitantesActivos] = useState([]);
  const [historialVisitas, setHistorialVisitas] = useState([]);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    empleadoId: '',
    motivoId: '',
    lugar: '',
    fechaDesde: null, // Sin filtro de fecha por defecto para mostrar todos los registros
    fechaHasta: null  // Sin filtro de fecha por defecto para mostrar todos los registros
  });
  const [activeTab, setActiveTab] = useState('activos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSalidaModal, setShowSalidaModal] = useState(false);
  const [visitaParaSalida, setVisitaParaSalida] = useState(null);
  const [visitanteParaSalida, setVisitanteParaSalida] = useState(null);
  
  // Estados para paginación del historial
  const [historialPagination, setHistorialPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  });
  
  // Estados para paginación de visitantes activos
  const [activosPagination, setActivosPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  
  // Estado para la vista previa en tiempo real
  const [vistaPreviaVisitante, setVistaPreviaVisitante] = useState(null);
  const [vistaPreviaVisita, setVistaPreviaVisita] = useState(null);
  const [visitasPendientes, setVisitasPendientes] = useState([]);
  
  // Función para actualizar dinámicamente una visita en la tabla
  const actualizarVisitaEnTabla = (visitaId, datosActualizados) => {
    setVisitantesActivos(prev => {
      // Intentar encontrar por ID primero
      let index = prev.findIndex(v => 
        v.id === visitaId || 
        v._originalId === visitaId ||
        v._originalOfflineId === visitaId
      );
      
      // Si no encuentra por ID, buscar por coincidencia de datos más robusta
      if (index === -1 && datosActualizados.numero_documento) {
        console.log('[Dashboard] Buscando por características únicas...', {
          numero_documento: datosActualizados.numero_documento,
          personal_visitado_id: datosActualizados.personal_visitado_id,
          fecha_ingreso: datosActualizados.fecha_ingreso,
          hora_ingreso: datosActualizados.hora_ingreso
        });
        
        index = prev.findIndex(v => {
          // Buscar visitas offline sin salida que coincidan en múltiples criterios
          const mismoDocumento = v.numero_documento === datosActualizados.numero_documento;
          const mismoPersonal = v.personal_visitado_id === datosActualizados.personal_visitado_id;
          const sinSalida = !v.fecha_salida && !v.hora_salida;
          const esOffline = v._isOffline || v._isPending;
          
          // Comparar fecha y hora si están disponibles
          let mismaFecha = true;
          let mismaHora = true;
          
          if (datosActualizados.fecha_ingreso && v.fecha_ingreso) {
            const fechaOffline = v.fecha_ingreso?.split('T')[0] || v.fecha_ingreso;
            const fechaActualizada = datosActualizados.fecha_ingreso?.split('T')[0] || datosActualizados.fecha_ingreso;
            mismaFecha = fechaOffline === fechaActualizada;
          }
          
          if (datosActualizados.hora_ingreso && v.hora_ingreso) {
            const horaOffline = v.hora_ingreso?.substring(0, 5);
            const horaActualizada = datosActualizados.hora_ingreso?.substring(0, 5);
            mismaHora = horaOffline === horaActualizada;
          }
          
          return mismoDocumento && mismoPersonal && sinSalida && esOffline && mismaFecha && mismaHora;
        });
        
        if (index !== -1) {
          console.log('[Dashboard] ✅ Encontrada fila offline por características:', prev[index]);
        }
      }
      
      if (index !== -1) {
        // Actualizar la fila existente
        const actualizado = [...prev];
        actualizado[index] = { 
          ...actualizado[index], 
          ...datosActualizados,
          _isOffline: false, // Ya no es offline
          _isPending: false, // Ya no está pendiente
          _wasOffline: true, // Marcar que fue offline
          _originalOfflineId: actualizado[index]._originalId || actualizado[index].id
        };
        console.log('[Dashboard] Visita actualizada dinámicamente:', actualizado[index]);
        return actualizado;
      } else {
        console.warn('[Dashboard] No se encontró la visita para actualizar:', visitaId);
        console.log('[Dashboard] Visitas disponibles:', prev.map(v => ({ 
          id: v.id, 
          _originalId: v._originalId, 
          _originalOfflineId: v._originalOfflineId,
          numero_documento: v.numero_documento,
          personal_visitado_id: v.personal_visitado_id,
          fecha_ingreso: v.fecha_ingreso,
          hora_ingreso: v.hora_ingreso,
          _isOffline: v._isOffline,
          _isPending: v._isPending
        })));
      }
      return prev;
    });
  };

  // Función para obtener datos de referencia (empleados, motivos, áreas)
  const obtenerDatosReferencia = async () => {
    try {
      const [empleadosRes, motivosRes, areasRes] = await Promise.all([
        fetch('http://localhost:3000/api/personal').then(r => r.json()).catch(() => ({data: []})),
        fetch('http://localhost:3000/api/motivos-visita').then(r => r.json()).catch(() => ({data: []})),
        fetch('http://localhost:3000/api/areas').then(r => r.json()).catch(() => ({data: []}))
      ]);
      
      return {
        empleados: empleadosRes.data || [],
        motivos: motivosRes.data || [],
        areas: areasRes.data || []
      };
    } catch (error) {
      console.warn('[Dashboard] Error al obtener datos de referencia:', error);
      return { empleados: [], motivos: [], areas: [] };
    }
  };

  // Estado para la confirmación de doble Enter
  const [showDoubleEnterConfirm, setShowDoubleEnterConfirm] = useState(false);

  // Referencias para los atajos de teclado
  const documentoInputRef = useRef(null);
  const busquedaInputRef = useRef(null);
  const registroFormRef = useRef(null);
  
  // Referencia para debounce de búsquedas
  const searchTimeout = useRef(null);

  // Cargar visitantes activos al montar el componente
  useEffect(() => {
    // Conexión Socket.IO para actualizaciones en tiempo real
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false, // No conectar automáticamente
      reconnection: false, // Deshabilitar reconexión automática
      timeout: 5000 // Timeout más corto
    });

    // Intentar conectar solo si estamos online
    if (navigator.onLine) {
      socket.connect();
    }
  
    socket.on('connect', () => {
      // console.log('Conectado a Socket.IO', socket.id);
    });
  
    socket.on('nueva_visita_registrada', (visita) => {
      // Si ya existe, no duplicar
      setVisitantesActivos(prev => {
        if (prev.some(v => String(v.id) === String(visita.id))) return prev;
  
        // Mapear a la estructura usada en UI
        const mapeada = {
          ...visita,
          empleadoVisitado: {
            id: visita.personal_visitado_id,
            nombres: visita.personal_nombres || '',
            apellidos: visita.personal_apellidos || '',
            cargo: visita.personal_cargo || ''
          },
          motivo: {
            id: visita.motivo_visita_id,
            label: visita.nombre_motivo || ''
          },
          lugar: visita.area_destino_id,
          lugarNombre: visita.nombre_area || ''
        };
  
        return [mapeada, ...prev];
      });
    });
  
    // NUEVO: Listener para salidas registradas
    socket.on('salida_visita_registrada', ({ visitaId }) => {
      console.log(`Salida registrada para visita ID: ${visitaId}`);
      
      // Remover la visita de la lista de activos
      setVisitantesActivos(prev => {
        const nuevaLista = prev.filter(v => String(v.id) !== String(visitaId));
        console.log(`Visitantes activos después de remover: ${nuevaLista.length}`);
        return nuevaLista;
      });
      
      // Actualizar paginación
      setActivosPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));
    });
  
    socket.on('disconnect', () => {
      // console.log('Socket desconectado');
    });

    // Manejar errores de conexión silenciosamente
    socket.on('connect_error', (error) => {
      // No mostrar errores de conexión en consola
      // console.log('Error de conexión Socket.IO:', error.message);
    });
  
    return () => {
      socket.off('nueva_visita_registrada');
      socket.off('salida_visita_registrada'); // Limpiar el listener
      socket.close();
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    cargarVisitantesActivos();
    cargarVisitasPendientes(); // Cargar visitas pendientes de IndexedDB
    // Cargar historial inicial sin filtros para mostrar todos los registros
    const filtrosIniciales = {
      busqueda: '',
      empleadoId: '',
      motivoId: '',
      lugar: '',
      fechaDesde: null,
      fechaHasta: null
    };
    // Usar la función centralizada para evitar conflictos
    ejecutarBusqueda(filtrosIniciales, 1);
    
    // Limpieza del timeout al desmontar el componente
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  // Listener para detectar cuando se vuelve online y cuando termina la sincronización
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Dashboard] Conexión restaurada, sincronizando datos...');
      // No cargar inmediatamente, esperar a que termine la sincronización
    };

    const handleOffline = () => {
      console.log('[Dashboard] Conexión perdida, modo offline activado');
    };

    const handleSyncComplete = () => {
      console.log('[Dashboard] Sincronización completada, recargando visitantes activos...');
      cargarVisitantesActivos();
    };

    // Nuevo: Manejar salidas registradas offline
    const handleOfflineSalidaRegistrada = (event) => {
      console.log('[Dashboard] Salida registrada offline:', event.detail);
      const { visitaId, timestamp } = event.detail;
      
      // Actualizar inmediatamente la UI: mover de activos a historial
      setVisitantesActivos(prevActivos => {
        const visitaIndex = prevActivos.findIndex(v => 
          v.id === visitaId || 
          v._originalId === visitaId ||
          v._originalOfflineId === visitaId
        );
        
        if (visitaIndex !== -1) {
          const visita = prevActivos[visitaIndex];
          
          // Crear entrada para el historial con datos de salida
          const entradaHistorial = {
            ...visita,
            // Preservar la fecha y hora de ingreso original
            fecha_ingreso: visita.fecha_ingreso || visita.fechaIngreso || new Date().toISOString().split('T')[0],
            hora_ingreso: visita.hora_ingreso || visita.horaIngreso || new Date().toLocaleTimeString('es-PE', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            // Agregar datos de salida
            fecha_salida: new Date(timestamp).toISOString(),
            hora_salida: new Date(timestamp).toLocaleTimeString('es-PE', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            _wasOfflineExit: true,
            _offlineExitTimestamp: timestamp
          };
          
          // Agregar al historial solo si no existe ya
          setHistorialVisitas(prevHistorial => {
            // Verificar si ya existe una entrada con el mismo ID
            const existe = prevHistorial.some(h => 
              h.id === entradaHistorial.id || 
              h._originalId === entradaHistorial._originalId ||
              (h._wasOfflineExit && h._offlineExitTimestamp === entradaHistorial._offlineExitTimestamp)
            );
            
            if (!existe) {
              console.log('[Dashboard] Agregando entrada única al historial:', entradaHistorial.id);
              return [entradaHistorial, ...prevHistorial];
            } else {
              console.log('[Dashboard] Entrada ya existe en historial, evitando duplicado:', entradaHistorial.id);
              return prevHistorial;
            }
          });
          
          // Remover de activos
          const nuevosActivos = [...prevActivos];
          nuevosActivos.splice(visitaIndex, 1);
          
          // Actualizar paginación de activos
          setActivosPagination(prev => ({
            ...prev,
            totalItems: Math.max(0, prev.totalItems - 1),
            totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
          }));
          
          console.log('[Dashboard] Visitante movido de activos a historial (offline)');
          return nuevosActivos;
        }
        
        return prevActivos;
      });
    };

    // Nuevo: Manejar salidas sincronizadas (cuando vuelve la conexión)
    const handleOfflineSalidaSincronizada = (event) => {
      console.log('[Dashboard] Salida sincronizada:', event.detail);
      const { visitaId, responseData } = event.detail;
      
      // Actualizar la entrada en el historial con los datos correctos del servidor
      setHistorialVisitas(prevHistorial => {
        return prevHistorial.map(visita => {
          if (visita._wasOfflineExit && 
              (visita.id === visitaId || 
               visita._originalId === visitaId ||
               visita._originalOfflineId === visitaId)) {
            
            // Actualizar con datos del servidor, preservando la estructura original
            const visitaActualizada = {
              ...responseData, // Datos del servidor tienen prioridad
              // Preservar campos específicos offline que son importantes
              _wasOfflineExit: false, // Ya no es offline
              _synced: true, // Marcar como sincronizada
              _originalOfflineId: visita._originalOfflineId || visita.id
            };
            
            console.log('[Dashboard] Datos de salida actualizados con información del servidor:', visitaActualizada.id);
            return visitaActualizada;
          }
          return visita;
        });
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    window.addEventListener('offline-salida-registrada', handleOfflineSalidaRegistrada);
    window.addEventListener('offline-salida-sincronizada', handleOfflineSalidaSincronizada);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      window.removeEventListener('offline-salida-registrada', handleOfflineSalidaRegistrada);
      window.removeEventListener('offline-salida-sincronizada', handleOfflineSalidaSincronizada);
    };
  }, []);

  const cargarVisitantesActivos = async () => {
    try {
      setLoading(true);
      setError('');
      
      let activosData = [];
      
      // Si estamos online, cargar desde la API
      if (navigator.onLine) {
      const response = await visitasService.getActivas();
      
      if (response.data.success) {
          activosData = response.data.data || [];
          // Log solo en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('[Online] Datos recibidos del backend:', activosData);
        }
        
          // Verificar si hay visitas offline en el estado actual
          setVisitantesActivos(prevActivos => {
            // Log solo en modo desarrollo
            if (process.env.NODE_ENV === 'development') {
              console.log('[Online] Estado actual de visitantes:', prevActivos);
            }
            
            // Separar visitas offline de las normales
            const visitasOffline = prevActivos.filter(v => v._isOffline || v._isPending);
            const visitasNormales = prevActivos.filter(v => !v._isOffline && !v._isPending);
            
            // Log solo si hay datos relevantes
            if (visitasOffline.length > 0 || visitasNormales.length > 0) {
              console.log('[Online] Visitas offline encontradas:', visitasOffline.length);
              console.log('[Online] Visitas normales:', visitasNormales.length);
            }
            
            // Crear un mapa para rastrear qué visitas de la API ya fueron procesadas
            const visitasAPIProcesadas = new Set();
            
            // Actualizar visitas offline con datos de la API
            const visitasOfflineActualizadas = visitasOffline.map(visitaOffline => {
              // Buscar coincidencia en las visitas de la API
              const visitaAPI = activosData.find(v => {
                // Comparación más robusta usando múltiples criterios
                const mismoDocumento = v.numero_documento === visitaOffline.numero_documento;
                const mismoPersonal = v.personal_visitado_id === visitaOffline.personal_visitado_id;
                
                // Comparar fechas (normalizar a YYYY-MM-DD)
                const fechaOffline = visitaOffline.fecha_ingreso?.split('T')[0] || visitaOffline.fecha_ingreso;
                const fechaAPI = v.fecha_ingreso?.split('T')[0];
                const mismaFecha = fechaAPI === fechaOffline;
                
                // Comparar horas (usar hora_ingreso si está disponible, sino extraer de fecha_ingreso)
                let horaOffline = visitaOffline.hora_ingreso?.substring(0, 5);
                let horaAPI = '';
                
                if (v.hora_ingreso) {
                  horaAPI = v.hora_ingreso.substring(0, 5);
                } else if (v.fecha_ingreso && v.fecha_ingreso.includes('T')) {
                  horaAPI = new Date(v.fecha_ingreso).toTimeString().substring(0, 5);
                }
                
                const mismaHora = horaAPI === horaOffline;
                
                // También considerar visitas sin salida (activas)
                const sinSalida = !v.fecha_salida && !v.hora_salida;
                
                console.log('[Online] Comparando:', {
                  offline: {
                    doc: visitaOffline.numero_documento,
                    personal: visitaOffline.personal_visitado_id,
                    fecha: fechaOffline,
                    hora: horaOffline
                  },
                  api: {
                    doc: v.numero_documento,
                    personal: v.personal_visitado_id,
                    fecha: fechaAPI,
                    hora: horaAPI,
                    sinSalida: sinSalida
                  },
                  coincidencias: {
                    documento: mismoDocumento,
                    personal: mismoPersonal,
                    fecha: mismaFecha,
                    hora: mismaHora,
                    sinSalida: sinSalida
                  }
                });
                
                // Coincidencia si: mismo documento, mismo personal, misma fecha, misma hora Y sin salida
                return mismoDocumento && mismoPersonal && mismaFecha && mismaHora && sinSalida;
              });
              
              if (visitaAPI) {
                console.log('[Online] ✅ Encontrada coincidencia para visita offline:', {
                  offline: visitaOffline,
                  api: visitaAPI
                });
                
                // Marcar esta visita de la API como procesada
                visitasAPIProcesadas.add(visitaAPI.id);
                
                // Retornar la visita actualizada con datos de la API
                return {
                  ...visitaAPI,
                  _wasOffline: true,
                  _originalOfflineId: visitaOffline._originalId || visitaOffline.id
                };
              }
              
              // Si no hay coincidencia, mantener la visita offline
              console.log('[Online] ⚠️ No se encontró coincidencia para visita offline:', visitaOffline);
              return visitaOffline;
            });
            
            // Agregar solo las visitas de la API que NO fueron usadas para actualizar visitas offline
            const visitasAPINoUsadas = activosData.filter(visitaAPI => 
              !visitasAPIProcesadas.has(visitaAPI.id)
            );
            
            // Log solo si hay datos relevantes
            if (visitasOfflineActualizadas.length > 0 || visitasAPINoUsadas.length > 0) {
              console.log('[Online] Visitas offline actualizadas:', visitasOfflineActualizadas.length);
              console.log('[Online] Visitas de la API no usadas:', visitasAPINoUsadas.length);
            }
            
            // Combinar: visitas offline actualizadas + visitas de la API que no tenían correspondencia offline
            const resultado = [...visitasOfflineActualizadas, ...visitasAPINoUsadas];
            // Log solo si hay datos
            if (resultado.length > 0) {
              console.log('[Online] Total de visitas después de sincronización:', resultado.length);
            }
            
            return resultado;
          });
          
          // Actualizar paginación
          setActivosPagination(prev => ({
            ...prev,
            totalItems: activosData.length,
            totalPages: Math.ceil(activosData.length / prev.itemsPerPage),
            currentPage: 1
          }));
          
          return; // Salir aquí ya que actualizamos el estado directamente
        } else {
          setError('Error al cargar visitantes activos');
          return;
        }
      } else {
        // Si estamos offline, cargar visitas pendientes de IndexedDB
        console.log('[Offline] Cargando visitas pendientes como activos...');
        const pendientes = await getPendingVisitas();
        console.log('[Offline] Visitas pendientes encontradas:', pendientes);
        
        // En modo offline, no necesitamos obtener datos de referencia
        // porque los datos ya están completos en la visita guardada
        console.log('[Offline] Usando datos ya guardados en la visita offline');
        
        // Transformar visitas pendientes al formato de visitas activas
        activosData = pendientes.map(visita => {
          // Log solo en modo desarrollo
          if (process.env.NODE_ENV === 'development') {
            console.log('[Offline] Procesando visita pendiente:', visita);
          }
          
          // Usar los datos que ya están guardados en la visita offline
          // Estos datos ya vienen completos desde el registro
          return {
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
            hora_salida: null,
            // Campos específicos para visitas offline
            _isOffline: true,
            _isPending: true,
            _originalId: visita.id,
            _needsVisitanteCreation: visita.needsVisitanteCreation || false,
            visitanteData: visita.visitanteData
          };
        });
      }
      
      // Transformar los datos para que coincidan con la estructura esperada por el frontend
        const activosTransformados = activosData.map(visita => {
          console.log('DashboardVigilantePage - Visita individual:', visita);
          console.log('DashboardVigilantePage - personal_cargo:', visita.personal_cargo);
          
          return {
            ...visita,
            // Mapear empleadoVisitado para que coincida con la estructura esperada
            empleadoVisitado: {
              id: visita.personal_visitado_id,
              nombres: visita.personal_nombres || '',
              apellidos: visita.personal_apellidos || '',
              cargo: visita.personal_cargo || ''
            },
            // Mapear motivo para que coincida con la estructura esperada
            motivo: {
              id: visita.motivo_visita_id,
              label: visita.nombre_motivo || ''
            },
            // Mapear lugar para que coincida con la estructura esperada
            lugar: visita.area_destino_id,
          lugarNombre: visita.nombre_area || '',
          // Asegurar que los campos principales estén disponibles
          visitante_nombres: visita.visitante_nombres || visita.visitante?.nombres || '',
          visitante_apellidos: visita.visitante_apellidos || visita.visitante?.apellidos || '',
          personal_nombres: visita.personal_nombres || '',
          personal_apellidos: visita.personal_apellidos || '',
          personal_cargo: visita.personal_cargo || '',
          nombre_motivo: visita.nombre_motivo || '',
          nombre_area: visita.nombre_area || ''
          };
        });
        
        console.log('DashboardVigilantePage - Datos transformados:', activosTransformados);
        
        setVisitantesActivos(activosTransformados);
        
        // Actualizar paginación para activos
        setActivosPagination(prev => ({
          ...prev,
          totalItems: activosTransformados.length,
          totalPages: Math.ceil(activosTransformados.length / prev.itemsPerPage),
        currentPage: 1
        }));
      
    } catch (error) {
      console.error('Error al cargar visitantes activos:', error);
        setError('Error al cargar visitantes activos');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar visitas pendientes de IndexedDB
  const cargarVisitasPendientes = async () => {
    try {
      const pendientes = await getPendingVisitas();
      // Log solo si hay visitas pendientes
      if (pendientes.length > 0) {
        console.log('[Dashboard] Visitas pendientes cargadas:', pendientes);
      }
      
      // Transformar las visitas pendientes al formato esperado por la tabla
      const visitasTransformadas = pendientes.map(visita => ({
        id: `offline_${visita.id}`, // ID único para visitas offline
        visitante_nombres: visita.visitanteData?.nombres || '',
        visitante_apellidos: visita.visitanteData?.apellidos || '',
        tipo_documento_codigo: 'DNI', // Por defecto
        numero_documento: visita.visitanteData?.numeroDocumento || '',
        personal_nombres: '', // Se llenará con datos del empleado
        personal_apellidos: '',
        personal_cargo: 'Sin cargo', // Valor por defecto
        nombre_motivo: 'Pendiente', // Valor por defecto
        nombre_area: 'Pendiente', // Valor por defecto
        fecha_ingreso: visita.fechaIngreso || '',
        hora_ingreso: visita.horaIngreso || '',
        hora_salida: null,
        // Campos específicos para visitas pendientes
        _isPending: true,
        _offline: true,
        _needsVisitanteCreation: visita.needsVisitanteCreation || false,
        _originalId: visita.id, // ID original de IndexedDB
        // Datos de la visita
        personalVisitadoId: visita.personalVisitadoId,
        motivoVisitaId: visita.motivoVisitaId,
        areaDestinoId: visita.areaDestinoId,
        visitanteData: visita.visitanteData,
        // Campos para compatibilidad con la tabla
        personal_visitado_id: visita.personalVisitadoId,
        motivo_visita_id: visita.motivoVisitaId,
        area_destino_id: visita.areaDestinoId,
        personal_cargo: 'Sin cargo',
        nombre_motivo: 'Pendiente',
        nombre_area: 'Pendiente'
      }));
      
      setVisitasPendientes(visitasTransformadas);
    } catch (error) {
      console.error('[Dashboard] Error al cargar visitas pendientes:', error);
      setVisitasPendientes([]);
    }
  };

  // Handlers para el formulario de registro
  const handleAddVisitor = (visitanteData) => {
    const currentDate = new Date();
    // Generar hora en formato HH:MM usando toLocaleTimeString para evitar problemas de zona horaria
    const horaFormateada = currentDate.toLocaleTimeString('es-PE', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const nuevoVisitante = {
      id: Date.now(), // ID temporal
      ...visitanteData,
      fechaIngreso: currentDate.toISOString().split('T')[0],
      horaIngreso: horaFormateada,
      horaSalida: null
    };
    setVisitantesEnEspera(prev => [...prev, nuevoVisitante]);
    
    // Limpiar la vista previa cuando se agrega un visitante
    setVistaPreviaVisitante(null);
  };
  
  // Handler para cambios en tiempo real en el formulario
  const handleFormChange = (formData) => {
    console.warn('🚀 [Dashboard] handleFormChange LLAMADO');
    console.warn('🚀 [Dashboard] formData:', JSON.stringify(formData, null, 2));
    console.warn('🚀 [Dashboard] visitantesEnEspera.length:', visitantesEnEspera.length);
    console.warn('🚀 [Dashboard] visitantesEnEspera:', visitantesEnEspera);
    
    // Actualizar los visitantes en espera con los datos de la visita
    // IMPORTANTE: Solo actualizar si hay datos significativos (no vacíos)
    const tieneDatosSignificativos = formData.visita && 
      (formData.visita.empleadoId || formData.visita.motivoId || formData.visita.lugar);
    
    // NO actualizar si los datos están vacíos (evita sobrescribir datos existentes)
    const datosEstanVacios = formData.visita && 
      (!formData.visita.empleadoId && !formData.visita.motivoId && !formData.visita.lugar);
    
    if (tieneDatosSignificativos && visitantesEnEspera.length > 0 && !datosEstanVacios) {
      console.warn('🚀 [Dashboard] ✅ Condición cumplida, actualizando visitantes...');
      console.warn('🚀 [Dashboard] formData.visita:', formData.visita);
      
      // Crear un objeto con los datos de la visita
      const visitaData = {
        empleado: formData.visita.empleado,
        motivo: formData.visita.motivo,
        lugar: formData.visita.lugar, // Nombre del área para mostrar
        lugarId: formData.visita.lugarId, // ID del área para el backend
        empleadoVisitado: formData.visita.empleado,
        personal_nombres: formData.visita.empleado?.label?.split(' ')[0] || '',
        personal_apellidos: formData.visita.empleado?.label?.split(' ').slice(1).join(' ') || '',
        nombre_motivo: formData.visita.motivo?.label || '',
        nombre_area: formData.visita.lugar || ''
      };
      
      console.log('[Dashboard] visitaData a aplicar:', visitaData);
      
      // Actualizar todos los visitantes en espera con los mismos datos de visita
      const visitantesActualizados = visitantesEnEspera.map(visitante => ({
        ...visitante,
        ...visitaData
      }));
      
      console.log('[Dashboard] visitantesActualizados:', visitantesActualizados);
      
      setVisitantesEnEspera(visitantesActualizados);
    }
    
    // Mantener la vista previa para cuando no hay visitantes en espera
    if (visitantesEnEspera.length === 0) {
      if (formData.visitante && Object.values(formData.visitante).some(val => val)) {
        // Crear una vista previa del visitante con ID temporal
        const currentDate = new Date();
        // Generar hora en formato HH:MM usando toLocaleTimeString para evitar problemas de zona horaria
        const horaFormateada = currentDate.toLocaleTimeString('es-PE', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const previewVisitante = {
          id: 'preview',
          ...formData.visitante,
          fechaIngreso: currentDate.toISOString().split('T')[0],
          horaIngreso: horaFormateada,
          horaSalida: null
        };
        setVistaPreviaVisitante(previewVisitante);
      } else {
        setVistaPreviaVisitante(null);
      }
      
      if (formData.visita && Object.values(formData.visita).some(val => val)) {
        setVistaPreviaVisita(formData.visita);
      } else {
        setVistaPreviaVisita(null);
      }
    } else {
      // Si hay visitantes en espera, no mostrar vista previa
      setVistaPreviaVisitante(null);
      setVistaPreviaVisita(null);
    }
  };

  const handleRegisterVisit = async (datosVisita = null) => {
    if (visitantesEnEspera.length === 0) {
      setError('No hay visitantes en espera para registrar');
      return;
    }
    
    // Si no se proporcionan datos de visita, intentar obtenerlos del formulario actual
    if (!datosVisita) {
      // Obtener datos del formulario actual desde el estado de vista previa
      if (vistaPreviaVisita && vistaPreviaVisita.empleadoId && vistaPreviaVisita.motivoId && vistaPreviaVisita.lugarId) {
        datosVisita = {
          empleadoId: vistaPreviaVisita.empleadoId,
          motivoId: vistaPreviaVisita.motivoId,
          lugar: vistaPreviaVisita.lugarId
        };
      } else {
        setError('Debe seleccionar empleado, motivo y lugar antes de registrar las visitas');
        return;
      }
    }
    
    // Validar que los datos de visita estén completos
    if (!datosVisita || !datosVisita.empleadoId || !datosVisita.motivoId || !datosVisita.lugar) {
      setError('Debe seleccionar empleado, motivo y lugar antes de registrar las visitas');
      return;
    }
    
    // Limpiar las vistas previas cuando se registra la visita
    setVistaPreviaVisitante(null);
    setVistaPreviaVisita(null);

    try {
      setLoading(true);
      setError('');

      // Registrar cada visitante y luego sus visitas
      const visitasRegistradas = [];
      
      for (const visitante of visitantesEnEspera) {
        try {
          
          // Primero crear o buscar el visitante
            let visitanteId = visitante.visitanteId;
            let visitanteDataForOffline = null;
            let datosVisitanteActualizados = null;
          
          // Si el visitante ya existe en la base de datos, usar su ID
            if (visitanteId && visitanteId !== 'preview') {
              console.log('[Dashboard] Visitante ya existe con ID:', visitanteId);
              // Preparar datos del visitante existente para modo offline
              visitanteDataForOffline = {
                tipoDocumentoId: parseInt(visitante.tipoDocumentoId),
                numeroDocumento: visitante.numeroDocumento,
                nombres: visitante.nombres,
                apellidos: visitante.apellidos,
                visitanteId: visitanteId
              };
            }
            // Si no tiene ID o es temporal, necesitamos crear el visitante
            else {
              // Preparar datos del visitante
              const datosVisitante = {
                tipoDocumentoId: parseInt(visitante.tipoDocumentoId),
                numeroDocumento: visitante.numeroDocumento.slice(0, 20),
                nombres: visitante.nombres.slice(0, 150),
                apellidos: visitante.apellidos.slice(0, 150)
              };
              
              // Si estamos online, intentar crear el visitante
              if (navigator.onLine) {
                try {
                  const responseVisitante = await visitantesService.create(datosVisitante);
                  
                  // Verificar si la respuesta es válida y exitosa
                  if (responseVisitante && responseVisitante.data && responseVisitante.data.success) {
              visitanteId = responseVisitante.data.data.id;
                    console.log('[Online] Visitante creado con ID:', visitanteId);
                    
                    // Actualizar dinámicamente la fila en la tabla
                    actualizarVisitaEnTabla(visitante.id, {
                      visitanteId: visitanteId,
                      visitante_nombres: datosVisitante.nombres,
                      visitante_apellidos: datosVisitante.apellidos,
                      numero_documento: datosVisitante.numeroDocumento,
                      nombres: datosVisitante.nombres,
                      apellidos: datosVisitante.apellidos,
                      personal_visitado_id: visitante.personal_visitado_id || visitante.empleado?.id || visitante.empleadoVisitado?.id
                    });
                  }
                } catch (visitanteError) {
                  console.warn('[Online] Error al crear visitante, consultando RENIEC...', visitanteError.message);
                  
                  // Si falla, consultar RENIEC para obtener datos completos
                  const reniecData = await consultarRENIEC(visitante.numeroDocumento);
                  if (reniecData.success) {
                    // Actualizar datos del visitante con información de RENIEC
                    const datosCompletos = {
                      ...datosVisitante,
                      nombres: reniecData.data.nombres,
                      apellidos: reniecData.data.apellidos
                    };
                    
                    // Intentar crear nuevamente con datos de RENIEC
                    try {
                      const responseVisitanteRENIEC = await visitantesService.create(datosCompletos);
                      if (responseVisitanteRENIEC && responseVisitanteRENIEC.data && responseVisitanteRENIEC.data.success) {
                        visitanteId = responseVisitanteRENIEC.data.data.id;
                        console.log('[RENIEC] Visitante creado con datos de RENIEC, ID:', visitanteId);
                        
                        // Actualizar dinámicamente la fila en la tabla
                        actualizarVisitaEnTabla(visitante.id, {
                          visitanteId: visitanteId,
                          visitante_nombres: datosCompletos.nombres,
                          visitante_apellidos: datosCompletos.apellidos,
                          numero_documento: datosCompletos.numeroDocumento,
                          nombres: datosCompletos.nombres,
                          apellidos: datosCompletos.apellidos,
                          personal_visitado_id: visitante.personal_visitado_id || visitante.empleado?.id || visitante.empleadoVisitado?.id
                        });
                      }
                    } catch (reniecError) {
                      console.error('[RENIEC] Error al crear visitante con datos de RENIEC:', reniecError);
                      visitanteDataForOffline = datosCompletos;
                    }
            } else {
                    console.warn('[RENIEC] No se pudieron obtener datos de RENIEC:', reniecData.error);
                    visitanteDataForOffline = datosVisitante;
                  }
                }
              } else {
                // Modo offline, preparar datos para sincronización
                visitanteDataForOffline = datosVisitante;
                console.log('[Offline] Datos del visitante preparados para sincronización');
            }
          }

          // Extraer la hora de ingreso del visitante (que ya fue generada al agregarlo a la lista)
          const horaIngresoOriginal = visitante.horaIngreso || new Date().toLocaleTimeString('es-PE', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          // Extraer los datos de visita del visitante (priorizando los que ya tiene guardados)
          // Los datos vienen de SelectCustom que usa 'value' en lugar de 'id'
          let empleadoId = visitante.empleado?.value || visitante.empleado?.id || 
                          visitante.empleadoVisitado?.value || visitante.empleadoVisitado?.id;
          let motivoId = visitante.motivo?.value || visitante.motivo?.id;
          let lugarId = visitante.lugarId || visitante.lugar;
          
          console.log('[Dashboard] Datos extraídos del visitante:', {
            visitante,
            empleadoId,
            motivoId,
            lugarId,
            horaIngresoOriginal,
            fechaIngresoOriginal: visitante.fechaIngreso
          });
          
          // Si no tiene datos de visita guardados, usar los datos proporcionados como fallback
          if (!empleadoId || !motivoId || !lugarId) {
            console.log('[Dashboard] Usando datos de visita proporcionados como fallback');
            empleadoId = empleadoId || datosVisita?.empleadoId;
            motivoId = motivoId || datosVisita?.motivoId;
            lugarId = lugarId || datosVisita?.lugar;
          }
          
          // Validar que todos los campos requeridos estén presentes
          if (!empleadoId) {
            throw new Error(`Falta ID del empleado para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          if (!motivoId) {
            throw new Error(`Falta ID del motivo para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          if (!lugarId) {
            throw new Error(`Falta lugar para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          // Extraer datos adicionales para completar la información
          const empleadoNombre = visitante.empleado?.label || visitante.personal_nombres || '';
          const empleadoApellido = visitante.personal_apellidos || '';
          const empleadoCargo = visitante.empleado?.cargo || visitante.personal_cargo || 'Sin cargo';
          const motivoNombre = visitante.motivo?.label || visitante.nombre_motivo || '';
          const lugarNombre = visitante.empleado?.areaNombre || visitante.nombre_area || '';
          
          const visitaPayload = {
            visitanteId: parseInt(visitanteId),
            personalVisitadoId: parseInt(empleadoId),
            motivoVisitaId: parseInt(motivoId),
            areaDestinoId: parseInt(lugarId),
            usuarioIngresoId: user?.id ? parseInt(user.id) : 1,
            fechaIngreso: visitante.fechaIngreso || new Date().toISOString().split('T')[0],
            horaIngreso: horaIngresoOriginal, // Usar la hora original del visitante
            // Datos adicionales para completar la información
            personal_nombres: empleadoNombre,
            personal_apellidos: empleadoApellido,
            personal_cargo: empleadoCargo,
            nombre_motivo: motivoNombre,
            nombre_area: lugarNombre
          };
          

          // Log para depuración
          console.log('[Dashboard] Datos para crear visita:', {
            visitaPayload,
            visitanteDataForOffline,
            hasVisitanteData: !!visitanteDataForOffline
          });
          console.log('[Dashboard] 🕐 Hora de ingreso a enviar:', visitaPayload.horaIngreso);

          // Usar el servicio con soporte offline, pasando datos del visitante si es necesario
          const responseVisita = await createVisitaWithOfflineSupport(
            visitaPayload,
            visitanteDataForOffline, // Pasar datos del visitante si es nuevo
            visitasService.create
          );
          
          console.log('[Dashboard] Respuesta de createVisitaWithOfflineSupport:', responseVisita);
          
          // Verificar si es una respuesta offline
          if (isOfflineResponse(responseVisita)) {
            const message = getResponseMessage(responseVisita);
            setError(`${message.title} ${message.message}`);
            console.log('[Dashboard] Respuesta offline detectada:', message);
          }
          
          if (responseVisita && responseVisita.data && responseVisita.data.success) {
            visitasRegistradas.push(responseVisita.data.data);
            console.log('[Dashboard] Visita registrada correctamente (offline o online)');
            
            // Actualizar dinámicamente la fila en la tabla con datos completos
            actualizarVisitaEnTabla(visitante.id, {
              visitanteId: visitanteId,
              visitante_nombres: visitante.nombres,
              visitante_apellidos: visitante.apellidos,
              numero_documento: visitante.numeroDocumento,
              personal_nombres: empleadoNombre,
              personal_apellidos: empleadoApellido,
              personal_cargo: empleadoCargo,
              nombre_motivo: motivoNombre,
              nombre_area: lugarNombre,
              // Campos para compatibilidad
              personal_visitado_id: parseInt(empleadoId),
              motivo_visita_id: parseInt(motivoId),
              area_destino_id: parseInt(lugarId),
              // Mapear empleadoVisitado para la estructura esperada
              empleadoVisitado: {
                id: parseInt(empleadoId),
                nombres: empleadoNombre,
                apellidos: empleadoApellido,
                cargo: empleadoCargo
              },
              // Mapear motivo para la estructura esperada
              motivo: {
                id: parseInt(motivoId),
                label: motivoNombre
              },
              // Mapear lugar para la estructura esperada
              lugar: parseInt(lugarId),
              lugarNombre: lugarNombre
            });
          } else {
            console.error('[Dashboard] Respuesta inválida:', responseVisita);
            throw new Error('Error al crear visita: Respuesta inválida del servidor');
          }
        } catch (visitanteError) {
          console.error('Error al procesar visitante:', visitante, visitanteError);
          
          // Obtener más detalles del error para mostrar al usuario
          let errorMessage = `Error al registrar visitante: ${visitante.nombres} ${visitante.apellidos}`;
          
          if (visitanteError.response && visitanteError.response.data) {
            const errorData = visitanteError.response.data;
            errorMessage += ` - ${errorData.message || errorData.error || 'Error en el servidor'}`;
            console.log('Detalles del error:', errorData);
          }
          
          setError(errorMessage);
          return;
        }
      }

      // Si todo salió bien, actualizar el estado y recargar visitantes activos
        if (navigator.onLine) {
          // Modo online: limpiar y recargar
      setVisitantesEnEspera([]);
      await cargarVisitantesActivos();
        } else {
          // Modo offline: limpiar visitantes en espera y recargar activos (que incluirá las visitas pendientes)
          console.log('[Offline] Limpiando visitantes en espera y recargando activos...');
          setVisitantesEnEspera([]);
          // Recargar visitantes activos (que en modo offline cargará las visitas pendientes)
          await cargarVisitantesActivos();
        }
      
      
    } catch (err) {
      console.error('Error al registrar visitas:', err);
      setError('Error al registrar las visitas');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscarHistorial = async (filtrosData, page = 1) => {
    try {
      setLoading(true);
      setError('');
      setFiltros(filtrosData);
      
      let historialData = [];
      let totalItems = 0;
      
      // Si estamos online, cargar desde la API
      if (navigator.onLine) {
        // Construir parámetros de búsqueda con paginación
        const params = {
          page: page,
          limit: 15 // Usar 15 elementos por página
        };
        
        // Debug: Log de los filtros recibidos (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
          console.log('Filtros recibidos en handleBuscarHistorial:', filtrosData);
        }
        
        // CORRECCIÓN: Usar los nombres correctos que espera el backend
        if (filtrosData.busqueda) params.q = filtrosData.busqueda;
        if (filtrosData.empleadoId) params.personalVisitadoId = filtrosData.empleadoId;
        if (filtrosData.motivoId) params.motivoVisitaId = filtrosData.motivoId;
        if (filtrosData.lugar) params.areaId = filtrosData.lugar;
        if (filtrosData.fechaDesde) params.fechaInicio = filtrosData.fechaDesde;
        if (filtrosData.fechaHasta) params.fechaFin = filtrosData.fechaHasta;
        
        // Debug: Log de los parámetros que se envían al backend
        // Log solo en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log('Parámetros enviados al backend:', params);
        }
        
        const response = await visitasService.getAll(params);
        
        if (response.data.success) {
          const historialData = response.data.data || [];
          
          setHistorialVisitas(historialData);
          
          // Actualizar paginación si la respuesta incluye información de paginación
          if (response.data.pagination) {
            setHistorialPagination({
              currentPage: response.data.pagination.page || page,
              totalPages: response.data.pagination.totalPages || 1,
              totalItems: response.data.pagination.total || 0,
              itemsPerPage: response.data.pagination.limit || 15
            });
          } else {
            // Si no hay información de paginación del backend, usar los datos locales
            setHistorialPagination({
              currentPage: 1,
              totalPages: 1,
              totalItems: historialData.length,
              itemsPerPage: 15
            });
          }
        } else {
          setError('Error al buscar en el historial');
          return;
        }
      } else {
        // Modo offline: usar solo los datos locales del historial
        console.log('[Offline] Buscando en historial local...');
        const historialData = historialVisitas || [];
        
        // Aplicar filtros básicos en modo offline
        let historialFiltrado = historialData;
        if (filtrosData.busqueda) {
          const busqueda = filtrosData.busqueda.toLowerCase();
          historialFiltrado = historialData.filter(visita => {
            const nombreCompleto = `${visita.visitante_nombres || ''} ${visita.visitante_apellidos || ''}`.toLowerCase();
            const empleadoCompleto = `${visita.personal_nombres || ''} ${visita.personal_apellidos || ''}`.toLowerCase();
            const documento = (visita.numero_documento || '').toLowerCase();
            
            return nombreCompleto.includes(busqueda) || 
                   empleadoCompleto.includes(busqueda) || 
                   documento.includes(busqueda);
          });
        }
        
        setHistorialVisitas(historialFiltrado);
        
        setHistorialPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: historialFiltrado.length,
          itemsPerPage: 15
        });
      }
      
    } catch (err) {
      console.error('Error al buscar historial:', err);
      setError('Error al buscar en el historial');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar cambios de página en el historial
  const handleHistorialPageChange = (newPage) => {
    // Solo cambiar página, no resetear filtros
    setHistorialPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
    handleBuscarHistorial(filtros, newPage);
  };

  // Función centralizada para ejecutar búsqueda con todos los filtros
  const ejecutarBusqueda = async (filtrosCompletos, page = 1) => {
    // Resetear la paginación al cambiar filtros
    setHistorialPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
    
    // Actualizar el estado de filtros
    setFiltros(filtrosCompletos);
    
    // Limpiar timeout anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Ejecutar la búsqueda con debounce
    searchTimeout.current = setTimeout(() => {
      handleBuscarHistorial(filtrosCompletos, page);
    }, 300);  // Espera 300ms para batch cambios
  };

  // Función para manejar cambios en filtros del formulario
  const handleFiltrosChange = (nuevosFiltros) => {
    // Combinar los filtros del formulario con las fechas actuales
    const filtrosCompletos = {
      ...filtros, // Mantener fechas actuales
      ...nuevosFiltros // Aplicar nuevos filtros del formulario
    };
    
    ejecutarBusqueda(filtrosCompletos, 1);
  };

  // Función específica para manejar cambios de fecha desde
  const handleFechaDesdeChange = (fecha) => {
    const filtrosCompletos = {
      ...filtros,
      fechaDesde: fecha
    };
    ejecutarBusqueda(filtrosCompletos, 1);
  };

  // Función específica para manejar cambios de fecha hasta
  const handleFechaHastaChange = (fecha) => {
    const filtrosCompletos = {
      ...filtros,
      fechaHasta: fecha
    };
    ejecutarBusqueda(filtrosCompletos, 1);
  };
  
  // Función para manejar cambios de página en los activos
  const handleActivosPageChange = (newPage) => {
    setActivosPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const handleRegistrarSalida = (visitaId, visitanteData = null) => {
    // Si es una visita offline, extraer el ID original
    let idParaSalida = visitaId;
    if (visitaId && visitaId.toString().startsWith('offline_')) {
      // Buscar la visita pendiente para obtener el ID original
      const visitaPendiente = visitasPendientes.find(v => v.id === visitaId);
      if (visitaPendiente && visitaPendiente._originalId) {
        idParaSalida = visitaPendiente._originalId;
      }
    }
    
    setVisitaParaSalida(idParaSalida);
    setVisitanteParaSalida(visitanteData);
    setShowSalidaModal(true);
  };

  const handleEliminarVisitanteEspera = (visitanteId) => {
    // Filtrar el visitante de la lista de espera
    setVisitantesEnEspera(prev => prev.filter(v => v.id !== visitanteId));
  };

  const confirmarRegistrarSalida = async () => {
    if (!visitaParaSalida) return;
    
    try {
      setLoading(true);
      setError('');
      setShowSalidaModal(false);
      
      // Usar el servicio con soporte offline, pasando datos del visitante
      const response = await registrarSalidaWithOfflineSupport(
        visitaParaSalida,
        visitasService.registrarSalida,
        visitanteParaSalida // Pasar datos del visitante para referencia offline
      );
      
      if (response.data.success) {
        // Verificar si es una respuesta offline
        if (isOfflineResponse(response)) {
          const message = getResponseMessage(response);
          setError(`⚠️ ${message.title}: ${message.message}`);
          
          // En modo offline, la UI ya se actualiza automáticamente via eventos
          // No necesitamos recargar visitantes activos
          console.log('[Dashboard] Salida registrada offline, UI actualizada automáticamente');
        } else {
          // En modo online, recargar visitantes activos para reflejar el cambio
          await cargarVisitantesActivos();
          console.log('[Dashboard] Salida registrada online, recargando datos');
        }
      } else {
        setError('Error al registrar la salida');
      }
    } catch (err) {
      setError(`Error al registrar la salida: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
      setVisitaParaSalida(null);
    }
  };

  const cancelarRegistrarSalida = () => {
    setShowSalidaModal(false);
    setVisitaParaSalida(null);
    setVisitanteParaSalida(null);
  };

  // Función para manejar submit con Enter
  const handleEnterSubmit = (enterType = 'normal') => {
    if (activeTab === 'activos') {
      // Si hay visitantes en espera, registrar visita
      if (visitantesEnEspera.length > 0) {
        // Obtener datos del formulario actual
        if (registroFormRef.current) {
          const formData = registroFormRef.current.getCurrentFormData();
          if (formData.empleadoId && formData.motivoId && formData.lugar) {
            if (enterType === 'first_enter') {
              // Mostrar confirmación de doble Enter
              setShowDoubleEnterConfirm(true);
              setError(''); // Limpiar errores anteriores
              
              // Ocultar la confirmación después de 3 segundos
              setTimeout(() => {
                setShowDoubleEnterConfirm(false);
              }, 3000);
            } else {
              // Segundo Enter - proceder con el registro
              setShowDoubleEnterConfirm(false);
              handleRegisterVisit(formData);
            }
          } else {
            setError('Debe seleccionar empleado, motivo y lugar antes de registrar las visitas');
            setShowDoubleEnterConfirm(false);
          }
        }
      }
    } else if (activeTab === 'historial') {
      // Ejecutar búsqueda de historial usando el formulario
      if (registroFormRef.current) {
        registroFormRef.current.triggerRegisterVisit();
      }
    }
  };

  // Función para manejar cambio de pestaña
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    
    // Si se cambia a historial, ejecutar búsqueda inicial con filtros vacíos
    if (newTab === 'historial') {
      const filtrosVacios = {
        busqueda: '',
        empleadoId: '',
        motivoId: '',
        lugar: '',
        fechaDesde: null, // Usar null en lugar de cadena vacía
        fechaHasta: null  // Usar null en lugar de cadena vacía
      };
      ejecutarBusqueda(filtrosVacios, 1);
    }
  };

  // Configurar atajos de teclado
  useKeyboardShortcuts({
    activeTab,
    onSubmit: handleEnterSubmit,
    refs: {
      documentoInput: documentoInputRef,
      busquedaInput: busquedaInputRef
    },
    enabled: isAuthenticated
  });

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Error and Loading Messages */}
      <div className="flex-shrink-0">
        {error && (
          <div className="mx-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Confirmación de doble Enter */}
        {showDoubleEnterConfirm && (
          <div className="mx-2 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Presione Enter nuevamente para confirmar el registro de visita
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDoubleEnterConfirm(false)}
                className="text-yellow-400 hover:text-yellow-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
      </div>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 p-4 mt-4 bg-gray-50">
        <div className="flex gap-4 min-h-0">
          {/* Columna Izquierda - Tabla (70%) */}
          <div className="w-[70%] overflow-x-auto">
            <VisitantesTabla
              visitantesActivos={visitantesActivos}
              visitantesEnEspera={visitantesEnEspera}
              visitasPendientes={visitasPendientes}
              historialVisitas={historialVisitas}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onBuscarHistorial={handleFiltrosChange} // CAMBIO: usar handleFiltrosChange
              onRegistrarSalida={handleRegistrarSalida}
              onEliminarVisitanteEspera={handleEliminarVisitanteEspera}
              filtros={filtros}
              vistaPreviaVisitante={vistaPreviaVisitante}
              vistaPreviaVisita={vistaPreviaVisita}
              historialPagination={historialPagination}
              onHistorialPageChange={handleHistorialPageChange}
              activosPagination={activosPagination}
              onActivosPageChange={handleActivosPageChange}
            />
          </div>

          {/* Columna Derecha - Registro (30%) */}
          <div className="w-[30%] pt-0">
            <AnimatePresence mode="wait">
              {/* Key cambia cuando cambias de tab => dispara animación */}
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {activeTab === "historial" ? (
                  <>
                    {/* Item 1: DateRangeFilter */}
                    <motion.div variants={itemVariants}>
                      <DateRangeFilter
                        fechaDesde={filtros.fechaDesde}
                        fechaHasta={filtros.fechaHasta}
                        onFechaDesdeChange={handleFechaDesdeChange}
                        onFechaHastaChange={handleFechaHastaChange}
                        onClear={() => {
                          const filtrosCompletos = {
                            ...filtros,
                            fechaDesde: null,
                            fechaHasta: null,
                          };
                          ejecutarBusqueda(filtrosCompletos, 1);
                        }}
                        className="mb-4"
                      />
                    </motion.div>

                    {/* Item 2: RegistroForm */}
                    <motion.div variants={itemVariants}>
                      <RegistroForm
                        ref={registroFormRef}
                        visitantesEnEspera={visitantesEnEspera}
                        onAddVisitor={handleAddVisitor}
                        onRegisterVisit={handleRegisterVisit}
                        onFormChange={handleFormChange}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        onBuscarHistorial={handleFiltrosChange}
                        refs={{
                          documentoInput: documentoInputRef,
                          busquedaInput: busquedaInputRef,
                        }}
                      />
                    </motion.div>
                  </>
                ) : (
                  // Tab "activos": solo animamos RegistroForm
                  <motion.div variants={itemVariants}>
                    <RegistroForm
                      ref={registroFormRef}
                      visitantesEnEspera={visitantesEnEspera}
                      onAddVisitor={handleAddVisitor}
                      onRegisterVisit={handleRegisterVisit}
                      onFormChange={handleFormChange}
                      activeTab={activeTab}
                      onTabChange={handleTabChange}
                      onBuscarHistorial={handleFiltrosChange}
                      refs={{
                        documentoInput: documentoInputRef,
                        busquedaInput: busquedaInputRef,
                      }}
                    />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para registrar salida */}
      {showSalidaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Confirmar Registro de Salida
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-500">
                  ¿Está seguro de que desea registrar la salida de este visitante?
                </p>
                {visitanteParaSalida ? (
                  <p className="text-sm font-medium text-gray-700 mt-2">
                    <strong>{visitanteParaSalida.visitante_nombres || visitanteParaSalida.nombres || ''} {visitanteParaSalida.visitante_apellidos || visitanteParaSalida.apellidos || ''}</strong>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    ID de Visita: {visitaParaSalida}
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelarRegistrarSalida}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarRegistrarSalida}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Confirmar Salida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Componente de ayuda para atajos de teclado */}
      <KeyboardShortcutsHelp activeTab={activeTab} />
    </div>
  );
};

export default DashboardVigilantePage;