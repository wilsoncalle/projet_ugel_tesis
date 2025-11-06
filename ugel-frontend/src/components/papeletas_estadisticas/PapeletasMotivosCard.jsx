import { EstadisticasCard } from '../estadisticas';
import usePapeletasMotivos from '../../hooks/usePapeletasMotivos';

const PapeletasMotivosCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalPapeletas } = usePapeletasMotivos();

  const config = {
    title: 'Distribución por Motivo',
    subtitle: 'Papeletas agrupadas por motivo de salida',
    chartType: 'pie',
    chartSize: 300,
    layout: 'two-columns',
    showMetrics: true,
    exportFilename: 'papeletas-por-motivo',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'papeletas',
      centerLabel: 'papeletas',
      emptyMessage: 'No hay papeletas registradas',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'motivos',
      totalLabel: 'Total de Papeletas',
      maxLabel: 'Motivo Más Frecuente',
      minLabel: 'Motivo Menos Frecuente',
      countLabel: 'Total de Motivos',
      itemSuffix: 'papeletas',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'motivos',
      title: 'Detalle por Motivo',
      searchPlaceholder: 'Buscar motivo...',
      nameLabel: 'Motivo',
      countLabel: 'Cantidad',
      distributionLabel: 'Distribución',
      nameKey: 'motivo',
      countKey: 'count',
      sortByName: 'motivo',
      sortByCount: 'count',
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

export default PapeletasMotivosCard;

