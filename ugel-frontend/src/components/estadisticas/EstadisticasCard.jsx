import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import EstadisticasChart from './EstadisticasChart';
import EstadisticasModal from './EstadisticasModal';
import SelectCustom from '../SelectCustom';

/**
 * Componente genérico para tarjetas de estadísticas
 * @param {Object} props
 * @param {Object|Array} props.data - Datos para métricas y tabla
 * @param {Object|Array} props.chartData - Datos específicos para el gráfico (opcional, usa data si no se proporciona)
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.error - Mensaje de error
 * @param {string} props.periodo - Período seleccionado
 * @param {Function} props.onPeriodoChange - Función para cambiar el período
 * @param {number} props.totalVisitas - Total de visitas
 * @param {Object} props.config - Configuración de la tarjeta
 */
const EstadisticasCard = ({ 
  data, 
  chartData, // Datos separados para el gráfico (opcional)
  loading, 
  error, 
  periodo, 
  onPeriodoChange,
  totalVisitas,
  config = {}
}) => {
  const {
    title = 'Estadísticas',
    subtitle = 'Datos visualizados por período',
    chartType = 'pie',
    chartSize = 300,
    chartHeight = 400,
    showModal = true,
    chartConfig = {},
    tableConfig = {},
    metricsConfig = {},
  } = config;

  const [showModalState, setShowModalState] = useState(false);
  
  // Usar chartData si está disponible, sino usar data
  const dataParaGrafico = chartData || data;

  const opcionesPeriodo = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'anio', label: 'Este Año' },
    { value: 'todo', label: 'Todo el historial' }
  ];

  const handleExpandir = () => setShowModalState(true);
  const handleCerrarModal = () => setShowModalState(false);

  return (
    <>
      {/* Contenedor principal de la tarjeta */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 flex flex-col h-full">
        
        {/* Cabecera */}
        <div className="flex justify-between items-start mb-4">
          {/* Sección del título */}
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {title}
            </h2>
            <p className="text-sm text-slate-500">
              {subtitle}
            </p>
          </div>

          {/* Controles agrupados a la derecha */}
          <div className="flex flex-col items-end gap-3">
            {showModal && (
              <button
                onClick={handleExpandir}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-all duration-200"
                title="Expandir vista"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
            )}
            {/* Contenedor para controlar el ancho del select */}
            <div className="w-48">
              <SelectCustom
                value={opcionesPeriodo.find(op => op.value === periodo)}
                onChange={(selectedOption) => onPeriodoChange(selectedOption?.value || 'todo')}
                options={opcionesPeriodo}
                placeholder="Período"
                isClearable={false}
              />
            </div>
          </div>
        </div>

        {/* Contenido del gráfico */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {error ? (
            <div className="flex items-center justify-center h-full text-center text-red-500">
              <div>
                <p className="text-lg font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <EstadisticasChart 
              type={chartType}
              data={dataParaGrafico} 
              loading={loading} 
              size={chartSize}
              height={chartHeight}
              totalVisitas={totalVisitas}
              config={chartConfig}
            />
          )}
        </div>
      </div>

      {/* Modal expandido */}
      {showModal && showModalState && (
        <EstadisticasModal
          data={data}
          chartData={chartData}
          loading={loading}
          error={error}
          periodo={periodo}
          onPeriodoChange={onPeriodoChange}
          onClose={handleCerrarModal}
          totalVisitas={totalVisitas}
          config={{
            ...config,
            chartConfig,
            tableConfig,
            metricsConfig,
          }}
        />
      )}
    </>
  );
};

export default EstadisticasCard;

