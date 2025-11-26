import React, { useState, useEffect, useCallback } from 'react';
import { visitasService, personalService } from '../services/api';
import AdaptiveTable from '../components/AdaptiveTable';
import Button from '../components/Button';
import ModalGenerico from '../components/ModalGenerico';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import { toast } from 'react-hot-toast';
import { format, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const MisVisitasPage = () => {
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [wrongVisitorModalOpen, setWrongVisitorModalOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [delegateTo, setDelegateTo] = useState(null);
  const [personalList, setPersonalList] = useState([]);
  const [wrongVisitorData, setWrongVisitorData] = useState(null);

  const fetchVisitas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await visitasService.getMisVisitas({
        page: pagination.page,
        limit: pagination.limit,
        q: searchTerm
      });
      
      setVisitas(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.meta.total
      }));
    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchVisitas();
  }, [fetchVisitas]);

  // Search logic for "Wrong Visitor"
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // First, try to filter local list (already done by fetchVisitas via useEffect)
      // If local list is empty, try global search
      if (visitas.length === 0) {
        try {
          const response = await visitasService.buscarGlobal(searchTerm);
          if (response.data.success && response.data.data) {
             setWrongVisitorData(response.data.data);
             setWrongVisitorModalOpen(true);
          }
        } catch (error) {
          // If 404 or other error, just ignore or show "No results"
          console.log('Global search failed or no results');
        }
      }
    }
  };

  const handleAccept = async (visita) => {
    try {
      await visitasService.accept(visita.id);
      toast.success('Visita aceptada correctamente');
      fetchVisitas();
    } catch (error) {
      toast.error('Error al aceptar la visita');
    }
  };

  const handleRejectClick = (visita) => {
    setSelectedVisita(visita);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error('Debe ingresar un motivo');
      return;
    }
    try {
      await visitasService.reject(selectedVisita.id, rejectReason);
      toast.success('Visita rechazada correctamente');
      setRejectModalOpen(false);
      fetchVisitas();
    } catch (error) {
      toast.error('Error al rechazar la visita');
    }
  };

  const handleDelegateClick = async (visita) => {
    setSelectedVisita(visita);
    setDelegateTo(null);
    setDelegateModalOpen(true);
    // Load personal list if not loaded
    if (personalList.length === 0) {
      try {
        const response = await personalService.getActivos();
        setPersonalList(response.data.data.map(p => ({
          value: p.id,
          label: `${p.nombres} ${p.apellidos}`
        })));
      } catch (error) {
        toast.error('Error al cargar lista de personal');
      }
    }
  };

  const handleDelegateConfirm = async () => {
    if (!delegateTo) {
      toast.error('Debe seleccionar un personal');
      return;
    }
    try {
      await visitasService.delegate(selectedVisita.id, delegateTo.value);
      toast.success('Visita delegada correctamente');
      setDelegateModalOpen(false);
      fetchVisitas();
    } catch (error) {
      toast.error('Error al delegar la visita');
    }
  };

  const columns = [
    {
      header: 'Visitante',
      accessorKey: 'visitante_nombres',
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.visitante_nombres} {row.visitante_apellidos}
          </div>
          <div className="text-sm text-gray-500">
            {row.tipo_documento_codigo}: {row.numero_documento}
          </div>
        </div>
      )
    },
    {
      header: 'Área Destino',
      accessorKey: 'nombre_area', // Assuming backend returns this
      cell: (row) => (
        <span className="text-sm text-gray-700">{row.nombre_area || 'N/A'}</span>
      )
    },
    {
      header: 'Fecha/Hora',
      accessorKey: 'fecha_ingreso',
      cell: (row) => format(new Date(row.fecha_ingreso), 'dd/MM/yyyy HH:mm', { locale: es })
    },
    {
      header: 'Tiempo',
      id: 'tiempo',
      cell: (row) => {
        const now = new Date();
        const ingreso = new Date(row.fecha_ingreso);
        const diffMinutes = differenceInMinutes(now, ingreso);
        
        if (row.estado_visita === 'PENDIENTE') {
          const isOverLimit = diffMinutes > 5;
          return (
            <div className={`flex items-center space-x-1 ${isOverLimit ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
              <ClockIcon className="h-4 w-4" />
              <span>{diffMinutes} min</span>
              {isOverLimit && <ExclamationTriangleIcon className="h-4 w-4" title="Excedió tiempo de espera (5 min)" />}
            </div>
          );
        } else if (row.estado_visita === 'ACEPTADO') {
           const isOverLimit = diffMinutes > 30;
           return (
            <div className={`flex items-center space-x-1 ${isOverLimit ? 'text-orange-600 font-bold' : 'text-green-600'}`}>
              <ClockIcon className="h-4 w-4" />
              <span>{diffMinutes} min</span>
              {isOverLimit && <span className="text-xs bg-orange-100 px-1 rounded">Excedido</span>}
            </div>
           );
        }
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      header: 'Motivo',
      accessorKey: 'nombre_motivo'
    },
    {
      header: 'Estado',
      accessorKey: 'estado_visita',
      cell: (row) => {
        const colors = {
          PENDIENTE: 'bg-yellow-100 text-yellow-800',
          ACEPTADO: 'bg-green-100 text-green-800',
          RECHAZADO: 'bg-red-100 text-red-800',
          DELEGADO: 'bg-blue-100 text-blue-800',
          FINALIZADO: 'bg-gray-100 text-gray-800',
          NO_PRESENTADO: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[row.estado_visita] || 'bg-gray-100'}`}>
            {row.estado_visita}
          </span>
        );
      }
    },
    {
      header: 'Acciones',
      id: 'actions',
      cell: (row) => {
        if (row.estado_visita !== 'PENDIENTE') return null;
        
        return (
          <div className="flex space-x-2">
            <button
              onClick={() => handleAccept(row)}
              className="text-green-600 hover:text-green-900"
              title="Aceptar"
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleRejectClick(row)}
              className="text-red-600 hover:text-red-900"
              title="Rechazar"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelegateClick(row)}
              className="text-blue-600 hover:text-blue-900"
              title="Delegar"
            >
              <UserGroupIcon className="h-5 w-5" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Mis Visitas</h1>
        <div className="w-64">
          <Input
            placeholder="Buscar por DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
            icon={MagnifyingGlassIcon}
          />
        </div>
      </div>

      <AdaptiveTable
        data={visitas}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage: pagination.page,
          totalPages: Math.ceil(pagination.total / pagination.limit),
          onPageChange: (page) => setPagination(prev => ({ ...prev, page }))
        }}
      />

      {/* Reject Modal */}
      <ModalGenerico
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Rechazar Visita"
      >
        <div className="space-y-4">
          <p>¿Está seguro que desea rechazar esta visita?</p>
          <Input
            label="Motivo del rechazo"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ingrese el motivo..."
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRejectConfirm}>
              Rechazar
            </Button>
          </div>
        </div>
      </ModalGenerico>

      {/* Delegate Modal */}
      <ModalGenerico
        isOpen={delegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        title="Delegar Visita"
      >
        <div className="space-y-4">
          <p>Seleccione el personal a quien desea delegar la visita:</p>
          <SelectCustom
            options={personalList}
            value={delegateTo}
            onChange={setDelegateTo}
            placeholder="Buscar personal..."
            isSearchable
          />
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="secondary" onClick={() => setDelegateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDelegateConfirm}>
              Delegar
            </Button>
          </div>
        </div>
      </ModalGenerico>

      {/* Wrong Visitor Modal */}
      <ModalGenerico
        isOpen={wrongVisitorModalOpen}
        onClose={() => setWrongVisitorModalOpen(false)}
        title="Información de Visita"
      >
        <div className="space-y-4">
          <div className="flex items-center text-amber-600 mb-2">
            <InformationCircleIcon className="h-6 w-6 mr-2" />
            <span className="font-bold">Este visitante tiene una visita activa en otra área.</span>
          </div>
          
          {wrongVisitorData && (
            <div className="bg-gray-50 p-4 rounded-md space-y-2">
              <p><strong>Visitante:</strong> {wrongVisitorData.visitante_nombres} {wrongVisitorData.visitante_apellidos}</p>
              <p><strong>Área Correcta:</strong> {wrongVisitorData.nombre_area}</p>
              <p><strong>Personal Asignado:</strong> {wrongVisitorData.personal_nombres} {wrongVisitorData.personal_apellidos}</p>
              <p><strong>Motivo:</strong> {wrongVisitorData.nombre_motivo}</p>
              <p><strong>Estado:</strong> {wrongVisitorData.estado_visita}</p>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="primary" onClick={() => setWrongVisitorModalOpen(false)}>
              Entendido
            </Button>
          </div>
        </div>
      </ModalGenerico>
    </div>
  );
};

export default MisVisitasPage;
