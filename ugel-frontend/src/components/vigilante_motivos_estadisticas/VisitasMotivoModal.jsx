import { X } from 'lucide-react';
import VisitasMotivoChart from './VisitasMotivoChart';
import VisitasMotivoTabla from './VisitasMotivoTabla';
import VisitasMotivoMetricas from './VisitasMotivoMetricas';
import SelectCustom from '../SelectCustom';

const VisitasMotivoModal = ({ 
  data, 
  loading, 
  error, 
  periodo, 
  onPeriodoChange, 
  onClose,
  totalVisitas
}) => {
  // Función para exportar datos
  const handleExport = (datos) => {
    const csvContent = [
      ['Motivo', 'Cantidad', 'Porcentaje'],
      ...datos.map(item => [
        item.motivo, 
        item.count, 
        `${item.porcentaje}%`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitas-por-motivo-${periodo}-${new Date().toISOString().split('T')[0]}.csv`);
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
            Distribución por Motivo - Vista Detallada
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
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-xl font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Métricas resumidas */}
              <VisitasMotivoMetricas data={data} totalVisitas={totalVisitas} />
              
              {/* Layout de dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna izquierda - Gráfico dona */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Distribución por Motivo
                  </h3>
                  <div className="flex justify-center">
                    <VisitasMotivoChart 
                      data={data} 
                      loading={loading} 
                      size={500}
                      totalVisitas={totalVisitas}
                      layout="vertical" 
                    />
                  </div>
                </div>
                
                {/* Columna derecha - Tabla detallada */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <VisitasMotivoTabla 
                    data={data} 
                    totalVisitas={totalVisitas}
                    onExport={handleExport}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisitasMotivoModal;
