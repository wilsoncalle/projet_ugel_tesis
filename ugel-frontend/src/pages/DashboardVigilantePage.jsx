import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// import { io } from 'socket.io-client'; // Cargado dinámicamente
import { AnimatePresence, motion } from "framer-motion";
import Card from '../components/Card';
import RegistroForm from '../components/vigilante/RegistroForm';
import VisitantesTabla from '../components/vigilante/VisitantesTabla';
import DateRangeFilter from '../components/DateRangeFilter';
import PanelSeleccionEstadisticas from '../components/vigilante/PanelSeleccionEstadisticas';
import { VisitasAreaCard, VisitasMotivoCard } from '../components/vigilante_estadisticas';
import { visitasService, visitantesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { createVisitaWithOfflineSupport, registrarSalidaWithOfflineSupport, isOfflineResponse, getResponseMessage } from '../services/offlineApiService';
import { getPendingVisitas, getPendingSalidas, getVisitasActivasCompletas } from '../utils/offlineDB';
import { formatHora, formatFecha } from '../utils/dateHelpers';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Función para consultar RENIEC
const consultarRENIEC = async (numeroDocumento) => {
  try {
    console.log('[RENIEC] Consultando DNI vía backend:', numeroDocumento);
    const response = await visitantesService.consultarDNI(numeroDocumento);
    const payload = response.data;

    if (payload?.success && payload.data) {
      return {
        success: true,
        data: {
          nombres: payload.data.nombres || '',
          apellidos: payload.data.apellidos || '',
          numeroDocumento: numeroDocumento
        }
      };
    }

    return { success: false, error: payload?.message || 'No se encontraron datos de RENIEC' };
  } catch (error) {
    console.error('[RENIEC] Error al consultar:', error);
    const message = error.response?.data?.message || 'Error al consultar RENIEC';
    return { success: false, error: message };
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
  useDocumentTitle('Registro de Visitantes - COAC-UGEL');
  const navigate = useNavigate();
  // Hook de autenticación
  const { user, isAuthenticated } = useAuth();
  
  // Detección de dispositivo móvil y redirección
  useEffect(() => {
    const checkMobile = () => {
      // Detección combinada: ancho de pantalla < 768px O userAgent móvil
      const isMobileWidth = window.innerWidth < 768;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobileWidth || isMobileUserAgent) {
        console.log('[DashboardVigilante] Dispositivo móvil detectado, redirigiendo a escáner...');
        navigate('/escaner-movil', { replace: true });
      }
    };
    
    checkMobile();
    
    // Opcional: escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [navigate]);
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
  
  // Estado para la semana seleccionada
  const [semanaUI, setSemanaUI] = useState(null);
  
  const [activeTab, setActiveTab] = useState('activos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriaEstadisticas, setCategoriaEstadisticas] = useState('total-visitas');
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
    itemsPerPage: 15
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
            // CORRECCIÓN: Usar helper para formatear horas de forma consistente
            const horaOffline = formatHora(v.hora_ingreso);
            const horaActualizada = formatHora(datosActualizados.hora_ingreso);
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
        fetch('/api/personal').then(r => r.json()).catch(() => ({data: []})),
        fetch('/api/motivos-visita').then(r => r.json()).catch(() => ({data: []})),
        fetch('/api/areas').then(r => r.json()).catch(() => ({data: []}))
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
    // Ref para evitar múltiples conexiones en React StrictMode
    let socketInstance = null;
    let isCleaningUp = false;

    const initializeSocket = async () => {
      // Si ya hay una instancia, no crear otra
      if (socketInstance) return socketInstance;

      try {
        const { io } = await import('socket.io-client');
        
        if (isCleaningUp) return null;

        const socketURL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

        // Conexión Socket.IO para actualizaciones en tiempo real
        const token = localStorage.getItem('token');

        const socket = io(socketURL, {
          transports: ['websocket'],
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 2000,
          timeout: 5000,
          auth: {
            token: token
          }
        });

        socketInstance = socket;

        // Intentar conectar solo si estamos online
        if (navigator.onLine) {
          socket.connect();
        }
      
        socket.on('connect', () => {
            console.log('[Socket.IO] Conectado');
        });
      
        socket.on('nueva_visita_registrada', (visita) => {
          if (isCleaningUp) return; // Ignorar si estamos limpiando

          setVisitantesActivos(prev => {
            if (prev.some(v => String(v.id) === String(visita.id))) return prev;

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

          // Refrescar desde servidor para mantener tablas y paginación alineadas
          cargarVisitantesActivos();
        });
      
          // Handler para actualizaciones de estado
          socket.on('estado_visita_actualizado', (data) => {
            if (isCleaningUp) return;

            console.log(`[Socket.IO] Estado actualizado para visita ID: ${data.id}, Nuevo estado: ${data.estado}`);

            setVisitantesActivos(prev => {
              return prev.map(v => {
                if (String(v.id) === String(data.id)) {
                  const updatedVisita = {
                    ...v,
                    estado_visita: data.estado,
                    fecha_aceptacion: data.fecha_aceptacion || v.fecha_aceptacion,
                    fecha_rechazo: data.fecha_rechazo || v.fecha_rechazo,
                    motivo_rechazo: data.motivo_rechazo || v.motivo_rechazo,
                    delegado_por_id: data.delegado_por_id || v.delegado_por_id,
                    fecha_delegacion: data.fecha_delegacion || v.fecha_delegacion
                  };

                  // Si es delegación, actualizar datos del personal visitado
                  if (data.estado === 'DELEGADO' && data.nuevo_personal_id) {
                    updatedVisita.personal_visitado_id = data.nuevo_personal_id;
                    updatedVisita.personal_nombres = data.nuevo_personal_nombres;
                    updatedVisita.personal_apellidos = data.nuevo_personal_apellidos;
                    updatedVisita.personal_cargo = data.nuevo_personal_cargo;
                    
                    // Actualizar objeto anidado si existe (usado en algunas vistas)
                    if (updatedVisita.empleadoVisitado) {
                       updatedVisita.empleadoVisitado = {
                         ...updatedVisita.empleadoVisitado,
                         id: data.nuevo_personal_id,
                         nombres: data.nuevo_personal_nombres,
                         apellidos: data.nuevo_personal_apellidos,
                         cargo: data.nuevo_personal_cargo
                       };
                    }

                    // Actualizar área si cambió
                    if (data.nuevo_area_id) {
                        updatedVisita.area_destino_id = data.nuevo_area_id;
                        updatedVisita.nombre_area = data.nuevo_area_nombre;
                        updatedVisita.lugarNombre = data.nuevo_area_nombre;
                    }
                  }

                  return updatedVisita;
                }
                return v;
              });
            });
          });

          // Handler para salidas con protección contra duplicados
          const handleSalidaRegistrada = ({ visitaId }) => {
            if (isCleaningUp) return; // Ignorar si estamos limpiando

            console.log(`[Socket.IO] Salida registrada para visita ID: ${visitaId}`);
            
          setVisitantesActivos(prev => {
              const visitaExistente = prev.find(v => String(v.id) === String(visitaId));
              
              if (!visitaExistente) {
                console.log(`[Socket.IO] Visita ${visitaId} no está en activos, ignorando`);
                return prev;
              }
              
              if (visitaExistente.fecha_salida || visitaExistente.hora_salida) {
                console.log(`[Socket.IO] Visita ${visitaId} ya tiene salida, ignorando`);
                return prev;
              }
              
            const nuevaLista = prev.filter(v => String(v.id) !== String(visitaId));
              console.log(`[Socket.IO] Visitantes activos después de remover: ${nuevaLista.length}`);
              
              setActivosPagination(prevPag => ({
                ...prevPag,
                totalItems: Math.max(0, prevPag.totalItems - 1),
                totalPages: Math.ceil(Math.max(0, prevPag.totalItems - 1) / prevPag.itemsPerPage)
              }));
              
              return nuevaLista;
            });
          };

          socket.on('salida_visita_registrada', handleSalidaRegistrada);
        socket.on('disconnect', () => {
            console.log('[Socket.IO] Desconectado');
          });
          socket.on('connect_error', () => {
            // Silencioso
          });

          return socket;
      } catch (error) {
        console.error('[Socket.IO] Error cargando librería:', error);
        return null;
      }
    };

    // Inicializar socket
    initializeSocket();

    // CLEANUP CRÍTICO
    return () => {
      console.log('[Socket.IO] Limpiando listeners...');
      isCleaningUp = true;

      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.close();
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, []); // Mantener array vacío pero con ref de control

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
    // COMENTADO: handleOnline causaba recarga prematura que competía con la sincronización
    // El flujo correcto es: online → offlineSync.js → offline-sync-complete → recarga UI
    /*
    const handleOnline = () => {
      console.log('[Dashboard] Conexión restaurada, sincronizando datos...');
      // No cargar inmediatamente, esperar a que termine la sincronización
    };
    */

    const handleOffline = () => {
      console.log('[Dashboard] Conexión perdida, modo offline activado');
    };

    const handleSyncComplete = (event) => {
      console.log('[Dashboard] Sincronización completada:', event.detail);
      const { successCount, failedCount } = event.detail || {};
      
      if (successCount > 0) {
        console.log(`[Dashboard] ${successCount} registros sincronizados, recargando datos...`);
        
        // Esperar un momento para que la sincronización se complete completamente
        // antes de recargar los datos para evitar que aparezcan visitantes brevemente
        setTimeout(async () => {
          try {
            // Recargar visitantes activos para reflejar los cambios del servidor
            await cargarVisitantesActivos();
            console.log('[Dashboard] Visitantes activos recargados después de sincronización');
            
            // También recargar historial si estamos en esa pestaña
            if (activeTab === 'historial') {
              await handleBuscarHistorial(filtros, historialPagination.currentPage);
              console.log('[Dashboard] Historial recargado después de sincronización');
            }
          } catch (error) {
            console.error('[Dashboard] Error recargando datos después de sincronización:', error);
          }
        }, 1500); // Aumentar a 1500ms para dar margen a la DB
      }
    };

    // Nuevo: Manejar actualizaciones de visitantes con datos de RENIEC
    const handleVisitanteActualizadoRENIEC = (event) => {
      console.log('[Dashboard] Visitante actualizado con datos de RENIEC:', event.detail);
      const { visitanteId, nombres, apellidos, numeroDocumento } = event.detail;
      
      // Actualizar la tabla de visitantes activos con los nuevos datos
      setVisitantesActivos(prev => prev.map(visitante => {
        if (visitante.visitanteId === visitanteId || visitante.numero_documento === numeroDocumento) {
          return {
            ...visitante,
            visitante_nombres: nombres,
            visitante_apellidos: apellidos,
            nombres: nombres,
            apellidos: apellidos
          };
        }
        return visitante;
      }));
      
      // También actualizar el historial si está visible
      if (activeTab === 'historial') {
        setHistorialVisitas(prev => prev.map(visita => {
          if (visita.visitanteId === visitanteId || visita.numero_documento === numeroDocumento) {
            return {
              ...visita,
              visitante_nombres: nombres,
              visitante_apellidos: apellidos,
              nombres: nombres,
              apellidos: apellidos
            };
          }
          return visita;
        }));
      }
      
      console.log('[Dashboard] ✅ Datos del visitante actualizados con información de RENIEC');
    };

    // Nuevo: Manejar salidas registradas offline
    const handleOfflineSalidaRegistrada = (event) => {
      console.log('[Dashboard] Salida registrada offline:', event.detail);
      const { visitaId, timestamp, visitanteData } = event.detail;
      
      // Actualizar inmediatamente la UI: mover de activos a historial
      setVisitantesActivos(prevActivos => {
        console.log('[Dashboard] Buscando visita en activos:', { visitaId, activos: prevActivos.length });
        
        // Buscar la visita por múltiples criterios
        let visitaIndex = -1;
        let visita = null;
        
        // Primero buscar por ID exacto
        visitaIndex = prevActivos.findIndex(v => v.id === visitaId);
        if (visitaIndex !== -1) {
          visita = prevActivos[visitaIndex];
          console.log('[Dashboard] Encontrada por ID exacto:', visita.id);
        }
        
        // Si no se encuentra, buscar por ID original
        if (visitaIndex === -1) {
          visitaIndex = prevActivos.findIndex(v => v._originalId === visitaId);
          if (visitaIndex !== -1) {
            visita = prevActivos[visitaIndex];
            console.log('[Dashboard] Encontrada por ID original:', visita._originalId);
          }
        }
        
        // Si no se encuentra, buscar por ID offline
        if (visitaIndex === -1) {
          visitaIndex = prevActivos.findIndex(v => v._originalOfflineId === visitaId);
          if (visitaIndex !== -1) {
            visita = prevActivos[visitaIndex];
            console.log('[Dashboard] Encontrada por ID offline:', visita._originalOfflineId);
          }
        }
        
        // Si aún no se encuentra, buscar por datos del visitante (para visitas offline)
        if (visitaIndex === -1 && visitanteData) {
          visitaIndex = prevActivos.findIndex(v => {
            const mismoDocumento = v.numero_documento === visitanteData.numeroDocumento;
            const mismoNombre = v.visitante_nombres === visitanteData.nombres;
            const mismoApellido = v.visitante_apellidos === visitanteData.apellidos;
            const esOffline = v._isOffline || v._isPending;
            
            return mismoDocumento && mismoNombre && mismoApellido && esOffline;
          });
          
          if (visitaIndex !== -1) {
            visita = prevActivos[visitaIndex];
            console.log('[Dashboard] Encontrada por datos del visitante:', visita);
          }
        }
        
        if (visitaIndex !== -1 && visita) {
          // Crear entrada para el historial con datos de salida
          const entradaHistorial = {
            ...visita,
            // Preservar la fecha y hora de ingreso original
            fecha_ingreso: visita.fecha_ingreso || visita.fechaIngreso || formatFecha(new Date(), 'YYYY-MM-DD'),
            hora_ingreso: formatHora(visita.hora_ingreso || visita.horaIngreso || new Date()),
            // Agregar datos de salida
            fecha_salida: new Date(timestamp).toISOString(),
            hora_salida: formatHora(new Date(timestamp)),
            _wasOfflineExit: true,
            _offlineExitTimestamp: timestamp,
            _originalOfflineId: visitaId
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
        } else {
          console.warn('[Dashboard] No se encontró la visita en activos para la salida offline:', { visitaId, visitanteData });
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
      
      // También asegurar que el visitante no esté en activos después de la sincronización
      setVisitantesActivos(prevActivos => {
        return prevActivos.filter(v => 
          v.id !== visitaId && 
          v._originalId !== visitaId &&
          v._originalOfflineId !== visitaId
        );
      });
    };

    // COMENTADO: No registrar handleOnline para evitar recarga prematura
    // window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    window.addEventListener('offline-salida-registrada', handleOfflineSalidaRegistrada);
    window.addEventListener('offline-salida-sincronizada', handleOfflineSalidaSincronizada);
    window.addEventListener('visitante-actualizado-reniec', handleVisitanteActualizadoRENIEC);

    return () => {
      // COMENTADO: No remover handleOnline ya que no se registró
      // window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      window.removeEventListener('offline-salida-registrada', handleOfflineSalidaRegistrada);
      window.removeEventListener('offline-salida-sincronizada', handleOfflineSalidaSincronizada);
      window.removeEventListener('visitante-actualizado-reniec', handleVisitanteActualizadoRENIEC);
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
        
        // También cargar salidas pendientes para aplicar sobre las visitas del servidor
        const salidasPendientes = await getPendingSalidas();
        if (salidasPendientes.length > 0) {
          console.log('[Online] Salidas pendientes encontradas:', salidasPendientes);
          
          // Crear un mapa de salidas por visitaId para acceso rápido
          const salidasPorVisita = new Map();
          salidasPendientes.forEach(salida => {
            salidasPorVisita.set(salida.visitaId, salida);
          });
          
          // Aplicar salidas a las visitas correspondientes del servidor
          activosData = activosData.map(visita => {
            const salida = salidasPorVisita.get(visita.id.toString());
            if (salida) {
              console.log('[Online] Aplicando salida pendiente a visita del servidor:', {
                visitaId: visita.id,
                salidaId: salida.id,
                fechaSalida: salida.fechaSalida,
                horaSalida: salida.horaSalida
              });
              
              return {
                ...visita,
                fecha_salida: salida.fechaSalida,
                hora_salida: salida.horaSalida,
                _hasOfflineExit: true,
                _offlineExitId: salida.id
              };
            }
            return visita;
          });
          
          console.log('[Online] Salidas aplicadas sobre datos del servidor. Visitas con salida:', 
            activosData.filter(v => v._hasOfflineExit).length);
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
                
                // CORRECCIÓN: Usar helper para formatear horas de forma consistente
                const horaOffline = formatHora(visitaOffline.hora_ingreso);
                const horaAPI = formatHora(v.hora_ingreso || v.fecha_ingreso);
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
            
            // Cachear resultado final
            try {
              localStorage.setItem('cache_visitas_activas', JSON.stringify({ ts: Date.now(), data: resultado }));
            } catch (e) {
              console.warn('No se pudo cachear visitas activas', e);
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
        // Si estamos offline, cargar visitas activas completas (visitas + salidas)
        console.log('[Offline] Cargando visitas activas completas...');
        const { visitasActivas, visitasConSalida } = await getVisitasActivasCompletas();
        
        // Solo mostrar visitas que NO tienen salida (activas)
        activosData = visitasActivas;
        
        // Las visitas con salida se manejarán en el historial
        if (visitasConSalida.length > 0) {
          console.log('[Offline] Visitas con salida encontradas (se mostrarán en historial):', visitasConSalida.length);
        }

        // Usar caché solo como complemento/fallback sin pisar las visitas offline recién guardadas
        try {
          const cached = localStorage.getItem('cache_visitas_activas');
          if (cached) {
            const parsed = JSON.parse(cached);
            const cachedData = Array.isArray(parsed?.data) ? parsed.data : [];

            if (cachedData.length > 0) {
              // Clave compuesta para evitar duplicados (doc + personal + fecha + hora)
              const offlineKeys = new Set(
                activosData.map((v) => {
                  const doc = v.numero_documento || '';
                  const personalId = v.personal_visitado_id || v.personalVisitadoId || '';
                  const fecha = (v.fecha_ingreso || '').split('T')[0] || '';
                  const hora = formatHora(v.hora_ingreso || v.fecha_ingreso || '');
                  return `${doc}|${personalId}|${fecha}|${hora}`;
                })
              );

              const extrasFromCache = cachedData.filter((v) => {
                const doc = v.numero_documento || '';
                const personalId = v.personal_visitado_id || v.personalVisitadoId || '';
                const fecha = (v.fecha_ingreso || '').split('T')[0] || '';
                const hora = formatHora(v.hora_ingreso || v.fecha_ingreso || '');
                const key = `${doc}|${personalId}|${fecha}|${hora}`;
                return !offlineKeys.has(key);
              });

              if (activosData.length === 0) {
                activosData = cachedData;
              } else if (extrasFromCache.length > 0) {
                activosData = [...activosData, ...extrasFromCache];
              }
            }
          }
        } catch (e) {
          console.warn('No se pudo leer cache de visitas activas', e);
        }
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
        
        // Filtrar visitas que ya tienen salida registrada para evitar que aparezcan en activos
        const activosSinSalida = activosTransformados.filter(visita => {
          // Excluir visitas que tienen fecha_salida (ya salieron)
          const tieneSalida = visita.fecha_salida && visita.fecha_salida !== null;
          if (tieneSalida) {
            console.log('[Dashboard] Excluyendo visita con salida registrada:', {
              id: visita.id,
              fecha_salida: visita.fecha_salida,
              hora_salida: visita.hora_salida
            });
          }
          return !tieneSalida;
        });
        
        console.log(`[Dashboard] Visitas activas filtradas: ${activosSinSalida.length} de ${activosTransformados.length}`);
        
        setVisitantesActivos(activosSinSalida);
        
        // Actualizar paginación para activos
        setActivosPagination(prev => ({
          ...prev,
          totalItems: activosSinSalida.length,
          totalPages: Math.ceil(activosSinSalida.length / prev.itemsPerPage),
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
        area_destino_id: visita.areaDestinoId
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
    // CORRECCIÓN: Usar helper para formatear horas de forma consistente
    const horaFormateada = formatHora(currentDate);
    
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
  // NOTA: Actualmente aplica los mismos datos de visita a TODOS los visitantes en espera
  // Si en el futuro se necesita permitir datos individuales por visitante, se puede modificar
  const handleFormChange = (formData) => {
    // Actualizar los visitantes en espera con los datos de la visita
    // IMPORTANTE: Solo actualizar si hay datos significativos (no vacíos)
    const tieneDatosSignificativos = formData.visita && 
      (formData.visita.empleadoId || formData.visita.motivoId || formData.visita.lugar);
    
    // NO actualizar si los datos están vacíos (evita sobrescribir datos existentes)
    const datosEstanVacios = formData.visita && 
      (!formData.visita.empleadoId && !formData.visita.motivoId && !formData.visita.lugar);
    
    if (tieneDatosSignificativos && visitantesEnEspera.length > 0 && !datosEstanVacios) {
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
      
      // CORRECCIÓN: Actualizar todos los visitantes en espera con los mismos datos de visita
      // NOTA: Si se necesita permitir datos individuales por visitante, se puede modificar
      // para aplicar solo a visitantes específicos o usar un ID de visitante en formData
      const visitantesActualizados = visitantesEnEspera.map(visitante => ({
        ...visitante,
        ...visitaData
      }));
      
      setVisitantesEnEspera(visitantesActualizados);
    }
    
    // Mantener la vista previa para cuando no hay visitantes en espera
    if (visitantesEnEspera.length === 0) {
      if (formData.visitante && Object.values(formData.visitante).some(val => val)) {
        // Crear una vista previa del visitante con ID temporal
        const currentDate = new Date();
        // CORRECCIÓN: Usar helper para formatear horas de forma consistente
        const horaFormateada = formatHora(currentDate);
        
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
                tipoDocumentoCodigo: visitante.tipoDocumento?.codigo || 'DNI', // Incluir código del tipo de documento
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
                tipoDocumentoCodigo: visitante.tipoDocumento?.codigo || 'DNI', // Incluir código del tipo de documento
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

          // CORRECCIÓN: Usar helper para formatear horas de forma consistente
          const horaIngresoOriginal = formatHora(visitante.horaIngreso || new Date());
          
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
            fechaIngreso: visitante.fechaIngreso || formatFecha(new Date(), 'YYYY-MM-DD'),
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

            // Notificar a otras vistas (Mis Visitas) que se creó una visita
            try {
              const visitaParaEvento = responseVisita?.data?.data || visitaPayload;
              window.dispatchEvent(new CustomEvent('visita-registrada', {
                detail: {
                  personalVisitadoId: parseInt(empleadoId),
                  visita: visitaParaEvento
                }
              }));
            } catch (evtError) {
              console.warn('[Dashboard] No se pudo notificar la creación de visita:', evtError);
            }
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
        // Cachear historial de visitas
        try {
          localStorage.setItem('cache_visitas_historial', JSON.stringify({
            ts: Date.now(),
            data: historialData,
            pagination: response.data.pagination,
            filtros: filtrosData
          }));
        } catch (e) {
          console.warn('No se pudo cachear historial de visitas', e);
        }
        
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
        let historialData = historialVisitas || [];
        try {
          const cached = localStorage.getItem('cache_visitas_historial');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) {
              historialData = parsed.data;
              if (parsed.pagination) setHistorialPagination(parsed.pagination);
            }
          }
        } catch (e) {
          console.warn('No se pudo leer cache de historial de visitas', e);
        }
        
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
      // Fallback cache
      try {
        const cached = localStorage.getItem('cache_visitas_historial');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.data)) {
            setHistorialVisitas(parsed.data);
            if (parsed.pagination) setHistorialPagination(parsed.pagination);
          }
        }
      } catch (e) {
        // ignore
      }
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
  const handleFechaDesdeChange = (fecha, fechaHasta = null) => {
    // Si viene fechaHasta, es porque se seleccionó un rango completo (semana) o un solo día específico
    if (fechaHasta) {
      // Si fecha === fechaHasta, es un solo día específico (chip de día)
      // Si fecha !== fechaHasta, es un rango completo (semana)
      const filtrosCompletos = {
        ...filtros,
        fechaDesde: fecha,
        fechaHasta: fechaHasta
      };
      
      // Actualizar directamente sin debounce para rangos de semana o días específicos
      setFiltros(filtrosCompletos);
      setHistorialPagination(prev => ({ ...prev, currentPage: 1 }));
      handleBuscarHistorial(filtrosCompletos, 1);
    } else {
      // Comportamiento normal para selección individual
      const filtrosCompletos = {
        ...filtros,
        fechaDesde: fecha
      };
      ejecutarBusqueda(filtrosCompletos, 1);
    }
  };

  // Función específica para manejar cambios de fecha hasta
  const handleFechaHastaChange = (fecha, fechaDesde = null) => {
    // Si viene fechaDesde, es porque se seleccionó un rango completo (semana) o un solo día
    // En este caso, el handleFechaDesdeChange ya manejó todo, así que ignoramos
    if (fechaDesde) {
      return;
    }
    
    // Comportamiento normal para selección individual
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
    setVisitantesEnEspera(prev => {
      const next = prev.filter(v => v.id !== visitanteId);
      // Si la lista queda vacía, limpiar el formulario de visita
      if (next.length === 0) {
        requestAnimationFrame(() => registroFormRef.current?.resetVisitForm?.());
      }
      return next;
    });
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
          setError(message.title + ': ' + message.message);
          
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
      // Calcular semana actual (lunes a domingo)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // Obtener el lunes de esta semana
      const dayOfWeek = hoy.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lunesSemanaActual = new Date(hoy);
      lunesSemanaActual.setDate(hoy.getDate() - daysToMonday);
      lunesSemanaActual.setHours(0, 0, 0, 0);
      
      // Obtener el domingo de esta semana
      const domingoSemanaActual = new Date(lunesSemanaActual);
      domingoSemanaActual.setDate(lunesSemanaActual.getDate() + 6);
      
      // Si el domingo está en el futuro, usar hoy como límite
      const finSemana = domingoSemanaActual > hoy ? hoy : domingoSemanaActual;
      
      // Formatear fechas como YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const fechaHoy = formatDate(hoy);
      const fechaLunes = formatDate(lunesSemanaActual);
      const fechaDomingo = formatDate(finSemana);
      
      // Calcular el índice de la semana en el mes actual
      const firstDayOfMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const firstMondayOfMonth = new Date(firstDayOfMonth);
      const dowFirstDay = firstDayOfMonth.getDay();
      const toSubtractFirstDay = dowFirstDay === 0 ? 6 : dowFirstDay - 1;
      firstMondayOfMonth.setDate(firstDayOfMonth.getDate() - toSubtractFirstDay);
      
      // Calcular qué semana es en el mes (S1, S2, etc.)
      const diffTime = lunesSemanaActual.getTime() - firstMondayOfMonth.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7);
      
      // Construir payload de la semana (similar a buildWeekPayload en DateRangeFilter)
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(lunesSemanaActual);
        day.setDate(lunesSemanaActual.getDate() + i);
        return day;
      });
      
      const monthDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const monthName = monthNames[monthDate.getMonth()];
      const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      const semanaPayload = {
        start: fechaLunes,
        end: fechaDomingo,
        monthName: monthNameCapitalized,
        weekIndex: weekIndex + 1,
        days: days.map((d) => {
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const dayShortNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
          const dayOfWeek = d.getDay();
          return {
            date: formatDate(d),
            labelShort: dayShortNames[dayOfWeek],
            labelLong: dayNames[dayOfWeek]
          };
        })
      };
      
      // Establecer la semana en semanaUI y el día actual
      setSemanaUI(semanaPayload);
      handleFechaDesdeChange(fechaHoy, fechaHoy);
    }
  };

  // Función para manejar cambio de categoría de estadísticas
  const handleCategoriaEstadisticasChange = (categoria) => {
    setCategoriaEstadisticas(categoria);
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
      <div className="flex-1 p-4 mt-0 bg-gray-50">
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
              // Pasar datos adicionales para estadísticas
              categoriaEstadisticas={categoriaEstadisticas}
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
                          setSemanaUI(null); // limpiar chips al limpiar fechas
                          ejecutarBusqueda(filtrosCompletos, 1);
                        }}
                        onSemanaChange={(info) => setSemanaUI(info)}
                        semanaUIProp={semanaUI}
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
                ) : activeTab === "estadisticas" ? (
                  // Tab "estadisticas": PanelSeleccionEstadisticas
                  <motion.div variants={itemVariants}>
                    <PanelSeleccionEstadisticas
                      categoriaActiva={categoriaEstadisticas}
                      onCategoriaChange={handleCategoriaEstadisticasChange}
                    />
                  </motion.div>
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
