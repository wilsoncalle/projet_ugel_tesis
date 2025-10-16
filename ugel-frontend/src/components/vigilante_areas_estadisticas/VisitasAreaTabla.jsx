import { useState, useMemo } from 'react';
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const VisitasAreaTabla = ({ data, onExport }) => {
  const [busqueda, setBusqueda] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('visitas');
  const [direccionOrden, setDireccionOrden] = useState('desc');

  const totalVisitas = useMemo(() => {
    return data.reduce((sum, item) => sum + parseInt(item.visitas), 0);
  }, [data]);

  const datosFiltrados = useMemo(() => {
    let datos = [...data];

    if (busqueda) {
      datos = datos.filter(item => 
        item.nombre_area.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    datos.sort((a, b) => {
      let valorA, valorB;
      
      if (ordenarPor === 'visitas') {
        valorA = parseInt(a.visitas);
        valorB = parseInt(b.visitas);
      } else {
        valorA = a.nombre_area.toLowerCase();
        valorB = b.nombre_area.toLowerCase();
      }

      if (direccionOrden === 'asc') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

    return datos;
  }, [data, busqueda, ordenarPor, direccionOrden]);

  const handleOrdenar = (campo) => {
    if (ordenarPor === campo) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(campo);
      setDireccionOrden('desc');
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(datosFiltrados);
    }
  };

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
              Detalle por Área
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {datosFiltrados.length} áreas registradas
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
                placeholder="Buscar área..."
                className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            {/* Botón Exportar */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:border-gray-300 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th 
                className="px-6 py-4 text-left cursor-pointer group hover:bg-gray-50 transition-colors"
                onClick={() => handleOrdenar('nombre')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Área
                  </span>
                  {getIconoOrden('nombre')}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-left cursor-pointer group hover:bg-gray-50 transition-colors"
                onClick={() => handleOrdenar('visitas')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Visitas
                  </span>
                  {getIconoOrden('visitas')}
                </div>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Distribución
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {datosFiltrados.map((item, index) => {
              const porcentaje = totalVisitas > 0 ? ((parseInt(item.visitas) / totalVisitas) * 100).toFixed(1) : 0;
              
              return (
                <tr 
                  key={item.nombre_area} 
                  className="group hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-125 transition-transform" />
                      <span className="text-sm font-medium text-gray-900">
                        {item.nombre_area}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">
                      {parseInt(item.visitas).toLocaleString()}
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
                <span className="font-semibold text-gray-900">{datosFiltrados.length}</span> de {data.length} áreas
              </span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Total de visitas: </span>
            <span className="font-bold text-gray-900">{totalVisitas.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitasAreaTabla;