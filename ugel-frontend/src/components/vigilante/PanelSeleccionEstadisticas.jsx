import { BarChart, MapPin, Target, Users, UserCheck } from 'lucide-react';

// Se ha reemplazado el componente Card importado para resolver el error de ruta.
// Ahora se usa un div con estilos equivalentes.
const PanelSeleccionEstadisticas = ({ categoriaActiva, onCategoriaChange }) => {
  const categorias = [
    {
      id: 'total-visitas',
      titulo: 'Total de Visitas',
      descripcion: 'Total por período y flujo diario',
      icono: BarChart
    },
    {
      id: 'areas',
      titulo: 'Áreas',
      descripcion: 'Visitas por área destino',
      icono: MapPin
    },
    {
      id: 'motivos',
      titulo: 'Motivos',
      descripcion: 'Distribución por motivo',
      icono: Target
    },
    {
      id: 'personal',
      titulo: 'Personal',
      descripcion: 'Visitas por personal visitado',
      icono: Users
    },
    {
      id: 'visitantes',
      titulo: 'Visitantes',
      descripcion: 'Visitantes frecuentes',
      icono: UserCheck
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="shadow-lg border border-gray-200 bg-white flex flex-col h-full rounded-2xl">
        <div className="p-6 flex-1 flex flex-col">
          <h2 className="text-base font-semibold mb-4 text-gray-800">
            Visualizar estadísticas por:
          </h2>
          
          <div className="flex flex-col gap-3 flex-1">
            {categorias.map((categoria) => {
              const Icono = categoria.icono;
              const isActive = categoriaActiva === categoria.id;
              
              return (
                <button
                  key={categoria.id}
                  onClick={() => onCategoriaChange(categoria.id)}
                  className={`
                    w-full p-3 rounded-full border transition-all duration-300 text-left
                    hover:scale-105 hover:shadow-md
                    ${isActive 
                      ? 'bg-blue-50 border-blue-500 shadow-md' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center space-x-4 px-2">
                    <div className={`
                      p-2 rounded-full
                      ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                    `}>
                      <Icono className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {categoria.titulo}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {categoria.descripcion}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelSeleccionEstadisticas;

