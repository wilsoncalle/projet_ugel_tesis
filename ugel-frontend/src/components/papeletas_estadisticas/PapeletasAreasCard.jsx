import { EstadisticasCard } from '../estadisticas';
import usePapeletasAreas from '../../hooks/usePapeletasAreas';

const PapeletasAreasCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalPapeletas } = usePapeletasAreas();

  const config = {
    title: 'Papeletas por Área',
    subtitle: 'Datos visualizados por período',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'papeletas-por-area',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'nombre_area',
      valueKey: 'papeletas',
      datasetLabel: 'Papeletas',
      tooltipSuffix: 'papeletas',
      emptyTitle: 'No hay papeletas registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'areas',
      countField: 'papeletas',
      totalLabel: 'Total de Papeletas',
      maxLabel: 'Área con Más Papeletas',
      minLabel: 'Área con Menos Papeletas',
      averageLabel: 'Promedio por Área',
      itemSuffix: 'papeletas',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'areas',
      title: 'Detalle por Área',
      searchPlaceholder: 'Buscar área...',
      nameLabel: 'Área',
      countLabel: 'Papeletas',
      distributionLabel: 'Distribución',
      nameKey: 'nombre_area',
      countKey: 'papeletas',
      sortByName: 'nombre',
      sortByCount: 'papeletas',
    },
  };

  return (
    <EstadisticasCard
      data={data}
      loading={loading}
      error={error}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      totalVisitas={totalPapeletas}
      config={config}
    />
  );
};

export default PapeletasAreasCard;

