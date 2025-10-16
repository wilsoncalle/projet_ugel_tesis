import { TrendingUp, TrendingDown, Hash, Users } from 'lucide-react';

const VisitasMotivoMetricas = ({ data, totalVisitas = 0 }) => {
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const values = Array.isArray(data?.datasets?.[0]?.data) ? data.datasets[0].data.map(v => Number(v ?? 0)) : [];

  let motivoMasFrecuente = 'N/A';
  let motivoMasFrecuenteCount = 0;
  let motivoMenosFrecuente = 'N/A';
  let motivoMenosFrecuenteCount = 0;

  if (labels.length > 0 && values.length > 0) {
    // asegurar que iteramos por la menor longitud entre labels y values
    const n = Math.min(labels.length, values.length);
    let maxIdx = 0;
    let minIdx = 0;

    for (let i = 0; i < n; i++) {
      const val = Number(values[i] ?? 0);
      // inicializar minIdx con el primer valor real
      if (i === 0) {
        maxIdx = 0;
        minIdx = 0;
      } else {
        if (val > Number(values[maxIdx] ?? 0)) maxIdx = i;
        if (val < Number(values[minIdx] ?? Infinity)) minIdx = i;
      }
    }

    motivoMasFrecuente = labels[maxIdx] ?? 'N/A';
    motivoMasFrecuenteCount = Number(values[maxIdx] ?? 0);

    motivoMenosFrecuente = labels[minIdx] ?? 'N/A';
    motivoMenosFrecuenteCount = Number(values[minIdx] ?? 0);
  }

  const motivoMasFrecuentePorcentaje = totalVisitas > 0
    ? ((motivoMasFrecuenteCount / totalVisitas) * 100).toFixed(1)
    : '0.0';

  const motivoMenosFrecuentePorcentaje = totalVisitas > 0
    ? ((motivoMenosFrecuenteCount / totalVisitas) * 100).toFixed(1)
    : '0.0';

  const totalMotivos = labels.length;

  const metricas = [
    {
      titulo: 'Total de Visitas',
      valor: totalVisitas.toLocaleString(),
      visitas: `${totalVisitas.toLocaleString()} visitas en total`,
      icono: <Users className="h-5 w-5" />,
    },
    {
      titulo: 'Motivo Más Frecuente',
      valor: motivoMasFrecuente || 'N/A',
      visitas: `${motivoMasFrecuenteCount.toLocaleString()} visitas (${motivoMasFrecuentePorcentaje}%)`,
      icono: <TrendingUp className="h-5 w-5" />,
    },
    {
      titulo: 'Motivo Menos Frecuente',
      valor: motivoMenosFrecuente || 'N/A',
      visitas: `${motivoMenosFrecuenteCount.toLocaleString()} visitas (${motivoMenosFrecuentePorcentaje}%)`,
      icono: <TrendingDown className="h-5 w-5" />,
    },
    {
      titulo: 'Total de Motivos',
      valor: totalMotivos.toLocaleString(),
      visitas: `${totalMotivos} motivos diferentes`,
      icono: <Hash className="h-5 w-5" />,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

export default VisitasMotivoMetricas;
