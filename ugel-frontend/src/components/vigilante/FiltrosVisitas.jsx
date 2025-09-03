import { useState, useEffect } from 'react';
import Button from '../Button';
import Input from '../Input';
import Select from '../Select';
import { MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motivosVisitaService, personalService } from '../../services/api';

const FiltrosVisitas = ({ filtros, onBuscar, isExpanded, onToggleExpanded }) => {
  const [formFiltros, setFormFiltros] = useState({
    busqueda: '',
    empleadoId: '',
    motivoId: '',
    fechaDesde: '',
    fechaHasta: '',
    ...filtros
  });

  // Estados para datos de los selects
  const [empleados, setEmpleados] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar datos de las APIs al montar el componente
  useEffect(() => {
    cargarDatosFiltros();
  }, []);

  const cargarDatosFiltros = async () => {
    try {
      setLoadingData(true);
      
      const [motivosResp, personalResp] = await Promise.all([
        motivosVisitaService.getAll({ activo: true }),
        personalService.getAll()
      ]);

      // Transformar motivos
      if (motivosResp.data.success) {
        const motivosFormateados = motivosResp.data.data.map(motivo => ({
          value: motivo.id.toString(),
          label: motivo.nombre
        }));
        setMotivos(motivosFormateados);
      }

      // Transformar personal (empleados)
      if (personalResp.data.success) {
        const empleadosFormateados = personalResp.data.data.map(emp => ({
          value: emp.id.toString(),
          label: `${emp.nombres} ${emp.apellidos} - ${emp.area?.nombre || 'Sin área'}`
        }));
        setEmpleados(empleadosFormateados);
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
      empleadoId: '',
      motivoId: '',
      fechaDesde: '',
      fechaHasta: ''
    };
    setFormFiltros(filtrosLimpios);
    onBuscar(filtrosLimpios);
  };

  const hasActiveFilters = Object.values(formFiltros).some(value => value !== '');

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
      {/* Header del filtro */}
      <div className="px-6 py-4 border-b border-blue-200/50">
        <button
          onClick={() => onToggleExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left group transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="flex items-center space-x-3">
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
          </div>
          <div className="p-2 rounded-lg group-hover:bg-blue-100 transition-colors">
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-blue-600" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-blue-600" />
            )}
          </div>
        </button>
      </div>

      {/* Contenido del filtro */}
      {isExpanded && (
        <div className="p-6 space-y-6 bg-white/50">
          {/* Primera fila - Búsqueda general */}
          <div>
            <Input
              label="Buscar visitante"
              value={formFiltros.busqueda}
              onChange={(e) => handleChange('busqueda', e.target.value)}
              placeholder="Nombre, apellido o número de documento..."
              leftIcon={<MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />}
            />
          </div>

          {/* Segunda fila - Selects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Datos de la Visita"
              value={formFiltros.empleadoId}
              onChange={(e) => handleChange('empleadoId', e.target.value)}
              options={empleados}
              placeholder="Todos los empleados"
              isLoading={loadingData}
            />
            <Select
              label="Motivo de visita"
              value={formFiltros.motivoId}
              onChange={(e) => handleChange('motivoId', e.target.value)}
              options={motivos}
              placeholder="Todos los motivos"
              isLoading={loadingData}
            />
          </div>

          {/* Tercera fila - Fechas */}
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
              Buscar Registros
            </Button>
            <Button
              variant="outline"
              onClick={handleLimpiar}
              leftIcon={<XMarkIcon className="h-4 w-4" />}
              className="flex-1 sm:flex-none border-blue-300 text-blue-700 hover:bg-blue-50"
              size="lg"
            >
              Limpiar Filtros
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
                {formFiltros.empleadoId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Datos de la Visita seleccionados
                  </span>
                )}
                {formFiltros.motivoId && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                    Motivo seleccionado
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
    </div>
  );
};

export default FiltrosVisitas;
