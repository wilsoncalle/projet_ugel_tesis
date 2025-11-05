import { EstadisticasCard } from '../estadisticas';
import useAsistenciasAreas from '../../hooks/useAsistenciasAreas';

const AreasCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useAsistenciasAreas();

  const config = {
    title: 'Asistencia por Áreas',
    subtitle: 'Datos visualizados por período',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'asistencias-por-area',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'nombre_area',
      valueKey: 'asistencias',
      datasetLabel: 'Asistencias',
      tooltipSuffix: 'asistencias',
      emptyTitle: 'No hay asistencias registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'areas',
      totalLabel: 'Total de Asistencias',
      maxLabel: 'Área con Más Asistencias',
      minLabel: 'Área con Menos Asistencias',
      averageLabel: 'Promedio por Área',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'areas',
      title: 'Detalle por Área',
      searchPlaceholder: 'Buscar área...',
      nameLabel: 'Área',
      countLabel: 'Asistencias',
      distributionLabel: 'Distribución',
      nameKey: 'nombre_area',
      countKey: 'asistencias',
      sortByName: 'nombre',
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
      config={config}
    />
  );
};

export default AreasCard;
