import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { visitasService } from '../services/api';
import MisVisitasTabla from '../components/personal_visitas/MisVisitasTabla';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const MisVisitasPage = () => {
  const { user } = useAuth();
  const personalId = user?.personal_id || user?.personalId;
  const missingPersonalToast = useRef(false);
  const isFetchingRef = useRef(false);
  const [activeTab, setActiveTab] = useState('activos');
  const [visitasActivas, setVisitasActivas] = useState([]);
  const [historialVisitas, setHistorialVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activosPagination, setActivosPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const [historialPagination, setHistorialPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  // Estados para filtro de año y mes
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  // Opciones de año
  const yearOptions = useMemo(() => {
    const currentYear = hoy.getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      years.push({ value: y, label: y.toString() });
    }
    return years;
  }, [hoy]);

  const monthOptions = useMemo(
    () => [
      { value: 0, label: 'Todos' },
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Setiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' },
    ],
    []
  );

  const handleChangeYear = (option) => {
    if (!option) return;
    setAnio(option.value);
    // Reset pagination when filter changes
    setActivosPagination(prev => ({ ...prev, page: 1 }));
    setHistorialPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleChangeMonth = (option) => {
    if (!option) return;
    setMes(option.value);
    // Reset pagination when filter changes
    setActivosPagination(prev => ({ ...prev, page: 1 }));
    setHistorialPagination(prev => ({ ...prev, page: 1 }));
  };

  const fetchVisitas = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      if (!personalId) {
        setVisitasActivas([]);
        setHistorialVisitas([]);
        if (!missingPersonalToast.current) {
          toast.error('Tu usuario no está asociado a un personal, no se pueden mostrar visitas');
          missingPersonalToast.current = true;
        }
        return;
      }
      
      // Definir estados y paginación según el tab activo
      const estados = activeTab === 'activos' 
        ? 'PENDIENTE,ACEPTADO,DELEGADO' 
        : 'FINALIZADO,RECHAZADO,NO_PRESENTADO';
      
      const page = activeTab === 'activos' ? activosPagination.page : historialPagination.page;
      const limit = activeTab === 'activos' ? activosPagination.limit : historialPagination.limit;

      const filters = {
        page,
        limit,
        estados
      };

      // Solo aplicar filtros de calendario al historial; las visitas activas son del presente.
      if (activeTab === 'historial') {
        filters.anio = anio;
        filters.mes = mes === 0 ? undefined : mes;
      }

      const response = await visitasService.getMisVisitas(filters);
      
      const { data, pagination } = response.data;
      const apiPagination = pagination || {};
      const totalFromApi = apiPagination.total ?? 0;

      if (activeTab === 'activos') {
        setVisitasActivas(data || []);
        setActivosPagination(prev => ({
          ...prev,
          limit: apiPagination.limit ?? prev.limit,
          total: totalFromApi
        }));
      } else {
        setHistorialVisitas(data || []);
        setHistorialPagination(prev => ({
          ...prev,
          limit: apiPagination.limit ?? prev.limit,
          total: totalFromApi
        }));
      }

    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeTab, activosPagination.page, activosPagination.limit, historialPagination.page, historialPagination.limit, personalId, anio, mes]);

  useEffect(() => {
    fetchVisitas();
  }, [fetchVisitas]);

  useEffect(() => {
    const handleVisitaCreada = (event) => {
      const detail = event.detail || {};
      const visitadoId = detail.personalVisitadoId || detail.visita?.personal_visitado_id || detail.visita?.personalVisitadoId;
      if (!personalId || !visitadoId) return;
      if (parseInt(visitadoId, 10) !== parseInt(personalId, 10)) return;
      fetchVisitas();
    };

    window.addEventListener('visita-registrada', handleVisitaCreada);
    return () => window.removeEventListener('visita-registrada', handleVisitaCreada);
  }, [fetchVisitas, personalId]);

  // Socket.IO integration for real-time updates
  useEffect(() => {
    if (!personalId) return;

    let socket;
    
    const initializeSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        const socketURL = import.meta.env.VITE_SOCKET_URL || (window.location.origin.includes(':5173') ? 'http://localhost:3000' : window.location.origin);
        
        const token = localStorage.getItem('token');
        
        socket = io(socketURL, {
          transports: ['websocket'],
          reconnection: true,
          auth: {
            token: token
          }
        });

        socket.on('connect', () => {
          console.log('[MisVisitas] Socket connected');
        });

        socket.on('nueva_visita_registrada', (visita) => {
          const visitadoId = visita.personal_visitado_id ?? visita.personalVisitadoId;
          // Check if the visit is for the current user
          if (visitadoId && parseInt(visitadoId, 10) === parseInt(personalId, 10)) {
             console.log('[MisVisitas] Nueva visita recibida por socket', visita);
             fetchVisitas();
             toast.success('Nueva visita registrada');
          }
        });

        socket.on('salida_visita_registrada', ({ visitaId }) => {
           console.log('[MisVisitas] Salida registrada recibida por socket', visitaId);
           
           // Actualizar estado local inmediatamente para feedback visual rápido
           setVisitasActivas(prev => prev.filter(v => v.id !== parseInt(visitaId)));
           
           // Recargar datos para asegurar consistencia (especialmente historial)
           fetchVisitas();
        });

      } catch (error) {
        console.error('[MisVisitas] Error initializing socket:', error);
      }
    };

    initializeSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [personalId, fetchVisitas]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset page when switching tabs
    if (tab === 'activos') {
      setActivosPagination(prev => ({ ...prev, page: 1 }));
    } else {
      setHistorialPagination(prev => ({ ...prev, page: 1 }));
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-1 p-4">
        <div className="max-w-8xl mx-auto h-full">
          <MisVisitasTabla
            visitasActivas={visitasActivas}
            historialVisitas={historialVisitas}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onRefresh={fetchVisitas}
            activosPagination={{
              currentPage: activosPagination.page,
              totalPages: Math.ceil(activosPagination.total / activosPagination.limit),
              totalItems: activosPagination.total,
              itemsPerPage: activosPagination.limit
            }}
            onActivosPageChange={(page) => setActivosPagination(prev => ({ ...prev, page }))}
            historialPagination={{
              currentPage: historialPagination.page,
              totalPages: Math.ceil(historialPagination.total / historialPagination.limit),
              totalItems: historialPagination.total,
              itemsPerPage: historialPagination.limit
            }}
            onHistorialPageChange={(page) => setHistorialPagination(prev => ({ ...prev, page }))}

            filters={{
              yearOptions,
              monthOptions,
              anio,
              mes,
              onYearChange: handleChangeYear,
              onMonthChange: handleChangeMonth
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MisVisitasPage;
