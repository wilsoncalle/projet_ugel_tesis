import { EstadisticasCard } from '../estadisticas';
import usePapeletasHoras from '../../hooks/usePapeletasHoras';

const PapeletasHorasCard = () => {
  const { data, loading, error, periodo, setPeriodo, resumen } = usePapeletasHoras();

  const config = {
    title: 'Horas Autorizadas vs Usadas',
    subtitle: 'Desviación promedio por personal (Top 10)',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'papeletas-horas',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'personal',
      valueKey: 'desviacion',
      datasetLabel: 'Desviación (min)',
      tooltipSuffix: 'min',
      emptyTitle: 'No hay datos de horas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'horas',
      totalLabel: 'Total de Registros',
      maxLabel: 'Mayor Desviación',
      minLabel: 'Menor Desviación',
      averageLabel: 'Promedio General',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'horas',
      title: 'Detalle por Personal',
      searchPlaceholder: 'Buscar personal...',
      nameLabel: 'Personal',
      countLabel: 'Desviación (min)',
      distributionLabel: 'Desviación',
      nameKey: 'personal',
      countKey: 'desviacion',
      sortByName: 'personal',
      sortByCount: 'desviacion',
    },
  };

  return (
    <EstadisticasCard
      data={data}
      loading={loading}
      error={error}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      totalVisitas={resumen?.total_registros || 0}
      config={config}
    />
  );
};

export default PapeletasHorasCard;

