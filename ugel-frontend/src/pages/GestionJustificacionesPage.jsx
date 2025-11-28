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
  EyeIcon 
} from '@heroicons/react/24/outline';
import ModalGenerico from '../components/ModalGenerico';

const GestionJustificacionesPage = () => {
  useDocumentTitle('Gestión de Justificaciones - RRHH');
  const [justificaciones, setJustificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [searchTerm, setSearchTerm] = useState('');
  
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
      const response = await justificacionesService.getAll(filtroEstado, searchTerm);
      if (response.data?.success) {
        setJustificaciones(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando justificaciones', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filtroEstado, searchTerm]);

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
              onClick={() => window.open(`http://localhost:3000${row.evidencia_url}`, '_blank')}
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Justificaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Administre las solicitudes de justificación de inasistencias y tardanzas.</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex bg-white rounded-lg p-1 shadow-sm border">
          {['PENDIENTE', 'APROBADO', 'RECHAZADO'].map(est => (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                filtroEstado === est ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-white">
        <TableGenerica 
          columns={columns} 
          data={justificaciones} 
          isLoading={loading}
          emptyMessage="No hay solicitudes en este estado."
        />
      </Card>

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
