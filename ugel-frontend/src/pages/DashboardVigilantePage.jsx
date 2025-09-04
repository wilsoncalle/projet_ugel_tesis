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
  
  // Log del estado de autenticación
  console.log('Estado de autenticación:', { isAuthenticated, user });
  
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
    fechaHasta: new Date().toISOString().split('T')[0] // Fecha actual por defecto
  });
  const [activeTab, setActiveTab] = useState('activos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para paginación del historial
  const [historialPagination, setHistorialPagination] = useState({
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
      
      console.log('Respuesta completa de visitantes activos:', response);
      
      if (response.data.success) {
        const activosData = response.data.data || [];
        console.log('Número de visitantes activos:', activosData.length);
        
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
        
        // Mostrar estructura completa del primer elemento para depuración
        if (activosTransformados.length > 0) {
          console.log('Estructura completa del primer visitante activo transformado:', JSON.stringify(activosTransformados[0], null, 2));
          console.log('Todas las claves disponibles en el objeto transformado:', Object.keys(activosTransformados[0]));
        }
        
        setVisitantesActivos(activosTransformados);
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
    console.log('=== HANDLE FORM CHANGE ===');
    console.log('formData recibido:', formData);
    console.log('formData.visita:', formData.visita);
    console.log('formData.visita.lugar:', formData.visita?.lugar);
    console.log('formData.visita.lugarId:', formData.visita?.lugarId);
    
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
      
      console.log('=== VISITANTES ACTUALIZADOS ===');
      console.log('visitaData aplicado:', visitaData);
      console.log('Primer visitante actualizado:', visitantesActualizados[0]);
      
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

  const handleRegisterVisit = async () => {
    if (visitantesEnEspera.length === 0) {
      setError('No hay visitantes en espera para registrar');
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
          console.log('=== PROCESANDO VISITANTE ===');
          console.log('Visitante completo:', visitante);
          console.log('lugar (nombre):', visitante.lugar);
          console.log('lugarId (ID):', visitante.lugarId);
          
          // Primero crear o buscar el visitante
          let visitanteId = visitante.id;
          
          // Si el visitante ya existe en la base de datos, usar su ID
          if (visitante.visitanteId) {
            visitanteId = visitante.visitanteId;
            console.log('Usando visitante existente con ID:', visitanteId);
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
            
            console.log('Enviando visitante al backend:', visitantePayload);
            const responseVisitante = await visitantesService.create(visitantePayload);
            
            if (responseVisitante.data.success) {
              visitanteId = responseVisitante.data.data.id;
            } else {
              throw new Error('Error al crear visita');
            }
          }

          // Crear la visita (utilizando la fecha actual en lugar de la fecha de la visita)
          const currentDate = new Date();
          
          console.log('Datos del visitante para crear visita:', visitante);
          console.log('ID del visitante:', visitanteId);
          console.log('Datos del empleado:', visitante.empleado);
          console.log('Datos del motivo:', visitante.motivo);
          console.log('Datos del lugar (nombre):', visitante.lugar);
          console.log('Datos del lugarId (ID):', visitante.lugarId);
          
          // Validar que todos los campos requeridos estén presentes
          if (!visitante.empleado?.id && !visitante.empleadoVisitado?.id) {
            throw new Error(`Falta ID del empleado para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          if (!visitante.motivo?.id) {
            throw new Error(`Falta ID del motivo para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          if (!visitante.lugarId && !visitante.lugar) {
            throw new Error(`Falta lugar para visitante ${visitante.nombres} ${visitante.apellidos}`);
          }
          
          const visitaPayload = {
            visitanteId: parseInt(visitanteId),
            personalVisitadoId: parseInt(visitante.empleado?.id || visitante.empleadoVisitado?.id), // Usar datos del visitante
            motivoVisitaId: parseInt(visitante.motivo?.id), // Usar datos del visitante
            areaDestinoId: parseInt(visitante.lugarId || visitante.lugar), // Usar lugarId si existe, sino lugar como fallback
            usuarioIngresoId: user?.id ? parseInt(user.id) : 1, // ID del usuario autenticado o valor por defecto
            // Usar la fecha y hora actual para evitar problemas con fechas futuras
            fechaIngreso: currentDate.toISOString().split('T')[0],
            horaIngreso: currentDate.toTimeString().substring(0, 8)
          };
          
          console.log('Payload de la visita a enviar:', visitaPayload);
          console.log('areaDestinoId que se enviará:', visitaPayload.areaDestinoId);

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
      
      console.log('Visitas registradas exitosamente:', visitasRegistradas);
      
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
      
      console.log('Enviando parámetros de búsqueda:', params);
      const response = await visitasService.getAll(params);
      
      console.log('Respuesta completa del historial:', response);
      console.log('Datos del historial:', response.data);
      
      if (response.data.success) {
        const historialData = response.data.data || [];
        
        console.log('Número de registros en historial:', historialData.length);
        
        // Mostrar estructura completa del primer elemento para depuración
        if (historialData.length > 0) {
          console.log('Estructura completa del primer elemento del historial:', JSON.stringify(historialData[0], null, 2));
          
          // Mostrar todas las claves disponibles en el objeto
          const primerElemento = historialData[0];
          console.log('Todas las claves disponibles en el objeto:', Object.keys(primerElemento));
          
          // Verificar campos específicos
          console.log('Campos individuales del primer elemento:');
          console.log('- ID:', primerElemento.id);
          
          // Visitante
          console.log('- Visitante (objeto completo):', primerElemento.visitante);
          console.log('- visitante_id:', primerElemento.visitante_id);
          console.log('- visitante_nombres:', primerElemento.visitante_nombres);
          console.log('- visitante_apellidos:', primerElemento.visitante_apellidos);
          console.log('- visitante_numero_documento:', primerElemento.visitante_numero_documento);
          
          // Empleado
          console.log('- empleadoVisitado:', primerElemento.empleadoVisitado);
          console.log('- empleado_visitado:', primerElemento.empleado_visitado);
          console.log('- empleado_visitado_id:', primerElemento.empleado_visitado_id);
          console.log('- empleado_nombres:', primerElemento.empleado_nombres);
          console.log('- empleado_apellidos:', primerElemento.empleado_apellidos);
          console.log('- empleado_nombre_completo:', primerElemento.empleado_nombre_completo);
          
          // Motivo
          console.log('- motivo:', primerElemento.motivo);
          console.log('- motivo_id:', primerElemento.motivo_id);
          console.log('- motivo_nombre:', primerElemento.motivo_nombre);
          console.log('- motivo_visita_nombre:', primerElemento.motivo_visita_nombre);
          
          // Lugar
          console.log('- lugar:', primerElemento.lugar);
          
          // Fechas y horas
          console.log('- fechaIngreso:', primerElemento.fechaIngreso);
          console.log('- fecha_ingreso:', primerElemento.fecha_ingreso);
          console.log('- horaIngreso:', primerElemento.horaIngreso);
          console.log('- hora_ingreso:', primerElemento.hora_ingreso);
          console.log('- horaSalida:', primerElemento.horaSalida);
          console.log('- hora_salida:', primerElemento.hora_salida);
          
          // Mostrar el objeto completo para referencia
          console.log('Objeto completo:', primerElemento);
        }
        
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

  const handleRegistrarSalida = async (visitaId) => {
    try {
      console.log('=== INICIO REGISTRO DE SALIDA ===');
      console.log('Visita ID:', visitaId);
      console.log('Tipo de ID:', typeof visitaId);
      console.log('Usuario autenticado:', user);
      console.log('Estado de autenticación:', isAuthenticated);
      
      setLoading(true);
      setError('');
      
      console.log('Llamando al servicio visitasService.registrarSalida...');
      console.log('URL que se llamará:', `/visitas/${visitaId}/salida`);
      
      const response = await visitasService.registrarSalida(visitaId);
      
      console.log('Respuesta del servicio:', response);
      console.log('Respuesta exitosa:', response.data.success);
      
      if (response.data.success) {
        // Recargar visitantes activos para reflejar el cambio
        console.log('Recargando visitantes activos...');
        await cargarVisitantesActivos();
        console.log('Salida registrada exitosamente para visita:', visitaId);
        console.log('=== FIN REGISTRO DE SALIDA (EXITOSO) ===');
      } else {
        console.error('Error en la respuesta del servicio:', response.data);
        setError('Error al registrar la salida');
        console.log('=== FIN REGISTRO DE SALIDA (ERROR EN RESPUESTA) ===');
      }
    } catch (err) {
      console.error('=== ERROR EN REGISTRO DE SALIDA ===');
      console.error('Error completo:', err);
      console.error('Mensaje del error:', err.message);
      console.error('Respuesta del servidor:', err.response?.data);
      console.error('Estado HTTP:', err.response?.status);
      console.error('Headers de respuesta:', err.response?.headers);
      console.error('=== FIN ERROR ===');
      
      setError(`Error al registrar la salida: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
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
      <div className="flex-1 p-4 min-h-0 mt-4">
        <div className="h-full flex gap-4">
          {/* Columna Izquierda - Tabla (70%) */}
          <div className="w-[70%] h-full">
            <VisitantesTabla
              visitantesActivos={visitantesActivos}
              visitantesEnEspera={visitantesEnEspera}
              historialVisitas={historialVisitas}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onBuscarHistorial={handleBuscarHistorial}
              onRegistrarSalida={handleRegistrarSalida}
              filtros={filtros}
              vistaPreviaVisitante={vistaPreviaVisitante}
              vistaPreviaVisita={vistaPreviaVisita}
              historialPagination={historialPagination}
              onHistorialPageChange={handleHistorialPageChange}
            />
          </div>

          {/* Columna Derecha - Registro (30%) */}
          <div className="w-[30%] h-full pt-0">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardVigilantePage;
