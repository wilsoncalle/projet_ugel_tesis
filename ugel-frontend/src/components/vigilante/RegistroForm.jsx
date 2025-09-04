import { useState, useEffect } from 'react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import Badge from '../Badge';
import { PlusIcon, ClipboardDocumentListIcon, UserGroupIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { tiposDocumentoService, motivosVisitaService, personalService, areasService, visitantesService } from '../../services/api';

const RegistroForm = ({ visitantesEnEspera, onAddVisitor, onRegisterVisit, onFormChange, activeTab = 'activos' }) => {
  // Estados del formulario de visitante
  const [formVisitante, setFormVisitante] = useState({
    tipoDocumentoId: '',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    visitanteId: null
  });

  // Estados del formulario de visita
  const [formVisita, setFormVisita] = useState({
    empleadoId: '',
    motivoId: '',
    lugar: ''
  });

  // Estados para los datos de los selects
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [empleadosFiltrados, setEmpleadosFiltrados] = useState([]);
  const [lugares, setLugares] = useState([]);
  
  // Estados para la búsqueda de visitante
  const [buscandoVisitante, setBuscandoVisitante] = useState(false);
  const [visitanteEncontrado, setVisitanteEncontrado] = useState(null);
  const [mensajeVisitante, setMensajeVisitante] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  // Estados de carga
  const [loadingData, setLoadingData] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);
  
  const cargarDatosIniciales = async () => {
    setLoadingData(true);
    try {
      const [tiposResponse, motivosResponse, empleadosResponse, areasResponse] = await Promise.all([
        tiposDocumentoService.getAll(),
        motivosVisitaService.getAll(),
          personalService.getAll(),
        areasService.getAll()
      ]);

      if (tiposResponse.data.success) {
        const tiposData = tiposResponse.data.data.map(tipo => ({
          value: tipo.id.toString(),
          label: tipo.nombre_completo || tipo.nombre
        }));
        setTiposDocumento(tiposData);
        
        const tipoDNI = tiposData.find(tipo => tipo.label?.toLowerCase().includes('dni'));
        if (tipoDNI && !formVisitante.tipoDocumentoId) {
          setFormVisitante(prev => ({ ...prev, tipoDocumentoId: tipoDNI.value }));
        }
      }

      if (motivosResponse.data.success) {
        setMotivos(motivosResponse.data.data.map(motivo => ({
          value: motivo.id.toString(),
          label: motivo.nombre_motivo || motivo.nombre
        })));
      }

      if (empleadosResponse.data.success) {
        const empleadosData = empleadosResponse.data.data.map(empleado => ({
          value: empleado.id.toString(),
          label: `${empleado.nombres} ${empleado.apellidos}`,
          areaId: empleado.area_id
        }));
        setEmpleados(empleadosData);
        setEmpleadosFiltrados(empleadosData);
      }

      if (areasResponse.data.success) {
        setLugares(areasResponse.data.data.map(area => ({
            value: area.id.toString(),
          label: area.nombre_area || area.nombre
        })));
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtrar empleados por área
  const filtrarEmpleadosPorArea = (areaId) => {
    if (!areaId) {
      setEmpleadosFiltrados(empleados);
    } else {
      const empleadosFiltrados = empleados.filter(empleado => 
        empleado.areaId && empleado.areaId.toString() === areaId
      );
    setEmpleadosFiltrados(empleadosFiltrados);
    }
  };

  // Resetear filtros de empleados
  const resetearFiltros = () => {
    setEmpleadosFiltrados(empleados);
  };

  // Buscar visitante por documento
  const buscarVisitante = async () => {
    if (!formVisitante.tipoDocumentoId || !formVisitante.numeroDocumento) return;

    setBuscandoVisitante(true);
    setMensajeVisitante('');
    setVisitanteEncontrado(null);

    try {
      const response = await visitantesService.buscarPorDocumento(
        formVisitante.tipoDocumentoId,
        formVisitante.numeroDocumento
      );

      if (response.data.success && response.data.data) {
        const visitante = response.data.data;
        setVisitanteEncontrado(visitante);
        setFormVisitante(prev => ({
          ...prev,
          nombres: visitante.nombres || '',
          apellidos: visitante.apellidos || '',
          visitanteId: visitante.id
        }));
        setMensajeVisitante('Visitante encontrado en el sistema');
        setTipoMensaje('success');
      } else {
        setMensajeVisitante('Visitante no encontrado. Complete los datos para registrar uno nuevo.');
        setTipoMensaje('info');
        setFormVisitante(prev => ({
          ...prev,
          visitanteId: null
        }));
      }
    } catch (error) {
      console.error('Error al buscar visitante:', error);
      setMensajeVisitante('Error al buscar visitante. Intente nuevamente.');
      setTipoMensaje('error');
    } finally {
      setBuscandoVisitante(false);
    }
  };

  // Manejar cambios en el formulario de visitante
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
      onFormChange({
        visitante: newFormVisitante,
        visita: formVisita
      });
    }
  };

  // Manejar cambios en el formulario de visita
  const handleVisitaChange = (field, value) => {
    const newFormVisita = {
      ...formVisita,
      [field]: value
    };
    setFormVisita(newFormVisita);
    
      // Si se selecciona un lugar, filtrar los empleados
    if (field === 'lugar') {
      filtrarEmpleadosPorArea(value);
    }
    
    // Enviar datos actualizados en tiempo real al componente padre
    if (onFormChange) {
      onFormChange({
        visitante: formVisitante,
        visita: newFormVisita
      });
    }
  };

  // Agregar visitante
  const handleAddVisitor = () => {
    if (!isVisitanteFormValid) return;

    const visitanteData = {
      tipoDocumentoId: formVisitante.tipoDocumentoId,
      numeroDocumento: formVisitante.numeroDocumento,
      nombres: formVisitante.nombres,
      apellidos: formVisitante.apellidos,
      visitanteId: formVisitante.visitanteId,
      tipoDocumento: tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId)
    };

    onAddVisitor(visitanteData);
    
    // Limpiar solo el formulario de visitante y la búsqueda
    setFormVisitante({
      tipoDocumentoId: '',
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      visitanteId: null
    });
    limpiarBusqueda();
  };

  // Registrar visita
  const handleRegisterVisit = () => {
    if (!isVisitaFormValid || visitantesEnEspera.length === 0) return;
    
    const visitaData = {
      empleadoId: formVisita.empleadoId,
      motivoId: formVisita.motivoId,
      lugar: formVisita.lugar,
      empleado: empleados.find(emp => emp.value === formVisita.empleadoId),
      motivo: motivos.find(mot => mot.value === formVisita.motivoId),
      lugarId: formVisita.lugar
    };

    onRegisterVisit(visitaData);
    
    // Limpiar todo el formulario
    setFormVisita({
      empleadoId: '',
      motivoId: '',
      lugar: ''
    });
    resetearFiltros();

    if (onFormChange) {
      onFormChange({
        visitante: formVisitante,
        visita: {
          empleadoId: '',
          motivoId: '',
          lugar: ''
        }
      });
    }
  };

  // Función para limpiar mensajes y estado de búsqueda
  const limpiarBusqueda = () => {
    setMensajeVisitante('');
    setTipoMensaje('');
    setVisitanteEncontrado(null);
  };

  const handleLimpiarVisitante = () => {
    // Buscar DNI en los tipos disponibles o usar el primer tipo
    let tipoPorDefecto = '1'; // Fallback
    if (tiposDocumento.length > 0) {
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label && (
        tipo.label.toLowerCase().includes('dni') || 
          tipo.label.toLowerCase().includes('nacional')
        )
      );
      tipoPorDefecto = tipoDNI ? tipoDNI.value : tiposDocumento[0].value;
    }
    
    const newFormVisitante = {
      tipoDocumentoId: tipoPorDefecto,
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

  const isVisitanteFormValid = activeTab === 'activos' 
    ? (formVisitante.numeroDocumento && formVisitante.nombres && formVisitante.apellidos)
    : true; // En historial siempre es válido (puede estar en "Todos")

  const isVisitaFormValid = activeTab === 'activos'
    ? (formVisita.empleadoId && formVisita.motivoId && formVisita.lugar)
    : true; // En historial siempre es válido (puede estar en "Todos")

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Card
        className="shadow-lg border border-gray-200 bg-white flex flex flex-col overflow-hidden rounded-2xl"
      >
        <div className="p-0 flex-1 flex flex-col overflow-hidden">
          {/* Sección de Datos del Visitante */}
          <div className="flex-shrink-0 space-y-3 border border-gray-200 rounded-xl pb-3 mb-3 p-3">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              {activeTab === 'activos' ? 'Datos del Visitante' : 'Buscar Visitante'}
            </h3>
            
            {activeTab === 'activos' ? (
              <>
          <div className="grid grid-cols-2 gap-3">
                  <div>
            <Select
              label="Tipo de Documento *"
              value={formVisitante.tipoDocumentoId}
              onChange={(e) => handleVisitanteChange('tipoDocumentoId', e.target.value)}
              options={tiposDocumento}
                      placeholder="Seleccione tipo de documento..."
              isLoading={loadingData}
            />
                  </div>
            <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                Número de Documento *
              </label>
              <div className="flex">
                <Input
                  value={formVisitante.numeroDocumento}
                  onChange={(e) => handleVisitanteChange('numeroDocumento', e.target.value)}
                        placeholder=""
                  maxLength="12"
                  className="rounded-r-none border-r-0"
                        style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0' }}
                />
                <Button
                  onClick={buscarVisitante}
                  disabled={!formVisitante.tipoDocumentoId || !formVisitante.numeroDocumento || buscandoVisitante}
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombres *"
              value={formVisitante.nombres}
              onChange={(e) => handleVisitanteChange('nombres', e.target.value)}
                    placeholder=""
            />
            <Input
              label="Apellidos *"
              value={formVisitante.apellidos}
              onChange={(e) => handleVisitanteChange('apellidos', e.target.value)}
                    placeholder=""
                  />
                </div>
              </>
            ) : (
              /* Campo de búsqueda para historial */
              <div>
                <Input
                  label="Buscar por nombres o número de documento"
                  value={formVisitante.numeroDocumento}
                  onChange={(e) => handleVisitanteChange('numeroDocumento', e.target.value)}
                  placeholder="Ingrese nombre, apellido o documento..."
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
            />
          </div>
            )}

          {/* Mensaje de estado de la búsqueda */}
          {mensajeVisitante && (
              <div className={`p-2 rounded-lg border text-xs ${
              tipoMensaje === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
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

            <div className="flex gap-2">
            <Button
                onClick={activeTab === 'activos' ? handleAddVisitor : () => console.log('Buscar visitante')}
              disabled={!isVisitanteFormValid}
                leftIcon={activeTab === 'activos' ? <PlusIcon className="h-4 w-4" /> : <MagnifyingGlassIcon className="h-4 w-4" />}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                size="sm"
              >
                {activeTab === 'activos' ? 'Agregar Visitante' : 'Buscar Visitante'}
            </Button>
            <Button
              variant="outline"
              onClick={handleLimpiarVisitante}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
                size="sm"
            >
                <XMarkIcon className="h-4 w-4" />
            </Button>
            </div>
          </div>

          {/* Lista de Visitantes en Espera */}
          {visitantesEnEspera.length > 0 && (
            <div className="flex-shrink-0 border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-800">
                  Visitantes en Espera
                </h3>
                <Badge variant="warning">
                  {visitantesEnEspera.length}
                </Badge>
              </div>
              <div className="space-y-2 max-h-20 overflow-y-auto">
                {visitantesEnEspera.map((visitante, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-xs">
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
          <div className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl p-3">
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              {activeTab === 'activos' ? 'Datos de la Visita' : 'Buscar Visita'}
            </h3>
            
            {activeTab === 'activos' ? (
              <div className="space-y-4 flex-1">
            <Select
              label="Empleado a Visitar *"
              value={formVisita.empleadoId}
              onChange={(e) => handleVisitaChange('empleadoId', e.target.value)}
              options={empleadosFiltrados}
                  placeholder="Seleccione empleado..."
                  isSearchable={true}
                  searchPlaceholder="Buscar empleado..."
              isLoading={loadingData}
            />

                <div className="grid grid-cols-2 gap-3">
              <Select
                label="Motivo de Visita *"
                value={formVisita.motivoId}
                onChange={(e) => handleVisitaChange('motivoId', e.target.value)}
                options={motivos}
                    placeholder="Seleccione motivo..."
                isLoading={loadingData}
              />
              <Select
                label="Lugar *"
                value={formVisita.lugar}
                onChange={(e) => handleVisitaChange('lugar', e.target.value)}
                options={lugares}
                    placeholder="Seleccione lugar..."
                  />
                </div>
              </div>
            ) : (
              /* Campos de búsqueda para historial */
              <div className="space-y-4 flex-1">
                <Select
                  label="Buscar por Empleado"
                  value={formVisita.empleadoId}
                  onChange={(e) => handleVisitaChange('empleadoId', e.target.value)}
                  options={[{ value: '', label: 'Todos los empleados' }, ...empleadosFiltrados]}
                  placeholder="Seleccione empleado..."
                  isSearchable={true}
                  searchPlaceholder="Buscar empleado..."
                />

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Buscar por Motivo"
                    value={formVisita.motivoId}
                    onChange={(e) => handleVisitaChange('motivoId', e.target.value)}
                    options={[{ value: '', label: 'Todos los motivos' }, ...motivos]}
                    placeholder="Seleccione motivo..."
                    isSearchable={true}
                    searchPlaceholder="Buscar motivo..."
                  />
                  <Select
                    label="Buscar por Lugar"
                    value={formVisita.lugar}
                    onChange={(e) => handleVisitaChange('lugar', e.target.value)}
                    options={[{ value: '', label: 'Todos los lugares' }, ...lugares]}
                    placeholder="Seleccione lugar..."
                    isSearchable={true}
                    searchPlaceholder="Buscar lugar..."
                  />
                </div>
              </div>
            )}
            </div>
            
                    {/* Botones de registro y limpieza */}
          <div className="flex-shrink-0 mt-2 pt-2">
            <div className="flex gap-3">
              <Button
                onClick={activeTab === 'activos' ? handleRegisterVisit : () => console.log('Buscar visita')}
                disabled={!isVisitaFormValid}
                variant="primary"
                size="lg"
                leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {activeTab === 'activos' ? 'Registrar Visita Completa' : 'Buscar Visita'}
                {activeTab === 'activos' && visitantesEnEspera.length > 0 && (
                  <Badge variant="primary" className="ml-3 bg-white text-blue-600">
                    {visitantesEnEspera.length}
                  </Badge>
                )}
              </Button>
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
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
                size="lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RegistroForm;