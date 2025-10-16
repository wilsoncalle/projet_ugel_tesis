import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// --- Constantes y Componentes Auxiliares ---
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#06B6D4', '#F97316', '#6366F1', '#14B8A6', '#EF4444',
];

const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    
    return (
      <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg border border-gray-800">
        <p className="font-semibold text-sm mb-1">{data.name}</p>
        <p className="text-xs">
          <span className="font-bold">{data.value.toLocaleString()}</span> visitas
        </p>
        <p className="text-xs text-gray-300">{percentage}% del total</p>
      </div>
    );
  }
  return null;
};

// --- AVISO: Aquí está el cambio principal ---
// La leyenda ahora usa una cuadrícula de 2 columnas en pantallas pequeñas y más grandes
const CustomLegend = ({ data, total }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-6">
      {data.map((entry, index) => {
        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
        
        return (
          <div 
            key={`legend-${index}`}
            className="flex items-center justify-between py-1 group"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-medium text-gray-700 truncate">
                {entry.name}
              </span>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm font-bold text-gray-900">
                {entry.value.toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- Componente Principal (con layout vertical restaurado) ---

const VisitasMotivoChart = ({ data, loading, size = 300, totalVisitas = 0 }) => {
  if (loading) { /* ... código de loading sin cambios ... */
    return (
        <div className="flex items-center justify-center" style={{ width: `100%`, height: `${size}px` }}>
            <div className="relative">
                <div className="rounded-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 animate-pulse" style={{ width: `${size}px`, height: `${size}px` }}/>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full" style={{ width: `${size * 0.6}px`, height: `${size * 0.6}px` }}/>
            </div>
        </div>
    );
  }
  if (!data || !data.labels || data.labels.length === 0) { /* ... código de sin datos sin cambios ... */
    return (
        <div className="flex items-center justify-center bg-gray-50 rounded-2xl w-full" style={{ height: `${size}px` }}>
            <div className="text-center px-6">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                <p className="text-base font-semibold text-gray-700 mb-1">Sin datos disponibles</p>
                <p className="text-sm text-gray-500">No hay visitas registradas</p>
            </div>
        </div>
    );
  }

  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0].data[index],
    color: COLORS[index % COLORS.length]
  }));

  const totalCalculado = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    // Se restaura el layout vertical simple
    <div className="w-full flex flex-col items-center">
      <div 
        className="relative" 
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell 
                  key={`cell-${entry.name}`} 
                  fill={entry.color}
                  stroke={entry.color}
                  className="focus:outline-none hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={totalCalculado} />} />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total</p>
          <p className="text-3xl font-bold text-gray-900">{totalVisitas.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">visitas</p>
        </div>
      </div>

      <div className="w-full max-w-lg">
        <CustomLegend data={chartData} total={totalCalculado} />
      </div>
    </div>
  );
};

export default VisitasMotivoChart;