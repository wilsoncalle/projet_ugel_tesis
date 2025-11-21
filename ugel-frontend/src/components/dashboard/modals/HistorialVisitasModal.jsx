import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import TableGenerica from '../../TableGenerica';
import Input from '../../Input';
import Button from '../../Button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getHistorialDeVisitas } from '../../../services/api';
import getHistorialVisitasColumns from '../../vigilante/columns/historialVisitasColumns.jsx';
import ModalDetalles from '../../ModalDetalles';
import DateRangeFilter from '../../DateRangeFilter';

const HistorialVisitasModal = ({ isOpen, onClose, initialFilters = {} }) => {
  const [filtros, setFiltros] = useState({
    busqueda: '',
    fechaDesde: '',
    fechaHasta: '',
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

      const response = await getHistorialDeVisitas(filtrosCompletos);
      const payload = response.data;

      if (payload && payload.success) {
        const items = payload.data || [];
        const pag = payload.pagination || {};

        setData(items);
        setPagination({
          page: pag.page || page,
          totalPages: pag.totalPages || 1,
          total: pag.total || items.length || 0,
          limit: pag.limit || 10,
        });
        setFiltros((prev) => ({
          ...prev,
          busqueda: filtrosCompletos.busqueda || '',
          fechaDesde: filtrosCompletos.fechaDesde || '',
          fechaHasta: filtrosCompletos.fechaHasta || '',
        }));
      } else {
        setData([]);
        setPagination({ page, totalPages: 1, total: 0, limit: 10 });
        setError('No se encontraron registros para los filtros aplicados');
      }
    } catch (e) {
      setError('Error al cargar el historial de visitas');
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
      // Si viene fechaHasta (semana o día específico), usarlo; si no, mantener el actual
      fechaHasta: fechaHasta !== null ? fechaHasta : filtros.fechaHasta,
    };

    setFiltros(filtrosActualizados);
    fetchData(1, filtrosActualizados);
  };

  const handleFechaHastaChange = (fecha, fechaDesde = null) => {
    // Si viene fechaDesde, el handler de fechaDesde ya gestionó el rango completo
    if (fechaDesde) {
      return;
    }

    const filtrosActualizados = {
      ...filtros,
      fechaHasta: fecha,
    };

    setFiltros(filtrosActualizados);
    fetchData(1, filtrosActualizados);
  };

  const columns = getHistorialVisitasColumns({
    handleOpenModal: (row) => setSelectedItem(row),
  });

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

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
                    Historial de Visitas
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
                    {/* Columna izquierda: buscador arriba, botones debajo */}
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar nombre, documento o empleado visitado"
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

                    {/* Columna derecha: filtro por fechas */}
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
                      emptyMessage="No se encontraron registros para los filtros aplicados"
                    />
                  </div>
                </div>

                <ModalDetalles
                  isOpen={!!selectedItem}
                  onClose={handleCloseDetails}
                  data={selectedItem || {}}
                  title="Detalles de Visita"
                  size="lg"
                  fields={[
                    {
                      key: 'visitante_nombres',
                      label: 'Visitante',
                      render: (value, dataRow) =>
                        `${dataRow.visitante_nombres || ''} ${
                          dataRow.visitante_apellidos || ''
                        }`.trim(),
                    },
                    {
                      key: 'numero_documento',
                      label: 'Documento',
                      render: (value, dataRow) =>
                        `${dataRow.tipo_documento_codigo || 'DNI'}: ${value || ''}`,
                    },
                    {
                      key: 'personal_nombres',
                      label: 'Empleado Visitado',
                      render: (value, dataRow) =>
                        `${dataRow.personal_nombres || ''} ${
                          dataRow.personal_apellidos || ''
                        }`.trim(),
                    },
                    {
                      key: 'personal_cargo',
                      label: 'Cargo del Empleado',
                      render: (value) => value || 'Sin cargo asignado',
                    },
                    {
                      key: 'nombre_motivo',
                      label: 'Motivo de Visita',
                      render: (value) => value || 'No especificado',
                    },
                    {
                      key: 'nombre_area',
                      label: 'Área de Destino',
                      render: (value) => value || 'No especificada',
                    },
                    {
                      key: 'fecha_ingreso',
                      label: 'Fecha y Hora de Ingreso',
                      render: (value) => {
                        if (!value) return 'No especificada';
                        try {
                          const fecha = new Date(value);
                          return fecha.toLocaleString('es-PE');
                        } catch {
                          return value;
                        }
                      },
                    },
                    {
                      key: 'fecha_salida',
                      label: 'Fecha y Hora de Salida',
                      render: (value) => {
                        if (!value) return 'Visita activa';
                        try {
                          const fecha = new Date(value);
                          return fecha.toLocaleString('es-PE');
                        } catch {
                          return value;
                        }
                      },
                    },
                    {
                      key: 'usuario_ingreso',
                      label: 'Registrado por',
                      render: (value) => value || 'No especificado',
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

export default HistorialVisitasModal;
