import React from 'react';
import { Calendar, RefreshCw, Download } from 'lucide-react';
import SelectCustom from '../SelectCustom';

/**
 * Componente de filtros globales para el dashboard
 */
const DashboardFilters = ({ 
  periodo, 
  onPeriodoChange, 
  onRefresh, 
  onExport,
  loading 
}) => {
  const opcionesPeriodo = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'anio', label: 'Este Año' },
    { value: 'todo', label: 'Todo el Historial' }
  ];

  const periodoActual = opcionesPeriodo.find(op => op.value === periodo);

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        {/* Título y descripción */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Filtros del Dashboard</h2>
            <p className="text-sm text-slate-500">Personaliza la vista de tus estadísticas</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Selector de período */}
          <div className="w-full sm:w-56">
            <SelectCustom
              value={periodoActual}
              onChange={(selectedOption) => onPeriodoChange(selectedOption?.value || 'mes')}
              options={opcionesPeriodo}
              placeholder="Seleccionar período"
              isClearable={false}
            />
          </div>

          {/* Botón de refrescar */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Botón de exportar */}
          <button
            onClick={onExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar datos"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
