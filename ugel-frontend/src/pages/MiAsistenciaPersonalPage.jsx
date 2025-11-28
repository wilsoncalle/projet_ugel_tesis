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
} from '@heroicons/react/24/outline';

// Badge simple para el estado de presencia
// Badge con código de una letra (P, T, F, J)
const EstadoBadge = ({ estado }) => {
  const configs = {
    Presente: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Presente',
    },
    Tardanza: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'Tardanza',
    },
    Tarde: {
      bg: 'bg-amber-100',
      text: 'text-amber-800',
      label: 'Tardanza',
    },
    Ausente: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Falta',
    },
    Permiso: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'Justificado',
    },
    'En Permiso': {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'Justificado',
    },
    Justificada: {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      label: 'Justificado',
    },
    Comisión: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      label: 'Comisión',
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
        {Icon && <Icon className="h-4 w-4" />}
        <span className="text-xs font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
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

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });

  // Opciones de año (puedes ajustar el rango)
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

  // Si el usuario no es "Personal" puedes mostrar un mensaje sencillo
  const noEsPersonal = user && user.rol && user.rol !== 'Personal';

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
          totalPages: (pag.totalPages ?? Math.ceil((pag.total ?? 0) / prev.limit)) || 1,
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

  // Cuando cambian año o mes, reiniciamos la página a 1
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [anio, mes]);

  // Cargar datos al cambiar filtros o página
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
              <div className="text-sm text-gray-900">
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
            <div className="text-sm text-gray-700">
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
          return <div className="text-sm text-gray-900">{h}</div>;
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
          return <div className="text-sm text-gray-900">{h}</div>;
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
            return <span className="text-sm text-gray-400">-</span>;
          }
          const esMayor30 = minutos > 30;
          return (
            <span
              className={`text-sm font-semibold ${
                esMayor30 ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              {minutos} min
            </span>
          );
        },
      },
    ],
    []
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
      <div className="flex-1 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Encabezado y filtros */}
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Mi Asistencia
              </h1>
              <p className="text-sm text-gray-600">
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
            <Card className="p-4 border border-gray-200 bg-white rounded-2xl">
              <div className="flex flex-col gap-3">
                {/* Tolerancia */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Tolerancia de llegadas tarde
                      </p>
                      <p className="text-xs text-gray-600">
                        {loadingResumen ? 'Calculando...' : mensajeTolerancia}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <MetricCard
                      label="Días totales"
                      value={resumen.diasToleranciaTotal}
                      icon={CalendarIcon}
                    />
                    <MetricCard
                      label="Días usados"
                      value={resumen.diasToleranciaUsados}
                      icon={ClockIcon}
                    />
                    <MetricCard
                      label="Días restantes"
                      value={resumen.diasToleranciaRestantes}
                      icon={CheckCircleIcon}
                    />
                  </div>
                </div>

                {/* Conteo de estados */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                  <MetricCard
                    label="Presentes"
                    value={resumen.presentes}
                    icon={CheckCircleIcon}
                    colorClasses="border-green-200"
                  />
                  <MetricCard
                    label="Tardanzas"
                    value={resumen.tardanzas}
                    icon={ClockIcon}
                    colorClasses="border-amber-200"
                  />
                  <MetricCard
                    label="Ausentes"
                    value={resumen.ausentes}
                    icon={XCircleIcon}
                    colorClasses="border-red-200"
                  />
                  <MetricCard
                    label="Permisos"
                    value={resumen.permisos}
                    icon={ExclamationTriangleIcon}
                    colorClasses="border-blue-200"
                  />
                  <MetricCard
                    label="Justificadas"
                    value={resumen.justificadas}
                    icon={InformationCircleIcon}
                    colorClasses="border-purple-200"
                  />
                </div>

                {/* Minutos de tardanza totales */}
                <div className="mt-2">
                  <p className="text-xs text-gray-600">
                    Minutos de tardanza acumulados en el período:{' '}
                    <span className="font-semibold text-amber-700">
                      {resumen.minutosTardanza} min
                    </span>
                  </p>
                </div>
              </div>
            </Card>

            {/* Tabla de asistencias */}
            <Card className="p-0 border border-gray-200 bg-white rounded-2xl">
              <div className="px-1 pt-0 pb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-800">
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
                  className="text-xs"
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
    </div>
  );
};

export default MiAsistenciaPersonalPage;
