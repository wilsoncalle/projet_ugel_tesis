import { useState, useMemo } from 'react';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Componente genérico para mostrar tablas de estadísticas
 * @param {Object} props
 * @param {Object|Array} props.data - Datos para la tabla
 * @param {number} props.totalVisitas - Total de visitas
 * @param {Function} props.onExport - Función para exportar datos
 * @param {Object} props.config - Configuración de la tabla
 */
const EstadisticasTabla = ({ data, totalVisitas, onExport, config = {} }) => {
  const {
    type = 'motivos', // 'motivos', 'areas', 'visitantes', etc.
    title = 'Detalle',
    searchPlaceholder = 'Buscar...',
    nameLabel = 'Nombre',
    countLabel = 'Cantidad',
    distributionLabel = 'Distribución',
    nameKey = 'nombre',
    countKey = 'count',
    sortByName = 'nombre',
    sortByCount = 'count',
    columns = null, // Columnas personalizadas (opcional)
    enableRowClick = false,
    onRowClick = null,
  } = config;
  
  const hasCustomColumns = Array.isArray(columns) && columns.length > 0;

  const [busqueda, setBusqueda] = useState('');
  const [ordenarPor, setOrdenarPor] = useState(sortByCount);
  const [direccionOrden, setDireccionOrden] = useState('desc');

  // Transforma los datos según el tipo
  const datosTabla = useMemo(() => {
    // Si hay columnas personalizadas, usar los datos directamente
    if (hasCustomColumns && Array.isArray(data)) {
      return data;
    }
    
    // Datos tipo motivos (con labels y datasets)
    if (type === 'motivos' || (data?.labels && data?.datasets)) {
      if (!data || !data.labels || !data.datasets || !data.datasets[0]) return [];
      
      return data.labels.map((label, index) => ({
        [nameKey]: label,
        [countKey]: data.datasets[0].data[index],
      }));
    }
    
    // Datos tipo áreas (array directo)
    if (Array.isArray(data)) {
      return data.map(item => ({
        [nameKey]: item.nombre_area || item.nombre || item[nameKey],
        [countKey]: parseInt(item.visitas || item.valor || item[countKey] || 0),
      }));
    }

    return [];
  }, [data, type, nameKey, countKey, hasCustomColumns]);

  // Calcula el total si no se proporciona
  const total = useMemo(() => {
    if (totalVisitas) return totalVisitas;
    return datosTabla.reduce((sum, item) => sum + (item[countKey] || 0), 0);
  }, [datosTabla, totalVisitas, countKey]);

  // Filtra y ordena los datos
  const datosFiltrados = useMemo(() => {
    let datos = [...datosTabla];

    if (busqueda) {
      datos = datos.filter(item => {
        // Buscar en múltiples campos
        const searchableFields = hasCustomColumns 
          ? columns.filter(col => col.sortable !== false).map(col => item[col.key])
          : [item[nameKey]];
        
        return searchableFields.some(field => 
          String(field).toLowerCase().includes(busqueda.toLowerCase())
        );
      });
    }

    datos.sort((a, b) => {
      let valorA, valorB;
      
      // Obtener los valores a comparar
      valorA = a[ordenarPor];
      valorB = b[ordenarPor];

      // Determinar si es numérico o string
      const isNumeric = typeof valorA === 'number' || !isNaN(parseFloat(valorA));
      
      if (isNumeric) {
        valorA = parseFloat(valorA) || 0;
        valorB = parseFloat(valorB) || 0;
      } else {
        valorA = String(valorA || '').toLowerCase();
        valorB = String(valorB || '').toLowerCase();
      }

      if (direccionOrden === 'asc') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

    return datos;
  }, [datosTabla, busqueda, ordenarPor, direccionOrden, nameKey, countKey, hasCustomColumns, columns]);

  // Maneja el cambio de ordenación
  const handleOrdenar = (campo) => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setDireccionOrden('desc');
    }
  };
  
  // Exporta los datos
  const handleExport = () => {
    if (onExport) {
      const datosConPorcentaje = datosFiltrados.map(item => ({
        ...item,
        porcentaje: total > 0 ? ((item[countKey] / total) * 100).toFixed(1) : 0
      }));
      onExport(datosConPorcentaje);
    }
  };

  // Ícono de ordenación
  const getIconoOrden = (campo) => {
    if (ordenarPor !== campo) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return direccionOrden === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-gray-600" />
      : <ArrowDown className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {datosFiltrados.length} {type === 'motivos' ? 'motivos' : type === 'areas' ? 'áreas' : 'elementos'} registrados
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Botón Exportar */}
            {onExport && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {hasCustomColumns ? (
                // Columnas personalizadas
                columns.map((col, index) => (
                  <th 
                    key={col.key || index}
                    className={`px-6 py-4 text-left ${col.sortable ? 'cursor-pointer group hover:bg-gray-50 transition-colors' : ''}`}
                    onClick={col.sortable ? () => handleOrdenar(col.key) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {col.label}
                      </span>
                      {col.sortable && getIconoOrden(col.key)}
                    </div>
                  </th>
                ))
              ) : (
                // Columnas por defecto
                <>
                  <th 
                    className="px-6 py-4 text-left cursor-pointer group hover:bg-gray-50 transition-colors"
                    onClick={() => handleOrdenar(sortByName)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {nameLabel}
                      </span>
                      {getIconoOrden(sortByName)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left cursor-pointer group hover:bg-gray-50 transition-colors"
                    onClick={() => handleOrdenar(sortByCount)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {countLabel}
                      </span>
                      {getIconoOrden(sortByCount)}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {distributionLabel}
                    </span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {datosFiltrados.map((item, index) => {
              const porcentaje = total > 0 ? ((item[countKey] / total) * 100).toFixed(1) : 0;
              const itemKey = item.id || item.visitante_id || item[nameKey] || index;
              
              return (
                <tr 
                  key={`${itemKey}-${index}`}
                  className={`group hover:bg-gray-50/50 transition-colors ${enableRowClick ? 'cursor-pointer' : ''}`}
                  onClick={enableRowClick && onRowClick ? () => onRowClick(item) : undefined}
                >
                  {hasCustomColumns ? (
                    // Renderizar columnas personalizadas
                    columns.map((col, colIndex) => (
                      <td key={col.key || colIndex} className="px-6 py-4">
                        {col.render ? col.render(item) : (
                          <span className="text-sm text-gray-900">
                            {item[col.key] || 'N/A'}
                          </span>
                        )}
                      </td>
                    ))
                  ) : (
                    // Columnas por defecto
                    <>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-125 transition-transform" />
                          <span className="text-sm font-medium text-gray-900">
                            {item[nameKey]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">
                          {item[countKey].toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-xs">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(porcentaje, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-600 min-w-[3rem] text-right">
                            {porcentaje}%
                          </span>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer con estadísticas */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{datosFiltrados.length}</span> de {datosTabla.length} {type === 'motivos' ? 'motivos' : type === 'areas' ? 'áreas' : 'elementos'}
              </span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total de visitas: </span>
            <span className="font-bold text-gray-900">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasTabla;

