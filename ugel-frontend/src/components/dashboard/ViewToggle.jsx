import React from 'react';
import { Users, UserCheck } from 'lucide-react';

/**
 * Componente de toggle para alternar entre vistas de Personal y Visitas
 */
const ViewToggle = ({ vistaActiva, onCambiarVista }) => {
  const vistas = [
    {
      id: 'personal',
      label: 'Personal',
      icon: UserCheck,
      description: 'Asistencias y estadísticas del personal'
    },
    {
      id: 'visitas',
      label: 'Visitas',
      icon: Users,
      description: 'Visitantes y estadísticas de visitas'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-2 border border-slate-100 mb-6">
      <div className="grid grid-cols-2 gap-2">
        {vistas.map((vista) => {
          const Icon = vista.icon;
          const isActive = vistaActiva === vista.id;
          
          return (
            <button
              key={vista.id}
              onClick={() => onCambiarVista(vista.id)}
              className={`
                relative px-6 py-4 rounded-xl font-semibold transition-all duration-300
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <div className="flex items-center justify-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <div className="text-left">
                  <div className="text-base font-bold">{vista.label}</div>
                  <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'} hidden sm:block`}>
                    {vista.description}
                  </div>
                </div>
              </div>
              
              {/* Indicador activo */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                  <div className="w-2 h-2 bg-white rounded-full shadow-lg"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewToggle;
