import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import TableGenerica from '../components/TableGenerica';
import Button from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { justificacionesService } from '../services/api';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  DocumentTextIcon, 
  EyeIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import ModalGenerico from '../components/ModalGenerico';
import TabView from '../components/TabView';
import SelectCustom from '../components/SelectCustom'; // Importar SelectCustom

const GestionJustificacionesPage = () => {
  useDocumentTitle('Gestión de Justificaciones - RRHH');
  const [justificaciones, setJustificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros de fecha
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para el modal de rechazo/observación
  const [modalOpen, setModalOpen] = useState(false);
  const [accionActual, setAccionActual] = useState(null); // { id, tipo: 'APROBADO'|'RECHAZADO' }
  const [observacion, setObservacion] = useState('');
  const textareaRef = useRef(null);
  const MAX_CHARS = 500;

  // Efecto para auto-ajustar la altura del textarea
  useEffect(() => {
    if (modalOpen && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [observacion, modalOpen]);

  // Estado para ver motivo completo
  const [motiveModalOpen, setMotiveModalOpen] = useState(false);
  const [currentMotive, setCurrentMotive] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pasamos filtros al servicio (asumiendo que el servicio los maneja o manejaremos filtrado local si la API no soporta)
      // Actualizaremos la llamada para incluir año y mes si la API lo permite, si no, filtraremos localmente.
      // Revisitando justificacionesService.getAll: acepta (estado, search).
      // Si la API no tiene filtro de fecha, filtraremos en el cliente.
      
      const response = await justificacionesService.getAll(filtroEstado, searchTerm);
      if (response.data?.success) {
        let data = response.data.data;

        // Filtrado Local por Año y Mes (SIEMPRE APLICAR, excepto PENDIENTES que suelen ser de siempre)
        // Ojo: Si el usuarios quiere ver pendientes historicos, quizas quiera filtrar.
        // Pero para "Pendientes" lo ideal es ver TODO lo pendiente.
        // Para "Aprobados/Rechazados" es critico el filtro historico.
        
        if (filtroEstado !== 'PENDIENTE') {
           data = data.filter(item => {
              const d = new Date(item.fecha);
              return d.getFullYear() === parseInt(selectedYear) && 
                     (d.getMonth() + 1) === parseInt(selectedMonth);
           });
        }
        
        setJustificaciones(data);
      }
    } catch (error) {
      console.error('Error cargando justificaciones', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filtroEstado, searchTerm, selectedYear, selectedMonth]); // Re-fetch cuando cambian filtros

  // Generar opciones de años (actual - 5)
  const years = Array.from({length: 6}, (_, i) => {
     const y = currentYear - i;
     return { value: y, label: y.toString() };
  });

  // Opciones de meses
  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  const handleActionClick = (row, tipo) => {
    setAccionActual({ id: row.id, tipo });
    setObservacion('');
    
    // Si es APROBAR, pedimos confirmación simple. Si es RECHAZAR, obligamos a poner motivo?
    // Para simplificar, abrimos modal siempre para confirmar.
    setModalOpen(true);
  };

  const procesarAccion = async () => {
    try {
      await justificacionesService.evaluar(accionActual.id, {
        estado: accionActual.tipo,
        observacion: observacion
      });
      setModalOpen(false);
      fetchData(); // Recargar tabla
    } catch (error) {
      alert('Error al procesar la solicitud');
    }
  };

  const columns = [
    {
      key: 'personal',
      label: 'Personal',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.nombres} {row.apellidos}</div>
          <div className="text-xs text-gray-500">{row.numero_documento}</div>
        </div>
      )
    },
    {
      key: 'fecha_falta',
      label: 'Fecha Incidencia',
      render: (row) => (
        <div className="text-sm text-gray-700">
          {new Date(row.fecha).toLocaleDateString('es-PE')}
        </div>
      )
    },
    {
      key: 'estado_original',
      label: 'Estado',
      render: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.estado_original === 'Tardanza' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.estado_original}
        </span>
      )
    },
    {
      key: 'motivo',
      label: 'Motivo',
      render: (row) => (
        <div>
          <button
            onClick={() => {
              setCurrentMotive(row.motivo);
              setMotiveModalOpen(true);
            }}
            className="bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-200 rounded-full px-3 py-1 transition-all shadow-sm flex flex-row items-center gap-2"
          >
            <EyeIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Ver motivo</span>
          </button>
        </div>
      )
    },
    {
      key: 'evidencia',
      label: 'Evidencia',
      render: (row) => (
        <div>
          {row.evidencia_url ? (
            <button 
              onClick={() => window.open(row.evidencia_url, '_blank')}
              className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 rounded-full px-2 py-1 transition-all shadow-sm flex flex-row items-center gap-2"
            >
              <DocumentTextIcon className="h-4 w-4 text-blue-800" />
              <span className="text-xs font-medium">Ver evidencia</span>
            </button>
          ) : (
            <span className="text-xs text-gray-400 italic">Sin evidencia</span>
          )}
        </div>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (row) => {
        if (row.estado !== 'PENDIENTE') {
            return <span className={`text-xs font-bold ${row.estado === 'APROBADO' ? 'text-green-600' : 'text-red-600'}`}>{row.estado}</span>
        }
        return (
          <div className="flex gap-2">
            <button 
              onClick={() => handleActionClick(row, 'APROBADO')}
              className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200"
              title="Aprobar"
            >
              <CheckCircleIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => handleActionClick(row, 'RECHAZADO')}
              className="p-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200"
              title="Rechazar"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
        )
      }
    }
  ];

  const tabs = [
    { key: 'PENDIENTE', label: 'Pendientes', icon: <ClockIcon className="h-5 w-5" /> },
    { key: 'APROBADO', label: 'Aprobados', icon: <CheckCircleIcon className="h-5 w-5" /> },
    { key: 'RECHAZADO', label: 'Rechazados', icon: <XCircleIcon className="h-5 w-5" /> }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Justificaciones</h1>
          <p className="mt-1 text-sm text-gray-500">Administre las solicitudes de justificación de inasistencias y tardanzas.</p>
        </div>
      </div>

      <TabView 
        tabs={tabs} 
        activeTab={filtroEstado} 
        onTabChange={setFiltroEstado}
      >
        <Card className="bg-white shadow-lg border border-gray-200 rounded-2xl">
          
          
          {/* Controles: Buscador y Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-100 rounded-t-2xl">
             {/* Buscador - Lado Izquierdo */}
             <div className="relative flex-1 max-w-md w-full">
                {/* El componente TableGenerica ya tiene buscador interno si se le pasa searchable.
                    Para tener los filtros AL LADO, tenemos dos opciones:
                    1. Usar el prop `actions` de TableGenerica para inyectar los selectores.
                    2. Sacar el buscador de TableGenerica y poner todo junto aqui.
                    
                    OPCION 2: Control total del layout.
                    Deshabilitamos `searchable={true}` en TableGenerica y manejamos el input aqui.
                */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
             </div>

             {/* Filtros - Lado Derecho (solo si no es PENDIENTE) */}
             {filtroEstado !== 'PENDIENTE' && (
               <div className="flex gap-2 w-full sm:w-auto">
                 <div className="w-32">
                    <SelectCustom 
                      placeholder="Año"
                      options={years}
                      value={years.find(y => y.value === selectedYear)}
                      onChange={(opt) => setSelectedYear(opt?.value)}
                      isClearable={false}
                      minMenuWidth="120px"
                    />
                 </div>
                 <div className="w-32">
                    <SelectCustom 
                      placeholder="Mes"
                      options={months}
                      value={months.find(m => m.value === selectedMonth)}
                      onChange={(opt) => setSelectedMonth(opt?.value)}
                      isClearable={false}
                      minMenuWidth="120px"
                    />
                 </div>
               </div>
             )}
          </div>

          <TableGenerica 
            columns={columns} 
            data={justificaciones} 
            isLoading={loading}
            emptyMessage="No hay solicitudes en este estado."
            // Quitamos searchable de aqui porque ya lo implementamos arriba manualmente
            searchable={false} 
            pagination={true} 
            itemsPerPage={10} 
            className="!mt-0" // Quitamos margen superior porque ya tenemos los controles arriba
          />
        </Card>
      </TabView>

      {/* Modal de Confirmación */}
      <ModalGenerico
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={accionActual?.tipo === 'APROBADO' ? 'Aprobar Justificación' : 'Rechazar Justificación'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {accionActual?.tipo === 'APROBADO' 
              ? 'Al aprobar, el estado de asistencia del personal cambiará automáticamente a "Justificada".' 
              : 'Indique el motivo del rechazo (opcional).'}
          </p>
          
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full rounded-lg border-2 border-gray-200 shadow-sm focus:border-blue-600 focus:ring-blue-600 text-gray-700 text-sm leading-relaxed p-3 min-h-[100px] resize-none overflow-hidden transition-all duration-200 ease-in-out"
              rows="3"
              placeholder="Observaciones para el personal..."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={MAX_CHARS}
            />
            {/* Contador de caracteres */}
            <div className={`absolute bottom-2 right-3 text-xs font-medium transition-colors ${
              observacion.length >= MAX_CHARS ? 'text-red-500' : 'text-gray-400'
            }`}>
              {observacion.length}/{MAX_CHARS}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button 
              variant={accionActual?.tipo === 'APROBADO' ? 'primary' : 'danger'} 
              onClick={procesarAccion}
            >
              Confirmar {accionActual?.tipo === 'APROBADO' ? 'Aprobación' : 'Rechazo'}
            </Button>
          </div>
        </div>
      </ModalGenerico>

      {/* Modal para ver Motivo Completo */}
      <ModalGenerico
        isOpen={motiveModalOpen}
        onClose={() => setMotiveModalOpen(false)}
        title="Motivo de Justificación"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
            {currentMotive}
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="secondary" onClick={() => setMotiveModalOpen(false)}>Cerrar</Button>
          </div>
        </div>
      </ModalGenerico>
    </div>
  );
};

export default GestionJustificacionesPage;
