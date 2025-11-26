import React, { useState, useEffect, useCallback, useRef } from 'react';
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
      
      // Fetch activas (PENDIENTE, ACEPTADO, EN_CURSO)
      // Asumimos que el backend filtra por estado si no se pasa nada, o filtramos en cliente
      // Para "Mis Visitas", generalmente queremos ver las pendientes de acción primero
      const response = await visitasService.getMisVisitas({
        page: activeTab === 'activos' ? activosPagination.page : historialPagination.page,
        limit: activeTab === 'activos' ? activosPagination.limit : historialPagination.limit,
        // Aquí podrías agregar filtros de estado si tu API lo soporta
      });
      
      const allVisitas = response.data.data || [];
      const visitasParaMi = allVisitas.filter((v) => {
        const visitadoId = v.personal_visitado_id ?? v.personalVisitadoId ?? v.personal_id ?? v.personalId ?? v.personal?.id;
        return visitadoId && parseInt(visitadoId, 10) === parseInt(personalId, 10);
      });
      const dataFiltrada = visitasParaMi.length > 0 ? visitasParaMi : allVisitas;

      // Separar por fecha_salida (si no tenemos estados consistentes)
      const activas = dataFiltrada.filter(v => !v.fecha_salida);
      const historial = dataFiltrada.filter(v => v.fecha_salida);

      setVisitasActivas(activas);
      setHistorialVisitas(historial);

      // Actualizar totales (esto es aproximado si filtras en cliente, idealmente la API debería dar totales por estado)
      if (activeTab === 'activos') {
        setActivosPagination(prev => ({ ...prev, total: activas.length }));
      } else {
        setHistorialPagination(prev => ({ ...prev, total: historial.length }));
      }

    } catch (error) {
      console.error('Error fetching visits:', error);
      toast.error('Error al cargar las visitas');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeTab, activosPagination.page, historialPagination.page, personalId]);

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
           // Check if this visit is in our active list
           setVisitasActivas(prev => {
             const exists = prev.some(v => v.id === parseInt(visitaId));
             if (exists) {
               console.log('[MisVisitas] Salida registrada recibida por socket', visitaId);
               fetchVisitas();
             }
             return prev;
           });
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
    <div className="p-6 h-[calc(100vh-4rem)]">
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
      />
    </div>
  );
};

export default MisVisitasPage;
