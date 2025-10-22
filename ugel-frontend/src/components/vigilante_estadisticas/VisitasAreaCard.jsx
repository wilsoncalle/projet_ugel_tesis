import { EstadisticasCard } from '../estadisticas';
import useVisitasArea from '../../hooks/useVisitasArea';

const VisitasAreaCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useVisitasArea();

  const config = {
    title: 'Visitas por Área',
    subtitle: 'Datos visualizados por período',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'visitas-por-area',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'nombre_area',
      valueKey: 'visitas',
      datasetLabel: 'Visitas',
      tooltipSuffix: 'visitas',
      emptyTitle: 'No hay visitas registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'areas',
      totalLabel: 'Total de Visitas',
      maxLabel: 'Área Más Visitada',
      minLabel: 'Área Menos Visitada',
      averageLabel: 'Promedio por Área',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'areas',
      title: 'Detalle por Área',
      searchPlaceholder: 'Buscar área...',
      nameLabel: 'Área',
      countLabel: 'Visitas',
      distributionLabel: 'Distribución',
      nameKey: 'nombre_area',
      countKey: 'visitas',
      sortByName: 'nombre',
      sortByCount: 'visitas',
    },
  };

  return (
    <EstadisticasCard
      data={data}
      loading={loading}
      error={error}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      config={config}
    />
  );
};

export default VisitasAreaCard;

