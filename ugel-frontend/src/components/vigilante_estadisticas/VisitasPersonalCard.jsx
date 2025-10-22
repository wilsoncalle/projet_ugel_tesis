import { EstadisticasCard } from '../estadisticas';
import useVisitasPersonal from '../../hooks/useVisitasPersonal';

const VisitasPersonalCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalVisitas } = useVisitasPersonal();

  const config = {
    title: 'Distribución por Personal Visitado',
    subtitle: 'Visitas agrupadas por el personal visitado',
    chartType: 'doughnut',
    chartSize: 300,
    layout: 'two-columns',
    showMetrics: true,
    exportFilename: 'visitas-por-personal',
    
    // Configuración del gráfico
    chartConfig: {
      tooltipSuffix: 'visitas',
      centerLabel: 'visitas',
      emptyMessage: 'No hay visitas registradas',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'personal',
      totalLabel: 'Total de Visitas',
      maxLabel: 'Personal Más Visitado',
      minLabel: 'Personal Menos Visitado',
      countLabel: 'Total de Personal',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'personal',
      title: 'Detalle por Personal',
      searchPlaceholder: 'Buscar personal...',
      nameLabel: 'Personal',
      countLabel: 'Cantidad',
      distributionLabel: 'Distribución',
      nameKey: 'nombre_personal',
      countKey: 'visitas',
      sortByName: 'nombre_personal',
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

export default VisitasPersonalCard;

