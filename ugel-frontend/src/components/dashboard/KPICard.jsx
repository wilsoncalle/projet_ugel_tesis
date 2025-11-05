import React from 'react';
import { formatNumber, formatPercentage, getTrendInfo } from '../../utils/dashboardUtils';

/**
 * Componente de tarjeta KPI para el dashboard
 * Muestra métricas clave con indicadores de tendencia
 */
const KPICard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  loading,
  subtitle,
  colorScheme = 'blue' // 'blue', 'green', 'purple', 'orange'
}) => {
  const trendInfo = getTrendInfo(change);
  
  const colorSchemes = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      light: 'bg-blue-50',
    },
    green: {
      bg: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      light: 'bg-green-50',
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      light: 'bg-purple-50',
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      light: 'bg-orange-50',
    },
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.blue;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
          </div>
          <div className={`w-12 h-12 rounded-xl ${colors.light}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors">
            {formatNumber(value)}
          </h3>
          
          {/* Indicador de tendencia */}
          {change !== undefined && change !== null && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${trendInfo.bgColor} ${trendInfo.color} border ${trendInfo.borderColor}`}>
                <span className="text-sm">{trendInfo.icon}</span>
                {formatPercentage(Math.abs(change))}
              </span>
              <span className="text-xs text-slate-500">vs período anterior</span>
            </div>
          )}
          
          {/* Subtítulo opcional */}
          {subtitle && (
            <p className="text-xs text-slate-500 mt-2">{subtitle}</p>
          )}
        </div>

        {/* Ícono */}
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-6 h-6 ${colors.iconColor}`} />
          </div>
        )}
      </div>

      {/* Barra de progreso decorativa */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${colors.bg} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: '75%' }}
        ></div>
      </div>
    </div>
  );
};

export default KPICard;
