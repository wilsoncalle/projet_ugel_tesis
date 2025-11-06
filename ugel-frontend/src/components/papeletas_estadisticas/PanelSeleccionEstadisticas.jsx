import { BarChart, FileText, Users, Building2 } from 'lucide-react';
import PapeletasEstadoCard from './PapeletasEstadoCard';
import PapeletasMotivosCard from './PapeletasMotivosCard';
import PapeletasHorasCard from './PapeletasHorasCard';
import PapeletasAreasCard from './PapeletasAreasCard';

/**
 * Panel selector de estadísticas de papeletas
 * Permite navegar entre diferentes vistas de estadísticas
 */
const PanelSeleccionEstadisticas = ({ categoriaActiva, onCategoriaChange }) => {
  const categorias = [
    {
      id: 'estado',
      titulo: 'Estado',
      descripcion: 'Flujo de papeletas por estado',
      icono: BarChart
    },
    {
      id: 'motivos',
      titulo: 'Motivos',
      descripcion: 'Distribución por motivo de salida',
      icono: FileText
    },
    {
      id: 'horas',
      titulo: 'Empleados',
      descripcion: 'Ranking de solicitudes por empleado',
      icono: Users
    },
    {
      id: 'areas',
      titulo: 'Áreas',
      descripcion: 'Ranking por área y colaborador',
      icono: Building2
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
