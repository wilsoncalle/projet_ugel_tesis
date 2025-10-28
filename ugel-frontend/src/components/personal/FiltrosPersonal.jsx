import { useState, useEffect } from 'react';
import Button from '../Button';
import Input from '../Input';
import SelectCustom from '../SelectCustom';
import Pagination from '../Pagination';
import { MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cargosService, areasService } from '../../services/api';

const FiltrosPersonal = ({ 
  filtros, 
  onBuscar, 
  isExpanded, 
  onToggleExpanded,
  historialPagination,
  onHistorialPageChange
}) => {
  const [formFiltros, setFormFiltros] = useState({
    busqueda: '',
    cargoId: '',
    areaId: '',
    activo: '',
    fechaDesde: '',
    fechaHasta: '',
    ...filtros
  });

  // Estados para datos de los selects
  const [cargos, setCargos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos de las APIs al montar el componente
  useEffect(() => {
    cargarDatosFiltros();
  }, []);

  const cargarDatosFiltros = async () => {
    try {
      setLoadingData(true);
      
      const [cargosResp, areasResp] = await Promise.all([
        cargosService.getAll({ activo: true }),
        areasService.getAll({ activo: true })
      ]);

      // Transformar cargos
      if (cargosResp.data.success) {
        const cargosFormateados = [
          { value: '', label: 'Todos los cargos' },
          ...cargosResp.data.data.map(cargo => ({
            value: cargo.id.toString(),
            label: cargo.nombre_cargo
          }))
        ];
        setCargos(cargosFormateados);
      }

      // Transformar áreas
      if (areasResp.data.success) {
        const areasFormateadas = [
          { value: '', label: 'Todas las áreas' },
          ...areasResp.data.data.map(area => ({
            value: area.id.toString(),
            label: area.nombre_area
          }))
        ];
        setAreas(areasFormateadas);
      }

    } catch (error) {
      console.error('Error al cargar datos de filtros:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormFiltros(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBuscar = () => {
    onBuscar(formFiltros);
  };

  const handleLimpiar = () => {
    const filtrosLimpios = {
      busqueda: '',
      cargoId: '',
      areaId: '',
      activo: '',
      fechaDesde: '',
      fechaHasta: ''
    };
    setFormFiltros(filtrosLimpios);
    onBuscar(filtrosLimpios);
  };

  const hasActiveFilters = Object.values(formFiltros).some(value => value !== '');

  // Opciones de estado
  const estadosOpciones = [
    { value: '', label: 'Todos los estados' },
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo/Cesado' }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
      {/* Header del filtro */}
      <div className="px-6 py-4 border-b border-blue-200/50">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onToggleExpanded(!isExpanded)}
            className="flex items-center space-x-3 text-left group transition-all duration-200 hover:scale-[1.02] flex-1"
          >
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <MagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <span className="font-semibold text-gray-800 text-lg">Filtros de Búsqueda</span>
              {hasActiveFilters && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓ Filtros activos
                  </span>
                </div>
              )}
            </div>
          </button>
          
          <button
            onClick={() => onToggleExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-blue-600" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Contenido del filtro */}
      {isExpanded && (
        <div className="p-6 space-y-6 bg-white/50">
          {/* Primera fila - Búsqueda general */}
          <div>
            <Input
              label="Buscar personal"
              value={formFiltros.busqueda}
              onChange={(e) => handleChange('busqueda', e.target.value)}
              placeholder="Nombre, apellido o número de documento..."
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
            />
          </div>

          {/* Segunda fila - Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectCustom
              label="Cargo"
              value={cargos.find(c => c.value === formFiltros.cargoId) || null}
              onChange={(selectedOption) => handleChange('cargoId', selectedOption?.value || '')}
              options={cargos}
              placeholder="Todos los cargos"
              isLoading={loadingData}
            />
            <SelectCustom
              label="Área"
              value={areas.find(a => a.value === formFiltros.areaId) || null}
              onChange={(selectedOption) => handleChange('areaId', selectedOption?.value || '')}
              options={areas}
              placeholder="Todas las áreas"
              isLoading={loadingData}
            />
          </div>
          
          {/* Tercera fila - Estado */}
          <div>
            <SelectCustom
              label="Estado"
              value={estadosOpciones.find(e => e.value === formFiltros.activo) || null}
              onChange={(selectedOption) => handleChange('activo', selectedOption?.value || '')}
              options={estadosOpciones}
              placeholder="Todos los estados"
            />
          </div>

          {/* Cuarta fila - Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Fecha desde"
              value={formFiltros.fechaDesde}
              onChange={(e) => handleChange('fechaDesde', e.target.value)}
            />
            <Input
              type="date"
              label="Fecha hasta"
              value={formFiltros.fechaHasta}
              onChange={(e) => handleChange('fechaHasta', e.target.value)}
            />
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-blue-200/50">
            <Button
              onClick={handleBuscar}
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              size="lg"
            >
              Buscar Personal
            </Button>
            <Button
              variant="outline"
              onClick={handleLimpiar}
              className="flex-1 sm:flex-none border-blue-300 text-blue-700 hover:bg-blue-50 px-3"
              size="lg"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Resumen de filtros activos */}
          {hasActiveFilters && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {formFiltros.busqueda && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Búsqueda: "{formFiltros.busqueda}"
                  </span>
                )}
                {formFiltros.cargoId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Cargo seleccionado
                  </span>
                )}
                {formFiltros.areaId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Área seleccionada
                  </span>
                )}
                {formFiltros.activo && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Estado seleccionado
                  </span>
                )}
                {(formFiltros.fechaDesde || formFiltros.fechaHasta) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Rango de fechas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Paginación del historial */}
      {historialPagination && historialPagination.totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-blue-200/50">
          <Pagination
            currentPage={historialPagination.currentPage}
            totalPages={historialPagination.totalPages}
            totalItems={historialPagination.totalItems}
            itemsPerPage={historialPagination.itemsPerPage}
            onPageChange={onHistorialPageChange}
            showInfo={true}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
};

export default FiltrosPersonal;

