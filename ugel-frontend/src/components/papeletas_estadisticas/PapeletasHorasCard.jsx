import { EstadisticasCard } from '../estadisticas';
import usePapeletasHoras from '../../hooks/usePapeletasHoras';

const PapeletasHorasCard = () => {
  const { data, loading, error, periodo, setPeriodo, resumen, totalPapeletas } = usePapeletasHoras();

  const config = {
    title: 'Empleados con Más Solicitudes',
    subtitle: 'Ranking de personal con más papeletas (Top 10)',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'papeletas-empleados',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'personal',
      valueKey: 'papeletas',
      datasetLabel: 'Papeletas',
      tooltipSuffix: 'papeletas',
      emptyTitle: 'No hay datos de empleados',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'areas',
      countField: 'papeletas',
      totalLabel: 'Total de Papeletas',
      maxLabel: 'Empleado con Más Solicitudes',
      minLabel: 'Empleado con Menos Solicitudes',
      averageLabel: 'Promedio por Empleado',
      itemSuffix: 'papeletas',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'areas',
      title: 'Detalle por Empleado',
      searchPlaceholder: 'Buscar empleado...',
      nameLabel: 'Empleado',
      countLabel: 'Papeletas',
      distributionLabel: 'Distribución',
      nameKey: 'personal',
      countKey: 'papeletas',
      sortByName: 'personal',
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

export default PapeletasHorasCard;

