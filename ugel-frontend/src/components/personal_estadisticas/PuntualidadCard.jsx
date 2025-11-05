import { EstadisticasCard } from '../estadisticas';
import useAsistenciasPuntualidad from '../../hooks/useAsistenciasPuntualidad';

const PuntualidadCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useAsistenciasPuntualidad();

  // Calcular total para el gráfico de pie
  const totalAsistencias = data?.datasets?.[0]?.data?.reduce((sum, val) => sum + val, 0) || 0;

  const config = {
    title: 'Puntualidad y Tardanzas',
    subtitle: 'Distribución de asistencias por estado de presencia',
    chartType: 'pie',
    chartSize: 300,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'puntualidad-tardanzas',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'asistencias',
      centerLabel: 'asistencias',
      emptyTitle: 'No hay datos registrados',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'puntualidad',
      totalLabel: 'Total de Registros',
      maxLabel: 'Estado Más Frecuente',
      minLabel: 'Estado Menos Frecuente',
      averageLabel: 'Promedio por Estado',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'puntualidad',
      title: 'Detalle por Estado',
      searchPlaceholder: 'Buscar estado...',
      nameLabel: 'Estado de Presencia',
      countLabel: 'Cantidad',
      distributionLabel: 'Distribución',
      nameKey: 'estado_presencia',
      countKey: 'cantidad',
      sortByName: 'estado',
      sortByCount: 'cantidad',
    },
  };

  return (
    <EstadisticasCard
      data={data}
      loading={loading}
      error={error}
      periodo={periodo}
      onPeriodoChange={setPeriodo}
      totalVisitas={totalAsistencias}
      config={config}
    />
  );
};

export default PuntualidadCard;
