import { EstadisticasCard } from '../estadisticas';
import useVisitasTotales from '../../hooks/useVisitasTotales';

const VisitasTotalesCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalVisitas } = useVisitasTotales();

  const config = {
    title: 'Total de Visitas',
    subtitle: 'Flujo de visitas por día en el período seleccionado',
    chartType: 'line',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'visitas-totales',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'Visitas',
      emptyTitle: 'No hay visitas registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Visitas',
      maxLabel: 'Día con Más Visitas',
      minLabel: 'Día con Menos Visitas',
      averageLabel: 'Promedio Diario',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'totales',
      title: 'Detalle por Día',
      searchPlaceholder: 'Buscar fecha...',
      nameLabel: 'Fecha',
      countLabel: 'Visitas',
      distributionLabel: 'Distribución',
      nameKey: 'fecha',
      countKey: 'visitas',
      sortByName: 'fecha',
      sortByCount: 'visitas',
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

export default VisitasTotalesCard;

