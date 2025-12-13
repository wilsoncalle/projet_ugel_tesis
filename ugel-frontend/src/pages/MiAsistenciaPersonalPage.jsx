import { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../components/Card';
import SelectCustom from '../components/SelectCustom';
import TableGenerica from '../components/TableGenerica';
import Button from '../components/Button';
import { asistenciaPersonalService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import JustificationModal from '../components/JustificationModal';
import Notification from '../components/Notification';

// Badge simple para el estado de presencia
const EstadoBadge = ({ estado }) => {
  const configs = {
    Presente: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'PRESENTE',
    },
    Tardanza: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'TARDANZA',
    },
    Tarde: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'TARDANZA',
    },
    Ausente: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'AUSENTE',
    },
    Permiso: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'PERMISO',
    },
    'En Permiso': {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'EN PERMISO',
    },
    Justificada: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'JUSTIFICADA',
    },
    Comisión: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      label: 'COMISIÓN',
    },
  };

  const config = configs[estado] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    label: estado || 'Desconocido',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
};

// Tarjeta métrica pequeña
const MetricCard = ({ label, value, icon: Icon, colorClasses = '' }) => {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-3 py-2 bg-white ${colorClasses}`}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900 tabular-nums">
        {value}
      </span>
    </div>
  );
};

const MiAsistenciaPersonalPage = () => {
  useDocumentTitle('Mi Asistencia - COAC-UGEL');
  const { user } = useAuth();

  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [asistencias, setAsistencias] = useState([]);
  const [resumen, setResumen] = useState({
    diasToleranciaTotal: 0,
    diasToleranciaUsados: 0,
    diasToleranciaRestantes: 0,
    presentes: 0,
    tardanzas: 0,
    ausentes: 0,
    permisos: 0,
    justificadas: 0,
    minutosTardanza: 0,
  });

  const [loadingTabla, setLoadingTabla] = useState(false);
  const [loadingResumen, setLoadingResumen] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // Estado para el modal de justificación
  const [justificationModalOpen, setJustificationModalOpen] = useState(false);
  const [selectedRecordForJustification, setSelectedRecordForJustification] =
    useState(null);
  const [justifying, setJustifying] = useState(false);

  // Opciones de año
  const yearOptions = useMemo(() => {
    const currentYear = hoy.getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      years.push({ value: y, label: y.toString() });
    }
    return years;
  }, [hoy]);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Setiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' },
    ],
    []
  );

  // Se permite el acceso a cualquier rol, el backend validará si tiene personal_id asociado
  const noEsPersonal = user && user.rol && user.rol !== 'personal';

  const fetchResumen = useCallback(async () => {
    try {
      setLoadingResumen(true);
      setError('');

      const response = await asistenciaPersonalService.getMiResumen({
        anio,
        mes,
      });

      if (response.data?.success) {
        const d = response.data.data || {};
        setResumen({
          diasToleranciaTotal: d.diasToleranciaTotal ?? 0,
          diasToleranciaUsados: d.diasToleranciaUsados ?? 0,
          diasToleranciaRestantes: d.diasToleranciaRestantes ?? 0,
          presentes: d.presentes ?? 0,
          tardanzas: d.tardanzas ?? 0,
          ausentes: d.ausentes ?? 0,
          permisos: d.permisos ?? 0,
          justificadas: d.justificadas ?? 0,
          minutosTardanza: d.minutosTardanza ?? 0,
        });
      } else {
        setError('No se pudo cargar el resumen de asistencia.');
      }
    } catch (err) {
      console.error('Error al cargar resumen:', err);
      setError(
        err.response?.data?.message ||
          'Error al cargar el resumen de asistencia.'
      );
    } finally {
      setLoadingResumen(false);
    }
  }, [anio, mes]);

  const fetchAsistencias = useCallback(async () => {
    try {
      setLoadingTabla(true);
      setError('');

      const response = await asistenciaPersonalService.getMiAsistencia({
        anio,
        mes,
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.data?.success) {
        setAsistencias(response.data.data || []);
        const pag = response.data.pagination || response.data.meta || {};
        setPagination((prev) => ({
          ...prev,
          page: pag.page ?? prev.page,
          limit: pag.limit ?? prev.limit,
          total: pag.total ?? prev.total ?? 0,
          totalPages:
            (pag.totalPages ??
              Math.ceil((pag.total ?? 0) / prev.limit)) || 1,
        }));
      } else {
        setError('No se pudo cargar la asistencia.');
      }
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
      setError(
        err.response?.data?.message ||
          'Error al cargar los registros de asistencia.'
      );
    } finally {
      setLoadingTabla(false);
    }
  }, [anio, mes, pagination.page, pagination.limit]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [anio, mes]);

  useEffect(() => {
    if (noEsPersonal) return;
    fetchResumen();
    fetchAsistencias();
  }, [noEsPersonal, fetchResumen, fetchAsistencias]);

  const handleChangeYear = (option) => {
    if (!option) return;
    setAnio(option.value);
  };

  const handleChangeMonth = (option) => {
    if (!option) return;
    setMes(option.value);
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const openJustificationModal = (record) => {
    setSelectedRecordForJustification(record);
    setJustificationModalOpen(true);
  };

  const closeJustificationModal = () => {
    setJustificationModalOpen(false);
    setSelectedRecordForJustification(null);
  };

  const handleSubmitJustification = async (data) => {
    if (!selectedRecordForJustification) return;

    try {
      setJustifying(true);
      const response = await asistenciaPersonalService.justificar(
        selectedRecordForJustification.id,
        data
      );

      if (response.data?.success) {
        // Actualizar la lista y el resumen
        fetchAsistencias();
        fetchResumen();
        closeJustificationModal();
        setNotification({
          message: 'Justificación enviada correctamente. Pendiente de aprobación.',
          type: 'success',
        });
      } else {
        setNotification({
          message: 'Error al enviar la justificación.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Error al justificar:', err);
      setNotification({
        message: err.response?.data?.message || 'Error al enviar la justificación.',
        type: 'error',
      });
    } finally {
      setJustifying(false);
    }
  };

  // Columnas de la tabla
  const columns = useMemo(
    () => [
      {
        key: 'fecha',
        label: 'Fecha',
        width: '110px',
        minWidth: '110px',
        render: (row) => {
          if (!row?.fecha) return '-';
          try {
            const fecha = new Date(row.fecha);
            return (
              <div className="text-sm text-gray-900 tabular-nums">
                {fecha.toLocaleDateString('es-PE')}
              </div>
            );
          } catch {
            return <div className="text-sm text-gray-900">{row.fecha}</div>;
          }
        },
      },
      {
        key: 'dia_semana',
        label: 'Día',
        width: '100px',
        minWidth: '100px',
        render: (row) => {
          if (!row?.fecha) return '-';
          const fecha = new Date(row.fecha);
          const dias = [
            'Domingo',
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
            'Sábado',
          ];
          return (
            <div className="text-sm text-gray-900">
              {dias[fecha.getDay()] || '-'}
            </div>
          );
        },
      },
      {
        key: 'hora_ingreso',
        label: 'Ingreso',
        width: '80px',
        minWidth: '80px',
        render: (row) => {
          let h = row?.hora_ingreso || '-';
          if (h !== '-' && typeof h === 'string' && h.includes(':')) {
            h = h.substring(0, 5);
          }
          return (
            <div className="text-sm text-gray-900 tabular-nums">
              {h}
            </div>
          );
        },
      },
      {
        key: 'hora_salida',
        label: 'Salida',
        width: '80px',
        minWidth: '80px',
        render: (row) => {
          let h = row?.hora_salida || '-';
          if (h !== '-' && typeof h === 'string' && h.includes(':')) {
            h = h.substring(0, 5);
          }
          return (
            <div className="text-sm text-gray-900 tabular-nums">
              {h}
            </div>
          );
        },
      },
      {
        key: 'estado_presencia',
        label: 'Estado',
        width: '120px',
        minWidth: '120px',
        render: (row) => <EstadoBadge estado={row?.estado_presencia} />,
      },
      {
        key: 'minutos_tardanza',
        label: 'Min. Tardanza',
        width: '110px',
        minWidth: '110px',
        render: (row) => {
          const minutos =
            row?.minutos_tardanza ??
            row?.minutosTardanza ??
            row?.minutos_tarde ??
            0;
          if (!minutos) {
            return <span className="text-sm text-gray-900">-</span>;
          }
          const esMayor30 = minutos > 30;
          return (
            <span
              className={`text-sm font-semibold tabular-nums ${
                esMayor30 ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              {minutos} min
            </span>
          );
        },
      },
      {
        key: 'acciones',
        label: 'Acciones',
        width: '120px',
        minWidth: '120px',
        render: (row) => {
          // Verificar si ya tiene justificación
          const justificacionEstado = row?.justificacion_estado;
          
          if (justificacionEstado) {
            // Mapear colores según estado
            const badgeColors = {
              PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-200',
              APROBADO: 'bg-green-100 text-green-800 border-green-200',
              RECHAZADO: 'bg-red-100 text-red-800 border-red-200',
            };
            const colorClass = badgeColors[justificacionEstado] || 'bg-gray-100 text-gray-800 border-gray-200';
            
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                {justificacionEstado}
              </span>
            );
          }

          // Si no tiene justificación, verificar si puede justificar
          const canJustify = ['Tardanza', 'Ausente', 'Falta'].includes(row?.estado_presencia);
          
          return canJustify ? (
            <Button
              variant="default"
              size="xs"
              onClick={() => openJustificationModal(row)}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 rounded-full px-2 py-1 transition-all shadow-sm"
            >
              <span className="flex flex-row items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-blue-800" />
                <span className="text-xs font-medium">Justificar</span>
              </span>
            </Button>
          ) : (
            <span className="mx-auto block w-4 h-1 bg-gray-200 rounded-full"></span>
          );
        },
      },
    ],
    [openJustificationModal]
  );

  if (noEsPersonal) {
    return (
      <div className="p-6">
        <Card className="p-6 border border-amber-200 bg-amber-50">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold text-amber-800">
                Solo para usuarios con rol "Personal"
              </h2>
              <p className="text-sm text-amber-700">
                Esta vista está diseñada para que cada trabajador vea su propia
                asistencia.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const mensajeTolerancia =
    resumen.diasToleranciaRestantes > 0
      ? `Te quedan ${resumen.diasToleranciaRestantes} día(s) de tolerancia.`
      : 'Ya no te quedan días de tolerancia.';

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Encabezado y filtros */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Mi Asistencia
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Consulta tus registros de asistencia por año y mes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-40">
                <SelectCustom
                  label="Año"
                  hideLabel
                  options={yearOptions}
                  value={yearOptions.find((y) => y.value === anio) || null}
                  onChange={handleChangeYear}
                  isSearchable={false}
                />
              </div>
              <div className="w-40">
                <SelectCustom
                  label="Mes"
                  hideLabel
                  options={monthOptions}
                  value={monthOptions.find((m) => m.value === mes) || null}
                  onChange={handleChangeMonth}
                  isSearchable={false}
                />
              </div>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Métricas */}
            <Card className="p-0 border border-gray-200 bg-white rounded-2xl shadow-sm">
              <div className="flex flex-col gap-4">
                {/* Tolerancia */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <CalendarIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Tolerancia de tardanzas
                      </p>
                      <p className="text-xs text-gray-500 tabular-nums">
                        {loadingResumen ? 'Calculando...' : mensajeTolerancia}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <MetricCard
                      label={'Días totales:\u00A0'}
                      value={
                        <span className="text-xs font-semibold text-gray-800">
                          {resumen.diasToleranciaTotal}
                        </span>
                      }
                      icon={CalendarIcon}
                    />

                    <MetricCard
                      label={'Días usados:\u00A0'}
                      value={
                        <span className="text-xs font-semibold text-gray-800">
                          {resumen.diasToleranciaUsados}
                        </span>
                      }
                      icon={ClockIcon}
                    />

                    <MetricCard
                      label={'Días restantes:\u00A0'}
                      value={
                        <span className="text-xs font-semibold text-red-600">
                          {resumen.diasToleranciaRestantes}
                        </span>
                      }
                      icon={CheckCircleIcon}
                    />
                  </div>
                </div>

                {/* Conteo de estados */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Resumen del mes
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <MetricCard
                      label="Presentes"
                      value={resumen.presentes}
                      icon={CheckCircleIcon}
                      colorClasses="border-green-100 bg-green-50/30"
                    />
                    <MetricCard
                      label="Tardanzas"
                      value={resumen.tardanzas}
                      icon={ClockIcon}
                      colorClasses="border-amber-100 bg-amber-50/30"
                    />
                    <MetricCard
                      label="Ausentes"
                      value={resumen.ausentes}
                      icon={XCircleIcon}
                      colorClasses="border-red-100 bg-red-50/30"
                    />
                    <MetricCard
                      label="Permisos"
                      value={resumen.permisos}
                      icon={ExclamationTriangleIcon}
                      colorClasses="border-blue-100 bg-blue-50/30"
                    />
                    <MetricCard
                      label="Justificadas"
                      value={resumen.justificadas}
                      icon={InformationCircleIcon}
                      colorClasses="border-purple-100 bg-purple-50/30"
                    />
                  </div>
                </div>

                {/* Minutos de tardanza totales */}
                <div className="pt-2">
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    Minutos de tardanza acumulados:{' '}
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {resumen.minutosTardanza} min
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            {/* Tabla de asistencias */}
            <Card className="p-0 border border-gray-200 bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-1 pt-0 pb-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Registros de asistencia
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    fetchResumen();
                    fetchAsistencias();
                  }}
                  disabled={loadingTabla || loadingResumen}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900"
                >
                  Actualizar
                </Button>
              </div>

              <div className="p-0">
                <TableGenerica
                  columns={columns}
                  data={asistencias}
                  pagination
                  itemsPerPage={pagination.limit}
                  currentPage={pagination.page}
                  totalItems={pagination.total}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  isLoading={loadingTabla}
                  emptyMessage="No hay registros de asistencia para el período seleccionado."
                />
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Justificación */}
      <JustificationModal
        isOpen={justificationModalOpen}
        onClose={closeJustificationModal}
        onSubmit={handleSubmitJustification}
        attendanceRecord={selectedRecordForJustification}
        isLoading={justifying}
      />
    </div>
  );
};

export default MiAsistenciaPersonalPage;
