import { EstadisticasCard } from '../estadisticas';
import useAsistenciasTotales from '../../hooks/useAsistenciasTotales';

const AsistenciasTotalesCard = () => {
  const { 
    dataAsistencias, 
    dataInasistencias, 
    dataPermisos, 
    loading, 
    error, 
    periodo, 
    setPeriodo, 
    totalAsistencias,
    totalInasistencias,
    totalPermisos
  } = useAsistenciasTotales();

  const configAsistencias = {
    title: 'Total de Asistencias',
    subtitle: 'Personal que asistió (Presente + Tardanza)',
    chartType: 'line',
    chartHeight: 300,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'asistencias',
    chartConfig: {
      tooltipSuffix: 'Asistencias',
      emptyTitle: 'No hay asistencias registradas',
      emptySubtitle: 'en este período',
    },
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Asistencias',
      maxLabel: 'Día con Más Asistencias',
      minLabel: 'Día con Menos Asistencias',
      averageLabel: 'Promedio Diario',
    },
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

  const configInasistencias = {
    title: 'Total de Inasistencias',
    subtitle: 'Personal que no asistió',
    chartType: 'line',
    chartHeight: 300,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'inasistencias',
    chartConfig: {
      tooltipSuffix: 'Inasistencias',
      emptyTitle: 'No hay inasistencias registradas',
      emptySubtitle: 'en este período',
    },
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Inasistencias',
      maxLabel: 'Día con Más Inasistencias',
      minLabel: 'Día con Menos Inasistencias',
      averageLabel: 'Promedio Diario',
    },
    tableConfig: {
      type: 'totales',
      title: 'Detalle por Día',
      searchPlaceholder: 'Buscar fecha...',
      nameLabel: 'Fecha',
      countLabel: 'Inasistencias',
      distributionLabel: 'Distribución',
      nameKey: 'fecha',
      countKey: 'inasistencias',
      sortByName: 'fecha',
      sortByCount: 'inasistencias',
    },
  };

  const configPermisos = {
    title: 'Total de Permisos',
    subtitle: 'Personal con permiso',
    chartType: 'line',
    chartHeight: 300,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'permisos',
    chartConfig: {
      tooltipSuffix: 'Permisos',
      emptyTitle: 'No hay permisos registrados',
      emptySubtitle: 'en este período',
    },
    metricsConfig: {
      type: 'totales',
      totalLabel: 'Total de Permisos',
      maxLabel: 'Día con Más Permisos',
      minLabel: 'Día con Menos Permisos',
      averageLabel: 'Promedio Diario',
    },
    tableConfig: {
      type: 'totales',
      title: 'Detalle por Día',
      searchPlaceholder: 'Buscar fecha...',
      nameLabel: 'Fecha',
      countLabel: 'Permisos',
      distributionLabel: 'Distribución',
      nameKey: 'fecha',
      countKey: 'permisos',
      sortByName: 'fecha',
      sortByCount: 'permisos',
    },
  };

  return (
    <div className="space-y-6">
      {/* Total de Asistencias - Ocupa todo el ancho */}
      <EstadisticasCard
        data={dataAsistencias}
        loading={loading}
        error={error}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        totalVisitas={totalAsistencias}
        config={configAsistencias}
      />
      
      {/* Inasistencias y Permisos - Lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EstadisticasCard
          data={dataInasistencias}
          loading={loading}
          error={error}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          totalVisitas={totalInasistencias}
          config={configInasistencias}
        />
        
        <EstadisticasCard
          data={dataPermisos}
          loading={loading}
          error={error}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          totalVisitas={totalPermisos}
          config={configPermisos}
        />
      </div>
    </div>
  );
};

export default AsistenciasTotalesCard;
