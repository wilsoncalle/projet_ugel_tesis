import React from 'react';
import { Users, UserCheck } from 'lucide-react';

/**
 * Componente de toggle para alternar entre vistas
 */
const ViewToggle = ({ vistaActiva, onCambiarVista, tabs: customTabs }) => {
  const defaultTabs = [
    {
      key: 'personal',
      label: 'Personal',
      icon: <UserCheck className="h-4 w-4" />,
      description: 'Asistencias y estadísticas del personal'
    },
    {
      key: 'visitas',
      label: 'Visitas',
      icon: <Users className="h-4 w-4" />,
      description: 'Visitantes y estadísticas de visitas'
    }
  ];

  const tabs = customTabs || defaultTabs;

  return (
    <div className="mb-6">
      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-full">
        {tabs.map((tab) => {
          const isActive = vistaActiva === tab.key;
          
          return (
            <button
              key={tab.key}
              onClick={() => onCambiarVista(tab.key)}
              className={`
                flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-full
                font-medium text-sm transition-all duration-200
                ${isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <span className={isActive ? 'text-gray-900' : 'text-gray-500'}>
                {tab.icon}
              </span>
              <span className="font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ViewToggle;
