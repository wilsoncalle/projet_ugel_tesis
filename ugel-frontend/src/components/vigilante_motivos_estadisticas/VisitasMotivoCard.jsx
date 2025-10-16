import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import VisitasMotivoChart from './VisitasMotivoChart';
import VisitasMotivoModal from './VisitasMotivoModal';
import useVisitasMotivo from '../../hooks/useVisitasMotivo';
import SelectCustom from '../SelectCustom';

const VisitasMotivoCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalVisitas } = useVisitasMotivo();
  const [showModal, setShowModal] = useState(false);

  const opcionesPeriodo = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'anio', label: 'Este Año' },
    { value: 'todo', label: 'Todo el historial' }
  ];

  const handleExpandir = () => setShowModal(true);
  const handleCerrarModal = () => setShowModal(false);

  return (
    <>
      {/* Contenedor principal con el diseño unificado */}
      <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 flex flex-col h-full">
        
        {/* Cabecera reorganizada: Título a la izquierda, controles a la derecha */}
        <div className="flex justify-between items-start mb-4">
          {/* Sección del título con más jerarquía */}
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Distribución por Motivo
            </h2>
            <p className="text-sm text-slate-500">
              Visitas agrupadas por el motivo de ingreso
            </p>
          </div>

          {/* Controles agrupados a la derecha */}
          <div className="flex flex-col items-end gap-3">
            <button
              onClick={handleExpandir}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition-all duration-200"
              title="Expandir vista"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            {/* Contenedor para controlar el ancho del select */}
            <div className="w-48">
              <SelectCustom
                value={opcionesPeriodo.find(op => op.value === periodo)}
                onChange={(selectedOption) => setPeriodo(selectedOption?.value || 'todo')}
                options={opcionesPeriodo}
                placeholder="Período"
                isClearable={false}
              />
            </div>
          </div>
        </div>

        {/* Contenido del gráfico, adaptado para ocupar el espacio restante */}
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {error ? (
            <div className="flex items-center justify-center h-full text-center text-red-500">
              <div>
                <p className="text-lg font-medium">Error al cargar datos</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : (
            <VisitasMotivoChart 
              data={data} 
              loading={loading} 
              totalVisitas={totalVisitas}
              layout="horizontal"
              // Se elimina la prop 'size' para que el gráfico se ajuste al contenedor
            />
          )}
        </div>
      </div>

      {/* Modal expandido (sin cambios) */}
      {showModal && (
        <VisitasMotivoModal
          data={data}
          loading={loading}
          error={error}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          onClose={handleCerrarModal}
          totalVisitas={totalVisitas}
        />
      )}
    </>
  );
};

export default VisitasMotivoCard;