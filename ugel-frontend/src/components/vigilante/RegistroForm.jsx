import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import SelectCustom from '../SelectCustom';
import Badge from '../Badge';
import { PlusIcon, ClipboardDocumentListIcon, UserGroupIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { tiposDocumentoService, motivosVisitaService, personalService, areasService, visitantesService, registrarVisitaCompleta, getVisitantesActivos } from '../../services/api';

const RegistroForm = forwardRef(({ visitantesEnEspera, onAddVisitor, onRegisterVisit, onFormChange, activeTab = 'activos', onTabChange, onBuscarHistorial, refs = {} }, ref) => {
  // Estados del formulario de visitante (compartido entre tabs)
  const [formVisitante, setFormVisitante] = useState({
    tipoDocumentoId: '',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    visitanteId: null
  });

  // Estados del formulario de visita para ACTIVOS
  const [formVisitaActivos, setFormVisitaActivos] = useState({
    empleadoId: '',
    motivoId: '',
    lugar: '',
    _tab: 'activos' // Identificador único para evitar reutilización
  });

  // Estados del formulario de visita para HISTORIAL
  const [formVisitaHistorial, setFormVisitaHistorial] = useState({
    empleadoId: '',
    motivoId: '',
    lugar: '',
    busqueda: '', // Campo de búsqueda por nombre, apellido o documento
    _tab: 'historial' // Identificador único para evitar reutilización
  });

  // Estados para los datos de los selects
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [lugares, setLugares] = useState([]);
  
  // Estados completamente separados para cada vista
  const [empleadosActivos, setEmpleadosActivos] = useState([]);
  const [empleadosHistorial, setEmpleadosHistorial] = useState([]);
  const [motivosActivos, setMotivosActivos] = useState([]);
  const [motivosHistorial, setMotivosHistorial] = useState([]);
  const [lugaresActivos, setLugaresActivos] = useState([]);
  const [lugaresHistorial, setLugaresHistorial] = useState([]);
  
  // Estados para la búsqueda de visitante
  const [buscandoVisitante, setBuscandoVisitante] = useState(false);
  const [visitanteEncontrado, setVisitanteEncontrado] = useState(null);
  const [mensajeVisitante, setMensajeVisitante] = useState('');
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
          empleadoId: formVisitaActivos.empleadoId,
          motivoId: formVisitaActivos.motivoId,
          lugar: formVisitaActivos.lugar
        };
      } else {
        return {
          empleadoId: formVisitaHistorial.empleadoId,
          motivoId: formVisitaHistorial.motivoId,
          lugar: formVisitaHistorial.lugar,
          busqueda: formVisitaHistorial.busqueda
        };
      }
    },
    triggerRegisterVisit: () => {
      if (activeTab === 'activos') {
        handleRegisterVisit();
      } else {
        handleBuscarHistorial();
      }
    }
  }));


  // Función para actualizar el formulario de visita de ACTIVOS
  const updateFormVisitaActivos = (newFormVisita) => {
    setFormVisitaActivos(newFormVisita);
  };

  // Función para actualizar el formulario de visita de HISTORIAL
  const updateFormVisitaHistorial = (newFormVisita) => {
    setFormVisitaHistorial(newFormVisita);
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Estado para rastrear el tab anterior
  const [previousTab, setPreviousTab] = useState(activeTab);

  // Buscar visitante automáticamente cuando se complete el número de documento
  useEffect(() => {
    
    // Crear clave única para el documento actual
    const documentoActual = `${formVisitante.tipoDocumentoId}-${formVisitante.numeroDocumento}`;
    
    // Solo buscar si tenemos ambos datos, el número de documento tiene al menos 8 caracteres,
    // no estamos buscando actualmente, y no hemos buscado este documento específico antes
    if (formVisitante.tipoDocumentoId && 
        formVisitante.numeroDocumento && 
        formVisitante.numeroDocumento.length >= 8 &&
        !buscandoVisitante &&
        documentoActual !== documentoYaBuscado) {
      // Usar setTimeout para evitar múltiples llamadas
      const timeoutId = setTimeout(() => {
        buscarVisitante();
      }, 500); // Esperar 500ms después del último cambio
      
      return () => clearTimeout(timeoutId);
    }
  }, [formVisitante.tipoDocumentoId, formVisitante.numeroDocumento, buscandoVisitante, documentoYaBuscado]);

  // Limpiar formularios al cambiar de tab
  useEffect(() => {
    // Solo limpiar si realmente cambió el tab (no en el montaje inicial)
    if (previousTab !== activeTab) {
      
      // Limpiar ambos formularios al cambiar de tab para evitar persistencia
      const newFormVisitaActivos = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        _tab: 'activos'
      };
      
      const newFormVisitaHistorial = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        busqueda: '',
        _tab: 'historial'
      };
      
      
      // Actualizar ambos formularios
      updateFormVisitaActivos(newFormVisitaActivos);
      updateFormVisitaHistorial(newFormVisitaHistorial);
      
      // Resetear filtros y restaurar listas completas
      setEmpleadosActivos(empleados);
      setEmpleadosHistorial([{ value: '', label: 'Todos los empleados' }, ...empleados]);
      
      // Notificar al componente padre con el formulario del tab activo
      if (onFormChange) {
        const currentFormVisita = activeTab === 'activos' ? newFormVisitaActivos : newFormVisitaHistorial;
        onFormChange({
          visitante: formVisitante,
          visita: currentFormVisita
        });
      }
      
      // Actualizar el tab anterior
      setPreviousTab(activeTab);
    }
  }, [activeTab, previousTab]);
  
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
        
        // Buscar DNI por nombre
        const tipoDNI = tiposData.find(tipo => 
          tipo.label?.toLowerCase().includes('dni') ||
          tipo.label?.toLowerCase().includes('documento nacional')
        );
        if (tipoDNI && !formVisitante.tipoDocumentoId) {
          setFormVisitante(prev => ({ ...prev, tipoDocumentoId: tipoDNI.value }));
        }
      }

      if (motivosResponse.data.success) {
        const motivosData = motivosResponse.data.data.map(motivo => ({
          value: motivo.id.toString(),
          label: motivo.nombre_motivo || motivo.nombre
        }));
        setMotivos(motivosData);
        setMotivosActivos(motivosData);
        setMotivosHistorial([{ value: '', label: 'Todos los motivos' }, ...motivosData]);
      }

      if (empleadosResponse.data.success) {
        const empleadosData = empleadosResponse.data.data.map(empleado => ({
          value: empleado.id.toString(),
          label: `${empleado.nombres} ${empleado.apellidos}`,
          areaId: empleado.area_destino_id, // Corregir el campo del área
          areaNombre: empleado.area_nombre || 'Sin área',
          cargo: empleado.cargo_nombre || 'Sin cargo'
        }));
        setEmpleados(empleadosData);
        setEmpleadosActivos(empleadosData);
        setEmpleadosHistorial([{ value: '', label: 'Todos los empleados' }, ...empleadosData]);
      }

      if (areasResponse.data.success) {
        const lugaresData = areasResponse.data.data.map(area => ({
          value: area.id.toString(),
          label: area.nombre_area || area.nombre
        }));
        setLugares(lugaresData);
        setLugaresActivos(lugaresData);
        setLugaresHistorial([{ value: '', label: 'Todos los lugares' }, ...lugaresData]);
      }
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filtrar empleados por área para ACTIVOS
  const filtrarEmpleadosPorAreaActivos = (areaId) => {
    if (!areaId) {
      setEmpleadosActivos(empleados);
    } else {
      const empleadosFiltrados = empleados.filter(empleado => 
        empleado.areaId && empleado.areaId.toString() === areaId
      );
      setEmpleadosActivos(empleadosFiltrados);
    }
  };


  // Resetear filtros de empleados para ACTIVOS
  const resetearFiltrosActivos = () => {
    setEmpleadosActivos(empleados);
  };


  // Función para obtener el área de un empleado específico
  const obtenerAreaDeEmpleado = (empleadoId) => {
    const empleado = empleados.find(emp => emp.value === empleadoId);
    return empleado ? empleado.areaId : null;
  };

  // Función para obtener empleados de un área específica
  const obtenerEmpleadosDeArea = (areaId) => {
    if (!areaId) {
      return empleados;
    }
    return empleados.filter(empleado => 
      empleado.areaId && empleado.areaId.toString() === areaId
    );
  };

  // Función para actualizar el lugar cuando se selecciona un empleado
  const actualizarLugarPorEmpleado = (empleadoId) => {
    if (!empleadoId) return '';
    
    const areaId = obtenerAreaDeEmpleado(empleadoId);
    if (areaId) {
      // Buscar el lugar correspondiente en la lista de lugares
      const lugarCorrespondiente = lugares.find(lugar => lugar.value === areaId.toString());
      if (lugarCorrespondiente) {
        return lugarCorrespondiente.value;
      }
    }
    return '';
  };

  // Función para actualizar la lista de empleados cuando se selecciona un lugar
  const actualizarEmpleadosPorLugar = (lugarId) => {
    const empleadosDelArea = obtenerEmpleadosDeArea(lugarId);
    setEmpleadosActivos(empleadosDelArea);
  };

  // Funciones específicas para HISTORIAL
  // Función para obtener el área de un empleado específico (para historial)
  const obtenerAreaDeEmpleadoHistorial = (empleadoId) => {
    const empleado = empleados.find(emp => emp.value === empleadoId);
    return empleado ? empleado.areaId : null;
  };

  // Función para obtener empleados de un área específica (para historial)
  const obtenerEmpleadosDeAreaHistorial = (areaId) => {
    if (!areaId) {
      return [{ value: '', label: 'Todos los empleados' }, ...empleados];
    }
    const empleadosDelArea = empleados.filter(empleado => 
      empleado.areaId && empleado.areaId.toString() === areaId
    );
    return [{ value: '', label: 'Todos los empleados' }, ...empleadosDelArea];
  };

  // Función para actualizar el lugar cuando se selecciona un empleado (para historial)
  const actualizarLugarPorEmpleadoHistorial = (empleadoId) => {
    if (!empleadoId) return '';
    
    const areaId = obtenerAreaDeEmpleadoHistorial(empleadoId);
    if (areaId) {
      // Buscar el lugar correspondiente en la lista de lugares
      const lugarCorrespondiente = lugares.find(lugar => lugar.value === areaId.toString());
      if (lugarCorrespondiente) {
        return lugarCorrespondiente.value;
      }
    }
    return '';
  };

  // Función para actualizar la lista de empleados cuando se selecciona un lugar (para historial)
  const actualizarEmpleadosPorLugarHistorial = (lugarId) => {
    const empleadosDelArea = obtenerEmpleadosDeAreaHistorial(lugarId);
    setEmpleadosHistorial(empleadosDelArea);
  };

  // Verificar si el visitante ya tiene una visita activa
  const verificarVisitaActiva = async (visitanteId) => {
    try {
      const response = await getVisitantesActivos();
      if (response.data.success && response.data.data) {
        const visitasActivas = response.data.data;
        const visitaActiva = visitasActivas.find(visita => 
          visita.visitante_id === visitanteId
        );
        return visitaActiva;
      }
      return null;
    } catch (error) {
      console.error('Error verificando visita activa:', error);
      return null;
    }
  };

  // Buscar visitante por documento
  const buscarVisitante = async () => {
    if (!formVisitante.tipoDocumentoId || !formVisitante.numeroDocumento) {
      return;
    }

    // Crear clave única para el documento actual
    const documentoActual = `${formVisitante.tipoDocumentoId}-${formVisitante.numeroDocumento}`;
    
    setBuscandoVisitante(true);
    setMensajeVisitante('');
    setVisitanteEncontrado(null);

    try {
      // Si es DNI, intentar autocompletado con API externa
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label?.toLowerCase().includes('dni') ||
        tipo.label?.toLowerCase().includes('documento nacional')
      );
      
      if (tipoDNI && formVisitante.tipoDocumentoId === tipoDNI.value && formVisitante.numeroDocumento.length === 8) {
        try {
          const dniResponse = await visitantesService.consultarDNI(formVisitante.numeroDocumento);
          
          if (dniResponse.data.success && dniResponse.data.data) {
            const datosDNI = dniResponse.data.data;
            
            // Verificar si el visitante ya está en la lista de espera
            const yaEnEspera = visitantesEnEspera.find(v => 
              v.tipoDocumentoId === formVisitante.tipoDocumentoId && 
              v.numeroDocumento === formVisitante.numeroDocumento
            );
            
            if (yaEnEspera) {
              setMensajeVisitante('Este visitante ya está en la lista de espera');
              setTipoMensaje('error');
              setDocumentoYaBuscado(documentoActual);
              return;
            }
            
            // Verificar si el visitante ya tiene una visita activa
            const visitaActiva = await verificarVisitaActiva(datosDNI.id);
            if (visitaActiva) {
              setMensajeVisitante('El visitante ya tiene una visita activa. Registre su salida primero.');
              setTipoMensaje('error');
              setDocumentoYaBuscado(documentoActual);
              return;
            }
            
            // Autocompletar campos del formulario con datos de la API externa
            setFormVisitante(prev => ({
              ...prev,
              nombres: datosDNI.nombres,
              apellidos: datosDNI.apellidos,
              visitanteId: datosDNI.id // Usar el ID del visitante (ya sea local o recién creado)
            }));

            setMensajeVisitante('');
            setTipoMensaje('');
            setVisitanteEncontrado(datosDNI);
            setDocumentoYaBuscado(documentoActual);
            
            // AUTO-AGREGAR: Automáticamente agregar el visitante a la lista de espera
            console.log('[RegistroForm] 🔄 Auto-agregando visitante encontrado en RENIEC...');
            const visitanteData = {
              tipoDocumentoId: formVisitante.tipoDocumentoId,
              numeroDocumento: formVisitante.numeroDocumento,
              nombres: datosDNI.nombres,
              apellidos: datosDNI.apellidos,
              visitanteId: datosDNI.id,
              tipoDocumento: tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId)
            };
            
            // Llamar a la función de agregar visitante
            onAddVisitor(visitanteData);
            
            // Limpiar formulario de visitante
            setFormVisitante({
              tipoDocumentoId: formVisitante.tipoDocumentoId, // Preservar tipo de documento
              numeroDocumento: '',
              nombres: '',
              apellidos: '',
              visitanteId: null
            });
            
            return;
          }
        } catch (dniError) {
          console.log('Error consultando DNI externo, continuando con búsqueda local:', dniError.message);
          
          // Si es error 404 (DNI no encontrado), mostrar mensaje específico
          if (dniError.response && dniError.response.status === 404) {
            setMensajeVisitante('DNI no encontrado en la base de datos nacional. Complete los datos manualmente.');
            setTipoMensaje('info');
            setDocumentoYaBuscado(documentoActual);
            return;
          }
          
          // Para otros errores, continuar con búsqueda local
        }
      }

      // Búsqueda local tradicional
      const response = await visitantesService.getByDocumento(
        formVisitante.tipoDocumentoId,
        formVisitante.numeroDocumento
      );

      if (response.data.success && response.data.data) {
        const visitante = response.data.data;
        
        // Verificar si el visitante ya está en la lista de espera
        const yaEnEspera = visitantesEnEspera.find(v => 
          v.tipoDocumentoId === formVisitante.tipoDocumentoId && 
          v.numeroDocumento === formVisitante.numeroDocumento
        );
        
        if (yaEnEspera) {
          setMensajeVisitante('Este visitante ya está en la lista de espera');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        // Verificar si el visitante ya tiene una visita activa
        const visitaActiva = await verificarVisitaActiva(visitante.id);
        if (visitaActiva) {
          setMensajeVisitante('El visitante ya tiene una visita activa. Registre su salida primero.');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        setVisitanteEncontrado(visitante);
        setFormVisitante(prev => ({
          ...prev,
          nombres: visitante.nombres || '',
          apellidos: visitante.apellidos || '',
          visitanteId: visitante.id
        }));
        setMensajeVisitante('');
        setTipoMensaje('');
        setDocumentoYaBuscado(documentoActual);
        
        // AUTO-AGREGAR: Automáticamente agregar el visitante a la lista de espera
        console.log('[RegistroForm] 🔄 Auto-agregando visitante encontrado en base de datos...');
        const visitanteData = {
          tipoDocumentoId: formVisitante.tipoDocumentoId,
          numeroDocumento: formVisitante.numeroDocumento,
          nombres: visitante.nombres || '',
          apellidos: visitante.apellidos || '',
          visitanteId: visitante.id,
          tipoDocumento: tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId)
        };
        
        // Llamar a la función de agregar visitante
        onAddVisitor(visitanteData);
        
        // Limpiar formulario de visitante
        setFormVisitante({
          tipoDocumentoId: formVisitante.tipoDocumentoId, // Preservar tipo de documento
          numeroDocumento: '',
          nombres: '',
          apellidos: '',
          visitanteId: null
        });
      } else {
        // Verificar si el visitante ya está en la lista de espera (incluso si no está en la BD)
        const yaEnEspera = visitantesEnEspera.find(v => 
          v.tipoDocumentoId === formVisitante.tipoDocumentoId && 
          v.numeroDocumento === formVisitante.numeroDocumento
        );
        
        if (yaEnEspera) {
          setMensajeVisitante('Este visitante ya está en la lista de espera');
          setTipoMensaje('error');
          setDocumentoYaBuscado(documentoActual);
          return;
        }
        
        setMensajeVisitante('Visitante no encontrado. Complete los datos manualmente para registrar uno nuevo.');
        setTipoMensaje('info');
        setFormVisitante(prev => ({
          ...prev,
          visitanteId: null
        }));
        setDocumentoYaBuscado(documentoActual);
      }
    } catch (error) {
      
      // Manejar específicamente el caso 404 (visitante no encontrado)
      if (error.response && error.response.status === 404) {
        setMensajeVisitante('Visitante no encontrado. Complete los datos manualmente para registrar uno nuevo.');
        setTipoMensaje('info');
        setFormVisitante(prev => ({
          ...prev,
          visitanteId: null
        }));
      } else {
        setMensajeVisitante('Error al buscar visitante. Intente nuevamente.');
        setTipoMensaje('error');
      }
      
      setDocumentoYaBuscado(documentoActual);
    } finally {
      setBuscandoVisitante(false);
    }
  };

  // Manejar cambios en el formulario de visitante
  const handleVisitanteChange = (field, value) => {
    // Validar límites de caracteres según la BD
    let validatedValue = value;
    
    switch (field) {
      case 'numeroDocumento':
        validatedValue = value.slice(0, 20); // VARCHAR(20)
        break;
      case 'nombres':
        validatedValue = value.slice(0, 150); // VARCHAR(150)
        break;
      case 'apellidos':
        validatedValue = value.slice(0, 150); // VARCHAR(150)
        break;
      default:
        validatedValue = value;
    }
    
    const newFormVisitante = {
      ...formVisitante,
      [field]: validatedValue
    };
    setFormVisitante(newFormVisitante);
    
    // Limpiar búsqueda cuando cambie tipo de documento o número de documento
    if (field === 'tipoDocumentoId' || field === 'numeroDocumento') {
      limpiarBusqueda();
    }
    
    // Validar duplicados cuando se cambie el número de documento
    if (field === 'numeroDocumento' && value && newFormVisitante.tipoDocumentoId) {
      const documentoDuplicado = visitantesEnEspera.find(visitante => 
        visitante.tipoDocumentoId === newFormVisitante.tipoDocumentoId && 
        visitante.numeroDocumento === value
      );
      
      if (documentoDuplicado) {
        setMensajeVisitante('Ya existe un visitante con el mismo documento en la lista de espera');
        setTipoMensaje('error');
      } else {
        // Limpiar mensaje de error si no hay duplicado
        if (tipoMensaje === 'error' && mensajeVisitante.includes('mismo documento')) {
          setMensajeVisitante('');
          setTipoMensaje('');
        }
      }
    }
    
    // Enviar datos actualizados en tiempo real al componente padre
    if (onFormChange) {
      onFormChange({
        visitante: newFormVisitante,
        visita: activeTab === 'activos' ? formVisitaActivos : formVisitaHistorial
      });
    }
  };

  // Manejar cambios en el formulario de visita para ACTIVOS
  const handleVisitaChangeActivos = (field, value) => {
    console.error('🚨🚨🚨 [handleVisitaChangeActivos] LLAMADO!!! 🚨🚨🚨');
    console.error('🚨 field:', field, 'value:', value);
    
    let newFormVisita = {
      ...formVisitaActivos,
      [field]: value
    };

    // Implementar vinculación automática entre empleado y lugar
    if (field === 'empleadoId') {
      // Cuando se selecciona un empleado, actualizar automáticamente el lugar
      const lugarCorrespondiente = actualizarLugarPorEmpleado(value);
      if (lugarCorrespondiente) {
        newFormVisita.lugar = lugarCorrespondiente;
        // También actualizar la lista de empleados para mostrar solo los del área seleccionada
        actualizarEmpleadosPorLugar(lugarCorrespondiente);
      } else {
        // Si no se encuentra el área del empleado, limpiar el lugar
        newFormVisita.lugar = '';
        // Restaurar la lista completa de empleados
        setEmpleadosActivos(empleados);
      }
    } else if (field === 'lugar') {
      // Cuando se selecciona un lugar, filtrar los empleados para ACTIVOS
      actualizarEmpleadosPorLugar(value);
      
      // Si había un empleado seleccionado que no pertenece al área seleccionada, limpiarlo
      if (newFormVisita.empleadoId) {
        const empleadoSeleccionado = empleados.find(emp => emp.value === newFormVisita.empleadoId);
        if (empleadoSeleccionado && empleadoSeleccionado.areaId && 
            empleadoSeleccionado.areaId.toString() !== value) {
          newFormVisita.empleadoId = '';
        }
      }
    } else if (field === 'motivoId') {
      // Para el motivo no hay vinculación, solo actualizar el valor
      // No se requiere lógica adicional
    }

    updateFormVisitaActivos(newFormVisita);
    
    // Obtener los datos completos de los selects usando la función robusta
    const { empleado, motivo, lugar } = obtenerDatosVisita(newFormVisita, true);

    // Crear objeto de visita con datos completos
    const visitaCompleta = {
      ...newFormVisita,
      empleado: empleado,
      motivo: motivo,
      lugar: lugar?.label || '',
      lugarId: lugar?.value || '',
      personal_nombres: empleado?.label?.split(' ')[0] || '',
      personal_apellidos: empleado?.label?.split(' ').slice(1).join(' ') || '',
      nombre_motivo: motivo?.label || '',
      nombre_area: lugar?.label || ''
    };

    // Enviar datos actualizados en tiempo real al componente padre
    console.warn('🔔 [RegistroForm-Activos] Llamando onFormChange');
    console.warn('🔔 [RegistroForm-Activos] visitaCompleta:', JSON.stringify(visitaCompleta, null, 2));
    console.warn('🔔 [RegistroForm-Activos] onFormChange exists:', !!onFormChange);
    
    if (onFormChange) {
      onFormChange({
        visitante: formVisitante,
        visita: visitaCompleta
      });
      console.warn('✅ [RegistroForm-Activos] onFormChange ejecutado');
    } else {
      console.error('❌ [RegistroForm-Activos] onFormChange NO está definido!');
    }
  };

  // Manejar cambios en el formulario de visita para HISTORIAL
  const handleVisitaChangeHistorial = (field, value) => {
    let newFormVisita = {
      ...formVisitaHistorial,
      [field]: value
    };

    // Implementar vinculación automática entre empleado y lugar para HISTORIAL
    if (field === 'empleadoId') {
      // Cuando se selecciona un empleado, actualizar automáticamente el lugar
      const lugarCorrespondiente = actualizarLugarPorEmpleadoHistorial(value);
      if (lugarCorrespondiente) {
        newFormVisita.lugar = lugarCorrespondiente;
        // También actualizar la lista de empleados para mostrar solo los del área seleccionada
        actualizarEmpleadosPorLugarHistorial(lugarCorrespondiente);
      } else {
        // Si no se encuentra el área del empleado, limpiar el lugar
        newFormVisita.lugar = '';
        // Restaurar la lista completa de empleados con opción "Todos"
        setEmpleadosHistorial([{ value: '', label: 'Todos los empleados' }, ...empleados]);
      }
    } else if (field === 'lugar') {
      // Cuando se selecciona un lugar, filtrar los empleados para HISTORIAL
      actualizarEmpleadosPorLugarHistorial(value);
      
      // Si había un empleado seleccionado que no pertenece al área seleccionada, limpiarlo
      if (newFormVisita.empleadoId) {
        const empleadoSeleccionado = empleados.find(emp => emp.value === newFormVisita.empleadoId);
        if (empleadoSeleccionado && empleadoSeleccionado.areaId && 
            empleadoSeleccionado.areaId.toString() !== value) {
          newFormVisita.empleadoId = '';
        }
      }
    } else if (field === 'motivoId') {
      // Para el motivo no hay vinculación, solo actualizar el valor
      // No se requiere lógica adicional
    }

    updateFormVisitaHistorial(newFormVisita);
    
    // Obtener los datos completos de los selects usando la función robusta
    const { empleado, motivo, lugar } = obtenerDatosVisita(newFormVisita, false);

    // Crear objeto de visita con datos completos
    const visitaCompleta = {
      ...newFormVisita,
      empleado: empleado,
      motivo: motivo,
      lugar: lugar?.label || '',
      lugarId: lugar?.value || '',
      personal_nombres: empleado?.label?.split(' ')[0] || '',
      personal_apellidos: empleado?.label?.split(' ').slice(1).join(' ') || '',
      nombre_motivo: motivo?.label || '',
      nombre_area: lugar?.label || ''
    };

    // Enviar datos actualizados en tiempo real al componente padre
    if (onFormChange) {
      onFormChange({
        visitante: formVisitante,
        visita: visitaCompleta
      });
    }
  };

  // Agregar visitante
  const handleAddVisitor = async () => {
    
    if (!isVisitanteFormValid) {
      return;
    }

    // Si no tenemos visitanteId, intentar buscar el visitante primero
    if (!formVisitante.visitanteId && formVisitante.tipoDocumentoId && formVisitante.numeroDocumento) {
      try {
        await buscarVisitante();
        // Esperar un momento para que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Si después de buscar tenemos un visitanteId, verificar si tiene visita activa
        if (formVisitante.visitanteId) {
          const visitaActiva = await verificarVisitaActiva(formVisitante.visitanteId);
          if (visitaActiva) {
            setMensajeVisitante('El visitante ya tiene una visita activa. Registre su salida primero.');
            setTipoMensaje('error');
            return;
          }
        }
      } catch (error) {
        console.error('Error al buscar visitante:', error);
      }
    }

    // Validar que no exista un visitante duplicado con el mismo documento
    const documentoDuplicado = visitantesEnEspera.find(visitante => 
      visitante.tipoDocumentoId === formVisitante.tipoDocumentoId && 
      visitante.numeroDocumento === formVisitante.numeroDocumento
    );
    
    if (documentoDuplicado) {
      setMensajeVisitante('Ya existe un visitante con el mismo documento en la lista de espera');
      setTipoMensaje('error');
      return;
    }

    // No validar motivo y lugar aquí - se validarán al registrar la visita completa

    // Verificar si hay datos de visita seleccionados
    const tieneDatosVisita = formVisitaActivos.motivoId && formVisitaActivos.lugar;
    
    if (tieneDatosVisita) {
      // Si hay datos de visita, registrar la visita completa
      
      // Obtener los datos de la visita actual usando la función robusta
      const { empleado, motivo, lugar } = obtenerDatosVisita(formVisitaActivos, true);

      // Preparar datos para la API del backend
      const datosVisita = {
        // Datos de la visita (usar IDs numéricos)
        lugarId: parseInt(formVisitaActivos.lugar), // areaDestinoId
        motivoId: parseInt(formVisitaActivos.motivoId) // motivoVisitaId
      };

      // Si el visitante ya existe en la BD, usar su ID
      if (formVisitante.visitanteId) {
        datosVisita.visitanteId = parseInt(formVisitante.visitanteId);
      } else {
        // Si es un visitante nuevo, incluir sus datos
        datosVisita.tipoDocumentoId = parseInt(formVisitante.tipoDocumentoId);
        datosVisita.numeroDocumento = formVisitante.numeroDocumento;
        datosVisita.nombres = formVisitante.nombres;
        datosVisita.apellidos = formVisitante.apellidos;
      }

      // Solo agregar empleadoId si está seleccionado
      if (formVisitaActivos.empleadoId) {
        datosVisita.empleadoId = parseInt(formVisitaActivos.empleadoId); // personalVisitadoId
      }

      try {
        // Registrar la visita usando la nueva función
        const response = await registrarVisitaCompleta(datosVisita);
        
        console.log('[RegistroForm] Respuesta de registrarVisitaCompleta:', response);
        console.log('[RegistroForm] Datos de visita obtenidos:', { empleado, motivo, lugar });
        
        if (response.data.success) {
          
          // Crear objeto de visitante para la UI con datos completos
          const visitanteData = {
            tipoDocumentoId: formVisitante.tipoDocumentoId,
            numeroDocumento: formVisitante.numeroDocumento,
            nombres: formVisitante.nombres,
            apellidos: formVisitante.apellidos,
            visitanteId: formVisitante.visitanteId,
            tipoDocumento: tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId),
            // Incluir datos de la visita
            empleado: empleado,
            motivo: motivo,
            lugar: lugar?.label || '',
            lugarId: lugar?.value || '',
            nombre_area: lugar?.label || '',
            nombre_motivo: motivo?.label || '',
            personal_nombres: empleado?.label?.split(' ')[0] || '',
            personal_apellidos: empleado?.label?.split(' ').slice(1).join(' ') || '',
            empleadoVisitado: empleado,
            // Datos adicionales para preservar en modo offline
            personal_cargo: empleado?.cargo || 'Sin cargo',
            area_destino_id: lugar?.value || '',
            motivo_visita_id: motivo?.value || '',
            personal_visitado_id: empleado?.value || null
          };

          console.log('[RegistroForm] Visitante a agregar con datos completos:', visitanteData);
          
          // Si es offline, mostrar mensaje especial
          if (response.data.offline) {
            setMensajeVisitante('✅ Visita guardada offline. Se sincronizará automáticamente cuando haya conexión.');
            setTipoMensaje('success');
          } else {
            setMensajeVisitante('✅ Visita registrada correctamente');
            setTipoMensaje('success');
          }

          onAddVisitor(visitanteData);
          
          // Limpiar formularios después de registrar visita exitosamente
          // Preservar el tipo de documento seleccionado
          const tipoDocumentoActual = formVisitante.tipoDocumentoId;
          setFormVisitante({
            tipoDocumentoId: tipoDocumentoActual, // Preservar tipo de documento
            numeroDocumento: '',
            nombres: '',
            apellidos: '',
            visitanteId: null
          });
          
          // Limpiar formulario de visita
          setFormVisitaActivos({
            empleadoId: '',
            motivoId: '',
            lugar: ''
          });
          
          // Limpiar búsqueda
          limpiarBusqueda();
        }
      } catch (error) {
        console.error('[RegistroForm] Error al registrar visita:', error);
        console.error('[RegistroForm] Datos de visita en catch:', { empleado, motivo, lugar });
        
        // Manejar específicamente el error de visita activa duplicada (409)
        if (error.response && error.response.status === 409) {
          setMensajeVisitante('El visitante ya tiene una visita activa. Registre su salida primero.');
          setTipoMensaje('error');
          return; // No continuar con el proceso
        }
        
        // Para otros errores de red, NO mostrar error si puede ser offline
        const isNetworkError = !error.response || error.message === 'Network Error' || error.code === 'ERR_NETWORK';
        
        if (isNetworkError) {
          setMensajeVisitante('⚠️ Sin conexión. La visita se guardará cuando haya internet.');
          setTipoMensaje('warning');
        } else {
          setMensajeVisitante('Error al registrar la visita: ' + (error.response?.data?.message || error.message));
          setTipoMensaje('error');
        }
      }
    } else {
      // Si no hay datos de visita completos, agregar el visitante a la lista de espera
      // PERO preservar los datos de visita si están disponibles en el formulario
      
      // Intentar obtener los datos de visita del formulario si existen
      let empleado = null, motivo = null, lugar = null;
      if (formVisitaActivos.empleadoId || formVisitaActivos.motivoId || formVisitaActivos.lugar) {
        const datosVisita = obtenerDatosVisita(formVisitaActivos, true);
        empleado = datosVisita.empleado;
        motivo = datosVisita.motivo;
        lugar = datosVisita.lugar;
      }
      
      // Crear objeto de visitante para la UI
      const visitanteData = {
        tipoDocumentoId: formVisitante.tipoDocumentoId,
        numeroDocumento: formVisitante.numeroDocumento,
        nombres: formVisitante.nombres,
        apellidos: formVisitante.apellidos,
        visitanteId: formVisitante.visitanteId,
        tipoDocumento: tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId),
        // PRESERVAR datos de visita si están disponibles
        empleado: empleado,
        motivo: motivo,
        lugar: lugar?.label || '',
        lugarId: lugar?.value || formVisitaActivos.lugar || '',
        nombre_area: lugar?.label || '',
        nombre_motivo: motivo?.label || '',
        personal_nombres: empleado?.label?.split(' ')[0] || '',
        personal_apellidos: empleado?.label?.split(' ').slice(1).join(' ') || '',
        empleadoVisitado: empleado
      };
      
      console.log('RegistroForm - Visitante agregado a espera CON datos de visita:', visitanteData);

      onAddVisitor(visitanteData);
      
      // Limpiar solo el formulario de visitante (preservar tipo de documento)
      const tipoDocumentoActual = formVisitante.tipoDocumentoId;
      setFormVisitante({
        tipoDocumentoId: tipoDocumentoActual, // Preservar tipo de documento
        numeroDocumento: '',
        nombres: '',
        apellidos: '',
        visitanteId: null
      });
      
      // Limpiar búsqueda
      limpiarBusqueda();
    }
  };

  // Registrar visita
  const handleRegisterVisit = () => {
    if (!isVisitaFormValid || visitantesEnEspera.length === 0) return;
    
    const visitaData = {
      empleadoId: formVisitaActivos.empleadoId,
      motivoId: formVisitaActivos.motivoId,
      lugar: formVisitaActivos.lugar,
      empleado: empleados.find(emp => emp.value === formVisitaActivos.empleadoId),
      motivo: motivos.find(mot => mot.value === formVisitaActivos.motivoId),
      lugarId: formVisitaActivos.lugar
    };

    onRegisterVisit(visitaData);
    
    // Limpiar solo el formulario de activos
    updateFormVisitaActivos({
      empleadoId: '',
      motivoId: '',
      lugar: '',
      _tab: 'activos'
    });
    resetearFiltrosActivos();

    if (onFormChange) {
      onFormChange({
        visitante: formVisitante,
        visita: {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          _tab: 'activos'
        }
      });
    }
  };

  // Función para limpiar mensajes y estado de búsqueda
  const limpiarBusqueda = () => {
    setMensajeVisitante('');
    setTipoMensaje('');
    setVisitanteEncontrado(null);
    setDocumentoYaBuscado(''); // Resetear el estado de documento ya buscado
  };

  // Función para obtener datos de visita de manera robusta
  const obtenerDatosVisita = (formVisita, esActivos = true) => {
    const empleadosArray = esActivos ? empleadosActivos : empleadosHistorial;
    const motivosArray = esActivos ? motivosActivos : motivosHistorial;
    const lugaresArray = esActivos ? lugaresActivos : lugaresHistorial;
    
    // Buscar en arrays específicos primero, luego en arrays principales como fallback
    const empleado = empleadosArray.find(emp => emp.value === formVisita.empleadoId) || 
                     empleados.find(emp => emp.value === formVisita.empleadoId);
    const motivo = motivosArray.find(mot => mot.value === formVisita.motivoId) || 
                   motivos.find(mot => mot.value === formVisita.motivoId);
    const lugar = lugaresArray.find(lug => lug.value === formVisita.lugar) || 
                  lugares.find(lug => lug.value === formVisita.lugar);
    
    
    return { empleado, motivo, lugar };
  };

  // Función corregida para limpiar visitante
  const handleLimpiarVisitante = () => {
    // Buscar DNI en los tipos disponibles o usar el primer tipo
    let tipoPorDefecto = tiposDocumento[0]?.value || '1'; // Fallback
    if (tiposDocumento.length > 0) {
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label && (
          tipo.label.toLowerCase().includes('dni') || 
          tipo.label.toLowerCase().includes('documento nacional')
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
    
    // ✅ CORRECCIÓN: Usar el formulario correcto según el tab activo
    const currentFormVisita = activeTab === 'activos' ? formVisitaActivos : formVisitaHistorial;
    
    // Notificar al componente padre que se ha limpiado el formulario
    if (onFormChange) {
      onFormChange({
        visitante: newFormVisitante,
        visita: currentFormVisita // ✅ Ahora usa el formulario correcto
      });
    }
  };

  // También deberías agregar una función para limpiar el formulario de visita específico
  const handleLimpiarFormularioVisita = () => {
    if (activeTab === 'activos') {
      const newFormVisitaActivos = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        _tab: 'activos'
      };
      updateFormVisitaActivos(newFormVisitaActivos);
      // Restaurar la lista completa de empleados al limpiar
      setEmpleadosActivos(empleados);
      
      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: newFormVisitaActivos
        });
      }
    } else {
      const newFormVisitaHistorial = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        busqueda: '',
        _tab: 'historial'
      };
      updateFormVisitaHistorial(newFormVisitaHistorial);
      // Restaurar la lista completa de empleados con opción "Todos" al limpiar historial
      setEmpleadosHistorial([{ value: '', label: 'Todos los empleados' }, ...empleados]);
      
      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: newFormVisitaHistorial
        });
      }
      
      // Ejecutar búsqueda con filtros vacíos para mostrar todos los registros
      if (onBuscarHistorial) {
        const filtrosVacios = {
          busqueda: '',
          empleadoId: '',
          motivoId: '',
          lugar: '',
          fechaDesde: null, // Usar null para limpiar fechas
          fechaHasta: null  // Usar null para limpiar fechas
        };
        onBuscarHistorial(filtrosVacios);
      }
    }
  };

  // Función para manejar la búsqueda de historial
  const handleBuscarHistorial = () => {
    if (onBuscarHistorial) {
      // Preparar los filtros para enviar al componente padre
      const filtros = {
        busqueda: formVisitaHistorial.busqueda,
        empleadoId: formVisitaHistorial.empleadoId,
        motivoId: formVisitaHistorial.motivoId,
        lugar: formVisitaHistorial.lugar
        // fechaDesde y fechaHasta se manejan en el componente padre
      };
      
      // Llamar a la función de búsqueda del componente padre
      onBuscarHistorial(filtros);
    }
  };

  // Función adicional: Limpiar al cambiar de tab (llamar desde el componente padre)
  const handleTabChange = (newTab) => {
    // Limpiar formularios al cambiar de tab para evitar persistencia de valores
    if (newTab === 'activos') {
      // Limpiar formulario de activos
      const newFormVisitaActivos = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        _tab: 'activos'
      };
      updateFormVisitaActivos(newFormVisitaActivos);
      // Restaurar la lista completa de empleados al cambiar a activos
      setEmpleadosActivos(empleados);
      
      // Notificar al componente padre
      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: newFormVisitaActivos
        });
      }
    } else {
      // Limpiar formulario de historial
      const newFormVisitaHistorial = {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        busqueda: '',
        _tab: 'historial'
      };
      updateFormVisitaHistorial(newFormVisitaHistorial);
      // Restaurar la lista completa de empleados con opción "Todos" al cambiar a historial
      setEmpleadosHistorial([{ value: '', label: 'Todos los empleados' }, ...empleados]);
      
      // Notificar al componente padre
      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: newFormVisitaHistorial
        });
      }
      
      // Ejecutar búsqueda inicial con filtros vacíos para mostrar todos los registros
      if (onBuscarHistorial) {
        const filtrosVacios = {
          busqueda: '',
          empleadoId: '',
          motivoId: '',
          lugar: '',
          fechaDesde: null, // Usar null para limpiar fechas
          fechaHasta: null  // Usar null para limpiar fechas
        };
        onBuscarHistorial(filtrosVacios);
      }
    }
  };

  const isVisitanteFormValid = activeTab === 'activos' 
    ? (formVisitante.numeroDocumento && formVisitante.nombres && formVisitante.apellidos)
    : true; // En historial siempre es válido (puede estar en "Todos")

  const isVisitaFormValid = activeTab === 'activos'
    ? (formVisitaActivos.empleadoId && formVisitaActivos.motivoId && formVisitaActivos.lugar)
    : true; // En historial siempre es válido (puede estar en "Todos")

  return (
    <div className="h-full flex flex-col overflow-visible">
      <Card
        className="shadow-lg border border-gray-200 bg-white flex flex-col overflow-visible rounded-2xl"
      >
        <div className="p-0 flex-1 flex flex-col overflow-visible">
          {/* Sección de Datos del Visitante - Solo para ACTIVOS */}
          {activeTab === 'activos' && (
            <div className="flex-shrink-0 space-y-3 border border-gray-200 rounded-xl pb-3 mb-3 p-3">
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                Datos del Visitante
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Columna 1: Tipo de Documento. La dejamos como está,
                    asumiendo que tu componente SelectCustom maneja bien su altura. */}
                <div>
                  <SelectCustom
                    label="Tipo de Documento *"
                    value={tiposDocumento.find(tipo => tipo.value === formVisitante.tipoDocumentoId)}
                    onChange={(selectedOption) => handleVisitanteChange('tipoDocumentoId', selectedOption?.value || '')}
                    options={tiposDocumento}
                    placeholder="Seleccione..."
                    isLoading={loadingData}
                    isClearable={false}
                  />
                </div>
                
                {/* Columna 2: Número de Documento */}
                {/* ¡AQUÍ ESTÁ LA MAGIA! */}
                {/* flex: convierte el div en un contenedor flex. */}
                {/* flex-col: lo orienta verticalmente. */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento *
                  </label>
                  
                  {/* mt-auto: empuja este div hacia abajo, ocupando todo el espacio vertical disponible. */}
                  <div className="flex mt-auto">
                    <Input
                      ref={documentoInput}
                      value={formVisitante.numeroDocumento}
                      onChange={(e) => handleVisitanteChange('numeroDocumento', e.target.value)}
                      placeholder=""
                      maxLength="20"
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
                  maxLength="150"
                />
                <Input
                  label="Apellidos *"
                  value={formVisitante.apellidos}
                  onChange={(e) => handleVisitanteChange('apellidos', e.target.value)}
                  placeholder=""
                  maxLength="150"
                />
              </div>

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
                  onClick={handleAddVisitor}
                  disabled={!isVisitanteFormValid}
                  leftIcon={<PlusIcon className="h-4 w-4" />}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  size="sm"
                >
                  Agregar Visitante
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
          )}


          {/* Sección de datos de la visita */}
          <div className={`flex-1 flex flex-col overflow-visible border border-gray-200 rounded-xl p-3 ${
            activeTab === 'activos' && visitantesEnEspera.length === 0 ? 'opacity-50 pointer-events-none' : ''
          }`}>
            <h3 className="text-base font-semibold text-gray-800 mb-3">
              {activeTab === 'activos' ? 'Datos de la Visita' : 'Buscar Visita'}
              {activeTab === 'activos' && visitantesEnEspera.length === 0 && (
                <span className="text-sm text-gray-500 ml-2">(Agregue un visitante primero)</span>
              )}
            </h3>
            
            {activeTab === 'activos' ? (
              <div className="space-y-4 flex-1">
            <SelectCustom
              label="Empleado a Visitar *"
              value={formVisitaActivos.empleadoId ? empleadosActivos.find(emp => emp.value === formVisitaActivos.empleadoId) : null}
              onChange={(selectedOption) => {
                console.warn('🎯 [SelectCustom-Empleado] onChange LLAMADO!');
                console.warn('🎯 [SelectCustom-Empleado] selectedOption:', selectedOption);
                handleVisitaChangeActivos('empleadoId', selectedOption?.value || '');
              }}
              options={empleadosActivos}
              placeholder="Seleccione empleado..."
              isSearchable={true}
              isLoading={loadingData}
              menuWidth="auto" // El menú se ajustará automáticamente al contenido
              noOptionsMessage="No se encontraron empleados"
            />

                <div className="grid grid-cols-2 gap-3">
              <SelectCustom
                label="Motivo de Visita *"
                value={formVisitaActivos.motivoId ? motivosActivos.find(mot => mot.value === formVisitaActivos.motivoId) : null}
                onChange={(selectedOption) => {
                  console.warn('🎯 [SelectCustom-Motivo] onChange LLAMADO!');
                  console.warn('🎯 [SelectCustom-Motivo] selectedOption:', selectedOption);
                  handleVisitaChangeActivos('motivoId', selectedOption?.value || '');
                }}
                options={motivosActivos}
                placeholder="Seleccione motivo..."
                isLoading={loadingData}
                isClearable={false}
                noOptionsMessage="No se encontraron motivos"
              />
              <SelectCustom
                label="Lugar *"
                value={formVisitaActivos.lugar ? lugaresActivos.find(lug => lug.value === formVisitaActivos.lugar) : null}
                onChange={(selectedOption) => {
                  console.warn('🎯 [SelectCustom-Lugar] onChange LLAMADO!');
                  console.warn('🎯 [SelectCustom-Lugar] selectedOption:', selectedOption);
                  handleVisitaChangeActivos('lugar', selectedOption?.value || '');
                }}
                options={lugaresActivos}
                placeholder="Seleccione lugar..."
                isClearable={false}
                noOptionsMessage="No se encontraron lugares"
              />
                </div>
              </div>
            ) : (
              /* Campos de búsqueda para historial */
              <div className="space-y-4 flex-1">
                {/* Campo de búsqueda general */}
                <Input
                  ref={busquedaInput}
                  label="Buscar Visitante"
                  value={formVisitaHistorial.busqueda}
                  onChange={(e) => handleVisitaChangeHistorial('busqueda', e.target.value)}
                  placeholder="Nombre, apellido o número de documento..."
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                />

                <SelectCustom
                  label="Buscar por Empleado"
                  value={formVisitaHistorial.empleadoId ? empleadosHistorial.find(emp => emp.value === formVisitaHistorial.empleadoId) : null}
                  onChange={(selectedOption) => handleVisitaChangeHistorial('empleadoId', selectedOption?.value || '')}
                  options={empleadosHistorial}
                  placeholder="Seleccione empleado..."
                  isSearchable={true}
                  noOptionsMessage="No se encontraron empleados"
                />

                <div className="grid grid-cols-2 gap-3">
                  <SelectCustom
                    label="Buscar por Motivo"
                    value={formVisitaHistorial.motivoId ? motivosHistorial.find(mot => mot.value === formVisitaHistorial.motivoId) : null}
                    onChange={(selectedOption) => handleVisitaChangeHistorial('motivoId', selectedOption?.value || '')}
                    options={motivosHistorial}
                    placeholder="Seleccione motivo..."
                    isSearchable={true}
                    noOptionsMessage="No se encontraron motivos"
                  />
                  <SelectCustom
                    label="Buscar por Lugar"
                    value={formVisitaHistorial.lugar ? lugaresHistorial.find(lug => lug.value === formVisitaHistorial.lugar) : null}
                    onChange={(selectedOption) => handleVisitaChangeHistorial('lugar', selectedOption?.value || '')}
                    options={lugaresHistorial}
                    placeholder="Seleccione lugar..."
                    isSearchable={true}
                    noOptionsMessage="No se encontraron lugares"
                  />
                </div>
              </div>
            )}
            </div>
            
                    {/* Botones de registro y limpieza */}
          <div className="flex-shrink-0 mt-2 pt-2">
            <div className="flex gap-3">
              <Button
                onClick={activeTab === 'activos' ? handleRegisterVisit : handleBuscarHistorial}
                disabled={activeTab === 'activos' && (!isVisitaFormValid || visitantesEnEspera.length === 0)}
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
                onClick={handleLimpiarFormularioVisita} // Usar la función que limpia según el tab activo
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

RegistroForm.displayName = 'RegistroForm';

export default RegistroForm;