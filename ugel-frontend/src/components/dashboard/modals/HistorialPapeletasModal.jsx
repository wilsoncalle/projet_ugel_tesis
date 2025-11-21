import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Eye } from 'lucide-react';
import TableGenerica from '../../TableGenerica';
import Input from '../../Input';
import Button from '../../Button';
import { papeletasSalidaService } from '../../../services/api';
import ModalDetalles from '../../ModalDetalles';
import DateRangeFilter from '../../DateRangeFilter';

const HistorialPapeletasModal = ({ isOpen, onClose, initialFilters = {} }) => {
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaDesde: '',
    fechaHasta: '',
    estado: '',
    ...initialFilters,
  });
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const safeInitialFilters = initialFilters || {};
      setFiltros((prev) => ({
        ...prev,
        ...safeInitialFilters,
      }));
      fetchData(1, safeInitialFilters);
    }
  }, [isOpen]);

  const fetchData = async (page = 1, overrides = {}) => {
    try {
      setLoading(true);
      setError('');

      const filtrosCompletos = {
        ...filtros,
        ...overrides,
        page,
        limit: 10,
      };

      // Construir params para el servicio
      // Nota: papeletasSalidaService.getExternas suele traer todo, 
      // si el backend soporta paginación real, se pasan params.
      // Si no, habrá que filtrar en cliente (simulado aquí si fuera necesario, 
      // pero asumiremos que el servicio puede manejar algunos filtros o lo adaptamos).
      
      // Si el backend de papeletas no soporta paginación directa en getExternas,
      // podríamos necesitar traer todo y paginar en cliente.
      // Por consistencia con otros modales, intentaremos usar la estructura estándar.
      
      const response = await papeletasSalidaService.getExternas();
      let items = response.data?.data || [];

      // Filtrado en cliente si el backend no lo hace (común en este proyecto para papeletas)
      if (filtrosCompletos.busqueda) {
        const q = filtrosCompletos.busqueda.toLowerCase();
        items = items.filter(p => 
           p.codigo_papeleta?.toLowerCase().includes(q) ||
           p.solicitante_nombres?.toLowerCase().includes(q) ||
           p.solicitante_apellidos?.toLowerCase().includes(q) ||
           p.nombres?.toLowerCase().includes(q) ||
           p.apellidos?.toLowerCase().includes(q)
        );
      }

      if (filtrosCompletos.fechaDesde) {
        const d = new Date(filtrosCompletos.fechaDesde);
        items = items.filter(p => new Date(p.created_at || p.fecha_solicitud) >= d);
      }
      
      if (filtrosCompletos.fechaHasta) {
        const d = new Date(filtrosCompletos.fechaHasta);
        // Ajustar al final del día
        d.setHours(23, 59, 59, 999);
        items = items.filter(p => new Date(p.created_at || p.fecha_solicitud) <= d);
      }

      // Paginación en cliente
      const total = items.length;
      const totalPages = Math.ceil(total / filtrosCompletos.limit);
      const startIndex = (page - 1) * filtrosCompletos.limit;
      const paginatedItems = items.slice(startIndex, startIndex + filtrosCompletos.limit);

      setData(paginatedItems);
      setPagination({
        page,
        totalPages,
        total,
        limit: filtrosCompletos.limit,
      });
      
      setFiltros((prev) => ({
        ...prev,
        busqueda: filtrosCompletos.busqueda || '',
        fechaDesde: filtrosCompletos.fechaDesde || '',
        fechaHasta: filtrosCompletos.fechaHasta || '',
      }));

    } catch (e) {
      console.error(e);
      setError('Error al cargar el historial de papeletas');
      setData([]);
      setPagination({ page, totalPages: 1, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    fetchData(newPage);
  };

  const handleBuscarClick = () => {
    fetchData(1, {});
  };

  const handleLimpiar = () => {
    const filtrosLimpios = {
      busqueda: '',
      fechaDesde: '',
      fechaHasta: '',
    };
    setFiltros(filtrosLimpios);
    fetchData(1, filtrosLimpios);
  };

  const handleFechaDesdeChange = (fecha, fechaHasta = null) => {
    const filtrosActualizados = {
      ...filtros,
      fechaDesde: fecha,
      fechaHasta: fechaHasta !== null ? fechaHasta : filtros.fechaHasta,
    };
    setFiltros(filtrosActualizados);
    fetchData(1, filtrosActualizados);
  };

  const handleFechaHastaChange = (fecha, fechaDesde = null) => {
    if (fechaDesde) return;
    const filtrosActualizados = {
      ...filtros,
      fechaHasta: fecha,
    };
    setFiltros(filtrosActualizados);
    fetchData(1, filtrosActualizados);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  // Helpers para columnas
  const estadoBadge = (estado) => {
    const map = {
      APROBADO: ["bg-green-100", "text-green-800", "Aprobado"],
      EN_CURSO: ["bg-blue-100", "text-blue-800", "En curso"],
      FINALIZADO: ["bg-gray-100", "text-gray-800", "Finalizado"],
      SOLICITADO: ["bg-yellow-100", "text-yellow-800", "Solicitado"],
      RECHAZADO: ["bg-red-100", "text-red-800", "Rechazado"],
    };
    const [bg, tx, txt] = map[estado] || ["bg-zinc-100", "text-zinc-800", estado || "—"];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${tx}`}>
        {txt}
      </span>
    );
  };

  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString("es-PE")} ${d.toTimeString().slice(0, 5)}`;
    } catch {
      return iso;
    }
  };

  const columns = [
    { 
      key: 'codigo', 
      title: 'Código',
      render: (row) => <span className="font-medium text-slate-700">{row.codigo_papeleta}</span>
    },
    { 
      key: 'personal', 
      title: 'Personal',
      render: (row) => {
        const nombres = row.solicitante_nombres || row.nombres || '';
        const apellidos = row.solicitante_apellidos || row.apellidos || '';
        return `${nombres} ${apellidos}`.trim();
      }
    },
    { 
      key: 'motivo', 
      title: 'Motivo',
      render: (row) => row.nombre_motivo || row.motivo || '—'
    },
    {
      key: 'salida',
      title: 'Salida Prog.',
      render: (row) => fmtDateTime(row.fecha_hora_salida_programada)
    },
    {
      key: 'retorno',
      title: 'Retorno Prog.',
      render: (row) => fmtDateTime(row.fecha_hora_retorno_programada)
    },
    { 
      key: 'estado', 
      title: 'Estado',
      render: (row) => estadoBadge(row.estado)
    },
    {
      key: 'acciones',
      title: 'Acción',
      render: (row) => (
        <button
          onClick={() => setSelectedItem(row)}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          title="Ver detalles"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
          >
            <path
              d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
    }
  ];

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-6 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full transform overflow-hidden rounded-2xl bg-white px-6 py-6 text-left shadow-2xl transition-all sm:my-8 max-w-6xl">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                  <Dialog.Title className="text-xl font-semibold text-gray-900">
                    Historial de Papeletas
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    {pagination.total > 0 && (
                      <span className="text-xs text-gray-500">
                        {pagination.total} registro(s) encontrados
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      className="p-2 rounded-full"
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar por código o personal"
                        value={filtros.busqueda}
                        onChange={(e) =>
                          setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
                        }
                      />

                      <div className="flex items-center justify-end gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLimpiar}
                          className="p-2 rounded-full"
                          aria-label="Limpiar filtros"
                          title="Limpiar filtros"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleBuscarClick} isLoading={loading}>
                          Aplicar filtros
                        </Button>
                      </div>
                    </div>

                    <div className="w-full md:w-1/2 mt-4 md:mt-0">
                      <DateRangeFilter
                        fechaDesde={filtros.fechaDesde || null}
                        fechaHasta={filtros.fechaHasta || null}
                        onFechaDesdeChange={handleFechaDesdeChange}
                        onFechaHastaChange={handleFechaHastaChange}
                        onClear={handleLimpiar}
                        className="mb-0"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <TableGenerica
                      columns={columns}
                      data={data}
                      isLoading={loading}
                      pagination={true}
                      itemsPerPage={pagination.limit}
                      currentPage={pagination.page}
                      totalItems={pagination.total}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                      searchable={false}
                      emptyMessage="No se encontraron papeletas para los filtros aplicados"
                    />
                  </div>
                </div>

                <ModalDetalles
                  isOpen={!!selectedItem}
                  onClose={handleCloseDetails}
                  data={selectedItem || {}}
                  title="Detalles de Papeleta de Salida"
                  size="lg"
                  fields={[
                    {
                      key: 'codigo_papeleta',
                      label: 'Código de Papeleta',
                      render: (value, data) => value || data?.codigo_papeleta || '—'
                    },
                    {
                      key: 'solicitante',
                      label: 'Solicitante',
                      render: (value, data) => {
                        const nombres = data?.solicitante_nombres || data?.nombres || '';
                        const apellidos = data?.solicitante_apellidos || data?.apellidos || '';
                        return `${nombres} ${apellidos}`.trim() || '—';
                      }
                    },
                    {
                      key: 'nombre_motivo',
                      label: 'Motivo de Salida',
                      render: (value, data) => value || data?.nombre_motivo || data?.motivo || '—'
                    },
                    {
                      key: 'fecha_hora_salida_programada',
                      label: 'Salida Programada',
                      render: (value, data) => fmtDateTime(value || data?.fecha_hora_salida_programada)
                    },
                    {
                      key: 'fecha_hora_retorno_programada',
                      label: 'Retorno Programada',
                      render: (value, data) => fmtDateTime(value || data?.fecha_hora_retorno_programada)
                    },
                    {
                      key: 'fecha_hora_salida_real',
                      label: 'Salida Real',
                      render: (value, data) => fmtDateTime(value || data?.fecha_hora_salida_real)
                    },
                    {
                      key: 'fecha_hora_retorno_real',
                      label: 'Retorno Real',
                      render: (value, data) => fmtDateTime(value || data?.fecha_hora_retorno_real)
                    },
                    {
                      key: 'estado',
                      label: 'Estado',
                      render: (value, data) => {
                        const estadoValue = value || data?.estado;
                        const estadoMap = {
                          APROBADO: 'Aprobado',
                          EN_CURSO: 'En curso',
                          FINALIZADO: 'Finalizado',
                          SOLICITADO: 'Solicitado',
                          RECHAZADO: 'Rechazado'
                        };
                        return estadoMap[estadoValue] || estadoValue || '—';
                      }
                    },
                  ]}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default HistorialPapeletasModal;
