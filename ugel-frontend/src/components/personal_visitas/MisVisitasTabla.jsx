import { useState, useEffect } from 'react';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatHora } from '../../utils/dateHelpers';
import { visitasService, personalService, areasService, papeletasSalidaService } from '../../services/api';
import { differenceInMinutes } from 'date-fns';

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
  className = ""
}) => {
  // Estados para modales
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  
  const [selectedVisita, setSelectedVisita] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Estados para delegación
  const [delegateTo, setDelegateTo] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [personalList, setPersonalList] = useState([]); // Lista filtrada
  const [fullPersonalList, setFullPersonalList] = useState([]); // Lista completa
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

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute to refresh the "Tiempo" column
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Acciones
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
    
    // Cargar datos si no están cargados o recargar para tener estados actualizados
    setLoadingPersonal(true);
    try {
      const [personalRes, areasRes, papeletasRes] = await Promise.all([
        personalService.getAll(),
        areasService.getAll(),
        papeletasSalidaService.getExternas()
      ]);

      // Procesar áreas
      if (areasRes.data.success) {
        setAreasList(areasRes.data.data.map(a => ({
          value: a.id.toString(),
          label: a.nombre_area || a.nombre
        })));
      }

      // Guardar papeletas externas para uso posterior
      const papeletasExternasData = papeletasRes?.data?.data || [];
      setPapeletasExternas(papeletasExternasData);

      // Procesar personal con estados (lógica copiada de RegistroForm)
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

        const empleadosProcesados = personalRes.data.data.map(empleado => {
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
        setPersonalList(empleadosProcesados); // Inicialmente mostrar todos
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
      // Si se limpia el área, mostrar todos los empleados
      setPersonalList(fullPersonalList);
    } else {
      // Filtrar empleados por área seleccionada
      const filtrados = fullPersonalList.filter(p => p.areaId === option.value);
      setPersonalList(filtrados);
      
      // Si el empleado seleccionado no pertenece a la nueva área, limpiarlo
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
      // Validar estado del empleado
      if (option.estado === 'permiso') {
        setMensajeEstadoEmpleado('No se puede delegar: El empleado tiene permiso de salida.');
        setTipoMensajeEmpleado('warning'); // Usamos warning para mostrar el botón de ver detalles
      } else if (option.estado === 'ausente') {
        setMensajeEstadoEmpleado('No se puede delegar: El empleado está ausente.');
        setTipoMensajeEmpleado('error');
      }

      if (option.areaId) {
        // Auto-seleccionar el área del empleado
        const areaDelEmpleado = areasList.find(a => a.value === option.areaId);
        if (areaDelEmpleado) {
          setSelectedArea(areaDelEmpleado);
        }
      }
    }
  };

  const handleVerDetallesPapeleta = async () => {
    if (!delegateTo?.detallePapeleta) {
      console.log('No hay código de papeleta');
      return;
    }

    setLoadingPapeleta(true);
    try {
      console.log('Buscando papeleta con código:', delegateTo.detallePapeleta);
      
      let papeletaExterna = papeletasExternas.find(p => p.codigo_papeleta === delegateTo.detallePapeleta);
      
      if (!papeletaExterna) {
         console.log('No encontrada en cache, recargando externas...');
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
      console.error('Error al cargar detalles de papeleta:', error);
      toast.error('Error al cargar detalles de papeleta');
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

  const handleDelegateConfirm = async () => {
    if (!delegateTo) {
      toast.error('Debe seleccionar un personal');
      return;
    }

    // Validar estado antes de enviar
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

  // Columnas de la tabla (misma estructura para ambas pestañas)
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
                
                // Evita que el click se propague si la fila tiene acciones
                e.stopPropagation();

                if (row.delegado_por_nombres) {
                  // Toast limpio, estilo sistema (blanco con sombra y borde sutil)
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
                      iconTheme: {
                        primary: '#3b82f6',
                        secondary: '#fff',
                      },
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
            
            // Clase base para los contenedores (Flexbox centrado estricto)
            const containerBase = "flex items-center gap-1.5"; 

            if (row.estado_visita === 'PENDIENTE' || row.estado_visita === 'DELEGADO') {
              const isOverLimit = diffMinutes > 5;
              return (
                <div className={`${containerBase} ${isOverLimit ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  {/* shrink-0 evita que el icono se deforme */}
                  <ClockIcon className="h-4 w-4 shrink-0" />
                  {/* leading-none elimina el espacio vertical extra del texto */}
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
                  
                  {/* Ajuste fino: leading-none alinea el texto con el icono */}
                  <span className={`leading-none ${isOverLimit ? 'font-bold' : ''}`}>
                    {diffMinutes} min
                  </span>

                  {isOverLimit && (
                    // Flexbox aquí también para asegurar que el texto pequeño quede centrado respecto a su propio borde
                    <div className="flex items-center border-l border-orange-300 pl-1.5 h-full">
                       <span className="text-xs font-bold leading-none">
                        Excedido
                      </span>
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

  // Datos según pestaña (igual idea que en VisitantesTabla)
  const getTabData = () => {
    if (activeTab === 'activos') {
      return visitasActivas || [];
    }
    return historialVisitas || [];
  };

  // Paginación dinámica (igual idea que en VisitantesTabla)
  const getPaginationProps = () => {
    const data = getTabData();
    const totalItemsLocal = data.length;

    if (activeTab === 'activos') {
      const itemsPerPage =
        activosPagination?.itemsPerPage ||
        activosPagination?.limit ||
        10;

      const currentPage =
        activosPagination?.currentPage ||
        activosPagination?.page ||
        1;

      const totalItems =
        activosPagination?.totalItems ??
        activosPagination?.total ??
        totalItemsLocal;

      const totalPages =
        activosPagination?.totalPages ??
        activosPagination?.pages ??
        Math.ceil((totalItems || 0) / itemsPerPage);

      // 🔥 Regla dinámica: si no hay datos o el total cabe en una página, no muestres paginación
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

    // HISTORIAL
    const itemsPerPage =
      historialPagination?.itemsPerPage ||
      historialPagination?.limit ||
      10;

    const currentPage =
      historialPagination?.currentPage ||
      historialPagination?.page ||
      1;

    const totalItems =
      historialPagination?.totalItems ??
      historialPagination?.total ??
      totalItemsLocal;

    const totalPages =
      historialPagination?.totalPages ??
      historialPagination?.pages ??
      Math.ceil((totalItems || 0) / itemsPerPage);

    // 🔥 Mismo criterio dinámico para Historial
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Mis Visitas</h2>
            </div>
            
            <TabView
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
              className="mb-4"
            />
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
                  ? 'No hay visitas activas'
                  : 'No hay historial de visitas'
              }
            />
          </div>
        </div>
      </Card>

      {/* Modales */}
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
