import React from 'react';
import TableGenerica from '../TableGenerica';
import { Maximize2 } from 'lucide-react';

const DashboardHistorialWidget = ({
  title,
  subtitle,
  data = [],
  columns = [],
  onExpand,
  loading = false,
  emptyMessage = 'No se encontraron registros para mostrar',
}) => {
  const rows = Array.isArray(data) ? data.slice(0, 10) : [];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border w-full max-h-[420px] flex flex-col">
      {/* Header del Widget */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Mostrando los 10 registros más recientes
          </p>
        </div>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            aria-label="Expandir historial"
            title="Expandir historial"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* CONTENEDOR DE LA TABLA (Aquí está la magia) */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden relative">
        
        {/* 1. overflow-auto: Habilita scroll X e Y aquí mismo */}
        {/* 2. max-h-full: Se adapta al espacio restante del widget */}
        <div className="w-full h-full overflow-auto scrollbar-thin">
          
          {/* 3. Wrapper interno con min-width: 
             Esto fuerza a que la tabla sea ancha y aparezca el scroll horizontal 
             incluso si hay pocas columnas. Ajusta 'min-w' según tu necesidad. */}
          <div className="inline-block min-w-full align-middle">
            <div className="min-w-[800px]"> {/* <--- AJUSTE CLAVE: Fuerza ancho mínimo */}
                <TableGenerica
                  columns={columns}
                  data={rows}
                  isLoading={loading}
                  pagination={false}
                  searchable={false}
                  emptyMessage={emptyMessage}
                />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHistorialWidget;