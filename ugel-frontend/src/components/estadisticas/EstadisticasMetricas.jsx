import { TrendingUp, TrendingDown, Hash, Users, BarChart3 } from 'lucide-react';

/**
 * Componente genérico para mostrar métricas de estadísticas
 * @param {Object} props
 * @param {Object} props.data - Datos para calcular métricas (puede ser objeto con labels/datasets o array)
 * @param {number} props.totalVisitas - Total de visitas
 * @param {Object} props.config - Configuración de las métricas
 */
const EstadisticasMetricas = ({ data, totalVisitas = 0, config = {} }) => {
  const {
    type = 'motivos', // 'motivos' o 'areas'
    totalLabel = 'Total de Visitas',
    maxLabel = 'Más Frecuente',
    minLabel = 'Menos Frecuente',
    countLabel = 'Total de Elementos',
    averageLabel = 'Promedio',
    itemSuffix = 'visitas', // Sufijo para los items (visitas, papeletas, etc.)
    countField = null, // Campo personalizado para contar (opcional)
  } = config;

  let metricas = [];

  // Procesamiento para datos tipo totales (flujo diario)
  if (type === 'totales' && data?.labels && data?.datasets) {
    const labels = Array.isArray(data?.labels) ? data.labels : [];
    const values = Array.isArray(data?.datasets?.[0]?.data) ? data.datasets[0].data.map(v => Number(v ?? 0)) : [];

    let maxDia = 'N/A';
    let maxValue = 0;
    let minDia = 'N/A';
    let minValue = 0;

    if (labels.length > 0 && values.length > 0) {
      const n = Math.min(labels.length, values.length);
      let maxIdx = 0;
      let minIdx = 0;

      for (let i = 0; i < n; i++) {
        const val = Number(values[i] ?? 0);
        if (i === 0) {
          maxIdx = 0;
          minIdx = 0;
        } else {
          if (val > Number(values[maxIdx] ?? 0)) maxIdx = i;
          if (val < Number(values[minIdx] ?? Infinity)) minIdx = i;
        }
      }

      maxDia = labels[maxIdx] ?? 'N/A';
      maxValue = Number(values[maxIdx] ?? 0);
      minDia = labels[minIdx] ?? 'N/A';
      minValue = Number(values[minIdx] ?? 0);
    }

    const promedioDiario = values.length > 0 ? (totalVisitas / values.length).toFixed(1) : '0.0';

    metricas = [
      {
        titulo: totalLabel,
        valor: totalVisitas.toLocaleString(),
        visitas: `${totalVisitas.toLocaleString()} ${itemSuffix} en el período`,
        icono: <Users className="h-5 w-5" />,
      },
      {
        titulo: maxLabel,
        valor: maxDia || 'N/A',
        visitas: `${maxValue.toLocaleString()} ${itemSuffix}`,
        icono: <TrendingUp className="h-5 w-5" />,
      },
      {
        titulo: minLabel,
        valor: minDia || 'N/A',
        visitas: `${minValue.toLocaleString()} ${itemSuffix}`,
        icono: <TrendingDown className="h-5 w-5" />,
      },
      {
        titulo: averageLabel,
        valor: promedioDiario,
        visitas: `${promedioDiario} ${itemSuffix} por día`,
        icono: <BarChart3 className="h-5 w-5" />,
      }
    ];
  }
  // Procesamiento para datos tipo motivos (con labels y datasets)
  else if (type === 'motivos' || (data?.labels && data?.datasets)) {
    const labels = Array.isArray(data?.labels) ? data.labels : [];
    const values = Array.isArray(data?.datasets?.[0]?.data) ? data.datasets[0].data.map(v => Number(v ?? 0)) : [];

    let maxItem = 'N/A';
    let maxValue = 0;
    let minItem = 'N/A';
    let minValue = 0;

    if (labels.length > 0 && values.length > 0) {
      const n = Math.min(labels.length, values.length);
      let maxIdx = 0;
      let minIdx = 0;

      for (let i = 0; i < n; i++) {
        const val = Number(values[i] ?? 0);
        if (i === 0) {
          maxIdx = 0;
          minIdx = 0;
        } else {
          if (val > Number(values[maxIdx] ?? 0)) maxIdx = i;
          if (val < Number(values[minIdx] ?? Infinity)) minIdx = i;
        }
      }

      maxItem = labels[maxIdx] ?? 'N/A';
      maxValue = Number(values[maxIdx] ?? 0);
      minItem = labels[minIdx] ?? 'N/A';
      minValue = Number(values[minIdx] ?? 0);
    }

    const maxPercentage = totalVisitas > 0 ? ((maxValue / totalVisitas) * 100).toFixed(1) : '0.0';
    const minPercentage = totalVisitas > 0 ? ((minValue / totalVisitas) * 100).toFixed(1) : '0.0';
    const totalCount = labels.length;

    metricas = [
      {
        titulo: totalLabel,
        valor: totalVisitas.toLocaleString(),
        visitas: `${totalVisitas.toLocaleString()} ${itemSuffix} en total`,
        icono: <Users className="h-5 w-5" />,
      },
      {
        titulo: maxLabel,
        valor: maxItem || 'N/A',
        visitas: `${maxValue.toLocaleString()} ${itemSuffix} (${maxPercentage}%)`,
        icono: <TrendingUp className="h-5 w-5" />,
      },
      {
        titulo: minLabel,
        valor: minItem || 'N/A',
        visitas: `${minValue.toLocaleString()} ${itemSuffix} (${minPercentage}%)`,
        icono: <TrendingDown className="h-5 w-5" />,
      },
      {
        titulo: countLabel,
        valor: totalCount.toLocaleString(),
        visitas: `${totalCount} ${type === 'motivos' ? 'motivos' : 'elementos'} diferentes`,
        icono: <Hash className="h-5 w-5" />,
      }
    ];
  }
  
  // Procesamiento para datos tipo áreas, personal o visitantes (array de objetos)
  else if (Array.isArray(data)) {
    // Determinar campo de conteo según el tipo o usar el especificado en config
    const fieldToCount = countField || 
                         (type === 'visitantes' ? 'num_visitas' : 
                          type === 'personal' ? 'dias_asistidos' : 
                          type === 'areas' ? 'visitas' :
                          type === 'horas' ? 'desviacion' : 'visitas');
    
    const total = data.reduce((sum, item) => sum + parseInt(item[fieldToCount] || 0), 0);
    
    const maxItem = data.length > 0 ? data.reduce((max, item) => 
      parseInt(item[fieldToCount]) > parseInt(max[fieldToCount]) ? item : max
    ) : null;
    
    const minItem = data.length > 0 ? data.reduce((min, item) => 
      parseInt(item[fieldToCount]) < parseInt(min[fieldToCount]) ? item : min
    ) : null;
    
    const average = data.length > 0 ? (total / data.length).toFixed(1) : 0;
    
    // Determinar el campo de nombre según el tipo
    const getItemName = (item) => {
      if (!item) return 'N/A';
      if (type === 'personal') {
        return item?.personal || item?.nombre_personal || 'N/A';
      }
      if (type === 'visitantes') {
        return item?.visitante || 'N/A';
      }
      // Para áreas, puede tener 'nombre_area' o 'personal' (cuando es ranking de empleados)
      return item?.nombre_area || item?.personal || 'N/A';
    };

    const getAverageSuffix = () => {
      if (type === 'personal') return 'por persona';
      if (type === 'visitantes') return 'por visitante';
      if (type === 'areas' && data[0]?.personal) return 'por empleado';
      return 'por área';
    };

    const getCountSuffix = () => {
      if (type === 'personal') return 'días';
      if (type === 'horas') return 'min';
      // Usar itemSuffix si está definido, sino usar valores por defecto
      if (itemSuffix && itemSuffix !== 'visitas') return itemSuffix;
      if (type === 'areas') return 'asistencias';
      return 'visitas';
    };

    metricas = [
      {
        titulo: totalLabel,
        valor: total.toLocaleString(),
        visitas: `${total.toLocaleString()} ${getCountSuffix()}`,
        icono: <Users className="h-5 w-5" />,
      },
      {
        titulo: maxLabel,
        valor: getItemName(maxItem),
        visitas: `${maxItem ? parseInt(maxItem[fieldToCount]).toLocaleString() : 0} ${getCountSuffix()}`,
        icono: <TrendingUp className="h-5 w-5" />,
      },
      {
        titulo: minLabel,
        valor: getItemName(minItem),
        visitas: `${minItem ? parseInt(minItem[fieldToCount]).toLocaleString() : 0} ${getCountSuffix()}`,
        icono: <TrendingDown className="h-5 w-5" />,
      },
      {
        titulo: averageLabel,
        valor: average,
        visitas: `${average} ${getCountSuffix()} ${getAverageSuffix()}`,
        icono: <BarChart3 className="h-5 w-5" />,
      }
    ];
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricas.map((metrica, index) => (
        <div
          key={index}
          className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors duration-300">
                <div className="text-gray-700">
                  {metrica.icono}
                </div>
              </div>
            </div>

            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {metrica.titulo}
            </p>

            <p className="text-2xl font-bold text-gray-900 mb-3">
              {metrica.valor}
            </p>

            <p className="text-sm text-gray-500">
              {metrica.visitas}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EstadisticasMetricas;

