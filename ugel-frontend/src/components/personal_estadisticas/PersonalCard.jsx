import { useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { EstadisticasCard } from '../estadisticas';
import useAsistenciasPersonal from '../../hooks/useAsistenciasPersonal';
import ModalPersonalDetalle from './ModalPersonalDetalle';

const PersonalCard = () => {
  const { data, loading, error, periodo, setPeriodo } = useAsistenciasPersonal();
  const [selectedPersonal, setSelectedPersonal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePersonalClick = (personal) => {
    setSelectedPersonal(personal);
    setIsModalOpen(true);
  };

  const config = {
    title: 'Resumen por Personal',
    subtitle: 'Top 10 de personal con mayor asistencia',
    chartType: 'bar',
    chartHeight: 400,
    layout: 'stacked',
    showMetrics: true,
    exportFilename: 'asistencias-por-personal',
    
    // Configuración del gráfico
    chartConfig: {
      labelKey: 'personal',
      valueKey: 'dias_asistidos',
      datasetLabel: 'Días Asistidos',
      tooltipSuffix: 'días',
      emptyTitle: 'No hay asistencias registradas',
      emptySubtitle: 'en este período',
    },
    
    // Configuración de las métricas
    metricsConfig: {
      type: 'personal',
      totalLabel: 'Total de Asistencias',
      maxLabel: 'Personal con Más Asistencias',
      minLabel: 'Personal con Menos Asistencias',
      averageLabel: 'Promedio por Personal',
    },
    
    // Configuración de la tabla
    tableConfig: {
      type: 'personal',
      title: 'Detalle por Personal',
      searchPlaceholder: 'Buscar personal...',
      columns: [
        { 
          key: 'personal', 
          label: 'Nombre Completo', 
          sortable: true,
          render: (row) => (
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-125 transition-transform" />
              <span className="text-sm font-medium text-gray-900">
                {row.personal}
              </span>
            </div>
          )
        },
        { 
          key: 'dias_asistidos', 
          label: 'Días Asistidos', 
          sortable: true,
          render: (row) => (
            <span className="text-sm font-bold text-gray-900">
              {parseInt(row.dias_asistidos || 0).toLocaleString()}
            </span>
          )
        },
        { 
          key: 'dias_puntuales', 
          label: 'Puntuales', 
          sortable: true,
          render: (row) => (
            <span className="text-sm text-green-600 font-medium">
              {parseInt(row.dias_puntuales || 0).toLocaleString()}
            </span>
          )
        },
        { 
          key: 'dias_tarde', 
          label: 'Tardanzas', 
          sortable: true,
          render: (row) => (
            <span className="text-sm text-yellow-600 font-medium">
              {parseInt(row.dias_tarde || 0).toLocaleString()}
            </span>
          )
        },
        { 
          key: 'dias_ausente', 
          label: 'Ausencias', 
          sortable: true,
          render: (row) => (
            <span className="text-sm text-red-600 font-medium">
              {parseInt(row.dias_ausente || 0).toLocaleString()}
            </span>
          )
        },
        {
          key: 'acciones',
          label: 'Acciones',
          sortable: false,
          render: (row) => (
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePersonalClick(row);
                }}
                className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                title="Ver detalle completo"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          )
        }
      ],
      nameKey: 'personal',
      countKey: 'dias_asistidos',
      sortByName: 'personal',
      sortByCount: 'dias_asistidos',
      enableRowClick: true,
      onRowClick: handlePersonalClick,
    },
    useOriginalDataForMetrics: true,
  };

  // Asegurar que data sea un array
  const safeData = Array.isArray(data) ? data : [];
  const top10Data = safeData.slice(0, 10);
  const totalAsistencias = safeData.reduce((sum, p) => sum + parseInt(p.dias_asistidos || 0), 0);

  return (
    <>
      <EstadisticasCard
        data={top10Data}
        chartData={top10Data}
        loading={loading}
        error={error}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        totalVisitas={totalAsistencias}
        config={config}
      />
      
      {/* Modal personalizado para detalle de personal */}
      <ModalPersonalDetalle
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPersonal(null);
        }}
        personal={selectedPersonal}
        periodo={periodo}
      />
    </>
  );
};

export default PersonalCard;
