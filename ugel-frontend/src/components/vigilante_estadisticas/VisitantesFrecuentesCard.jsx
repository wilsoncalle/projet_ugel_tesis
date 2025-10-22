import { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { EstadisticasCard } from '../estadisticas';
import useVisitantesFrecuentes from '../../hooks/useVisitantesFrecuentes';
import ModalVisitanteDetalle from './ModalVisitanteDetalle';

const VisitantesFrecuentesCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useVisitantesFrecuentes();
  const [selectedVisitante, setSelectedVisitante] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tomar los top 10 visitantes (ya vienen ordenados de mayor a menor del backend)
  const chartData = data.slice(0, 10); // Top 10 de mayor a menor

  const handleVisitanteClick = (visitante) => {
    setSelectedVisitante(visitante);
    setIsModalOpen(true);
  };

  const config = {
    title: 'Visitantes Frecuentes',
    subtitle: 'Top 10 visitantes con más visitas registradas',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked', // Gráfico arriba, tabla abajo
    showMetrics: true,
    exportFilename: 'visitantes-frecuentes',
    
    // Configuración del gráfico de barras
    chartConfig: {
      labelKey: 'visitante',
      valueKey: 'num_visitas',
      datasetLabel: 'Visitas',
      tooltipSuffix: 'visitas',
      emptyMessage: 'No hay visitantes registrados',
      emptyTitle: 'Sin visitantes',
      emptySubtitle: 'en este período',
      onBarClick: handleVisitanteClick, // Nuevo: clic en barra
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'visitantes',
      totalLabel: 'Total de Visitas',
      maxLabel: 'Visitante Más Frecuente',
      minLabel: 'Visitante Menos Frecuente',
      averageLabel: 'Promedio de Visitas',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'visitantes',
      title: 'Detalle de Visitantes',
      searchPlaceholder: 'Buscar visitante...',
      columns: [
        { 
          key: 'visitante', 
          label: 'Nombre Completo', 
          sortable: true,
          render: (row) => (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-125 transition-transform" />
              <span className="text-sm font-medium text-gray-900">
                {row.visitante}
              </span>
            </div>
          )
        },
        { 
          key: 'documento', 
          label: 'Documento', 
          sortable: false,
          render: (row) => (
            <span className="text-sm text-gray-600">
              {row.tipo_documento || 'DNI'}: <span className="font-medium text-gray-900">{row.numero_documento || 'N/A'}</span>
            </span>
          )
        },
        { 
          key: 'num_visitas', 
          label: 'Visitas', 
          sortable: true,
          render: (row) => (
            <span className="text-sm font-bold text-gray-900">
              {parseInt(row.num_visitas || 0).toLocaleString()}
            </span>
          )
        },
        { 
          key: 'ultima_visita', 
          label: 'Última Visita', 
          sortable: true,
          render: (row) => {
            if (!row.ultima_visita) {
              return <span className="text-sm text-gray-400">N/A</span>;
            }
            const fecha = new Date(row.ultima_visita);
            return (
              <span className="text-sm text-gray-700">
                {fecha.toLocaleDateString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </span>
            );
          }
        },
        {
          key: 'acciones',
          label: 'Acciones',
          sortable: false,
          render: (row) => (
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVisitanteClick(row);
                }}
                className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                title="Ver detalle completo"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          )
        }
      ],
      nameKey: 'visitante',
      countKey: 'num_visitas',
      sortByName: 'visitante',
      sortByCount: 'num_visitas',
      enableRowClick: true,
      onRowClick: handleVisitanteClick,
    },
    // IMPORTANTE: Pasar datos originales para tabla/métricas, chartData para el gráfico
    useOriginalDataForMetrics: true,
  };

  return (
    <>
      <EstadisticasCard
        data={data.slice(0, 10)} // Pasar datos originales (top 10) para métricas y tabla
        chartData={chartData} // Pasar datos invertidos solo para el gráfico
        loading={loading}
        error={error}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        totalVisitas={data.reduce((sum, v) => sum + parseInt(v.num_visitas || 0), 0)}
        config={config}
      />
      
      {/* Modal personalizado para detalle de visitante */}
      <ModalVisitanteDetalle
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVisitante(null);
        }}
        visitante={selectedVisitante}
        periodo={periodo}
      />
    </>
  );
};

export default VisitantesFrecuentesCard;

