import { useState, useRef } from 'react';
import { X, FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { DocumentArrowDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import EstadisticasChart from './EstadisticasChart';
import EstadisticasTabla from './EstadisticasTabla';
import EstadisticasMetricas from './EstadisticasMetricas';
import SelectCustom from '../SelectCustom';
import {
  captureChartJSImage,
  captureRechartsImage,
  generatePdfReport,
  generateExcelReport,
  prepareTableData
} from '../../utils/exportHelpers';

/**
 * Componente genérico para modales de estadísticas
 * @param {Object} props
 * @param {Object|Array} props.data - Datos para métricas y tabla
 * @param {Object|Array} props.chartData - Datos específicos para el gráfico (opcional)
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.error - Mensaje de error
 * @param {string} props.periodo - Período seleccionado
 * @param {Function} props.onPeriodoChange - Función para cambiar el período
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {number} props.totalVisitas - Total de visitas
 * @param {Object} props.config - Configuración del modal
 */
const EstadisticasModal = ({ 
  data, 
  chartData, // Datos separados para el gráfico (opcional)
  loading, 
  error, 
  periodo, 
  onPeriodoChange, 
  onClose,
  totalVisitas,
  config = {}
}) => {
  // Estados para exportación
  const [exporting, setExporting] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  
  // Usar chartData si está disponible, sino usar data
  const dataParaGrafico = chartData || data;
  const {
    title = 'Estadísticas - Vista Detallada',
    chartType = 'pie',
    chartSize = 500,
    chartHeight = 700,
    chartTitle = 'Distribución',
    layout = 'two-columns', // 'two-columns' o 'stacked'
    showMetrics = true,
    chartConfig = {},
    tableConfig = {},
    metricsConfig = {},
    exportFilename = 'estadisticas',
  } = config;

  // Función para exportar a PDF o Excel
  const handleExportAdvanced = async (format) => {
    try {
      setExporting(true);

      // Capturar imagen del gráfico
      let chartImage = null;
      if (chartType === 'bar') {
        // Chart.JS (Bar charts)
        chartImage = captureChartJSImage(chartRef);
      } else {
        // Recharts (Pie, Line, Area)
        chartImage = await captureRechartsImage(chartContainerRef);
      }

      // Preparar datos de la tabla
      const tableData = prepareTableData(data, {
        nameKey: tableConfig.nameKey || 'nombre',
        countKey: tableConfig.countKey || 'count',
        total: totalVisitas
      });

      // Determinar nombres de columnas según el contexto
      const getColumnNames = () => {
        // Si tableConfig tiene labels personalizados, usarlos
        if (tableConfig.nameLabel && tableConfig.countLabel) {
          return [tableConfig.nameLabel, tableConfig.countLabel, 'Porcentaje'];
        }
        
        // Nombres por defecto según tipo de gráfico
        if (chartType === 'pie') {
          return ['Motivo', 'Cantidad', 'Porcentaje'];
        }
        
        return ['Nombre', 'Cantidad', 'Porcentaje'];
      };

      // Configuración del reporte
      const reportConfig = {
        titulo: title,
        subtitulo: chartTitle,
        periodo: periodo,
        tablas: [
          {
            titulo: tableConfig.title || 'Detalle de Datos',
            columnas: getColumnNames(),
            datos: tableData
          }
        ],
        graficos: chartImage ? [
          {
            titulo: chartTitle,
            imagen: chartImage,
            width: 170,
            height: 100
          }
        ] : [],
        resumen: {
          'Total': totalVisitas?.toLocaleString() || '0',
          'Registros': data?.length || data?.labels?.length || 0
        },
        nombreArchivo: exportFilename
      };

      // Generar reporte según formato
      if (format === 'pdf') {
        await generatePdfReport(reportConfig);
      } else if (format === 'excel') {
        await generateExcelReport(reportConfig);
      }

    } catch (error) {
      console.error('[Export] Error exportando:', error);
      alert('Error al exportar. Por favor, intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  // Función para exportar datos (CSV - legacy)
  const handleExport = (datos) => {
    const headers = chartType === 'pie' 
      ? ['Motivo', 'Cantidad', 'Porcentaje']
      : ['Área', 'Visitas', 'Porcentaje'];

    const csvContent = [
      headers,
      ...datos.map(item => {
        const name = item.motivo || item.nombre_area || item.nombre || item[tableConfig.nameKey || 'nombre'];
        const count = item.count || item.visitas || item.valor || item[tableConfig.countKey || 'count'];
        const percentage = item.porcentaje || '0.0';
        return [name, count, `${percentage}%`];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFilename}-${periodo}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const opcionesPeriodo = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'anio', label: 'Este Año' },
    { value: 'todo', label: 'Todo el historial' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {title}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Dropdown de exportación */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={exporting || loading}
                className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-amber-500 text-amber-600 rounded-full hover:bg-amber-50 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Exportar</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {exportDropdownOpen && (
                <>
                  {/* Overlay para cerrar al hacer clic afuera */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setExportDropdownOpen(false)}
                  />
                  
                  {/* Menu desplegable */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20">
                    <div className="py-1">
                      {/* Opción Excel */}
                      <button
                        onClick={() => {
                          handleExportAdvanced('excel');
                          setExportDropdownOpen(false);
                        }}
                        disabled={exporting}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-green-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                          <DocumentTextIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-green-700">Excel</div>
                          <div className="text-xs text-green-600">Formato .xlsx</div>
                        </div>
                      </button>
                      
                      {/* Divider */}
                      <div className="border-t border-gray-100 mx-2"></div>
                      
                      {/* Opción PDF */}
                      <button
                        onClick={() => {
                          handleExportAdvanced('pdf');
                          setExportDropdownOpen(false);
                        }}
                        disabled={exporting}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                          <DocumentArrowDownIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-red-700">PDF</div>
                          <div className="text-xs text-red-600">Formato .pdf</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Select de periodo sincronizado */}
            <div className="w-48">
              <SelectCustom
                value={opcionesPeriodo.find(op => op.value === periodo)}
                onChange={(selectedOption) => onPeriodoChange(selectedOption?.value || 'todo')}
                options={opcionesPeriodo}
                placeholder="Seleccionar período"
                isClearable={false}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-500">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-xl font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Métricas resumidas */}
              {showMetrics && (
                <EstadisticasMetricas 
                  data={data} 
                  totalVisitas={totalVisitas}
                  config={metricsConfig}
                />
              )}
              
              {/* Layout de dos columnas o apilado */}
              {layout === 'two-columns' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna izquierda - Gráfico */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {chartTitle}
                    </h3>
                    <div className="flex justify-center" ref={chartContainerRef}>
                      <EstadisticasChart 
                        ref={chartRef}
                        type={chartType}
                        data={dataParaGrafico} 
                        loading={loading} 
                        size={chartSize}
                        height={chartHeight}
                        totalVisitas={totalVisitas}
                        config={chartConfig}
                      />
                    </div>
                  </div>
                  
                  {/* Columna derecha - Tabla detallada */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <EstadisticasTabla 
                      data={data} 
                      totalVisitas={totalVisitas}
                      onExport={handleExport}
                      config={tableConfig}
                    />
                  </div>
                </div>
              ) : (
                /* Layout apilado */
                <>
                  {/* Gráfico más grande */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {chartTitle}
                    </h3>
                    <div ref={chartContainerRef}>
                      <EstadisticasChart 
                        ref={chartRef}
                        type={chartType}
                        data={dataParaGrafico} 
                        loading={loading} 
                        size={chartSize}
                        height={chartHeight}
                        totalVisitas={totalVisitas}
                        config={chartConfig}
                      />
                    </div>
                  </div>
                  
                  {/* Tabla detallada */}
                  <EstadisticasTabla 
                    data={data} 
                    totalVisitas={totalVisitas}
                    onExport={handleExport}
                    config={tableConfig}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EstadisticasModal;

