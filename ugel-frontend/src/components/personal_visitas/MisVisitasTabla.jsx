import { useState, useEffect, useRef } from 'react';
import Card from '../Card';
import Button from '../Button';
import TabView from '../TabView';
import TableGenerica from '../TableGenerica';
import ModalGenerico from '../ModalGenerico';
import ModalDetalles from '../ModalDetalles';
import Input from '../Input';
import SelectCustom from '../SelectCustom';
import { toast } from 'react-hot-toast';
import { 
  UsersIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  UserGroupIcon, 
  EyeIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { formatHora } from '../../utils/dateHelpers';
import { visitasService, personalService, areasService, papeletasSalidaService } from '../../services/api';
import { differenceInMinutes } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';

const MisVisitasTabla = ({
  visitasActivas,
  historialVisitas,
  activeTab,
  onTabChange,
  onRefresh,
  activosPagination,
  onActivosPageChange,
  historialPagination,
  onHistorialPageChange,
  filters,
  className = ""
}) => {
  const { user } = useAuth();
  const personalId = user?.personal_id || user?.personalId;

  // Estados para modales
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  
  const [selectedVisita, setSelectedVisita] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estados para delegación
  const [delegateTo, setDelegateTo] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [personalList, setPersonalList] = useState([]); 
  const [fullPersonalList, setFullPersonalList] = useState([]); 
  const [areasList, setAreasList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  
  // Estados para validación de personal (Ausente/Permiso)
  const [mensajeEstadoEmpleado, setMensajeEstadoEmpleado] = useState(null);
  const [tipoMensajeEmpleado, setTipoMensajeEmpleado] = useState(null);
  
  // Estados para Modal de Detalles de Papeleta
  const [isModalPapeletaOpen, setIsModalPapeletaOpen] = useState(false);
  const [papeletaSeleccionada, setPapeletaSeleccionada] = useState(null);
  const [loadingPapeleta, setLoadingPapeleta] = useState(false);
  const [papeletasExternas, setPapeletasExternas] = useState([]);

  // --- ESTADOS PARA BUSCADOR Y ORIENTACIÓN ---
  const [searchTerm, setSearchTerm] = useState('');
  const [orientationResult, setOrientationResult] = useState(null);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const searchTimeoutRef = useRef(null);
  // -------------------------------------------

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); 

    return () => clearInterval(timer);
  }, []);

  // --- LÓGICA DE BÚSQUEDA Y ORIENTACIÓN ---
  
  // Limpiar búsqueda al cambiar de pestaña
  useEffect(() => {
    setSearchTerm('');
    setOrientationResult(null);
  }, [activeTab]);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setOrientationResult(null); // Limpiar resultado previo

    // Si estamos en historial, solo filtramos localmente (no hacemos búsqueda global)
    if (activeTab === 'historial') return;

    // Si el término es corto, no buscar globalmente
    if (term.length < 3) return;

    // Debounce para búsqueda global
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      // 1. Primero verificar si ya lo tengo en MI lista (visitasActivas)
      const foundInMyList = visitasActivas.some(v => 
        v.numero_documento.includes(term) || 
        `${v.visitante_nombres} ${v.visitante_apellidos}`.toLowerCase().includes(term.toLowerCase())
      );

      // Si NO está en mi lista y tengo un término válido, buscar globalmente para orientar
      if (!foundInMyList) {
        setSearchingGlobal(true);
        try {
          // Usamos buscarGlobal del servicio
          const response = await visitasService.buscarGlobal(term);
          if (response.data && response.data.success && response.data.data) {
            // Filtramos para ver si hay una visita activa en otra área
            const visitaActivaOtra = response.data.data.find(v => 
              v.estado_visita === 'PENDIENTE' || v.estado_visita === 'EN_CURSO' || v.estado_visita === 'ACEPTADO'
            );
            setOrientationResult(visitaActivaOtra || null);
          } else {
            setOrientationResult(null);
          }
        } catch (error) {
          console.error("Error en búsqueda global:", error);
          setOrientationResult(null);
        } finally {
          setSearchingGlobal(false);
        }
      }
    }, 600); // 600ms delay
  };

  // Función para filtrar los datos de la tabla basado en el input
  const getFilteredData = (data) => {
    if (!searchTerm) return data;
    const lowerTerm = searchTerm.toLowerCase();
    return data.filter(item => 
      (item.visitante_nombres && item.visitante_nombres.toLowerCase().includes(lowerTerm)) ||
      (item.visitante_apellidos && item.visitante_apellidos.toLowerCase().includes(lowerTerm)) ||
      (item.numero_documento && item.numero_documento.includes(lowerTerm))
    );
  };
  // -------------------------------------------

  // Acciones (handleAccept, handleReject, etc. - Mismo código que antes)
  const handleAccept = async (visita) => {
    try {
      await visitasService.accept(visita.id);
      toast.success('Visita aceptada correctamente');
      onRefresh();
    } catch (error) {
      toast.error('Error al aceptar la visita');
      console.error(error);
    }
  };

  const handleRejectClick = (visita) => {
    setSelectedVisita(visita);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Debe ingresar un motivo');
      return;
    }
    try {
      await visitasService.reject(selectedVisita.id, rejectReason);
      toast.success('Visita rechazada correctamente');
      setRejectModalOpen(false);
      onRefresh();
    } catch (error) {
      toast.error('Error al rechazar la visita');
      console.error(error);
    }
  };

  const handleDelegateClick = async (visita) => {
    setSelectedVisita(visita);
    setDelegateTo(null);
    setSelectedArea(null);
    setMensajeEstadoEmpleado(null);
    setTipoMensajeEmpleado(null);
    setDelegateModalOpen(true);
    setLoadingPersonal(true);
    try {
      const [personalRes, areasRes, papeletasRes] = await Promise.all([
        personalService.getAll(),
        areasService.getAll(),
        papeletasSalidaService.getExternas()
      ]);

      if (areasRes.data.success) {
        setAreasList(areasRes.data.data.map(a => ({
          value: a.id.toString(),
          label: a.nombre_area || a.nombre
        })));
      }

      const papeletasExternasData = papeletasRes?.data?.data || [];
      setPapeletasExternas(papeletasExternasData);

      if (personalRes.data.success) {
        const papeletasActivasMap = new Map();
        papeletasExternasData.forEach(p => {
          if (p.estado === 'EN_CURSO') {
            if (p.solicitante_numero_documento) {
              papeletasActivasMap.set(p.solicitante_numero_documento, p);
            }
            const nombreCompleto = `${p.solicitante_nombres} ${p.solicitante_apellidos}`.trim().toLowerCase();
            papeletasActivasMap.set(nombreCompleto, p);
          }
        });

        const empleadosProcesados = personalRes.data.data
          .filter(empleado => String(empleado.id) !== String(personalId))
          .map(empleado => {
          const estadoBruto = (empleado.estado_presencia || '').toString().trim().toLowerCase();
          let estado = 'disponible';
          let codigoPapeleta = empleado.codigo_papeleta_activa || null;

          const nombreCompletoEmpleado = `${empleado.nombres} ${empleado.apellidos}`.trim().toLowerCase();
          const papeletaExterna = 
            papeletasActivasMap.get(empleado.numero_documento) || 
            papeletasActivasMap.get(nombreCompletoEmpleado);

          if (papeletaExterna) {
            estado = 'permiso';
            codigoPapeleta = papeletaExterna.codigo_papeleta;
          } else if (!empleado.estado_presencia) {
            estado = 'ausente';
          } else if (['ausente', 'falta', 'faltó', 'falto', 'sin marca', 'sin_marca'].includes(estadoBruto)) {
            estado = 'ausente';
          } else if (['permiso', 'comisión', 'comision'].includes(estadoBruto) || empleado.tiene_papeleta_activa) {
            estado = 'permiso';
          }

          return {
            value: empleado.id.toString(),
            label: `${empleado.nombres} ${empleado.apellidos}`,
            areaId: empleado.area_destino_id?.toString(),
            areaNombre: empleado.area_nombre || 'Sin área',
            cargo: empleado.cargo_nombre || 'Sin cargo',
            estado,
            detallePapeleta: codigoPapeleta,
          };
        });

        setFullPersonalList(empleadosProcesados);
        setPersonalList(empleadosProcesados);
      }
    } catch (error) {
      console.error('Error cargando datos para delegación:', error);
      toast.error('Error al cargar lista de personal');
    } finally {
      setLoadingPersonal(false);
    }
  };

  const handleAreaChange = (option) => {
    setSelectedArea(option);
    if (!option) {
      setPersonalList(fullPersonalList);
    } else {
      const filtrados = fullPersonalList.filter(p => p.areaId === option.value);
      setPersonalList(filtrados);
      if (delegateTo && delegateTo.areaId !== option.value) {
        setDelegateTo(null);
        setMensajeEstadoEmpleado(null);
        setTipoMensajeEmpleado(null);
      }
    }
  };

  const handlePersonalChange = (option) => {
    setDelegateTo(option);
    setMensajeEstadoEmpleado(null);
    setTipoMensajeEmpleado(null);
    if (option) {
      if (option.estado === 'permiso') {
        setMensajeEstadoEmpleado('No se puede delegar: El empleado tiene permiso de salida.');
        setTipoMensajeEmpleado('warning');
      } else if (option.estado === 'ausente') {
        setMensajeEstadoEmpleado('No se puede delegar: El empleado está ausente.');
        setTipoMensajeEmpleado('error');
      }
      if (option.areaId) {
        const areaDelEmpleado = areasList.find(a => a.value === option.areaId);
        if (areaDelEmpleado) setSelectedArea(areaDelEmpleado);
      }
    }
  };

  const handleVerDetallesPapeleta = async () => {
    if (!delegateTo?.detallePapeleta) return;
    setLoadingPapeleta(true);
    try {
      let papeletaExterna = papeletasExternas.find(p => p.codigo_papeleta === delegateTo.detallePapeleta);
      if (!papeletaExterna) {
         const response = await papeletasSalidaService.getExternas();
         if (response.data.success) {
           const freshData = response.data.data || [];
           setPapeletasExternas(freshData);
           papeletaExterna = freshData.find(p => p.codigo_papeleta === delegateTo.detallePapeleta);
         }
      }
      if (papeletaExterna) {
        const papeletaMapeada = {
          ...papeletaExterna,
          id: papeletaExterna._id || papeletaExterna.id,
          personal_solicitante_nombre: `${papeletaExterna.solicitante_nombres || ''} ${papeletaExterna.solicitante_apellidos || ''}`.trim(),
          personal_autoriza_nombre: 'Sistema Externo',
          motivo_nombre: papeletaExterna.nombre_motivo || papeletaExterna.motivo || '-',
          area_destino_nombre: papeletaExterna.lugar_destino || '-',
          fecha_solicitud: papeletaExterna.fecha_solicitud || papeletaExterna.fecha_inicio,
          fecha_salida_programada: papeletaExterna.fecha_inicio,
          fecha_retorno_programada: papeletaExterna.fecha_fin,
          sustento: papeletaExterna.observacion || papeletaExterna.sustento || '-',
          estado: papeletaExterna.estado
        };
        setPapeletaSeleccionada(papeletaMapeada);
        setIsModalPapeletaOpen(true);
      } else {
        toast.error('No se encontró la información de la papeleta.');
      }
    } catch (error) {
      toast.error('Error al cargar detalles de papeleta');
    } finally {
      setLoadingPapeleta(false);
    }
  };

  const handleCloseModalPapeleta = () => {
    setIsModalPapeletaOpen(false);
    setTimeout(() => setPapeletaSeleccionada(null), 300);
  };

  const handleDelegateConfirm = async () => {
    if (!delegateTo) {
      toast.error('Debe seleccionar un personal');
      return;
    }
    if (delegateTo.estado === 'permiso') {
      toast.error('No se puede delegar a un personal con permiso de salida');
      return;
    }
    if (delegateTo.estado === 'ausente') {
      toast.error('No se puede delegar a un personal ausente');
      return;
    }
    try {
      await visitasService.delegate(selectedVisita.id, delegateTo.value);
      toast.success('Visita delegada correctamente');
      setDelegateModalOpen(false);
      onRefresh();
    } catch (error) {
      toast.error('Error al delegar la visita');
      console.error(error);
    }
  };

  const handleFinalizarAtencion = async (visita) => {
    try {
      await visitasService.finalizarAtencion(visita.id);
      toast.success('Atención finalizada correctamente');
      onRefresh();
    } catch (error) {
      toast.error('Error al finalizar la atención');
      console.error(error);
    }
  };

  const handleViewDetails = (visita) => {
    setSelectedVisita(visita);
    setDetailsModalOpen(true);
  };

  const getColumns = () => {
    const baseColumns = [
      {
        key: 'visitante',
        label: 'Visitante',
        minWidth: '200px',
        render: (row) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.visitante_nombres} {row.visitante_apellidos}
            </div>
            <div className="text-sm text-gray-500">
              {row.tipo_documento_codigo}: {row.numero_documento}
            </div>
          </div>
        )
      },
      {
        key: 'motivo',
        label: 'Motivo',
        minWidth: '150px',
        render: (row) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {row.nombre_motivo || '-'}
          </span>
        )
      },
      {
        key: 'area',
        label: 'Área Destino',
        minWidth: '150px',
        render: (row) => (
          <div className="text-sm text-gray-900">
            {row.nombre_area || '-'}
          </div>
        )
      },
      {
        key: 'ingreso',
        label: 'Ingreso',
        minWidth: '120px',
        render: (row) => (
          <div className="text-sm text-gray-900">
            {formatHora(row.fecha_ingreso)}
          </div>
        )
      },
      {
        key: 'estado',
        label: 'Estado',
        minWidth: '100px',
        render: (row) => {
          const colors = {
            PENDIENTE: 'bg-yellow-100 text-yellow-800',
            ACEPTADO: 'bg-green-100 text-green-800',
            RECHAZADO: 'bg-red-100 text-red-800',
            DELEGADO: 'bg-blue-100 text-blue-800',
            FINALIZADO: 'bg-gray-100 text-gray-800',
            NO_PRESENTADO: 'bg-gray-100 text-gray-800'
          };
          const isDelegado = row.estado_visita === 'DELEGADO';
          return (
           <span
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-transparent
                ${colors[row.estado_visita] || 'bg-gray-100 text-gray-700'}
                ${isDelegado ? 'cursor-pointer hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 select-none ring-1 ring-inset ring-black/5' : ''}
              `}
              onClick={(e) => {
                if (!isDelegado) return;
                e.stopPropagation();
                if (row.delegado_por_nombres) {
                  toast.success(
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 text-sm">Visita Delegada</span>
                      <span className="text-gray-600 text-xs mt-0.5">
                        Por: {row.delegado_por_nombres} {row.delegado_por_apellidos}
                      </span>
                    </div>,
                    {
                      duration: 4000,
                      position: 'top-center',
                      iconTheme: { primary: '#3b82f6', secondary: '#fff' },
                      style: {
                        background: '#ffffff',
                        color: '#1f2937',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        border: '1px solid #f3f4f6',
                      },
                    }
                  );
                } else {
                  toast.error('Información del delegante no disponible');
                }
              }}
              title={isDelegado ? 'Ver detalles de la delegación' : ''}
            >
              {row.estado_visita}
            </span>
          );
        }
      }
    ];

    if (activeTab === 'activos') {
      baseColumns.push(
        {
          key: 'tiempo',
          label: 'Tiempo',
          minWidth: '100px',
          render: (row) => {
            const ingreso = new Date(row.fecha_ingreso);
            const diffMinutes = differenceInMinutes(currentTime, ingreso);
            const containerBase = "flex items-center gap-1.5"; 
            if (row.estado_visita === 'PENDIENTE' || row.estado_visita === 'DELEGADO') {
              const isOverLimit = diffMinutes > 5;
              return (
                <div className={`${containerBase} ${isOverLimit ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  <span className="leading-none">{diffMinutes} min</span>
                  {isOverLimit && (
                    <ExclamationTriangleIcon
                      className="h-4 w-4 shrink-0"
                      title="Excedió tiempo de espera (5 min)"
                    />
                  )}
                </div>
              );
            } else if (row.estado_visita === 'ACEPTADO') {
              const isOverLimit = diffMinutes > 30;
              return (
                <div className={`${containerBase} ${isOverLimit ? 'bg-orange-100 text-orange-700 px-2 py-1 rounded-md w-fit' : 'text-green-600'}`}>
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  <span className={`leading-none ${isOverLimit ? 'font-bold' : ''}`}>
                    {diffMinutes} min
                  </span>
                  {isOverLimit && (
                    <div className="flex items-center border-l border-orange-300 pl-1.5 h-full">
                       <span className="text-xs font-bold leading-none">Excedido</span>
                    </div>
                  )}
                </div>
              ); 
            }
            return <span className="text-gray-400">-</span>;
          }
        },
        {
          key: 'actions',
          label: 'Acciones',
          minWidth: '140px',
          sticky: 'right',
          render: (row) => {
            if (row.estado_visita === 'PENDIENTE' || row.estado_visita === 'DELEGADO') {
              return (
                <div className="flex justify-left space-x-2">
                  <button
                    onClick={() => handleAccept(row)}
                    className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                    title="Aceptar"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleRejectClick(row)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                    title="Rechazar"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelegateClick(row)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                    title="Delegar"
                  >
                    <UserGroupIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            } else if (row.estado_visita === 'ACEPTADO') {
              return (
                <div className="flex justify-left space-x-2">
                  <button
                    onClick={() => handleViewDetails(row)}
                    className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                    title="Ver Detalles"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  {!row.fecha_fin_atencion && (
                    <button
                      onClick={() => handleFinalizarAtencion(row)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                      title="Finalizar Atención"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              );
            }
            return null;
          }
        }
      );
    } else {
      baseColumns.push({
        key: 'actions',
        label: 'Ver',
        minWidth: '60px',
        sticky: 'right',
        render: (row) => (
          <div className="flex justify-left">
            <button
              onClick={() => handleViewDetails(row)}
              className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
              title="Ver Detalles"
            >
              <EyeIcon className="h-5 w-5" />
            </button>
          </div>
        )
      });
    }
    return baseColumns;
  };

  const getTabData = () => {
    // Aplicamos el filtro local del buscador
    const data = activeTab === 'activos' ? visitasActivas || [] : historialVisitas || [];
    return getFilteredData(data);
  };

  const getPaginationProps = () => {
    const data = getTabData();
    const totalItemsLocal = data.length;

    if (activeTab === 'activos') {
      const itemsPerPage = activosPagination?.itemsPerPage || activosPagination?.limit || 10;
      const currentPage = activosPagination?.currentPage || activosPagination?.page || 1;
      const totalItems = activosPagination?.totalItems ?? activosPagination?.total ?? totalItemsLocal;
      const totalPages = activosPagination?.totalPages ?? activosPagination?.pages ?? Math.ceil((totalItems || 0) / itemsPerPage);

      if (!totalItems || totalItems <= itemsPerPage) {
        return { pagination: false };
      }

      return {
        pagination: true,
        itemsPerPage,
        currentPage,
        totalItems,
        totalPages,
        onPageChange: onActivosPageChange
      };
    }

    const itemsPerPage = historialPagination?.itemsPerPage || historialPagination?.limit || 10;
    const currentPage = historialPagination?.currentPage || historialPagination?.page || 1;
    const totalItems = historialPagination?.totalItems ?? historialPagination?.total ?? totalItemsLocal;
    const totalPages = historialPagination?.totalPages ?? historialPagination?.pages ?? Math.ceil((totalItems || 0) / itemsPerPage);

    if (!totalItems || totalItems <= itemsPerPage) {
      return { pagination: false };
    }

    return {
      pagination: true,
      itemsPerPage,
      currentPage,
      totalItems,
      totalPages,
      onPageChange: onHistorialPageChange
    };
  };

  const tabs = [
    {
      key: 'activos',
      label: 'Visitantes Actuales',
      icon: <UsersIcon className="h-4 w-4" />,
      count: activosPagination?.totalItems || 0
    },
    {
      key: 'historial',
      label: 'Historial de Visitas',
      icon: <ClockIcon className="h-4 w-4" />,
      count: historialPagination?.totalItems || 0
    }
  ];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="shadow-lg border border-gray-200 bg-card flex-1 flex flex-col rounded-2xl h-full">
        <div className="p-0 flex flex-col h-full">
          <div className="px-0">
            {/* ENCABEZADO MODIFICADO: FLEXBOX CON BUSCADOR CENTRAL */}
            <div className="flex flex-col mb-3 px-1 pt-0 gap-2">
              <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">Mis Visitas</h2>
              
              <TabView
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={onTabChange}
                className="mb-0"
              />

              <div className="flex flex-col md:flex-row items-end justify-between gap-4 mt-0">
                {/* BUSCADOR TIPO PÍLDORA (IZQUIERDA) */}
                <div className="relative w-full max-w-md">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
                      placeholder={activeTab === 'activos' ? "Buscar visitante asignado..." : "Buscar en historial..."}
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                    {searchingGlobal && (
                       <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                       </div>
                    )}
                  </div>

                  {/* RESULTADO DE ORIENTACIÓN (SOLO VISIBLE EN TAB ACTIVOS) */}
                  {activeTab === 'activos' && orientationResult && (
                    <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-blue-100 p-3 animate-fade-in-down">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-blue-100 rounded-full p-2">
                          <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">
                            Visitante encontrado en otra asignación
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            Este visitante no está asignado a usted. Por favor oriéntelo a:
                          </p>
                          <div className="bg-gray-50 rounded-md p-2 text-xs space-y-1 border border-gray-200">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-500">Personal:</span>
                              <span className="font-semibold text-gray-800">
                                {orientationResult.personal_nombres} {orientationResult.personal_apellidos}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-500">Área:</span>
                              <span className="font-semibold text-gray-800">{orientationResult.nombre_area}</span>
                            </div>
                             <div className="flex justify-between">
                              <span className="font-medium text-gray-500">Motivo:</span>
                              <span className="font-semibold text-blue-700">{orientationResult.nombre_motivo}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setOrientationResult(null);
                            setSearchTerm('');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XCircleIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Filtros (DERECHA) */}
                {filters && activeTab === 'historial' && (
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <SelectCustom
                        label="Año"
                        hideLabel
                        options={filters.yearOptions}
                        value={filters.yearOptions.find((y) => y.value === filters.anio) || null}
                        onChange={filters.onYearChange}
                        isSearchable={false}
                        placeholder="Año"
                      />
                    </div>
                    <div className="w-32">
                      <SelectCustom
                        label="Mes"
                        hideLabel
                        options={filters.monthOptions}
                        value={filters.monthOptions.find((m) => m.value === filters.mes) || null}
                        onChange={filters.onMonthChange}
                        isSearchable={false}
                        placeholder="Mes"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 flex flex-col"
            style={{ maxWidth: '100%' }}
          >
            <TableGenerica
              columns={getColumns()}
              data={getTabData()}
              {...getPaginationProps()}
              className="flex-1 flex flex-col min-h-0"
              maxBodyHeight="100%"
              emptyMessage={
                activeTab === 'activos'
                  ? (searchTerm ? 'No se encontraron visitantes con ese criterio' : 'No hay visitas activas')
                  : 'No hay historial de visitas'
              }
            />
          </div>
        </div>
      </Card>

      {/* Modales (Sin cambios) */}
      <ModalGenerico
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Rechazar Visita"
      >
        <div className="space-y-4">
          <p>¿Está seguro que desea rechazar esta visita?</p>
          <Input
            label="Motivo del rechazo"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ingrese el motivo..."
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Rechazar
            </Button>
          </div>
        </div>
      </ModalGenerico>

      <ModalGenerico
        isOpen={delegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        title="Delegar Visita"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Seleccione el área y personal a quien desea delegar la visita:</p>
          
          <SelectCustom
            label="Área (Opcional)"
            options={areasList}
            value={selectedArea}
            onChange={handleAreaChange}
            placeholder="Filtrar por área..."
            isSearchable
            isClearable
          />

          <SelectCustom
            label="Personal"
            options={personalList}
            value={delegateTo}
            onChange={handlePersonalChange}
            placeholder="Buscar personal..."
            isSearchable
            isLoading={loadingPersonal}
            required
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
              {tipoMensajeEmpleado === 'warning' && delegateTo?.detallePapeleta && (
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
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setDelegateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleDelegateConfirm}
              disabled={!!mensajeEstadoEmpleado}
            >
              Delegar
            </Button>
          </div>
        </div>
      </ModalGenerico>

      <ModalGenerico
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Detalles de la Visita"
      >
        {selectedVisita && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-semibold">Visitante:</div>
              <div>{selectedVisita.visitante_nombres} {selectedVisita.visitante_apellidos}</div>
              
              <div className="font-semibold">Documento:</div>
              <div>{selectedVisita.tipo_documento_codigo}: {selectedVisita.numero_documento}</div>
              
              <div className="font-semibold">Motivo:</div>
              <div>{selectedVisita.nombre_motivo}</div>
              
              <div className="font-semibold">Área:</div>
              <div>{selectedVisita.nombre_area}</div>
              
              <div className="font-semibold">Ingreso:</div>
              <div>{formatHora(selectedVisita.fecha_ingreso)}</div>
              
              <div className="font-semibold">Salida:</div>
              <div>{selectedVisita.fecha_salida ? formatHora(selectedVisita.fecha_salida) : '-'}</div>
              
              <div className="font-semibold">Estado:</div>
              <div>{selectedVisita.estado_visita}</div>
            </div>

          </div>
        )}
      </ModalGenerico>

      {/* Modal de Detalles de Papeleta */}
      <ModalDetalles
        isOpen={isModalPapeletaOpen}
        onClose={handleCloseModalPapeleta}
        data={papeletaSeleccionada}
        title="Detalles de Papeleta de Salida"
        size="lg"
        fields={[
          {
            label: 'Código de Papeleta',
            key: 'codigo_papeleta',
          },
          {
            label: 'Solicitante',
            key: 'personal_solicitante_nombre',
          },
          {
            label: 'Motivo de Salida',
            key: 'motivo_nombre',
          },
          {
            label: 'Salida Programada',
            key: 'fecha_hora_salida_programada',
            render: (val) =>
              val
                ? new Date(val).toLocaleString('es-PE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '-',
          },
          {
            label: 'Retorno Programado',
            key: 'fecha_hora_retorno_programada',
            render: (val) =>
              val
                ? new Date(val).toLocaleString('es-PE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '-',
          },
           {
              label: 'Tiempo Restante',
              key: 'tiempo_restante',
              render: (val, data) => {
                const retornoStr = data?.fecha_hora_retorno_programada;
                if (!retornoStr) return '-';
                
                const retorno = new Date(retornoStr);
                const now = new Date();
                
                if (now > retorno) return 'Vencido';
                
                const diff = retorno - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                
                if (days > 0) return `${days} días, ${hours} horas`;
                return `${hours} horas`;
              }
            },
          {
            label: 'Estado',
            key: 'estado',
            render: (val) => (
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  val === 'APROBADO'
                    ? 'bg-green-100 text-green-800'
                    : val === 'EN_CURSO'
                    ? 'bg-blue-100 text-blue-800'
                    : val === 'RETORNADO'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {val === 'EN_CURSO' ? 'En Curso' : val}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
};

export default MisVisitasTabla;
