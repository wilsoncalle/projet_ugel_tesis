import { EstadisticasCard } from '../estadisticas';
import useVisitasMotivo from '../../hooks/useVisitasMotivo';

const VisitasMotivoCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalVisitas } = useVisitasMotivo();

  const config = {
    title: 'Distribución por Motivo',
    subtitle: 'Visitas agrupadas por el motivo de ingreso',
    chartType: 'pie',
    chartSize: 300,
    layout: 'two-columns',
    showMetrics: true,
    exportFilename: 'visitas-por-motivo',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'visitas',
      centerLabel: 'visitas',
      emptyMessage: 'No hay visitas registradas',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'motivos',
      totalLabel: 'Total de Visitas',
      maxLabel: 'Motivo Más Frecuente',
      minLabel: 'Motivo Menos Frecuente',
      countLabel: 'Total de Motivos',
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
      totalVisitas={totalVisitas}
      config={config}
    />
  );
};

export default VisitasMotivoCard;

