import { EstadisticasCard } from '../estadisticas';
import useAsistenciasAusencias from '../../hooks/useAsistenciasAusencias';

const AusenciasCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useAsistenciasAusencias();

  // Calcular total para el gráfico de pie
  const totalAusencias = data?.datasets?.[0]?.data?.reduce((sum, val) => sum + val, 0) || 0;

  const config = {
    title: 'Salidas por Motivo',
    subtitle: 'Distribución de papeletas de salida por motivo',
    chartType: 'pie',
    chartSize: 300,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'salidas-por-motivo',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'salidas',
      centerLabel: 'salidas',
      emptyTitle: 'No hay salidas registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'ausencias',
      totalLabel: 'Total de Salidas',
      maxLabel: 'Motivo Más Frecuente',
      minLabel: 'Motivo Menos Frecuente',
      averageLabel: 'Promedio por Motivo',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'ausencias',
      title: 'Detalle por Motivo',
      searchPlaceholder: 'Buscar motivo...',
      nameLabel: 'Motivo de Salida',
      countLabel: 'Cantidad',
      distributionLabel: 'Distribución',
      nameKey: 'tipo_ausencia',
      countKey: 'total',
      sortByName: 'tipo',
      sortByCount: 'total',
    },
  };

  return (
    <EstadisticasCard
      data={data}
      loading={loading}
      error={error}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      totalVisitas={totalAusencias}
      config={config}
    />
  );
};

export default AusenciasCard;
