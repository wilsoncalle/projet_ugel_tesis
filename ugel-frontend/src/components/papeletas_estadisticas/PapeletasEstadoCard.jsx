import { EstadisticasCard } from '../estadisticas';
import usePapeletasEstado from '../../hooks/usePapeletasEstado';

const PapeletasEstadoCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalPapeletas } = usePapeletasEstado();

  const config = {
    title: 'Estado de Papeletas',
    subtitle: 'Flujo de papeletas por día en el período seleccionado',
    chartType: 'line',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'papeletas-estado',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'Papeletas',
      emptyTitle: 'No hay papeletas registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Papeletas',
      maxLabel: 'Día con Más Papeletas',
      minLabel: 'Día con Menos Papeletas',
      averageLabel: 'Promedio Diario',
      itemSuffix: 'papeletas',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'totales',
      title: 'Detalle por Día',
      searchPlaceholder: 'Buscar fecha...',
      nameLabel: 'Fecha',
      countLabel: 'Papeletas',
      distributionLabel: 'Distribución',
      nameKey: 'fecha',
      countKey: 'papeletas',
      sortByName: 'fecha',
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

export default PapeletasEstadoCard;

