import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Popover from '../Popover';
import Button from '../Button';

const TablaVisitas = ({ data, columns, visitantesEnEspera, emptyMessage, onRegistrarSalida }) => {
  const [popoverOpen, setPopoverOpen] = useState(null);

  const isVisitanteEnEspera = (visitante) => {
    return visitantesEnEspera?.some(v => v.id === visitante.id) || visitante.isPreview;
  };

  const handleConfirmarSalida = (visitaId) => {
    onRegistrarSalida?.(visitaId);
    setPopoverOpen(null);
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos</h3>
        <p className="mt-1 text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => {
              const enEspera = isVisitanteEnEspera(row);
              const isPreview = row.isPreview === true;
              return (
                <tr
                  key={row.id || index}
                  className={`hover:bg-gray-50 transition-colors ${
                    isPreview ? 'bg-blue-50 border-l-4 border-blue-500' : 
                    enEspera ? 'bg-amber-50' : 'bg-white'
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Leyenda para visitantes */}
      <div className="mt-4 flex items-center justify-end space-x-4 text-sm text-gray-500">
        {visitantesEnEspera && visitantesEnEspera.length === 0 && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-50 rounded border-l-4 border-blue-500"></div>
            <span>Vista previa</span>
          </div>
        )}
        {visitantesEnEspera && visitantesEnEspera.length > 0 && (
          <>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-amber-50 rounded border"></div>
              <span>Visitante en espera</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-white rounded border"></div>
              <span>Visitante activo</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TablaVisitas;
