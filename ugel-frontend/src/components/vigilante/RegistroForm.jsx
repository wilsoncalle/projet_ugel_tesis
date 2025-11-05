import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Card from '../Card';
import Button from '../Button';
import Input from '../Input';
import SelectCustom from '../SelectCustom';
import Badge from '../Badge';
import ModalDetalles from '../ModalDetalles';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  tiposDocumentoService,
  motivosVisitaService,
  personalService,
  areasService,
  visitantesService,
  registrarVisitaCompleta,
  getVisitantesActivos,
  papeletasSalidaService,
} from '../../services/api';

const RegistroForm = forwardRef(
  (
    {
      visitantesEnEspera,
      onAddVisitor,
      onRegisterVisit,
      onFormChange,
      activeTab = 'activos',
      onTabChange,
      onBuscarHistorial,
      refs = {},
    },
    ref
  ) => {
    const [formVisitante, setFormVisitante] = useState({
      tipoDocumentoId: '',
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      visitanteId: null,
    });

    const [formVisitaActivos, setFormVisitaActivos] = useState({
      empleadoId: '',
      motivoId: '',
      lugar: '',
      _tab: 'activos',
    });

    const [formVisitaHistorial, setFormVisitaHistorial] = useState({
      empleadoId: '',
      motivoId: '',
      lugar: '',
      busqueda: '',
      _tab: 'historial',
    });

    const [tiposDocumento, setTiposDocumento] = useState([]);
    const [motivos, setMotivos] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [lugares, setLugares] = useState([]);

    const [empleadosActivos, setEmpleadosActivos] = useState([]);
    const [empleadosHistorial, setEmpleadosHistorial] = useState([]);
    const [motivosActivos, setMotivosActivos] = useState([]);
    const [motivosHistorial, setMotivosHistorial] = useState([]);
    const [lugaresActivos, setLugaresActivos] = useState([]);
    const [lugaresHistorial, setLugaresHistorial] = useState([]);

    const [buscandoVisitante, setBuscandoVisitante] = useState(false);
    const [visitanteEncontrado, setVisitanteEncontrado] = useState(null);
    const [mensajeVisitante, setMensajeVisitante] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('');
    const [documentoYaBuscado, setDocumentoYaBuscado] = useState('');

    const [mensajeEstadoEmpleado, setMensajeEstadoEmpleado] =
      useState(null);
    const [tipoMensajeEmpleado, setTipoMensajeEmpleado] =
      useState(null);
    const [empleadoSeleccionadoActual, setEmpleadoSeleccionadoActual] = useState(null);

    const [loadingData, setLoadingData] = useState(false);
    
    const [isModalPapeletaOpen, setIsModalPapeletaOpen] = useState(false);
    const [papeletaSeleccionada, setPapeletaSeleccionada] = useState(null);
    const [loadingPapeleta, setLoadingPapeleta] = useState(false);

    const { documentoInput, busquedaInput } = refs;

    useImperativeHandle(ref, () => ({
      getCurrentFormData: () => {
        if (activeTab === 'activos') {
          return {
            empleadoId: formVisitaActivos.empleadoId,
            motivoId: formVisitaActivos.motivoId,
            lugar: formVisitaActivos.lugar,
          };
        } else {
          return {
            empleadoId: formVisitaHistorial.empleadoId,
            motivoId: formVisitaHistorial.motivoId,
            lugar: formVisitaHistorial.lugar,
            busqueda: formVisitaHistorial.busqueda,
          };
        }
      },
      triggerRegisterVisit: () => {
        if (activeTab === 'activos') {
          handleRegisterVisit();
        } else {
          handleBuscarHistorial();
        }
      },
    }));

    const updateFormVisitaActivos = (newFormVisita) => {
      setFormVisitaActivos(newFormVisita);
    };

    const updateFormVisitaHistorial = (newFormVisita) => {
      setFormVisitaHistorial(newFormVisita);
    };

    useEffect(() => {
      cargarDatosIniciales();
    }, []);

    const [previousTab, setPreviousTab] = useState(activeTab);

    useEffect(() => {
      const documentoActual = `${formVisitante.tipoDocumentoId}-${formVisitante.numeroDocumento}`;

      if (
        formVisitante.tipoDocumentoId &&
        formVisitante.numeroDocumento &&
        formVisitante.numeroDocumento.length >= 8 &&
        !buscandoVisitante &&
        documentoActual !== documentoYaBuscado
      ) {
        const timeoutId = setTimeout(() => {
          buscarVisitante();
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    }, [
      formVisitante.tipoDocumentoId,
      formVisitante.numeroDocumento,
      buscandoVisitante,
      documentoYaBuscado,
    ]);

    useEffect(() => {
      if (previousTab !== activeTab) {
        const newFormVisitaActivos = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          _tab: 'activos',
        };

        const newFormVisitaHistorial = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          busqueda: '',
          _tab: 'historial',
        };

        updateFormVisitaActivos(newFormVisitaActivos);
        updateFormVisitaHistorial(newFormVisitaHistorial);

        setEmpleadosActivos(empleados);
        setEmpleadosHistorial([
          { value: '', label: 'Todos los empleados' },
          ...empleados,
        ]);

        if (onFormChange) {
          const currentFormVisita =
            activeTab === 'activos'
              ? newFormVisitaActivos
              : newFormVisitaHistorial;
          onFormChange({
            visitante: formVisitante,
            visita: currentFormVisita,
          });
        }

        setMensajeEstadoEmpleado(null);
        setTipoMensajeEmpleado(null);

        setPreviousTab(activeTab);
      }
    }, [activeTab, previousTab, empleados, formVisitante, onFormChange]);

    const cargarDatosIniciales = async () => {
      setLoadingData(true);
      try {
        const [
          tiposResponse,
          motivosResponse,
          empleadosResponse,
          areasResponse,
        ] = await Promise.all([
          tiposDocumentoService.getAll(),
          motivosVisitaService.getAll(),
          personalService.getAll(),
          areasService.getAll(),
        ]);

        if (tiposResponse.data.success) {
          const tiposData = tiposResponse.data.data.map((tipo) => ({
            value: tipo.id.toString(),
            label: tipo.nombre_completo || tipo.nombre,
          }));
          setTiposDocumento(tiposData);

          const tipoDNI = tiposData.find(
            (tipo) =>
              tipo.label?.toLowerCase().includes('dni') ||
              tipo.label
                ?.toLowerCase()
                .includes('documento nacional')
          );
          if (tipoDNI && !formVisitante.tipoDocumentoId) {
            setFormVisitante((prev) => ({
              ...prev,
              tipoDocumentoId: tipoDNI.value,
            }));
          }
        }

        if (motivosResponse.data.success) {
          const motivosData = motivosResponse.data.data.map(
            (motivo) => ({
              value: motivo.id.toString(),
              label: motivo.nombre_motivo || motivo.nombre,
            })
          );
          setMotivos(motivosData);
          setMotivosActivos(motivosData);
          setMotivosHistorial([
            { value: '', label: 'Todos los motivos' },
            ...motivosData,
          ]);
        }

        if (empleadosResponse.data.success) {
          const empleadosData = empleadosResponse.data.data.map(
            (empleado) => {
              const estadoBruto = (empleado.estado_presencia || '')
                .toString()
                .trim()
                .toLowerCase();

              let estado = 'disponible';

              // Si no hay registro de asistencia, lo consideramos ausente
              if (!empleado.estado_presencia) {
                estado = 'ausente';
              }
              // Ausente explícito
              else if (
                estadoBruto === 'ausente' ||
                estadoBruto === 'falta' ||
                estadoBruto === 'faltó' ||
                estadoBruto === 'falto' ||
                estadoBruto === 'sin marca' ||
                estadoBruto === 'sin_marca'
              ) {
                estado = 'ausente';
              }
              // Permiso / comisión o papeleta activa
              else if (
                estadoBruto === 'permiso' ||
                estadoBruto === 'comisión' ||
                estadoBruto === 'comision' ||
                empleado.tiene_papeleta_activa
              ) {
                estado = 'permiso';
              }

              return {
                value: empleado.id.toString(),
                label: `${empleado.nombres} ${empleado.apellidos}`,
                areaId: empleado.area_destino_id,
                areaNombre: empleado.area_nombre || 'Sin área',
                cargo: empleado.cargo_nombre || 'Sin cargo',
                estado,
                detallePapeleta: empleado.codigo_papeleta_activa || null,
              };
            }
          );
          setEmpleados(empleadosData);
          setEmpleadosActivos(empleadosData);
          setEmpleadosHistorial([
            { value: '', label: 'Todos los empleados' },
            ...empleadosData,
          ]);
        }

        if (areasResponse.data.success) {
          const lugaresData = areasResponse.data.data.map((area) => ({
            value: area.id.toString(),
            label: area.nombre_area || area.nombre,
          }));
          setLugares(lugaresData);
          setLugaresActivos(lugaresData);
          setLugaresHistorial([
            { value: '', label: 'Todos los lugares' },
            ...lugaresData,
          ]);
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoadingData(false);
      }
    };

    const filtrarEmpleadosPorAreaActivos = (areaId) => {
      if (!areaId) {
        setEmpleadosActivos(empleados);
      } else {
        const empleadosFiltrados = empleados.filter(
          (empleado) =>
            empleado.areaId &&
            empleado.areaId.toString() === areaId
        );
        setEmpleadosActivos(empleadosFiltrados);
      }
    };

    const resetearFiltrosActivos = () => {
      setEmpleadosActivos(empleados);
    };

    const obtenerAreaDeEmpleado = (empleadoId) => {
      const empleado = empleados.find(
        (emp) => emp.value === empleadoId
      );
      return empleado ? empleado.areaId : null;
    };

    const obtenerEmpleadosDeArea = (areaId) => {
      if (!areaId) {
        return empleados;
      }
      return empleados.filter(
        (empleado) =>
          empleado.areaId &&
          empleado.areaId.toString() === areaId
      );
    };

    const actualizarLugarPorEmpleado = (empleadoId) => {
      if (!empleadoId) return '';

      const areaId = obtenerAreaDeEmpleado(empleadoId);
      if (areaId) {
        const lugarCorrespondiente = lugares.find(
          (lugar) => lugar.value === areaId.toString()
        );
        if (lugarCorrespondiente) {
          return lugarCorrespondiente.value;
        }
      }
      return '';
    };

    const actualizarEmpleadosPorLugar = (lugarId) => {
      const empleadosDelArea = obtenerEmpleadosDeArea(lugarId);
      setEmpleadosActivos(empleadosDelArea);
    };

    const obtenerAreaDeEmpleadoHistorial = (empleadoId) => {
      const empleado = empleados.find(
        (emp) => emp.value === empleadoId
      );
      return empleado ? empleado.areaId : null;
    };

    const obtenerEmpleadosDeAreaHistorial = (areaId) => {
      if (!areaId) {
        return [
          { value: '', label: 'Todos los empleados' },
          ...empleados,
        ];
      }
      const empleadosDelArea = empleados.filter(
        (empleado) =>
          empleado.areaId &&
          empleado.areaId.toString() === areaId
      );
      return [
        { value: '', label: 'Todos los empleados' },
        ...empleadosDelArea,
      ];
    };

    const actualizarLugarPorEmpleadoHistorial = (empleadoId) => {
      if (!empleadoId) return '';

      const areaId = obtenerAreaDeEmpleadoHistorial(empleadoId);
      if (areaId) {
        const lugarCorrespondiente = lugares.find(
          (lugar) => lugar.value === areaId.toString()
        );
        if (lugarCorrespondiente) {
          return lugarCorrespondiente.value;
        }
      }
      return '';
    };

    const actualizarEmpleadosPorLugarHistorial = (lugarId) => {
      const empleadosDelArea =
        obtenerEmpleadosDeAreaHistorial(lugarId);
      setEmpleadosHistorial(empleadosDelArea);
    };

    const verificarVisitaActiva = async (visitanteId) => {
      try {
        const response = await getVisitantesActivos();
        if (response.data.success && response.data.data) {
          const visitasActivas = response.data.data;
          const visitaActiva = visitasActivas.find(
            (visita) => visita.visitante_id === visitanteId
          );
          return visitaActiva;
        }
        return null;
      } catch (error) {
        console.error(
          'Error verificando visita activa:',
          error
        );
        return null;
      }
    };

    const handleVerDetallesPapeleta = async () => {
      if (!empleadoSeleccionadoActual?.detallePapeleta) {
        console.log('No hay código de papeleta');
        return;
      }

      setLoadingPapeleta(true);
      try {
        console.log('Buscando papeleta con código:', empleadoSeleccionadoActual.detallePapeleta);
        
        // Buscar papeleta por código
        const response = await papeletasSalidaService.getAll({
          q: empleadoSeleccionadoActual.detallePapeleta,
          limit: 1
        });

        console.log('Respuesta completa:', response.data);

        if (response.data.success && response.data.data?.length > 0) {
          const papeleta = response.data.data[0];
          console.log('Papeleta encontrada:', papeleta);
          
          const papeletaMapeada = {
            ...papeleta,
            personal_solicitante_nombre: `${papeleta.solicitante_nombres || ''} ${papeleta.solicitante_apellidos || ''}`.trim(),
            personal_autoriza_nombre: papeleta.autoriza_nombres && papeleta.autoriza_apellidos 
              ? `${papeleta.autoriza_nombres} ${papeleta.autoriza_apellidos}`.trim()
              : '-',
            motivo_nombre: papeleta.nombre_motivo || '-',
            area_destino_nombre: '-',
          };
          
          setPapeletaSeleccionada(papeletaMapeada);
          setIsModalPapeletaOpen(true);
        } else {
          console.error('No se encontró la papeleta. Respuesta:', response.data);
        }
      } catch (error) {
        console.error('Error al cargar detalles de papeleta:', error);
      } finally {
        setLoadingPapeleta(false);
      }
    };

    const handleCloseModalPapeleta = () => {
      setIsModalPapeletaOpen(false);
      setTimeout(() => {
        setPapeletaSeleccionada(null);
      }, 300);
    };

    const buscarVisitante = async () => {
      if (
        !formVisitante.tipoDocumentoId ||
        !formVisitante.numeroDocumento
      ) {
        return;
      }

      const documentoActual = `${formVisitante.tipoDocumentoId}-${formVisitante.numeroDocumento}`;

      setBuscandoVisitante(true);
      setMensajeVisitante('');
      setVisitanteEncontrado(null);

      try {
        const response =
          await visitantesService.getByDocumento(
            formVisitante.tipoDocumentoId,
            formVisitante.numeroDocumento
          );

        if (response.data.success && response.data.data) {
          const visitante = response.data.data;

          const yaEnEspera = visitantesEnEspera.find(
            (v) =>
              v.tipoDocumentoId ===
                formVisitante.tipoDocumentoId &&
              v.numeroDocumento ===
                formVisitante.numeroDocumento
          );

          if (yaEnEspera) {
            setMensajeVisitante(
              'Este visitante ya está en la lista de espera'
            );
            setTipoMensaje('error');
            setDocumentoYaBuscado(documentoActual);
            return;
          }

          const visitaActiva = await verificarVisitaActiva(
            visitante.id
          );
          if (visitaActiva) {
            setMensajeVisitante(
              'El visitante ya tiene una visita activa. Registre su salida primero.'
            );
            setTipoMensaje('error');
            setDocumentoYaBuscado(documentoActual);
            return;
          }

          setVisitanteEncontrado(visitante);
          setFormVisitante((prev) => ({
            ...prev,
            nombres: visitante.nombres || '',
            apellidos: visitante.apellidos || '',
            visitanteId: visitante.id,
          }));
          setMensajeVisitante('');
          setTipoMensaje('');
          setDocumentoYaBuscado(documentoActual);

          const visitanteData = {
            tipoDocumentoId: formVisitante.tipoDocumentoId,
            numeroDocumento: formVisitante.numeroDocumento,
            nombres: visitante.nombres || '',
            apellidos: visitante.apellidos || '',
            visitanteId: visitante.id,
            tipoDocumento: tiposDocumento.find(
              (tipo) =>
                tipo.value === formVisitante.tipoDocumentoId
            ),
          };

          onAddVisitor(visitanteData);

          setFormVisitante({
            tipoDocumentoId: formVisitante.tipoDocumentoId,
            numeroDocumento: '',
            nombres: '',
            apellidos: '',
            visitanteId: null,
          });
        } else {
          const yaEnEspera = visitantesEnEspera.find(
            (v) =>
              v.tipoDocumentoId ===
                formVisitante.tipoDocumentoId &&
              v.numeroDocumento ===
                formVisitante.numeroDocumento
          );

          if (yaEnEspera) {
            setMensajeVisitante(
              'Este visitante ya está en la lista de espera'
            );
            setTipoMensaje('error');
            setDocumentoYaBuscado(documentoActual);
            return;
          }

          const tipoDNI = tiposDocumento.find(
            (tipo) =>
              tipo.label
                ?.toLowerCase()
                .includes('dni') ||
              tipo.label
                ?.toLowerCase()
                .includes('documento nacional')
          );

          if (
            tipoDNI &&
            formVisitante.tipoDocumentoId === tipoDNI.value &&
            formVisitante.numeroDocumento.length === 8
          ) {
            try {
              const dniResponse =
                await visitantesService.consultarDNI(
                  formVisitante.numeroDocumento
                );

              if (
                dniResponse.data.success &&
                dniResponse.data.data
              ) {
                const datosDNI = dniResponse.data.data;

                setFormVisitante((prev) => ({
                  ...prev,
                  nombres: datosDNI.nombres,
                  apellidos: datosDNI.apellidos,
                  visitanteId: datosDNI.id,
                }));

                setMensajeVisitante('');
                setTipoMensaje('');
                setVisitanteEncontrado(datosDNI);
                setDocumentoYaBuscado(documentoActual);

                const visitanteData = {
                  tipoDocumentoId:
                    formVisitante.tipoDocumentoId,
                  numeroDocumento:
                    formVisitante.numeroDocumento,
                  nombres: datosDNI.nombres,
                  apellidos: datosDNI.apellidos,
                  visitanteId: datosDNI.id,
                  tipoDocumento: tiposDocumento.find(
                    (tipo) =>
                      tipo.value ===
                      formVisitante.tipoDocumentoId
                  ),
                };

                onAddVisitor(visitanteData);

                setFormVisitante({
                  tipoDocumentoId:
                    formVisitante.tipoDocumentoId,
                  numeroDocumento: '',
                  nombres: '',
                  apellidos: '',
                  visitanteId: null,
                });

                return;
              }
            } catch (dniError) {
              console.log(
                'Error consultando DNI externo:',
                dniError.message
              );

              if (
                dniError.response &&
                dniError.response.status === 404
              ) {
                setMensajeVisitante(
                  'DNI no encontrado en la base de datos nacional. Complete los datos manualmente.'
                );
                setTipoMensaje('info');
                setDocumentoYaBuscado(documentoActual);
                return;
              }
            }
          }

          setMensajeVisitante(
            'Visitante no encontrado. Complete los datos manualmente para registrar uno nuevo.'
          );
          setTipoMensaje('info');
          setFormVisitante((prev) => ({
            ...prev,
            visitanteId: null,
          }));
          setDocumentoYaBuscado(documentoActual);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          setMensajeVisitante(
            'Visitante no encontrado. Complete los datos manualmente para registrar uno nuevo.'
          );
          setTipoMensaje('info');
          setFormVisitante((prev) => ({
            ...prev,
            visitanteId: null,
          }));
        } else {
          setMensajeVisitante(
            'Error al buscar visitante. Intente nuevamente.'
          );
          setTipoMensaje('error');
        }

        setDocumentoYaBuscado(documentoActual);
      } finally {
        setBuscandoVisitante(false);
      }
    };

    const handleVisitanteChange = (field, value) => {
      let validatedValue = value;

      switch (field) {
        case 'numeroDocumento':
          // Si es DNI, limitar a 8 dígitos
          const tipoDNI = tiposDocumento.find(
            (tipo) =>
              tipo.label?.toLowerCase().includes('dni') ||
              tipo.label?.toLowerCase().includes('documento nacional')
          );
          
          if (tipoDNI && formVisitante.tipoDocumentoId === tipoDNI.value) {
            validatedValue = value.slice(0, 8);
          } else {
            validatedValue = value.slice(0, 20);
          }
          break;
        case 'nombres':
          validatedValue = value.slice(0, 150);
          break;
        case 'apellidos':
          validatedValue = value.slice(0, 150);
          break;
        default:
          validatedValue = value;
      }

      const newFormVisitante = {
        ...formVisitante,
        [field]: validatedValue,
      };
      setFormVisitante(newFormVisitante);

      if (
        field === 'tipoDocumentoId' ||
        field === 'numeroDocumento'
      ) {
        limpiarBusqueda();
      }

      if (
        field === 'numeroDocumento' &&
        value &&
        newFormVisitante.tipoDocumentoId
      ) {
        const documentoDuplicado = visitantesEnEspera.find(
          (visitante) =>
            visitante.tipoDocumentoId ===
              newFormVisitante.tipoDocumentoId &&
            visitante.numeroDocumento === value
        );

        if (documentoDuplicado) {
          setMensajeVisitante(
            'Ya existe un visitante con el mismo documento en la lista de espera'
          );
          setTipoMensaje('error');
        } else {
          if (
            tipoMensaje === 'error' &&
            mensajeVisitante.includes('mismo documento')
          ) {
            setMensajeVisitante('');
            setTipoMensaje('');
          }
        }
      }

      if (onFormChange) {
        onFormChange({
          visitante: newFormVisitante,
          visita:
            activeTab === 'activos'
              ? formVisitaActivos
              : formVisitaHistorial,
        });
      }
    };

    const handleVisitaChangeActivos = (field, value) => {
      let newFormVisita = {
        ...formVisitaActivos,
        [field]: value,
      };

      if (field === 'empleadoId') {
        const empleadoSeleccionado = empleadosActivos.find(
          (emp) => emp.value === value
        );

        if (empleadoSeleccionado) {
          setEmpleadoSeleccionadoActual(empleadoSeleccionado);
          
          if (empleadoSeleccionado.estado === 'permiso') {
            setMensajeEstadoEmpleado(
              `El empleado tiene un permiso de salida activo${
                empleadoSeleccionado.detallePapeleta 
                  ? ` (código ${empleadoSeleccionado.detallePapeleta})` 
                  : ''
              }.`
            );
            setTipoMensajeEmpleado('warning');
          } else if (empleadoSeleccionado.estado === 'ausente') {
            setMensajeEstadoEmpleado('El empleado registra ausencia hoy.');
            setTipoMensajeEmpleado('error');
          } else {
            setMensajeEstadoEmpleado(null);
            setTipoMensajeEmpleado(null);
          }
        } else {
          setEmpleadoSeleccionadoActual(null);
          setMensajeEstadoEmpleado(null);
          setTipoMensajeEmpleado(null);
        }

        const lugarCorrespondiente =
          actualizarLugarPorEmpleado(value);
        if (lugarCorrespondiente) {
          newFormVisita.lugar = lugarCorrespondiente;
        } else {
          newFormVisita.lugar = '';
        }
      } else if (field === 'lugar') {
        actualizarEmpleadosPorLugar(value);

        if (newFormVisita.empleadoId) {
          const empleadoSeleccionado = empleados.find(
            (emp) => emp.value === newFormVisita.empleadoId
          );
          if (
            empleadoSeleccionado &&
            empleadoSeleccionado.areaId &&
            empleadoSeleccionado.areaId.toString() !== value
          ) {
            newFormVisita.empleadoId = '';
          }
        }
      }

      updateFormVisitaActivos(newFormVisita);

      const { empleado, motivo, lugar } =
        obtenerDatosVisita(newFormVisita, true);

      const visitaCompleta = {
        ...newFormVisita,
        empleado: empleado,
        motivo: motivo,
        lugar: lugar?.label || '',
        lugarId: lugar?.value || '',
        personal_nombres: empleado?.label?.split(' ')[0] || '',
        personal_apellidos:
          empleado?.label?.split(' ').slice(1).join(' ') || '',
        nombre_motivo: motivo?.label || '',
        nombre_area: lugar?.label || '',
      };

      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: visitaCompleta,
        });
      }
    };

    const handleVisitaChangeHistorial = (field, value) => {
      let newFormVisita = {
        ...formVisitaHistorial,
        [field]: value,
      };

      if (field === 'empleadoId') {
        const lugarCorrespondiente =
          actualizarLugarPorEmpleadoHistorial(value);
        if (lugarCorrespondiente) {
          newFormVisita.lugar = lugarCorrespondiente;
        } else {
          newFormVisita.lugar = '';
        }
      } else if (field === 'lugar') {
        actualizarEmpleadosPorLugarHistorial(value);

        if (newFormVisita.empleadoId) {
          const empleadoSeleccionado = empleados.find(
            (emp) => emp.value === newFormVisita.empleadoId
          );
          if (
            empleadoSeleccionado &&
            empleadoSeleccionado.areaId &&
            empleadoSeleccionado.areaId.toString() !== value
          ) {
            newFormVisita.empleadoId = '';
          }
        }
      }

      updateFormVisitaHistorial(newFormVisita);

      const { empleado, motivo, lugar } =
        obtenerDatosVisita(newFormVisita, false);

      const visitaCompleta = {
        ...newFormVisita,
        empleado: empleado,
        motivo: motivo,
        lugar: lugar?.label || '',
        lugarId: lugar?.value || '',
        personal_nombres: empleado?.label?.split(' ')[0] || '',
        personal_apellidos:
          empleado?.label?.split(' ').slice(1).join(' ') || '',
        nombre_motivo: motivo?.label || '',
        nombre_area: lugar?.label || '',
      };

      if (onFormChange) {
        onFormChange({
          visitante: formVisitante,
          visita: visitaCompleta,
        });
      }
    };

    const handleAddVisitor = async () => {
      if (!isVisitanteFormValid) {
        return;
      }

      if (
        !formVisitante.visitanteId &&
        formVisitante.tipoDocumentoId &&
        formVisitante.numeroDocumento
      ) {
        try {
          await buscarVisitante();
          await new Promise((resolve) =>
            setTimeout(resolve, 100)
          );

          if (formVisitante.visitanteId) {
            const visitaActiva =
              await verificarVisitaActiva(
                formVisitante.visitanteId
              );
            if (visitaActiva) {
              setMensajeVisitante(
                'El visitante ya tiene una visita activa. Registre su salida primero.'
              );
              setTipoMensaje('error');
              return;
            }
          }
        } catch (error) {
          console.error(
            'Error al buscar visitante:',
            error
          );
        }
      }

      const documentoDuplicado = visitantesEnEspera.find(
        (visitante) =>
          visitante.tipoDocumentoId ===
            formVisitante.tipoDocumentoId &&
          visitante.numeroDocumento ===
            formVisitante.numeroDocumento
      );

      if (documentoDuplicado) {
        setMensajeVisitante(
          'Ya existe un visitante con el mismo documento en la lista de espera'
        );
        setTipoMensaje('error');
        return;
      }

      const tieneDatosVisita =
        formVisitaActivos.motivoId &&
        formVisitaActivos.lugar;

      if (tieneDatosVisita) {
        const { empleado, motivo, lugar } =
          obtenerDatosVisita(formVisitaActivos, true);

        const datosVisita = {
          lugarId: parseInt(formVisitaActivos.lugar),
          motivoId: parseInt(formVisitaActivos.motivoId),
        };

        if (formVisitante.visitanteId) {
          datosVisita.visitanteId = parseInt(
            formVisitante.visitanteId
          );
        } else {
          datosVisita.tipoDocumentoId = parseInt(
            formVisitante.tipoDocumentoId
          );
          datosVisita.numeroDocumento =
            formVisitante.numeroDocumento;
          datosVisita.nombres = formVisitante.nombres;
          datosVisita.apellidos = formVisitante.apellidos;
        }

        if (formVisitaActivos.empleadoId) {
          datosVisita.empleadoId = parseInt(
            formVisitaActivos.empleadoId
          );
        }

        try {
          const response =
            await registrarVisitaCompleta(datosVisita);

          if (response.data.success) {
            const visitanteData = {
              tipoDocumentoId: formVisitante.tipoDocumentoId,
              numeroDocumento:
                formVisitante.numeroDocumento,
              nombres: formVisitante.nombres,
              apellidos: formVisitante.apellidos,
              visitanteId: formVisitante.visitanteId,
              tipoDocumento: tiposDocumento.find(
                (tipo) =>
                  tipo.value === formVisitante.tipoDocumentoId
              ),
              empleado: empleado,
              motivo: motivo,
              lugar: lugar?.label || '',
              lugarId: lugar?.value || '',
              nombre_area: lugar?.label || '',
              nombre_motivo: motivo?.label || '',
              personal_nombres:
                empleado?.label?.split(' ')[0] || '',
              personal_apellidos:
                empleado?.label
                  ?.split(' ')
                  .slice(1)
                  .join(' ') || '',
              empleadoVisitado: empleado,
              personal_cargo: empleado?.cargo || 'Sin cargo',
              area_destino_id: lugar?.value || '',
              motivo_visita_id: motivo?.value || '',
              personal_visitado_id: empleado?.value || null,
            };

            if (response.data.offline) {
              setMensajeVisitante(
                'Visita guardada offline. Se sincronizará automáticamente cuando haya conexión.'
              );
              setTipoMensaje('success');
            } else {
              setMensajeVisitante(
                'Visita registrado correctamente'
              );
              setTipoMensaje('success');
            }

            onAddVisitor(visitanteData);

            const tipoDocumentoActual =
              formVisitante.tipoDocumentoId;
            setFormVisitante({
              tipoDocumentoId: tipoDocumentoActual,
              numeroDocumento: '',
              nombres: '',
              apellidos: '',
              visitanteId: null,
            });

            setFormVisitaActivos({
              empleadoId: '',
              motivoId: '',
              lugar: '',
            });

            // Limpiar mensajes de estado del empleado
            setMensajeEstadoEmpleado(null);
            setTipoMensajeEmpleado(null);
            setEmpleadoSeleccionadoActual(null);

            limpiarBusqueda();
          }
        } catch (error) {
          console.error(
            '[RegistroForm] Error al registrar visita:',
            error
          );

          if (
            error.response &&
            error.response.status === 409
          ) {
            setMensajeVisitante(
              'El visitante ya tiene una visita activa. Registre su salida primero.'
            );
            setTipoMensaje('error');
            return;
          }

          const isNetworkError =
            !error.response ||
            error.message === 'Network Error' ||
            error.code === 'ERR_NETWORK';

          if (isNetworkError) {
            setMensajeVisitante(
              'Sin conexión. La visita se guardará cuando haya internet.'
            );
            setTipoMensaje('warning');
          } else {
            setMensajeVisitante(
              'Error al registrar la visita: ' +
                (error.response?.data?.message ||
                  error.message)
            );
            setTipoMensaje('error');
          }
        }
      } else {
        let empleado = null,
          motivo = null,
          lugar = null;
        if (
          formVisitaActivos.empleadoId ||
          formVisitaActivos.motivoId ||
          formVisitaActivos.lugar
        ) {
          const datosVisita = obtenerDatosVisita(
            formVisitaActivos,
            true
          );
          empleado = datosVisita.empleado;
          motivo = datosVisita.motivo;
          lugar = datosVisita.lugar;
        }

        const visitanteData = {
          tipoDocumentoId: formVisitante.tipoDocumentoId,
          numeroDocumento: formVisitante.numeroDocumento,
          nombres: formVisitante.nombres,
          apellidos: formVisitante.apellidos,
          visitanteId: formVisitante.visitanteId,
          tipoDocumento: tiposDocumento.find(
            (tipo) =>
              tipo.value === formVisitante.tipoDocumentoId
          ),
          empleado: empleado,
          motivo: motivo,
          lugar: lugar?.label || '',
          lugarId:
            lugar?.value || formVisitaActivos.lugar || '',
          nombre_area: lugar?.label || '',
          nombre_motivo: motivo?.label || '',
          personal_nombres:
            empleado?.label?.split(' ')[0] || '',
          personal_apellidos:
            empleado?.label
              ?.split(' ')
              .slice(1)
              .join(' ') || '',
          empleadoVisitado: empleado,
        };

        onAddVisitor(visitanteData);

        const tipoDocumentoActual =
          formVisitante.tipoDocumentoId;
        setFormVisitante({
          tipoDocumentoId: tipoDocumentoActual,
          numeroDocumento: '',
          nombres: '',
          apellidos: '',
          visitanteId: null,
        });

        // Limpiar mensajes de estado del empleado
        setMensajeEstadoEmpleado(null);
        setTipoMensajeEmpleado(null);
        setEmpleadoSeleccionadoActual(null);

        limpiarBusqueda();
      }
    };

    const handleRegisterVisit = () => {
  if (!isVisitaFormValid || !visitantesEnEspera || visitantesEnEspera.length === 0)
    return;

  const visitaData = {
    empleadoId: formVisitaActivos.empleadoId,
    motivoId: formVisitaActivos.motivoId,
    lugar: formVisitaActivos.lugar,
    empleado: empleados.find(
      (emp) => emp.value === formVisitaActivos.empleadoId
    ),
    motivo: motivos.find(
      (mot) => mot.value === formVisitaActivos.motivoId
    ),
    lugarId: formVisitaActivos.lugar,
  };

  onRegisterVisit(visitaData);

  updateFormVisitaActivos({
    empleadoId: '',
    motivoId: '',
    lugar: '',
    _tab: 'activos',
  });
  resetearFiltrosActivos();

  // AGREGAR ESTAS 3 LÍNEAS PARA LIMPIAR LOS MENSAJES:
  setMensajeEstadoEmpleado(null);
  setTipoMensajeEmpleado(null);
  setEmpleadoSeleccionadoActual(null);

  if (onFormChange) {
    onFormChange({
      visitante: formVisitante,
      visita: {
        empleadoId: '',
        motivoId: '',
        lugar: '',
        _tab: 'activos',
      },
    });
  }
};

    const limpiarBusqueda = () => {
      setMensajeVisitante('');
      setTipoMensaje('');
      setVisitanteEncontrado(null);
      setDocumentoYaBuscado('');
    };

    const obtenerDatosVisita = (formVisita, esActivos = true) => {
      const empleadosArray = esActivos
        ? empleadosActivos
        : empleadosHistorial;
      const motivosArray = esActivos
        ? motivosActivos
        : motivosHistorial;
      const lugaresArray = esActivos
        ? lugaresActivos
        : lugaresHistorial;

      const empleado =
        empleadosArray.find(
          (emp) => emp.value === formVisita.empleadoId
        ) ||
        empleados.find(
          (emp) => emp.value === formVisita.empleadoId
        );
      const motivo =
        motivosArray.find(
          (mot) => mot.value === formVisita.motivoId
        ) ||
        motivos.find(
          (mot) => mot.value === formVisita.motivoId
        );
      const lugar =
        lugaresArray.find(
          (lug) => lug.value === formVisita.lugar
        ) ||
        lugares.find(
          (lug) => lug.value === formVisita.lugar
        );

      return { empleado, motivo, lugar };
    };

    const handleLimpiarVisitante = () => {
      let tipoPorDefecto = tiposDocumento[0]?.value || '1';
      if (tiposDocumento.length > 0) {
        const tipoDNI = tiposDocumento.find(
          (tipo) =>
            tipo.label &&
            (tipo.label.toLowerCase().includes('dni') ||
              tipo.label
                .toLowerCase()
                .includes('documento nacional'))
        );
        tipoPorDefecto = tipoDNI
          ? tipoDNI.value
          : tiposDocumento[0].value;
      }

      const newFormVisitante = {
        tipoDocumentoId: tipoPorDefecto,
        numeroDocumento: '',
        nombres: '',
        apellidos: '',
        visitanteId: null,
      };

      setFormVisitante(newFormVisitante);
      limpiarBusqueda();

      const currentFormVisita =
        activeTab === 'activos'
          ? formVisitaActivos
          : formVisitaHistorial;

      if (onFormChange) {
        onFormChange({
          visitante: newFormVisitante,
          visita: currentFormVisita,
        });
      }
    };

    const handleLimpiarFormularioVisita = () => {
      if (activeTab === 'activos') {
        const newFormVisitaActivos = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          _tab: 'activos',
        };
        updateFormVisitaActivos(newFormVisitaActivos);
        setEmpleadosActivos(empleados);

        setMensajeEstadoEmpleado(null);
        setTipoMensajeEmpleado(null);
        setEmpleadoSeleccionadoActual(null);

        if (onFormChange) {
          onFormChange({
            visitante: formVisitante,
            visita: newFormVisitaActivos,
          });
        }
      } else {
        const newFormVisitaHistorial = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          busqueda: '',
          _tab: 'historial',
        };
        updateFormVisitaHistorial(newFormVisitaHistorial);
        setEmpleadosHistorial([
          { value: '', label: 'Todos los empleados' },
          ...empleados,
        ]);

        if (onFormChange) {
          onFormChange({
            visitante: formVisitante,
            visita: newFormVisitaHistorial,
          });
        }

        if (onBuscarHistorial) {
          const filtrosVacios = {
            busqueda: '',
            empleadoId: '',
            motivoId: '',
            lugar: '',
            fechaDesde: null,
            fechaHasta: null,
          };
          onBuscarHistorial(filtrosVacios);
        }
      }
    };

    const handleBuscarHistorial = () => {
      if (onBuscarHistorial) {
        const filtros = {
          busqueda: formVisitaHistorial.busqueda,
          empleadoId: formVisitaHistorial.empleadoId,
          motivoId: formVisitaHistorial.motivoId,
          lugar: formVisitaHistorial.lugar,
        };

        onBuscarHistorial(filtros);
      }
    };

    const handleTabChange = (newTab) => {
      if (newTab === 'activos') {
        const newFormVisitaActivos = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          _tab: 'activos',
        };
        updateFormVisitaActivos(newFormVisitaActivos);
        setEmpleadosActivos(empleados);

        if (onFormChange) {
          onFormChange({
            visitante: formVisitante,
            visita: newFormVisitaActivos,
          });
        }
      } else {
        const newFormVisitaHistorial = {
          empleadoId: '',
          motivoId: '',
          lugar: '',
          busqueda: '',
          _tab: 'historial',
        };
        updateFormVisitaHistorial(newFormVisitaHistorial);
        setEmpleadosHistorial([
          { value: '', label: 'Todos los empleados' },
          ...empleados,
        ]);

        if (onFormChange) {
          onFormChange({
            visitante: formVisitante,
            visita: newFormVisitaHistorial,
          });
        }

        if (onBuscarHistorial) {
          const filtrosVacios = {
            busqueda: '',
            empleadoId: '',
            motivoId: '',
            lugar: '',
            fechaDesde: null,
            fechaHasta: null,
          };
          onBuscarHistorial(filtrosVacios);
        }
      }
    };

    const isVisitanteFormValid =
      activeTab === 'activos'
        ? formVisitante.numeroDocumento &&
          formVisitante.nombres &&
          formVisitante.apellidos
        : true;

    const isVisitaFormValid =
      activeTab === 'activos'
        ? formVisitaActivos.empleadoId &&
          formVisitaActivos.motivoId &&
          formVisitaActivos.lugar
        : true;

    return (
      <>
        <div className="h-full flex flex-col overflow-visible">
          <Card className="shadow-lg border border-gray-200 bg-white flex flex-col overflow-visible rounded-2xl">
            <div className="p-0 flex-1 flex flex-col overflow-visible">
            {activeTab === 'activos' && (
              <div className="flex-shrink-0 space-y-3 border border-gray-200 rounded-xl pb-3 mb-3 p-3">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  Datos del Visitante
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <SelectCustom
                      label="Tipo de Documento *"
                      value={tiposDocumento.find(
                        (tipo) =>
                          tipo.value ===
                          formVisitante.tipoDocumentoId
                      )}
                      onChange={(selectedOption) =>
                        handleVisitanteChange(
                          'tipoDocumentoId',
                          selectedOption?.value || ''
                        )
                      }
                      options={tiposDocumento}
                      placeholder="Seleccione..."
                      isLoading={loadingData}
                      isClearable={false}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Documento *
                    </label>

                    <div className="flex mt-auto">
                      <Input
                        ref={documentoInput}
                        value={formVisitante.numeroDocumento}
                        onChange={(e) =>
                          handleVisitanteChange(
                            'numeroDocumento',
                            e.target.value
                          )
                        }
                        placeholder=""
                        maxLength={
                          tiposDocumento.find(
                            (tipo) =>
                              (tipo.label?.toLowerCase().includes('dni') ||
                               tipo.label?.toLowerCase().includes('documento nacional')) &&
                              tipo.value === formVisitante.tipoDocumentoId
                          )
                            ? 8
                            : 20
                        }
                        className="rounded-r-none border-r-0"
                        style={{
                          borderTopRightRadius: '0',
                          borderBottomRightRadius: '0',
                        }}
                      />
                      <Button
                        onClick={buscarVisitante}
                        disabled={
                          !formVisitante.tipoDocumentoId ||
                          !formVisitante.numeroDocumento ||
                          buscandoVisitante
                        }
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
                    onChange={(e) =>
                      handleVisitanteChange(
                        'nombres',
                        e.target.value
                      )
                    }
                    placeholder=""
                    maxLength="150"
                  />
                  <Input
                    label="Apellidos *"
                    value={formVisitante.apellidos}
                    onChange={(e) =>
                      handleVisitanteChange(
                        'apellidos',
                        e.target.value
                      )
                    }
                    placeholder=""
                    maxLength="150"
                  />
                </div>

                {mensajeVisitante && (
                  <div
                    className={`p-2 rounded-lg border text-xs ${
                      tipoMensaje === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : tipoMensaje === 'error'
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {mensajeVisitante}
                      </span>
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
                    leftIcon={
                      <PlusIcon className="h-4 w-4" />
                    }
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

            <div
              className={`flex-1 flex flex-col overflow-visible border border-gray-200 rounded-xl p-3 ${
                activeTab === 'activos' &&
                visitantesEnEspera &&
                visitantesEnEspera.length === 0
                  ? 'opacity-50 pointer-events-none'
                  : ''
              }`}
            >
              <h3 className="text-base font-semibold text-gray-800 mb-3">
                {activeTab === 'activos'
                  ? 'Datos de la Visita'
                  : 'Buscar Visita'}
                {activeTab === 'activos' &&
                  visitantesEnEspera &&
                  visitantesEnEspera.length === 0 && (
                    <span key="mensaje-agregar" className="text-sm text-gray-500 ml-2">
                      (Agregue un visitante primero)
                    </span>
                  )}
              </h3>

              {activeTab === 'activos' ? (
                <div className="space-y-4 flex-1">
                  <SelectCustom
                    label="Empleado a Visitar *"
                    value={
                      formVisitaActivos.empleadoId
                        ? empleadosActivos.find(
                            (emp) =>
                              emp.value ===
                              formVisitaActivos.empleadoId
                          )
                        : null
                    }
                    onChange={(selectedOption) => {
                      handleVisitaChangeActivos(
                        'empleadoId',
                        selectedOption?.value || ''
                      );
                    }}
                    options={empleadosActivos}
                    placeholder="Seleccione empleado..."
                    isSearchable={true}
                    isLoading={loadingData}
                    menuWidth="auto"
                    noOptionsMessage="No se encontraron empleados"
                  />

                  {mensajeEstadoEmpleado && (
                    <div
                      className={`text-xs rounded-md px-3 py-2 border flex items-center justify-between gap-2 ${
                        tipoMensajeEmpleado === 'warning'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}
                    >
                      <span>{mensajeEstadoEmpleado}</span>
                      {tipoMensajeEmpleado === 'warning' && empleadoSeleccionadoActual?.detallePapeleta && (
                        <button
                          type="button"
                          onClick={handleVerDetallesPapeleta}
                          disabled={loadingPapeleta}
                          className="text-blue-600 hover:text-blue-800 font-medium underline whitespace-nowrap disabled:opacity-50"
                        >
                          {loadingPapeleta ? 'Cargando...' : 'Ver detalles'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <SelectCustom
                      label="Motivo de Visita *"
                      value={
                        formVisitaActivos.motivoId
                          ? motivosActivos.find(
                              (mot) =>
                                mot.value ===
                                formVisitaActivos.motivoId
                            )
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleVisitaChangeActivos(
                          'motivoId',
                          selectedOption?.value || ''
                        )
                      }
                      options={motivosActivos}
                      placeholder="Seleccione motivo..."
                      isLoading={loadingData}
                      isClearable={false}
                      noOptionsMessage="No se encontraron motivos"
                    />
                    <SelectCustom
                      label="Lugar *"
                      value={
                        formVisitaActivos.lugar
                          ? lugaresActivos.find(
                              (lug) =>
                                lug.value ===
                                formVisitaActivos.lugar
                            )
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleVisitaChangeActivos(
                          'lugar',
                          selectedOption?.value || ''
                        )
                      }
                      options={lugaresActivos}
                      placeholder="Seleccione lugar..."
                      isClearable={false}
                      noOptionsMessage="No se encontraron lugares"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1">
                  <Input
                    ref={busquedaInput}
                    label="Buscar Visitante"
                    value={formVisitaHistorial.busqueda}
                    onChange={(e) =>
                      handleVisitaChangeHistorial(
                        'busqueda',
                        e.target.value
                      )
                    }
                    placeholder="Nombre, apellido o número de documento..."
                    leftIcon={
                      <MagnifyingGlassIcon className="h-4 w-4" />
                    }
                  />

                  <SelectCustom
                    label="Buscar por Empleado"
                    value={
                      formVisitaHistorial.empleadoId
                        ? empleadosHistorial.find(
                            (emp) =>
                              emp.value ===
                              formVisitaHistorial.empleadoId
                          )
                        : null
                    }
                    onChange={(selectedOption) =>
                      handleVisitaChangeHistorial(
                        'empleadoId',
                        selectedOption?.value || ''
                      )
                    }
                    options={empleadosHistorial}
                    placeholder="Seleccione empleado..."
                    isSearchable={true}
                    noOptionsMessage="No se encontraron empleados"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <SelectCustom
                      label="Buscar por Motivo"
                      value={
                        formVisitaHistorial.motivoId
                          ? motivosHistorial.find(
                              (mot) =>
                                mot.value ===
                                formVisitaHistorial.motivoId
                            )
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleVisitaChangeHistorial(
                          'motivoId',
                          selectedOption?.value || ''
                        )
                      }
                      options={motivosHistorial}
                      placeholder="Seleccione motivo..."
                      isSearchable={true}
                      noOptionsMessage="No se encontraron motivos"
                    />
                    <SelectCustom
                      label="Buscar por Lugar"
                      value={
                        formVisitaHistorial.lugar
                          ? lugaresHistorial.find(
                              (lug) =>
                                lug.value ===
                                formVisitaHistorial.lugar
                            )
                          : null
                      }
                      onChange={(selectedOption) =>
                        handleVisitaChangeHistorial(
                          'lugar',
                          selectedOption?.value || ''
                        )
                      }
                      options={lugaresHistorial}
                      placeholder="Seleccione lugar..."
                      isSearchable={true}
                      noOptionsMessage="No se encontraron lugares"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 mt-2 pt-2">
              <div className="flex gap-3">
                <Button
                  onClick={
                    activeTab === 'activos'
                      ? handleRegisterVisit
                      : handleBuscarHistorial
                  }
                  disabled={
                    activeTab === 'activos' &&
                    (!isVisitaFormValid ||
                      !visitantesEnEspera ||
                      visitantesEnEspera.length === 0)
                  }
                  variant="primary"
                  size="lg"
                  leftIcon={
                    <ClipboardDocumentListIcon className="h-5 w-5" />
                  }
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {activeTab === 'activos'
                    ? 'Registrar Visita Completa'
                    : 'Buscar Visita'}
                  {activeTab === 'activos' &&
                    visitantesEnEspera.length > 0 && (
                      <Badge
                        variant="primary"
                        className="ml-3 bg-white text-blue-600"
                      >
                        {visitantesEnEspera.length}
                      </Badge>
                    )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLimpiarFormularioVisita}
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

        {/* Modal de Detalles de Papeleta */}
        <ModalDetalles
          isOpen={isModalPapeletaOpen}
          onClose={handleCloseModalPapeleta}
          data={papeletaSeleccionada}
          title="Detalles de Papeleta de Salida"
          size="lg"
          fields={[
            {
              label: 'Código',
              key: 'codigo_papeleta',
            },
            {
              label: 'Estado',
              key: 'estado',
              render: (val) => (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    val === 'APROBADO'
                      ? 'bg-green-100 text-green-800'
                      : val === 'EN_CURSO'
                      ? 'bg-blue-100 text-blue-800'
                      : val === 'FINALIZADO'
                      ? 'bg-gray-100 text-gray-800'
                      : val === 'RECHAZADO'
                      ? 'bg-red-100 text-red-800'
                      : val === 'CANCELADO'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {val}
                </span>
              ),
            },
            {
              label: 'Solicitante',
              key: 'personal_solicitante_nombre',
            },
            {
              label: 'Motivo',
              key: 'motivo_nombre',
            },
            {
              label: 'Sustento',
              key: 'sustento_solicitud',
            },
            {
              label: 'Fecha de Solicitud',
              key: 'fecha_solicitud',
              render: (val) =>
                val ? new Date(val).toLocaleString('es-PE') : '-',
            },
            {
              label: 'Salida Programada',
              key: 'fecha_hora_salida_programada',
              render: (val) =>
                val ? new Date(val).toLocaleString('es-PE') : '-',
            },
            {
              label: 'Retorno Programado',
              key: 'fecha_hora_retorno_programada',
              render: (val) =>
                val ? new Date(val).toLocaleString('es-PE') : '-',
            },
            {
              label: 'Salida Real',
              key: 'fecha_hora_salida_real',
              render: (val) =>
                val ? new Date(val).toLocaleString('es-PE') : 'Pendiente',
            },
            {
              label: 'Retorno Real',
              key: 'fecha_hora_retorno_real',
              render: (val) =>
                val ? new Date(val).toLocaleString('es-PE') : 'Pendiente',
            },
            {
              label: 'Autorizado por',
              key: 'personal_autoriza_nombre',
            },
          ]}
        />
      </>
    );
  }
);

RegistroForm.displayName = 'RegistroForm';

export default RegistroForm;
