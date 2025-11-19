import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import SelectCustom from '../SelectCustom';
import Badge from '../Badge';
import { PlusIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { tiposDocumentoService, cargosService, areasService, personalService } from '../../services/api';
import api from '../../services/api';

const RegistroPersonalForm = forwardRef(({ 
  personalEnEspera, 
  onAddPersonal, 
  onRegisterAlta, 
  onFormChange, 
  activeTab = 'activos', 
  onTabChange, 
  onBuscarHistorial, 
  refs = {} 
}, ref) => {
  // Estados del formulario de personal (compartido entre tabs)
  const [formPersonal, setFormPersonal] = useState({
    tipoDocumentoId: '',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    personalId: null
  });

  // Estados del formulario de alta para ACTIVOS
  const [formAltaActivos, setFormAltaActivos] = useState({
    cargoId: '',
    areaId: '',
    tipoContratoId: '',
    _tab: 'activos'
  });

  // Estados del formulario de búsqueda para HISTORIAL
  const [formBusquedaHistorial, setFormBusquedaHistorial] = useState({
    cargoId: '',
    areaId: '',
    activo: '',
    busqueda: '',
    _tab: 'historial'
  });

  // Estados para los datos de los selects
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [tiposContrato, setTiposContrato] = useState([]);
  
  // Estados para la búsqueda de personal
  const [buscandoPersonal, setBuscandoPersonal] = useState(false);
  const [personalEncontrado, setPersonalEncontrado] = useState(null);
  const [mensajePersonal, setMensajePersonal] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [documentoYaBuscado, setDocumentoYaBuscado] = useState('');

  // Estados de carga
  const [loadingData, setLoadingData] = useState(false);

  // Referencias para atajos de teclado
  const { documentoInput, busquedaInput } = refs;

  // Exponer métodos al componente padre
  useImperativeHandle(ref, () => ({
    getCurrentFormData: () => {
      if (activeTab === 'activos') {
        return {
          cargoId: formAltaActivos.cargoId,
          areaId: formAltaActivos.areaId,
          tipoContratoId: formAltaActivos.tipoContratoId
        };
      } else {
        return {
          cargoId: formBusquedaHistorial.cargoId,
          areaId: formBusquedaHistorial.areaId,
          activo: formBusquedaHistorial.activo,
          busqueda: formBusquedaHistorial.busqueda
        };
      }
    },
    triggerRegisterAlta: () => {
      if (activeTab === 'activos') {
        handleRegisterAlta();
      } else {
        handleBuscarHistorial();
      }
    }
  }));

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Búsqueda automática cuando se complete el número de documento
  useEffect(() => {
    const documentoActual = `${formPersonal.tipoDocumentoId}-${formPersonal.numeroDocumento}`;
    
    if (formPersonal.tipoDocumentoId && 
        formPersonal.numeroDocumento && 
        formPersonal.numeroDocumento.length >= 8 &&
        !buscandoPersonal &&
        documentoActual !== documentoYaBuscado) {
      const timeoutId = setTimeout(() => {
        buscarPersonal();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [formPersonal.tipoDocumentoId, formPersonal.numeroDocumento, buscandoPersonal, documentoYaBuscado]);

  const cargarDatosIniciales = async () => {
    setLoadingData(true);
    try {
      const [tiposResponse, cargosResponse, areasResponse, tiposContratoResponse] = await Promise.all([
        tiposDocumentoService.getAll(),
        cargosService.getAll({ activo: true }),
        areasService.getAll({ activo: true }),
        api.get('/tipos-contrato')
      ]);

      // Tipos de documento
      if (tiposResponse.data.success) {
        const tiposData = tiposResponse.data.data.map(tipo => ({
          value: tipo.id.toString(),
          label: tipo.nombre_completo || tipo.nombre,
          codigo: tipo.codigo
        }));
        setTiposDocumento(tiposData);
        
        // Seleccionar DNI por defecto
        const tipoDNI = tiposData.find(tipo => 
          tipo.label?.toLowerCase().includes('dni')
        );
        if (tipoDNI && !formPersonal.tipoDocumentoId) {
          setFormPersonal(prev => ({ ...prev, tipoDocumentoId: tipoDNI.value }));
        }
      }

      // Cargos
      if (cargosResponse.data.success) {
        const cargosData = cargosResponse.data.data.map(cargo => ({
          value: cargo.id.toString(),
          label: cargo.nombre_cargo,
          areaId: cargo.area_destino_id
        }));
        setCargos(cargosData);
      }

      // Áreas
      if (areasResponse.data.success) {
        const areasData = areasResponse.data.data.map(area => ({
          value: area.id.toString(),
          label: area.nombre_area
        }));
        setAreas(areasData);
      }

      // Tipos de contrato
      if (tiposContratoResponse.data.success) {
        const tiposContratoData = tiposContratoResponse.data.data.map(tipo => ({
          value: tipo.id.toString(),
          label: tipo.nombre_tipo
        }));
        setTiposContrato(tiposContratoData);
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Buscar personal por documento
  const buscarPersonal = async () => {
    if (!formPersonal.tipoDocumentoId || !formPersonal.numeroDocumento) {
      return;
    }

    const documentoActual = `${formPersonal.tipoDocumentoId}-${formPersonal.numeroDocumento}`;
    
    setBuscandoPersonal(true);
    setMensajePersonal('');
    setPersonalEncontrado(null);

    try {
      // PRIMERO: Búsqueda local en base de datos
      const tipoDoc = tiposDocumento.find(t => t.value === formPersonal.tipoDocumentoId);
      const response = await personalService.getByDocumento(
        tipoDoc?.codigo || tipoDoc?.label || 'DNI',
        formPersonal.numeroDocumento
      );

      if (response.data.success && response.data.data) {
        const personal = response.data.data;
        
        // Verificar si el personal ya está en la lista de espera
        const yaEnEspera = personalEnEspera.find(p => 
          p.tipoDocumentoId === formPersonal.tipoDocumentoId && 
          p.numeroDocumento === formPersonal.numeroDocumento
        );
        
        if (yaEnEspera) {
          setMensajePersonal('Esta persona ya está en la lista de espera');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        // Verificar si el personal ya está activo
        if (personal.activo) {
          setMensajePersonal('Esta persona ya está registrada como personal activo');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        setPersonalEncontrado(personal);
        setFormPersonal(prev => ({
          ...prev,
          nombres: personal.nombres || '',
          apellidos: personal.apellidos || '',
          personalId: personal.id
        }));
        setMensajePersonal('');
        setTipoMensaje('');
        setDocumentoYaBuscado(documentoActual);
        
        // AUTO-AGREGAR a la lista de espera
        console.log('[RegistroPersonalForm] 🔄 Auto-agregando personal encontrado...');
        const personalData = {
          tipoDocumentoId: formPersonal.tipoDocumentoId,
          numeroDocumento: formPersonal.numeroDocumento,
          nombres: personal.nombres || '',
          apellidos: personal.apellidos || '',
          personalId: personal.id,
          tipoDocumento: tiposDocumento.find(tipo => tipo.value === formPersonal.tipoDocumentoId)
        };
        
        onAddPersonal(personalData);
        
        // Limpiar formulario
        setFormPersonal({
          tipoDocumentoId: formPersonal.tipoDocumentoId,
          numeroDocumento: '',
          nombres: '',
          apellidos: '',
          personalId: null
        });
      } else {
        // Verificar si ya está en la lista de espera
        const yaEnEspera = personalEnEspera.find(p => 
          p.tipoDocumentoId === formPersonal.tipoDocumentoId && 
          p.numeroDocumento === formPersonal.numeroDocumento
        );
        
        if (yaEnEspera) {
          setMensajePersonal('Esta persona ya está en la lista de espera');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        // SEGUNDO: Si no se encontró, consultar RENIEC (solo DNI)
        const tipoDNI = tiposDocumento.find(tipo => 
          tipo.label?.toLowerCase().includes('dni')
        );
        
        if (tipoDNI && formPersonal.tipoDocumentoId === tipoDNI.value && formPersonal.numeroDocumento.length === 8) {
          console.log('[RegistroPersonalForm] 🔍 No encontrado en BD, consultando RENIEC...');
          try {
            const dniResponse = await personalService.consultarDNI(formPersonal.numeroDocumento);
            
            if (dniResponse.data.success && dniResponse.data.data) {
              const datosDNI = dniResponse.data.data;
              
              // Autocompletar campos
              setFormPersonal(prev => ({
                ...prev,
                nombres: datosDNI.nombres,
                apellidos: datosDNI.apellidos
              }));

              setMensajePersonal('Datos obtenidos de RENIEC');
              setTipoMensaje('success');
              setDocumentoYaBuscado(documentoActual);
              
              // AUTO-AGREGAR
              const personalData = {
                tipoDocumentoId: formPersonal.tipoDocumentoId,
                numeroDocumento: formPersonal.numeroDocumento,
                nombres: datosDNI.nombres,
                apellidos: datosDNI.apellidos,
                personalId: null,
                tipoDocumento: tiposDocumento.find(tipo => tipo.value === formPersonal.tipoDocumentoId)
              };
              
              onAddPersonal(personalData);
              
              // Limpiar
              setFormPersonal({
                tipoDocumentoId: formPersonal.tipoDocumentoId,
                numeroDocumento: '',
                nombres: '',
                apellidos: '',
                personalId: null
              });
              
              return;
            }
          } catch (dniError) {
            console.log('Error consultando DNI:', dniError.message);
            
            if (dniError.response && dniError.response.status === 404) {
              setMensajePersonal('DNI no encontrado. Complete los datos manualmente.');
              setTipoMensaje('info');
              setDocumentoYaBuscado(documentoActual);
              return;
            }
          }
        }
        
        setMensajePersonal('Persona no encontrada. Complete los datos manualmente.');
        setTipoMensaje('info');
        setFormPersonal(prev => ({
          ...prev,
          personalId: null
        }));
        setDocumentoYaBuscado(documentoActual);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setMensajePersonal('Persona no encontrada. Complete los datos manualmente.');
        setTipoMensaje('info');
        setFormPersonal(prev => ({
          ...prev,
          personalId: null
        }));
      } else {
        setMensajePersonal('Error al buscar personal. Intente nuevamente.');
        setTipoMensaje('error');
      }
      
      setDocumentoYaBuscado(documentoActual);
    } finally {
      setBuscandoPersonal(false);
    }
  };

  // Manejar cambios en el formulario de personal
  const handlePersonalChange = (field, value) => {
    let validatedValue = value;
    
    switch (field) {
      case 'numeroDocumento':
        // Only allow numbers
        const numbersOnly = value.replace(/[^0-9]/g, '');
        validatedValue = numbersOnly.slice(0, 20);
        break;
      case 'nombres':
      case 'apellidos':
        validatedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '').slice(0, 150);
        break;
      default:
        validatedValue = value;
    }
    
    const newFormPersonal = {
      ...formPersonal,
      [field]: validatedValue
    };
    setFormPersonal(newFormPersonal);
    
    // Limpiar búsqueda cuando cambie tipo o número
    if (field === 'tipoDocumentoId' || field === 'numeroDocumento') {
      limpiarBusqueda();
    }
    
    // Validar duplicados
    if (field === 'numeroDocumento' && value && newFormPersonal.tipoDocumentoId) {
      const documentoDuplicado = personalEnEspera.find(personal => 
        personal.tipoDocumentoId === newFormPersonal.tipoDocumentoId && 
        personal.numeroDocumento === value
      );
      
      if (documentoDuplicado) {
        setMensajePersonal('Ya existe una persona con el mismo documento en la lista de espera');
        setTipoMensaje('error');
      } else {
        if (tipoMensaje === 'error' && mensajePersonal.includes('mismo documento')) {
          setMensajePersonal('');
          setTipoMensaje('');
        }
      }
    }
    
    // Enviar datos actualizados al componente padre
    if (onFormChange) {
      onFormChange({
        personal: newFormPersonal,
        alta: activeTab === 'activos' ? formAltaActivos : formBusquedaHistorial
      });
    }
  };

  // Manejar cambios en formulario de alta (ACTIVOS)
  const handleAltaChangeActivos = (field, value) => {
    const newFormAlta = {
      ...formAltaActivos,
      [field]: value
    };

    setFormAltaActivos(newFormAlta);
    
    // Obtener datos completos
    const cargo = cargos.find(c => c.value === newFormAlta.cargoId);
    const area = areas.find(a => a.value === newFormAlta.areaId);
    const tipoContrato = tiposContrato.find(t => t.value === newFormAlta.tipoContratoId);

    const altaCompleta = {
      ...newFormAlta,
      cargo: cargo,
      area: area,
      tipoContrato: tipoContrato,
      cargo_nombre: cargo?.label || '',
      area_nombre: area?.label || '',
      tipo_contrato_nombre: tipoContrato?.label || ''
    };

    if (onFormChange) {
      onFormChange({
        personal: formPersonal,
        alta: altaCompleta
      });
    }
  };

  // Manejar cambios en formulario de búsqueda (HISTORIAL)
  const handleBusquedaChangeHistorial = (field, value) => {
    const newFormBusqueda = {
      ...formBusquedaHistorial,
      [field]: value
    };

    setFormBusquedaHistorial(newFormBusqueda);

    if (onFormChange) {
      onFormChange({
        personal: formPersonal,
        alta: newFormBusqueda
      });
    }
  };

  // Agregar personal a la lista de espera
  const handleAddPersonal = () => {
    if (!isPersonalFormValid) {
      return;
    }

    // Validar duplicados
    const documentoDuplicado = personalEnEspera.find(personal => 
      personal.tipoDocumentoId === formPersonal.tipoDocumentoId && 
      personal.numeroDocumento === formPersonal.numeroDocumento
    );
    
    if (documentoDuplicado) {
      setMensajePersonal('Ya existe una persona con el mismo documento en la lista de espera');
      setTipoMensaje('error');
      return;
    }

    // Obtener datos de alta si están disponibles
    const cargo = cargos.find(c => c.value === formAltaActivos.cargoId);
    const area = areas.find(a => a.value === formAltaActivos.areaId);
    const tipoContrato = tiposContrato.find(t => t.value === formAltaActivos.tipoContratoId);

    const personalData = {
      tipoDocumentoId: formPersonal.tipoDocumentoId,
      numeroDocumento: formPersonal.numeroDocumento,
      nombres: formPersonal.nombres,
      apellidos: formPersonal.apellidos,
      personalId: formPersonal.personalId,
      tipoDocumento: tiposDocumento.find(tipo => tipo.value === formPersonal.tipoDocumentoId),
      cargo: cargo,
      area: area,
      tipoContrato: tipoContrato,
      cargoId: formAltaActivos.cargoId,
      areaId: formAltaActivos.areaId,
      tipoContratoId: formAltaActivos.tipoContratoId,
      cargo_nombre: cargo?.label || '',
      area_nombre: area?.label || '',
      tipo_contrato_nombre: tipoContrato?.label || ''
    };

    onAddPersonal(personalData);
    
    // Limpiar formulario de personal
    const tipoDocumentoActual = formPersonal.tipoDocumentoId;
    setFormPersonal({
      tipoDocumentoId: tipoDocumentoActual,
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      personalId: null
    });
    
    limpiarBusqueda();
  };

  // Registrar alta completa
  const handleRegisterAlta = () => {
    if (!isAltaFormValid || personalEnEspera.length === 0) return;
    
    const altaData = {
      cargoId: formAltaActivos.cargoId,
      areaId: formAltaActivos.areaId,
      tipoContratoId: formAltaActivos.tipoContratoId,
      cargo: cargos.find(c => c.value === formAltaActivos.cargoId),
      area: areas.find(a => a.value === formAltaActivos.areaId),
      tipoContrato: tiposContrato.find(t => t.value === formAltaActivos.tipoContratoId)
    };

    onRegisterAlta(altaData);
    
    // Limpiar formulario de alta
    setFormAltaActivos({
      cargoId: '',
      areaId: '',
      tipoContratoId: '',
      _tab: 'activos'
    });

    if (onFormChange) {
      onFormChange({
        personal: formPersonal,
        alta: {
          cargoId: '',
          areaId: '',
          tipoContratoId: '',
          _tab: 'activos'
        }
      });
    }
  };

  // Limpiar mensajes y estado de búsqueda
  const limpiarBusqueda = () => {
    setMensajePersonal('');
    setTipoMensaje('');
    setPersonalEncontrado(null);
    setDocumentoYaBuscado('');
  };

  // Limpiar formulario de personal
  const handleLimpiarPersonal = () => {
    let tipoPorDefecto = tiposDocumento[0]?.value || '1';
    if (tiposDocumento.length > 0) {
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label && tipo.label.toLowerCase().includes('dni')
      );
      tipoPorDefecto = tipoDNI ? tipoDNI.value : tiposDocumento[0].value;
    }
    
    const newFormPersonal = {
      tipoDocumentoId: tipoPorDefecto,
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      personalId: null
    };
    
    setFormPersonal(newFormPersonal);
    limpiarBusqueda();
    
    const currentFormAlta = activeTab === 'activos' ? formAltaActivos : formBusquedaHistorial;
    
    if (onFormChange) {
      onFormChange({
        personal: newFormPersonal,
        alta: currentFormAlta
      });
    }
  };

  // Limpiar formulario de alta/búsqueda
  const handleLimpiarFormularioAlta = () => {
    if (activeTab === 'activos') {
      const newFormAlta = {
        cargoId: '',
        areaId: '',
        tipoContratoId: '',
        _tab: 'activos'
      };
      setFormAltaActivos(newFormAlta);
      
      if (onFormChange) {
        onFormChange({
          personal: formPersonal,
          alta: newFormAlta
        });
      }
    } else {
      const newFormBusqueda = {
        cargoId: '',
        areaId: '',
        activo: '',
        busqueda: '',
        _tab: 'historial'
      };
      setFormBusquedaHistorial(newFormBusqueda);
      
      if (onFormChange) {
        onFormChange({
          personal: formPersonal,
          alta: newFormBusqueda
        });
      }
      
      if (onBuscarHistorial) {
        const filtrosVacios = {
          busqueda: '',
          cargoId: '',
          areaId: '',
          activo: '',
          fechaDesde: null,
          fechaHasta: null
        };
        onBuscarHistorial(filtrosVacios);
      }
    }
  };

  // Función para manejar la búsqueda de historial
  const handleBuscarHistorial = () => {
    if (onBuscarHistorial) {
      const filtros = {
        busqueda: formBusquedaHistorial.busqueda,
        cargoId: formBusquedaHistorial.cargoId,
        areaId: formBusquedaHistorial.areaId,
        activo: formBusquedaHistorial.activo
      };
      
      onBuscarHistorial(filtros);
    }
  };

  const isPersonalFormValid = activeTab === 'activos' 
    ? (formPersonal.numeroDocumento && formPersonal.nombres && formPersonal.apellidos)
    : true;

  const isAltaFormValid = activeTab === 'activos'
    ? (formAltaActivos.cargoId && formAltaActivos.areaId && formAltaActivos.tipoContratoId)
    : true;

  return (
    <div className="h-full flex flex-col overflow-visible">
      <Card className="shadow-lg border border-gray-200 bg-white flex flex-col overflow-visible rounded-2xl">
        <div className="p-0 flex-1 flex flex-col overflow-visible">
          {/* Sección de Datos del Personal - Solo para ACTIVOS */}
          {activeTab === 'activos' && (
            <div className="flex-shrink-0 space-y-3 border border-gray-200 rounded-xl pb-3 mb-3 p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Datos del Personal
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Tipo de Documento */}
                <div>
                  <SelectCustom
                    label="Tipo de Documento *"
                    value={tiposDocumento.find(tipo => tipo.value === formPersonal.tipoDocumentoId)}
                    onChange={(selectedOption) => handlePersonalChange('tipoDocumentoId', selectedOption?.value || '')}
                    options={tiposDocumento}
                    placeholder="Seleccione..."
                    isLoading={loadingData}
                    isClearable={false}
                  />
                </div>
                
                {/* Número de Documento */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento *
                  </label>
                  
                  <div className="flex mt-auto">
                    <Input
                      ref={documentoInput}
                      value={formPersonal.numeroDocumento}
                      onChange={(e) => handlePersonalChange('numeroDocumento', e.target.value)}
                      placeholder=""
                      maxLength="20"
                      className="rounded-r-none border-r-0"
                      style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0' }}
                    />
                    <Button
                      onClick={buscarPersonal}
                      disabled={!formPersonal.tipoDocumentoId || !formPersonal.numeroDocumento || buscandoPersonal}
                      className="rounded-l-none border-l-0 bg-blue-600 hover:bg-blue-700 text-white px-3"
                      size="sm"
                    >
                      {buscandoPersonal ? (
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
                  value={formPersonal.nombres}
                  onChange={(e) => handlePersonalChange('nombres', e.target.value)}
                  placeholder=""
                  maxLength="150"
                />
                <Input
                  label="Apellidos *"
                  value={formPersonal.apellidos}
                  onChange={(e) => handlePersonalChange('apellidos', e.target.value)}
                  placeholder=""
                  maxLength="150"
                />
              </div>

              {/* Mensaje de estado */}
              {mensajePersonal && (
                <div className={`p-2 rounded-lg border text-xs ${
                  tipoMensaje === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                  tipoMensaje === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{mensajePersonal}</span>
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
                  onClick={handleAddPersonal}
                  disabled={!isPersonalFormValid}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  size="sm"
                >
                  Agregar a Lista
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLimpiarPersonal}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
                  size="sm"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Sección de datos de alta/búsqueda */}
          <div className={`flex-1 flex flex-col overflow-visible border border-gray-200 rounded-xl p-3 ${
            activeTab === 'activos' && personalEnEspera.length === 0 ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              {activeTab === 'activos' ? 'Datos del Puesto' : 'Buscar Personal'}
              {activeTab === 'activos' && personalEnEspera.length === 0 && (
                <span className="text-sm text-gray-500 ml-2">(Agregue una persona primero)</span>
              )}
            </h3>
            
            {activeTab === 'activos' ? (
              <div className="space-y-4 flex-1">
                <SelectCustom
                  label="Cargo *"
                  value={cargos.find(c => c.value === formAltaActivos.cargoId) || null}
                  onChange={(selectedOption) => handleAltaChangeActivos('cargoId', selectedOption?.value || '')}
                  options={cargos}
                  placeholder="Seleccione cargo..."
                  isSearchable={true}
                  isLoading={loadingData}
                  noOptionsMessage="No se encontraron cargos"
                />

                <SelectCustom
                  label="Área *"
                  value={areas.find(a => a.value === formAltaActivos.areaId) || null}
                  onChange={(selectedOption) => handleAltaChangeActivos('areaId', selectedOption?.value || '')}
                  options={areas}
                  placeholder="Seleccione área..."
                  isSearchable={true}
                  isLoading={loadingData}
                  noOptionsMessage="No se encontraron áreas"
                />

                <SelectCustom
                  label="Tipo de Contrato *"
                  value={tiposContrato.find(t => t.value === formAltaActivos.tipoContratoId) || null}
                  onChange={(selectedOption) => handleAltaChangeActivos('tipoContratoId', selectedOption?.value || '')}
                  options={tiposContrato}
                  placeholder="Seleccione tipo de contrato..."
                  isLoading={loadingData}
                  noOptionsMessage="No se encontraron tipos de contrato"
                />
              </div>
            ) : (
              /* Campos de búsqueda para historial */
              <div className="space-y-4 flex-1">
                <Input
                  ref={busquedaInput}
                  label="Buscar Personal"
                  value={formBusquedaHistorial.busqueda}
                  onChange={(e) => handleBusquedaChangeHistorial('busqueda', e.target.value)}
                  placeholder="Nombre, apellido o número de documento..."
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                />

                <div className="grid grid-cols-2 gap-3">
                  <SelectCustom
                    label="Buscar por Cargo"
                    value={[{ value: '', label: 'Todos' }, ...cargos].find(c => c.value === formBusquedaHistorial.cargoId) || null}
                    onChange={(selectedOption) => handleBusquedaChangeHistorial('cargoId', selectedOption?.value || '')}
                    options={[{ value: '', label: 'Todos' }, ...cargos]}
                    placeholder="Seleccione cargo..."
                    isSearchable={true}
                    noOptionsMessage="No se encontraron cargos"
                  />
                  <SelectCustom
                    label="Buscar por Área"
                    value={[{ value: '', label: 'Todas' }, ...areas].find(a => a.value === formBusquedaHistorial.areaId) || null}
                    onChange={(selectedOption) => handleBusquedaChangeHistorial('areaId', selectedOption?.value || '')}
                    options={[{ value: '', label: 'Todas' }, ...areas]}
                    placeholder="Seleccione área..."
                    isSearchable={true}
                    noOptionsMessage="No se encontraron áreas"
                  />
                </div>

                <SelectCustom
                  label="Estado"
                  value={[
                    { value: '', label: 'Todos' },
                    { value: 'true', label: 'Activo' },
                    { value: 'false', label: 'Inactivo' }
                  ].find(e => e.value === formBusquedaHistorial.activo) || null}
                  onChange={(selectedOption) => handleBusquedaChangeHistorial('activo', selectedOption?.value || '')}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'true', label: 'Activo' },
                    { value: 'false', label: 'Inactivo' }
                  ]}
                  placeholder="Todos los estados"
                />
              </div>
            )}
          </div>
          
          {/* Botones de registro y limpieza */}
          <div className="flex-shrink-0 mt-2 pt-2">
            <div className="flex gap-3">
              <Button
                onClick={activeTab === 'activos' ? handleRegisterAlta : handleBuscarHistorial}
                disabled={activeTab === 'activos' && (!isAltaFormValid || personalEnEspera.length === 0)}
                variant="primary"
                size="lg"
                leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {activeTab === 'activos' ? 'Registrar Alta Completa' : 'Buscar Personal'}
                {activeTab === 'activos' && personalEnEspera.length > 0 && (
                  <Badge variant="primary" className="ml-3 bg-white text-blue-600">
                    {personalEnEspera.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleLimpiarFormularioAlta}
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
});

RegistroPersonalForm.displayName = 'RegistroPersonalForm';

export default RegistroPersonalForm;

