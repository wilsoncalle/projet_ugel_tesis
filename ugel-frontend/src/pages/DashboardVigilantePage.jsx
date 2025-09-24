import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import Card from '../components/Card';
import RegistroForm from '../components/vigilante/RegistroForm';
import VisitantesTabla from '../components/vigilante/VisitantesTabla';
import DateRangeFilter from '../components/DateRangeFilter';
import { visitasService, visitantesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';

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
    cargarVisitantesActivos();
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

  const cargarVisitantesActivos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await visitasService.getActivas();
      
      if (response.data.success) {
        const activosData = response.data.data || [];
        console.log('DashboardVigilantePage - Datos recibidos del backend:', activosData);
        
        // Transformar los datos de la API para que coincidan con la estructura esperada por el frontend
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
            lugarNombre: visita.nombre_area || ''
          };
        });
        
        console.log('DashboardVigilantePage - Datos transformados:', activosTransformados);
        
        
        setVisitantesActivos(activosTransformados);
        
        // Actualizar paginación para activos
        setActivosPagination(prev => ({
          ...prev,
          totalItems: activosTransformados.length,
          totalPages: Math.ceil(activosTransformados.length / prev.itemsPerPage),
          currentPage: 1 // Resetear a la primera página
        }));
      } else {
        setError('Error al cargar visitantes activos');
      }
    } catch (err) {
      console.error('Error al cargar visitantes activos:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Handlers para el formulario de registro
  const handleAddVisitor = (visitanteData) => {
    const currentDate = new Date();
    const nuevoVisitante = {
      id: Date.now(), // ID temporal
      ...visitanteData,
      fechaIngreso: currentDate.toISOString().split('T')[0],
      horaIngreso: currentDate.toTimeString().split(' ')[0].substring(0, 5),
      horaSalida: null
    };
    setVisitantesEnEspera(prev => [...prev, nuevoVisitante]);
    
    // Limpiar la vista previa cuando se agrega un visitante
    setVistaPreviaVisitante(null);
  };
  
  // Handler para cambios en tiempo real en el formulario
  const handleFormChange = (formData) => {
    
    // Actualizar los visitantes en espera con los datos de la visita
    if (formData.visita && Object.values(formData.visita).some(val => val) && visitantesEnEspera.length > 0) {
      // Crear un objeto con los datos de la visita
      const visitaData = {
        empleado: formData.visita.empleado,
        motivo: formData.visita.motivo,
        lugar: formData.visita.lugar, // Nombre del área para mostrar
        lugarId: formData.visita.lugarId, // ID del área para el backend
        empleadoVisitado: formData.visita.empleado,
        personal_nombres: formData.visita.empleado?.nombres || '',
        personal_apellidos: formData.visita.empleado?.apellidos || '',
        nombre_motivo: formData.visita.motivo?.label || '',
        nombre_area: formData.visita.lugar || ''
      };
      
      // Actualizar todos los visitantes en espera con los mismos datos de visita
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
        const previewVisitante = {
          id: 'preview',
          ...formData.visitante,
          fechaIngreso: currentDate.toISOString().split('T')[0],
          horaIngreso: currentDate.toTimeString().split(' ')[0].substring(0, 5),
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
          let visitanteId = visitante.id;
          
          // Si el visitante ya existe en la base de datos, usar su ID
          if (visitante.visitanteId) {
            visitanteId = visitante.visitanteId;
          }
          // Si el ID es temporal (generado con Date.now()), crear el visitante
          else if (typeof visitanteId === 'number' && visitanteId > 1000000000000) {
            // Asegurar que estamos enviando exactamente lo que espera la API
            const visitantePayload = {
              tipoDocumentoId: parseInt(visitante.tipoDocumentoId), // Convertir a número
              numeroDocumento: visitante.numeroDocumento.slice(0, 20), // VARCHAR(20)
              nombres: visitante.nombres.slice(0, 150), // VARCHAR(150)
              apellidos: visitante.apellidos.slice(0, 150) // VARCHAR(150)
            };
            
            const responseVisitante = await visitantesService.create(visitantePayload);
            
            if (responseVisitante.data.success) {
              visitanteId = responseVisitante.data.data.id;
            } else {
              throw new Error('Error al crear visita');
            }
          }

          // Crear la visita (utilizando la fecha actual en lugar de la fecha de la visita)
          const currentDate = new Date();
          
          
          // Si el visitante no tiene datos de visita, usar los datos proporcionados
          let empleadoId = visitante.empleado?.id || visitante.empleadoVisitado?.id;
          let motivoId = visitante.motivo?.id;
          let lugarId = visitante.lugarId || visitante.lugar;
          
          // Si no tiene datos de visita, usar los datos proporcionados
          if (!empleadoId || !motivoId || !lugarId) {
            empleadoId = datosVisita.empleadoId;
            motivoId = datosVisita.motivoId;
            lugarId = datosVisita.lugar;
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
          
          const visitaPayload = {
            visitanteId: parseInt(visitanteId),
            personalVisitadoId: parseInt(empleadoId), // Usar la variable definida arriba
            motivoVisitaId: parseInt(motivoId), // Usar la variable definida arriba
            areaDestinoId: parseInt(lugarId), // Usar la variable definida arriba
            usuarioIngresoId: user?.id ? parseInt(user.id) : 1, // ID del usuario autenticado o valor por defecto
            // Usar la fecha y hora actual para evitar problemas con fechas futuras
            fechaIngreso: currentDate.toISOString().split('T')[0],
            horaIngreso: currentDate.toTimeString().substring(0, 8)
          };
          

          const responseVisita = await visitasService.create(visitaPayload);
          
          if (responseVisita.data.success) {
            visitasRegistradas.push(responseVisita.data.data);
          } else {
            throw new Error('Error al crear visita');
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
      setVisitantesEnEspera([]);
      await cargarVisitantesActivos();
      
      
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
      
      // Construir parámetros de búsqueda con paginación
      const params = {
        page: page,
        limit: 15 // Usar 15 elementos por página
      };
      
      // Debug: Log de los filtros recibidos
      console.log('Filtros recibidos en handleBuscarHistorial:', filtrosData);
      
      // CORRECCIÓN: Usar los nombres correctos que espera el backend
      if (filtrosData.busqueda) params.q = filtrosData.busqueda;
      if (filtrosData.empleadoId) params.personalVisitadoId = filtrosData.empleadoId;
      if (filtrosData.motivoId) params.motivoVisitaId = filtrosData.motivoId;
      if (filtrosData.lugar) params.areaId = filtrosData.lugar;
      if (filtrosData.fechaDesde) params.fechaInicio = filtrosData.fechaDesde;
      if (filtrosData.fechaHasta) params.fechaFin = filtrosData.fechaHasta;
      
      // Debug: Log de los parámetros que se envían al backend
      console.log('Parámetros enviados al backend:', params);
      
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
    setVisitaParaSalida(visitaId);
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
      
      const response = await visitasService.registrarSalida(visitaParaSalida);
      
      if (response.data.success) {
        // Recargar visitantes activos para reflejar el cambio
        await cargarVisitantesActivos();
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
      <div className="flex-1 p-4 mt-4 overflow-y-scroll">
        <div className="flex gap-4 min-h-0">
          {/* Columna Izquierda - Tabla (70%) */}
          <div className="w-[70%] overflow-x-auto">
            <VisitantesTabla
              visitantesActivos={visitantesActivos}
              visitantesEnEspera={visitantesEnEspera}
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
