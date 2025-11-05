import { EstadisticasCard } from '../estadisticas';
import useAsistenciasTotales from '../../hooks/useAsistenciasTotales';

const AsistenciasTotalesCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalAsistencias } = useAsistenciasTotales();

  const config = {
    title: 'Total de Asistencias',
    subtitle: 'Flujo de asistencias por día en el período seleccionado',
    chartType: 'line',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'asistencias-totales',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'Asistencias',
      emptyTitle: 'No hay asistencias registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Asistencias',
      maxLabel: 'Día con Más Asistencias',
      minLabel: 'Día con Menos Asistencias',
      averageLabel: 'Promedio Diario',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'totales',
      title: 'Detalle por Día',
      searchPlaceholder: 'Buscar fecha...',
      nameLabel: 'Fecha',
      countLabel: 'Asistencias',
      distributionLabel: 'Distribución',
      nameKey: 'fecha',
      countKey: 'asistencias',
      sortByName: 'fecha',
      sortByCount: 'asistencias',
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

export default AsistenciasTotalesCard;
