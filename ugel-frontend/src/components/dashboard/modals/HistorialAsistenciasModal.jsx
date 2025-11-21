import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Maximize2 } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import TableGenerica from '../../TableGenerica';
import Input from '../../Input';
import Button from '../../Button';
import { asistenciaPersonalService } from '../../../services/api';
import getHistorialAsistenciasColumns from '../../personal/columns/historialAsistenciasColumns.jsx';
import ModalDetalles from '../../ModalDetalles';
import DateRangeFilter from '../../DateRangeFilter';

const HistorialAsistenciasModal = ({ isOpen, onClose, initialFilters = {} }) => {
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

      const params = {
        page: filtrosCompletos.page,
        limit: filtrosCompletos.limit,
      };

      if (filtrosCompletos.busqueda) params.q = filtrosCompletos.busqueda;
      if (filtrosCompletos.estadoPresencia) params.estadoPresencia = filtrosCompletos.estadoPresencia;
      if (filtrosCompletos.fechaDesde) params.fechaInicio = filtrosCompletos.fechaDesde;
      if (filtrosCompletos.fechaHasta) params.fechaFin = filtrosCompletos.fechaHasta;

      const response = await asistenciaPersonalService.getAll(params);
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
      setError('Error al cargar el historial de asistencias');
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

  const columns = getHistorialAsistenciasColumns({
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
                    Historial de Asistencias
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
                        placeholder="Buscar nombre, documento o área"
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
                  title="Detalles de Asistencia"
                  size="lg"
                  fields={[
                    {
                      key: 'personal_nombres',
                      label: 'Personal',
                      render: (value, dataRow) =>
                        `${dataRow.personal_nombres || ''} ${
                          dataRow.personal_apellidos || ''
                        }`.trim(),
                    },
                    {
                      key: 'personal_numero_documento',
                      label: 'Documento',
                      render: (value, dataRow) =>
                        `${dataRow.personal_tipo_documento || 'DNI'}: ${
                          value || ''
                        }`,
                    },
                    {
                      key: 'personal_cargo_nombre',
                      label: 'Cargo',
                      render: (value) => value || 'Sin cargo asignado',
                    },
                    {
                      key: 'personal_area_nombre',
                      label: 'Área',
                      render: (value, dataRow) => {
                        const area =
                          value ||
                          dataRow?.personal_area_nombre ||
                          dataRow?.area_nombre ||
                          dataRow?.area;
                        return area || 'Sin área asignada';
                      },
                    },
                    {
                      key: 'estado_presencia',
                      label: 'Estado de Presencia',
                      render: (value) => value || 'No especificado',
                    },
                    {
                      key: 'fecha',
                      label: 'Fecha',
                      render: (value) => {
                        if (!value) return 'No especificada';
                        try {
                          const fecha = new Date(value);
                          return fecha.toLocaleDateString('es-PE');
                        } catch {
                          return value;
                        }
                      },
                    },
                    {
                      key: 'hora_ingreso',
                      label: 'Hora de Ingreso',
                      render: (value) => {
                        if (!value) return 'No registrada';
                        return value.substring(0, 5);
                      },
                    },
                    {
                      key: 'hora_salida',
                      label: 'Hora de Salida',
                      render: (value) => {
                        if (!value) return 'Sin salida registrada';
                        return value.substring(0, 5);
                      },
                    },
                    {
                      key: 'usuario_registro',
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

export default HistorialAsistenciasModal;
