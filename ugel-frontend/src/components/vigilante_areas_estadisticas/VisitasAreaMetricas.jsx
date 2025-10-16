import { TrendingUp, TrendingDown, BarChart3, Users } from 'lucide-react';

const VisitasAreaMetricas = ({ data }) => {
  // Calcular métricas
  const totalVisitas = data.reduce((sum, item) => sum + parseInt(item.visitas), 0);
  
  const areaMasVisitada = data.length > 0 ? data.reduce((max, item) => 
    parseInt(item.visitas) > parseInt(max.visitas) ? item : max
  ) : null;
  
  const areaMenosVisitada = data.length > 0 ? data.reduce((min, item) => 
    parseInt(item.visitas) < parseInt(min.visitas) ? item : min
  ) : null;
  
  const promedioVisitas = data.length > 0 ? (totalVisitas / data.length).toFixed(1) : 0;

  const metricas = [
    {
      titulo: 'Total de Visitas',
      valor: totalVisitas.toLocaleString(),
      visitas: `${totalVisitas.toLocaleString()} visitas`,
      icono: <Users className="h-5 w-5" />,
      colorIcono: 'text-blue-600',
      colorFondo: 'bg-blue-50',
      colorFondoHover: 'group-hover:bg-blue-100'
    },
    {
      titulo: 'Área Más Visitada',
      valor: areaMasVisitada?.nombre_area || 'N/A',
      visitas: `${areaMasVisitada ? parseInt(areaMasVisitada.visitas).toLocaleString() : 0} visitas`,
      icono: <TrendingUp className="h-5 w-5" />,
      colorIcono: 'text-emerald-600',
      colorFondo: 'bg-emerald-50',
      colorFondoHover: 'group-hover:bg-emerald-100'
    },
    {
      titulo: 'Área Menos Visitada',
      valor: areaMenosVisitada?.nombre_area || 'N/A',
      visitas: `${areaMenosVisitada ? parseInt(areaMenosVisitada.visitas).toLocaleString() : 0} visitas`,
      icono: <TrendingDown className="h-5 w-5" />,
      colorIcono: 'text-amber-600',
      colorFondo: 'bg-amber-50',
      colorFondoHover: 'group-hover:bg-amber-100'
    },
    {
      titulo: 'Promedio por Área',
      valor: promedioVisitas,
      visitas: `${promedioVisitas} visitas`,
      icono: <BarChart3 className="h-5 w-5" />,
      colorIcono: 'text-violet-600',
      colorFondo: 'bg-violet-50',
      colorFondoHover: 'group-hover:bg-violet-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricas.map((metrica, index) => (
        <div 
          key={index} 
          className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative">
            {/* Header con ícono */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors duration-300">
                <div className="text-gray-700">
                  {metrica.icono}
                </div>
              </div>
            </div>

            {/* Título */}
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {metrica.titulo}
            </p>

            {/* Valor principal */}
            <p className="text-2xl font-bold text-gray-900 mb-3">
              {metrica.valor}
            </p>

            {/* Número de visitas siempre abajo */}
            <p className="text-sm text-gray-500">
              {metrica.visitas}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VisitasAreaMetricas;