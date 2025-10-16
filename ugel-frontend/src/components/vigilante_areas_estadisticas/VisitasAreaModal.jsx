import { X } from 'lucide-react';
import VisitasAreaChart from './VisitasAreaChart';
import VisitasAreaTabla from './VisitasAreaTabla';
import VisitasAreaMetricas from './VisitasAreaMetricas';
import SelectCustom from '../SelectCustom';

const VisitasAreaModal = ({ 
  data, 
  loading, 
  error, 
  periodo, 
  onPeriodoChange, 
  onClose 
}) => {
  // Función para exportar datos
  const handleExport = (datos) => {
    const csvContent = [
      ['Área', 'Visitas', 'Porcentaje'],
      ...datos.map(item => {
        const total = data.reduce((sum, d) => sum + parseInt(d.visitas), 0);
        const porcentaje = total > 0 ? ((parseInt(item.visitas) / total) * 100).toFixed(1) : 0;
        return [item.nombre_area, item.visitas, `${porcentaje}%`];
      })
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitas_por_area_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Opciones para el select de periodo
  const opcionesPeriodo = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'anio', label: 'Este Año' },
    { value: 'todo', label: 'Todo el historial' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Detalles de Visitas por Área
          </h2>
          <div className="flex items-center space-x-4">
            {/* Select de periodo sincronizado */}
            <div className="w-48">
              <SelectCustom
                value={opcionesPeriodo.find(op => op.value === periodo)}
                onChange={(selectedOption) => onPeriodoChange(selectedOption?.value || 'todo')}
                options={opcionesPeriodo}
                placeholder="Seleccionar período"
                isClearable={false}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-500">
                <p className="text-xl font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Métricas resumidas */}
              <VisitasAreaMetricas data={data} />
              
              {/* Gráfico más grande */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Distribución de Visitas por Área
                </h3>
                <VisitasAreaChart 
                  data={data} 
                  loading={loading} 
                  height={700}
                />
              </div>
              
              {/* Tabla detallada */}
              <VisitasAreaTabla 
                data={data} 
                onExport={handleExport}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitasAreaModal;
