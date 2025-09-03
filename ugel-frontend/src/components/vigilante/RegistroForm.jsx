import { useState, useEffect } from 'react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import Badge from '../Badge';
import { PlusIcon, ClipboardDocumentListIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { tiposDocumentoService, motivosVisitaService, personalService, areasService, visitantesService } from '../../services/api';

const RegistroForm = ({ visitantesEnEspera, onAddVisitor, onRegisterVisit, onFormChange }) => {
  // Estados del formulario de visitante
  const [formVisitante, setFormVisitante] = useState({
    tipoDocumentoId: '1', // DNI por defecto (ID 1)
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    visitanteId: null // ID del visitante si ya existe en la base de datos
  });

  // Estados del formulario de visita
  const [formVisita, setFormVisita] = useState({
    empleadoId: '',
    motivoId: '',
    lugar: ''
  });

  // Estados para datos de los selects
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [lugaresOriginales, setLugaresOriginales] = useState([]);
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState([]);
  const [empleadosOriginales, setEmpleadosOriginales] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Estados para búsqueda y validación de visitantes
  const [buscandoVisitante, setBuscandoVisitante] = useState(false);
  const [visitanteEncontrado, setVisitanteEncontrado] = useState(null);
  const [mensajeVisitante, setMensajeVisitante] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState(''); // 'success', 'warning', 'error'

  // Cargar datos de las APIs al montar el componente
  useEffect(() => {
    cargarDatosFormulario();
  }, []);

  const cargarDatosFormulario = async () => {
    try {
      setLoadingData(true);
      
      // Valores iniciales vacíos hasta que se carguen los datos reales
      setTiposDocumento([]);
      setMotivos([]);
      setEmpleados([]);
      setLugares([]);
      
      // Intentar cargar datos reales del backend
      try {
        const [tiposDoc, motivosResp, personalResp, areasResp] = await Promise.all([
          tiposDocumentoService.getAll({ activo: true }),
          motivosVisitaService.getAll({ activo: true }),
          personalService.getAll(),
          areasService.getAll({ activo: true })
        ]);

      console.log('Datos recibidos:', { tiposDoc, motivosResp, personalResp, areasResp });
      
      // Inspeccionar estructura completa de los datos
      if (tiposDoc.data && tiposDoc.data.data) {
        console.log('Estructura de tiposDoc.data.data[0]:', tiposDoc.data.data[0]);
      }
      
      if (motivosResp.data && motivosResp.data.data) {
        console.log('Estructura de motivosResp.data.data[0]:', motivosResp.data.data[0]);
      }

        // Transformar tipos de documento
        if (tiposDoc.data && tiposDoc.data.success && tiposDoc.data.data && tiposDoc.data.data.length > 0) {
          const tiposFormateados = tiposDoc.data.data.map(tipo => {
            return {
              value: tipo.id.toString(),
              label: tipo.nombre_completo
            };
          });
          console.log('Tipos de documento formateados:', tiposFormateados);
          setTiposDocumento(tiposFormateados);
        }

        // Transformar motivos
        if (motivosResp.data && motivosResp.data.success && motivosResp.data.data && motivosResp.data.data.length > 0) {
          const motivosFormateados = motivosResp.data.data.map(motivo => {
            return {
              value: motivo.id.toString(),
              label: motivo.nombre_motivo
            };
          });
          console.log('Motivos formateados:', motivosFormateados);
          setMotivos(motivosFormateados);
        }

        // Transformar personal (empleados)
        if (personalResp.data && personalResp.data.success && personalResp.data.data && personalResp.data.data.length > 0) {
          console.log('Datos originales del personal:', personalResp.data.data[0]);
          
          const empleadosFormateados = personalResp.data.data.map(emp => ({
            value: emp.id.toString(),
            label: `${emp.nombres} ${emp.apellidos}`,
            areaId: emp.area_destino_id, // Campo correcto del backend
            areaNombre: emp.area_nombre || 'Sin área' // Campo correcto del backend
          }));
          
          console.log('Empleados formateados:', empleadosFormateados);
          setEmpleados(empleadosFormateados);
          setEmpleadosOriginales(personalResp.data.data);
          setEmpleadosFiltrados(empleadosFormateados);
        }
        
        // Transformar áreas (lugares)
        if (areasResp.data && areasResp.data.success && areasResp.data.data && areasResp.data.data.length > 0) {
          console.log('Datos originales de áreas:', areasResp.data.data[0]);
          
          const areasFormateadas = areasResp.data.data.map(area => ({
            value: area.id.toString(),
            label: area.nombre_area // Campo correcto del backend
          }));
          
          console.log('Áreas formateadas:', areasFormateadas);
          setLugares(areasFormateadas);
          setLugaresOriginales(areasFormateadas);
        }
      } catch (error) {
        console.error('Error al cargar datos del backend:', error);
      }
    } catch (error) {
      console.error('Error al cargar datos del formulario:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Función para filtrar empleados por área
  const filtrarEmpleadosPorArea = (areaId) => {
    console.log('Filtrando empleados por área:', areaId);
    console.log('Empleados disponibles:', empleados);
    
    if (!areaId) {
      console.log('Restaurando empleados originales en filtrarEmpleadosPorArea');
      setEmpleadosFiltrados(empleados);
      return;
    }
    
    // Mostrar cada empleado y su área para depuración
    empleados.forEach(emp => {
      console.log(`Empleado ${emp.label}: areaId=${emp.areaId} (tipo: ${typeof emp.areaId})`);
    });
    
    const empleadosFiltrados = empleados.filter(emp => {
      const match = parseInt(emp.areaId) === parseInt(areaId);
      console.log(`Comparando: ${emp.areaId} === ${areaId} = ${match}`);
      return match;
    });
    
    console.log('Empleados filtrados:', empleadosFiltrados);
    setEmpleadosFiltrados(empleadosFiltrados);
    
    // Si solo hay un empleado en el área seleccionada, seleccionarlo automáticamente
    if (empleadosFiltrados.length === 1 && !formVisita.empleadoId) {
      const empleadoUnico = empleadosFiltrados[0];
      console.log('Seleccionando automáticamente empleado único:', empleadoUnico);
      setFormVisita(prev => ({
        ...prev,
        empleadoId: empleadoUnico.value
      }));
    }
  };

  // Función para filtrar áreas por empleado
  const filtrarAreasPorEmpleado = (empleadoId) => {
    console.log('Filtrando áreas por empleado:', empleadoId);
    console.log('Empleado encontrado:', empleados.find(emp => emp.value === empleadoId));
    
    if (!empleadoId) {
      // Restaurar todas las áreas originales
      if (lugaresOriginales.length > 0) {
        console.log('Restaurando áreas originales en filtrarAreasPorEmpleado');
        setLugares(lugaresOriginales);
      }
      return;
    }
    
    const empleado = empleados.find(emp => emp.value === empleadoId);
    console.log('Empleado para filtrar:', empleado);
    
    // No modificar el estado de lugares, solo filtrar para mostrar
    // Esto evita que se pierda la selección del lugar
  };

  const handleVisitanteChange = (field, value) => {
    const newFormVisitante = {
      ...formVisitante,
      [field]: value
    };
    setFormVisitante(newFormVisitante);
    
    // Limpiar búsqueda cuando cambie tipo de documento o número de documento
    if (field === 'tipoDocumentoId' || field === 'numeroDocumento') {
      limpiarBusqueda();
    }
    
    // Enviar datos actualizados en tiempo real al componente padre
    if (onFormChange) {
      const tipoDocumento = tiposDocumento.find(t => t.value === newFormVisitante.tipoDocumentoId);
      onFormChange({
        visitante: {
          ...newFormVisitante,
          tipoDocumento: tipoDocumento ? { 
            id: newFormVisitante.tipoDocumentoId,
            nombre: tipoDocumento.label 
          } : null
        },
        visita: formVisita
      });
    }
  };

  const handleVisitaChange = (field, value) => {
    const newFormVisita = {
      ...formVisita,
      [field]: value
    };
    setFormVisita(newFormVisita);
    
    // Aplicar filtros dinámicos
    if (field === 'empleadoId') {
      // Si se selecciona un empleado, filtrar las áreas y seleccionar automáticamente el lugar
      filtrarAreasPorEmpleado(value);
      
      // Seleccionar automáticamente el lugar del empleado
      if (value) {
        const empleado = empleados.find(emp => emp.value === value);
        if (empleado && empleado.areaId) {
          newFormVisita.lugar = empleado.areaId.toString();
        }
      }
    } else if (field === 'lugar') {
      // Si se selecciona un lugar, filtrar los empleados
      filtrarEmpleadosPorArea(value);
      // NO limpiar la selección del empleado para mantener la coherencia
    }
    
    // Enviar datos actualizados en tiempo real al componente padre
    if (onFormChange) {
      const empleado = empleados.find(e => e.value === newFormVisita.empleadoId);
      const motivo = motivos.find(m => m.value === newFormVisita.motivoId);
      const lugarSeleccionado = lugares.find(l => l.value === newFormVisita.lugar);
      
      onFormChange({
        visitante: {
          ...formVisitante,
          tipoDocumento: tiposDocumento.find(t => t.value === formVisitante.tipoDocumentoId)
        },
        visita: {
          ...newFormVisita,
          empleado: empleado ? {
            id: newFormVisita.empleadoId,
            label: empleado.label,
            nombres: empleado.label ? empleado.label.split(' ')[0] : '',
            apellidos: empleado.label ? empleado.label.split(' ').slice(1).join(' ') : ''
          } : null,
          motivo: motivo ? {
            id: newFormVisita.motivoId,
            label: motivo.label
          } : null,
          lugar: newFormVisita.lugar, // Enviar el ID del área, no el nombre
          lugarNombre: lugarSeleccionado ? lugarSeleccionado.label : '' // Enviar el nombre para mostrar
        }
      });
    }
  };

  const handleAddVisitor = () => {
    if (!formVisitante.numeroDocumento || !formVisitante.nombres || !formVisitante.apellidos || !formVisitante.tipoDocumentoId) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    // Verificar si el visitante ya tiene una visita activa
    const visitaActiva = visitantesEnEspera.find(v => 
      v.numeroDocumento === formVisitante.numeroDocumento && 
      v.tipoDocumentoId === formVisitante.tipoDocumentoId
    );

    if (visitaActiva) {
      alert('Este visitante ya tiene una visita activa. Debe registrar su salida antes de una nueva entrada.');
      return;
    }

    // Crear un objeto visitante con exactamente la estructura que espera el backend
    const visitanteData = {
      ...formVisitante,
      tipoDocumentoId: 1, // DNI por defecto
      tipoDocumento: { 
        id: 1,
        nombre: 'DNI' 
      }
    };

    onAddVisitor(visitanteData);
    
    // Limpiar solo el formulario de visitante y la búsqueda
    setFormVisitante({
      tipoDocumentoId: '1', // Mantener DNI por defecto
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      visitanteId: null
    });
    limpiarBusqueda();
  };

  const handleRegisterVisit = () => {
    if (visitantesEnEspera.length === 0) {
      alert('No hay visitantes en espera para registrar');
      return;
    }

    if (!formVisita.empleadoId || !formVisita.motivoId || !formVisita.lugar) {
      alert('Por favor complete todos los datos de la visita');
      return;
    }

    const empleado = empleados.find(e => e.value === formVisita.empleadoId);
    const motivo = motivos.find(m => m.value === formVisita.motivoId);

    if (!empleado || !motivo) {
      alert('Error: No se encontraron los datos seleccionados');
      return;
    }

    const nombreCompleto = empleado.label.split(' - ')[0];
    const partesNombre = nombreCompleto.split(' ');
    
    const lugarSeleccionado = lugares.find(l => l.value === formVisita.lugar);
    
    const visitaData = {
      empleado: {
        id: formVisita.empleadoId,
        nombres: partesNombre[0] || '',
        apellidos: partesNombre.slice(1).join(' ') || ''
      },
      motivo: {
        id: formVisita.motivoId,
        nombre: motivo.label
      },
      lugar: formVisita.lugar, // Guardar el ID del área, no el nombre
      lugarNombre: lugarSeleccionado ? lugarSeleccionado.label : '' // Guardar el nombre para mostrar
    };

    onRegisterVisit(visitaData);
    
    // Limpiar todo el formulario
    setFormVisita({
      empleadoId: '',
      motivoId: '',
      lugar: ''
    });
  };

  const resetearFiltros = () => {
    console.log('Reseteando filtros...');
    setEmpleadosFiltrados(empleados);
    
    // Restaurar todas las áreas originales
    if (lugaresOriginales.length > 0) {
      console.log('Restaurando áreas originales:', lugaresOriginales);
      setLugares(lugaresOriginales);
    }
  };

  // Función para buscar visitante por documento
  const buscarVisitante = async () => {
    if (!formVisitante.numeroDocumento) {
      setMensajeVisitante('Ingrese número de documento');
      setTipoMensaje('warning');
      return;
    }

    try {
      setBuscandoVisitante(true);
      setMensajeVisitante('');
      setVisitanteEncontrado(null);

      const response = await visitantesService.getByDocumento(
        1, // DNI por defecto
        formVisitante.numeroDocumento
      );

              if (response.data.success && response.data.data) {
          const visitante = response.data.data;
          setVisitanteEncontrado(visitante);
          
          // Auto-completar nombres y apellidos, y guardar el ID del visitante
          setFormVisitante(prev => ({
            ...prev,
            nombres: visitante.nombres,
            apellidos: visitante.apellidos,
            visitanteId: visitante.id // Guardar el ID del visitante existente
          }));

        // Verificar si el visitante ya tiene una visita activa (sin salida)
        const visitaActiva = visitantesEnEspera.find(v => 
          v.numeroDocumento === formVisitante.numeroDocumento && 
          v.tipoDocumentoId === formVisitante.tipoDocumentoId
        );

        if (visitaActiva) {
          setMensajeVisitante('Este visitante ya tiene una visita activa. Debe registrar su salida antes de una nueva entrada.');
          setTipoMensaje('warning');
        } else {
          setMensajeVisitante('Visitante encontrado. Los datos se han completado automáticamente.');
          setTipoMensaje('success');
        }
      } else {
        setMensajeVisitante('Visitante no encontrado. Puede proceder con el registro como nuevo visitante.');
        setTipoMensaje('info');
      }
    } catch (error) {
      console.error('Error buscando visitante:', error);
      if (error.response?.status === 404) {
        setMensajeVisitante('Visitante no encontrado. Puede proceder con el registro como nuevo visitante.');
        setTipoMensaje('info');
      } else {
        setMensajeVisitante('Error al buscar visitante. Intente nuevamente.');
        setTipoMensaje('error');
      }
    } finally {
      setBuscandoVisitante(false);
    }
  };

  // Función para limpiar mensajes y estado de búsqueda
  const limpiarBusqueda = () => {
    setMensajeVisitante('');
    setTipoMensaje('');
    setVisitanteEncontrado(null);
  };

  const handleLimpiarVisitante = () => {
    const newFormVisitante = {
      tipoDocumentoId: '1', // Mantener DNI por defecto
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      visitanteId: null
    };
    
    setFormVisitante(newFormVisitante);
    limpiarBusqueda(); // Limpiar estado de búsqueda
    
    // Notificar al componente padre que se ha limpiado el formulario
    if (onFormChange) {
      onFormChange({
        visitante: newFormVisitante,
        visita: formVisita
      });
    }
  };

  const isVisitanteFormValid = formVisitante.numeroDocumento && formVisitante.nombres && formVisitante.apellidos;
  const isVisitaFormValid = formVisita.empleadoId && formVisita.motivoId && formVisita.lugar;

  return (
    <div className="h-full flex flex-col">
      {/* Formulario Unificado de Visitante y Visita */}
      <Card
        className="shadow-lg border-0 bg-white/90 backdrop-blur-sm flex-1"
        title={
          <div className="flex items-center space-x-2 text-gray-800">
            <UserGroupIcon className="h-5 w-5 text-primary-600" />
            <span className="font-semibold">Registro de Visitas</span>
          </div>
        }
      >
        <div className="space-y-2 h-full flex flex-col">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Documento *
            </label>
            <div className="flex">
              <Input
                value={formVisitante.numeroDocumento}
                onChange={(e) => handleVisitanteChange('numeroDocumento', e.target.value)}
                placeholder="Ej: 12345678"
                maxLength="12"
                className="rounded-r-none border-r-0"
              />
              <Button
                onClick={buscarVisitante}
                disabled={!formVisitante.numeroDocumento || buscandoVisitante}
                className="rounded-l-none border-l-0 bg-blue-600 hover:bg-blue-700 text-white px-3"
                size="sm"
              >
                {buscandoVisitante ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <MagnifyingGlassIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombres *"
              value={formVisitante.nombres}
              onChange={(e) => handleVisitanteChange('nombres', e.target.value)}
              placeholder="Nombres del visitante"
            />
            <Input
              label="Apellidos *"
              value={formVisitante.apellidos}
              onChange={(e) => handleVisitanteChange('apellidos', e.target.value)}
              placeholder="Apellidos del visitante"
            />
          </div>

          {/* Mensaje de estado de la búsqueda */}
          {mensajeVisitante && (
            <div className={`p-3 rounded-lg border ${
              tipoMensaje === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              tipoMensaje === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              tipoMensaje === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{mensajeVisitante}</span>
                <Button
                  variant="ghost"
                  onClick={limpiarBusqueda}
                  className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6"
                  size="sm"
                >
                  ×
                </Button>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={handleAddVisitor}
              disabled={!isVisitanteFormValid}
              leftIcon={<PlusIcon className="h-4 w-4" />}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              size="md"
            >
              Agregar Visitante
            </Button>
            <Button
              variant="outline"
              onClick={handleLimpiarVisitante}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
              size="md"
            >
              Limpiar
            </Button>
          </div>

          {/* Lista de Visitantes en Espera */}
          {visitantesEnEspera.length > 0 && (
            <div className="mt-1 border-t border-b border-gray-200 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center space-x-2 text-amber-800">
                  <ClipboardDocumentListIcon className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-sm">Visitantes en Espera</span>
                </span>
                <Badge variant="warning">
                  {visitantesEnEspera.length}
                </Badge>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {visitantesEnEspera.map((visitante, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-1.5 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {visitante.nombres} {visitante.apellidos}
                      </p>
                      <p className="text-xs text-gray-500">
                        {visitante.tipoDocumento?.nombre || 'DNI'}: {visitante.numeroDocumento}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección de datos de la visita */}
          <div className="mt-1">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Datos de la Visita</h3>
            
            <Select
              label="Empleado a Visitar *"
              value={formVisita.empleadoId}
              onChange={(e) => handleVisitaChange('empleadoId', e.target.value)}
              options={empleadosFiltrados}
              placeholder="Buscar empleado..."
              isLoading={loadingData}
            />

            <div className="grid grid-cols-2 gap-3 mt-2">
              <Select
                label="Motivo de Visita *"
                value={formVisita.motivoId}
                onChange={(e) => handleVisitaChange('motivoId', e.target.value)}
                options={motivos}
                placeholder="Seleccionar motivo"
                isLoading={loadingData}
              />
              <Select
                label="Lugar *"
                value={formVisita.lugar}
                onChange={(e) => handleVisitaChange('lugar', e.target.value)}
                options={lugares}
                placeholder="Seleccionar lugar"
              />
            </div>
            
            <div className="flex justify-end mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFormVisita({
                    empleadoId: '',
                    motivoId: '',
                    lugar: ''
                  });
                  resetearFiltros();
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                size="sm"
              >
                Limpiar Formulario
              </Button>
            </div>
          </div>

          <div className="flex-grow"></div>

          <Button
            onClick={handleRegisterVisit}
            disabled={!isVisitaFormValid || visitantesEnEspera.length === 0}
            variant="primary"
            size="lg"
            isFullWidth
            leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all duration-200 mt-2"
          >
            Registrar Visita Completa
            {visitantesEnEspera.length > 0 && (
              <Badge variant="primary" className="ml-3 bg-white text-indigo-600">
                {visitantesEnEspera.length}
              </Badge>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RegistroForm;