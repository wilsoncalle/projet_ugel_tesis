import { useState } from 'react';
import Card from '../Card';
import Button from '../Button';
import TabView from '../TabView';
import TableGenerica from '../TableGenerica';
import ModalGenerico from '../ModalGenerico';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatHora } from '../../utils/dateHelpers';
import { visitasService, personalService } from '../../services/api';
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
  const [delegateTo, setDelegateTo] = useState(null);
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

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
    setDelegateModalOpen(true);
    
    if (personalList.length === 0) {
      setLoadingPersonal(true);
      try {
        const response = await personalService.getActivos();
        setPersonalList(response.data.data.map(p => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`
        })));
      } catch (error) {
        toast.error('Error al cargar lista de personal');
      } finally {
        setLoadingPersonal(false);
      }
    }
  };

  const handleDelegateConfirm = async () => {
    if (!delegateTo) {
      toast.error('Debe seleccionar un personal');
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
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[row.estado_visita] || 'bg-gray-100'}`}>
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
            const now = new Date();
            const ingreso = new Date(row.fecha_ingreso);
            const diffMinutes = differenceInMinutes(now, ingreso);
            
            if (row.estado_visita === 'PENDIENTE') {
              const isOverLimit = diffMinutes > 5;
              return (
                <div className={`flex items-center space-x-1 ${isOverLimit ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  <ClockIcon className="h-4 w-4" />
                  <span>{diffMinutes} min</span>
                  {isOverLimit && (
                    <ExclamationTriangleIcon
                      className="h-4 w-4"
                      title="Excedió tiempo de espera (5 min)"
                    />
                  )}
                </div>
              );
            } else if (row.estado_visita === 'ACEPTADO') {
              const isOverLimit = diffMinutes > 30;
              return (
                <div className={`flex items-center space-x-1 ${isOverLimit ? 'text-orange-600 font-bold' : 'text-green-600'}`}>
                  <ClockIcon className="h-4 w-4" />
                  <span>{diffMinutes} min</span>
                  {isOverLimit && (
                    <span className="text-xs bg-orange-100 px-1 rounded">
                      Excedido
                    </span>
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
            if (row.estado_visita !== 'PENDIENTE') return null;
            
            return (
              <div className="flex justify-center space-x-2">
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
          <div className="flex justify-center">
            <button
              onClick={() => handleViewDetails(row)}
              className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
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
          <p>Seleccione el personal a quien desea delegar la visita:</p>
          <SelectCustom
            options={personalList}
            value={delegateTo}
            onChange={setDelegateTo}
            placeholder="Buscar personal..."
            isSearchable
            isLoading={loadingPersonal}
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setDelegateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDelegateConfirm}>
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
            <div className="flex justify-end mt-4">
              <Button variant="primary" onClick={() => setDetailsModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </ModalGenerico>
    </div>
  );
};

export default MisVisitasTabla;
