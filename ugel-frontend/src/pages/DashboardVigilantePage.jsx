import { useState, useEffect } from 'react';
import Card from '../components/Card';
import RegistroForm from '../components/vigilante/RegistroForm';
import VisitantesTabla from '../components/vigilante/VisitantesTabla';
import DateRangeFilter from '../components/DateRangeFilter';
import { visitasService, visitantesService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

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
    fechaDesde: '',
    fechaHasta: (() => {
      // Crear fecha local sin problemas de zona horaria
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })()
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
    itemsPerPage: 10
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

  // Cargar visitantes activos al montar el componente
  useEffect(() => {
    cargarVisitantesActivos();
    // Cargar historial inicial con paginación
    handleBuscarHistorial(filtros, 1);
  }, []);

  const cargarVisitantesActivos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await visitasService.getActivas();
      
      if (response.data.success) {
        const activosData = response.data.data || [];
        
        // Transformar los datos de la API para que coincidan con la estructura esperada por el frontend
        const activosTransformados = activosData.map(visita => ({
          ...visita,
          // Mapear empleadoVisitado para que coincida con la estructura esperada
          empleadoVisitado: {
            id: visita.personal_visitado_id,
            nombres: visita.personal_nombres || '',
            apellidos: visita.personal_apellidos || ''
          },
          // Mapear motivo para que coincida con la estructura esperada
          motivo: {
            id: visita.motivo_visita_id,
            label: visita.nombre_motivo || ''
          },
          // Mapear lugar para que coincida con la estructura esperada
          lugar: visita.area_destino_id,
          lugarNombre: visita.nombre_area || ''
        }));
        
        
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
    
    // Si no se proporcionan datos de visita, mostrar error
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
              numeroDocumento: visitante.numeroDocumento,
              nombres: visitante.nombres,
              apellidos: visitante.apellidos
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
        limit: historialPagination.itemsPerPage // Usar 10 elementos por página
      };
      
      // Añadir filtros si existen (usar los mismos nombres que en el registro)
      if (filtrosData.busqueda) params.busqueda = filtrosData.busqueda; // Cambiar de 'q' a 'busqueda' para que coincida con el backend
      if (filtrosData.empleadoId) params.personalVisitadoId = filtrosData.empleadoId; // Usar el mismo campo que en el registro
      if (filtrosData.motivoId) params.motivoVisitaId = filtrosData.motivoId; // Usar el mismo campo que en el registro
      if (filtrosData.lugar) params.areaDestinoId = filtrosData.lugar; // Usar el mismo campo que en el registro
      if (filtrosData.fechaDesde) params.fechaDesde = filtrosData.fechaDesde;
      if (filtrosData.fechaHasta) params.fechaHasta = filtrosData.fechaHasta;
      
      const response = await visitasService.getAll(params);
      
      if (response.data.success) {
        const historialData = response.data.data || [];
        
        
        setHistorialVisitas(historialData);
        
        // Actualizar paginación si la respuesta incluye información de paginación
        if (response.data.pagination) {
          setHistorialPagination(prev => ({
            ...prev,
            currentPage: page,
            totalPages: response.data.pagination.totalPages || 1,
            totalItems: response.data.pagination.totalItems || historialData.length
          }));
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
    handleBuscarHistorial(filtros, newPage);
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
        
        {loading && (
          <div className="mx-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <p className="text-sm text-blue-600">Procesando...</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Fixed Height */}
      <div className="flex-1 p-4 mt-4 overflow-y-auto">
        <div className="flex gap-4 min-h-0">
          {/* Columna Izquierda - Tabla (70%) */}
          <div className="w-[70%] overflow-x-auto">
            <VisitantesTabla
              visitantesActivos={visitantesActivos}
              visitantesEnEspera={visitantesEnEspera}
              historialVisitas={historialVisitas}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onBuscarHistorial={handleBuscarHistorial}
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
            {/* Filtro de fechas para historial */}
            {activeTab === 'historial' && (
              <DateRangeFilter
                fechaDesde={filtros.fechaDesde}
                fechaHasta={filtros.fechaHasta}
                onFechaDesdeChange={(fecha) => setFiltros(prev => ({ ...prev, fechaDesde: fecha }))}
                onFechaHastaChange={(fecha) => setFiltros(prev => ({ ...prev, fechaHasta: fecha }))}
                className="mb-4"
              />
            )}
            
            <RegistroForm
              visitantesEnEspera={visitantesEnEspera}
              onAddVisitor={handleAddVisitor}
              onRegisterVisit={handleRegisterVisit}
              onFormChange={handleFormChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
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
    </div>
  );
};

export default DashboardVigilantePage;
