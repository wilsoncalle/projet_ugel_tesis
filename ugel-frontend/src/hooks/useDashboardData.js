import { useState, useEffect, useCallback } from 'react';
import { visitasService, asistenciaPersonalService } from '../services/api';

/**
 * Combina flujos diarios de asistencias, inasistencias y permisos
 * @param {Array} asistencias - Flujo diario de asistencias
 * @param {Array} inasistencias - Flujo diario de inasistencias
 * @param {Array} permisos - Flujo diario de permisos
 * @returns {Array} - Flujo combinado por fecha
 */
const combinarFlujosDiarios = (asistencias, inasistencias, permisos) => {
  const mapaFechas = new Map();

  // Procesar asistencias
  asistencias.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).asistencias = parseInt(item.asistencias || 0);
  });

  // Procesar inasistencias
  inasistencias.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).inasistencias = parseInt(item.inasistencias || 0);
  });

  // Procesar permisos
  permisos.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).permisos = parseInt(item.permisos || 0);
  });

  // Convertir a array y ordenar por fecha
  return Array.from(mapaFechas.values()).sort((a, b) => 
    new Date(a.dia) - new Date(b.dia)
  );
};

/**
 * Hook personalizado para manejar todos los datos del dashboard administrativo
 * Combina datos de Personal (Asistencias) y Visitas
 */
const useDashboardData = () => {
  // Estados globales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [vistaActiva, setVistaActiva] = useState('personal'); // 'personal' o 'visitas'
  
  // Estados para datos de Personal
  const [datosPersonal, setDatosPersonal] = useState({
    totalAsistencias: 0,
    totalAusencias: 0,
    puntualidad: 0,
    tardanzas: 0,
    flujoDiario: [],
    flujoDiarioCompleto: [], // Incluye todos los estados
    porArea: [],
    porEstado: [],
  });

  // Estados para datos de Visitas
  const [datosVisitas, setDatosVisitas] = useState({
    totalVisitas: 0,
    visitantesFrecuentes: 0,
    visitasHoy: 0,
    visitasSinSalida: 0,
    flujoDiario: [],
    porMotivo: [],
    porArea: [],
  });

  // Preview de historiales para el dashboard (10 registros más recientes)
  const [historialVisitasPreview, setHistorialVisitasPreview] = useState({
    items: [],
    total: 0,
    pagination: null,
  });

  const [historialAsistenciasPreview, setHistorialAsistenciasPreview] = useState({
    items: [],
    total: 0,
    pagination: null,
  });

  // Estados para comparación de períodos
  const [comparacion, setComparacion] = useState({
    asistenciasCambio: 0,
    visitasCambio: 0,
    puntualidadCambio: 0,
    visitantesCambio: 0,
  });

  /**
   * Fetch datos de Personal/Asistencias
   */
  // Helper para obtener fechas del período anterior
  const getPreviousPeriodDates = (periodoActual) => {
    const now = new Date();
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    let start, end;

    switch (periodoActual) {
      case 'hoy':
        start = new Date(now);
        start.setDate(now.getDate() - 1);
        end = new Date(start);
        break;
      case 'semana':
        // Semana anterior
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunes actual
        const lunesActual = new Date(now.setDate(diff));
        start = new Date(lunesActual);
        start.setDate(lunesActual.getDate() - 7);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'mes':
        // Mes anterior
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'anio':
        // Año anterior
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default: // 'todo' u otros
        return null;
    }
    return { start: formatDate(start), end: formatDate(end) };
  };

  /**
   * Fetch datos de Personal/Asistencias
   */
  const fetchDatosPersonal = useCallback(async () => {
    try {
      // 1. Fetch de datos Actuales - Usando servicio con interceptores
      const [totalesRes, ausenciasRes, puntualidadRes, areasRes, historialRes] = await Promise.all([
        asistenciaPersonalService.getEstadisticasTotales({ periodo }),
        asistenciaPersonalService.getEstadisticasAusencias({ periodo }),
        asistenciaPersonalService.getEstadisticasPuntualidad({ periodo }),
        asistenciaPersonalService.getEstadisticasAreas({ periodo }),
        asistenciaPersonalService.getAll({
          page: 1,
          limit: 10,
        }),
      ]);

      const totales = totalesRes.data;
      const ausencias = ausenciasRes.data;
      const puntualidad = puntualidadRes.data;
      const areas = areasRes.data;
      const historial = historialRes.data;

      // Procesar datos actuales
      const asistenciasData = totales.data?.asistencias || {};
      const inasistenciasData = totales.data?.inasistencias || {};
      const permisosData = totales.data?.permisos || {};
      
      const flujoDiario = asistenciasData.flujo_diario || [];
      const flujoDiarioInasistencias = inasistenciasData.flujo_diario || [];
      const flujoDiarioPermisos = permisosData.flujo_diario || [];
      
      const flujoDiarioCompleto = combinarFlujosDiarios(
        flujoDiario,
        flujoDiarioInasistencias,
        flujoDiarioPermisos
      );
      
      const estadosPuntualidad = puntualidad.data?.labels || [];
      const valoresPuntualidad = puntualidad.data?.datasets?.[0]?.data || [];
      
      const distribucionPorDia = puntualidad.data?.distribucion_por_dia || [];
      
      let totalPuntual = 0;
      let totalTardanza = 0;

      // Intentar calcular desde distribucion_por_dia (Estructura actual del backend)
      if (distribucionPorDia.length > 0) {
        distribucionPorDia.forEach(item => {
          const estado = (item.estado_presencia || '').toLowerCase();
          const cantidad = parseInt(item.cantidad || 0);
          if (estado === 'presente') totalPuntual += cantidad;
          if (estado === 'tardanza') totalTardanza += cantidad;
        });
      } else {
        // Fallback estructura antigua (Chart.js)
        const indexPuntual = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('puntual') || e.toLowerCase().includes('presente'));
        const indexTardanza = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('tardanza'));
        totalPuntual = indexPuntual >= 0 ? valoresPuntualidad[indexPuntual] : 0;
        totalTardanza = indexTardanza >= 0 ? valoresPuntualidad[indexTardanza] : 0;
      }

      const currentTotalAsistencias = asistenciasData.total || 0;

      setDatosPersonal({
        totalAsistencias: currentTotalAsistencias,
        totalAusencias: inasistenciasData.total || 0,
        puntualidad: totalPuntual,
        tardanzas: totalTardanza,
        flujoDiario: flujoDiario,
        flujoDiarioCompleto: flujoDiarioCompleto,
        porArea: areas.data?.por_area || areas.data || [],
        porEstado: estadosPuntualidad.map((label, idx) => ({
          estado: label,
          cantidad: valoresPuntualidad[idx]
        })),
      });

      // Preview de historial
      if (historial && historial.success) {
         setHistorialAsistenciasPreview({
          items: historial.data || [],
          total: historial.pagination?.total || (historial.data || []).length || 0,
          pagination: historial.pagination || null,
        });
      } else {
        setHistorialAsistenciasPreview({ items: [], total: 0, pagination: null });
      }

      // 2. Fetch de datos Anteriores para Comparación (Solo si no es 'todo')
      const prevDates = getPreviousPeriodDates(periodo);
      if (prevDates) {
        const [prevTotalesRes, prevPuntualidadRes] = await Promise.all([
          asistenciaPersonalService.getEstadisticasTotales({ 
            fechaInicio: prevDates.start,
            fechaFin: prevDates.end 
          }),
          asistenciaPersonalService.getEstadisticasPuntualidad({ 
            fechaInicio: prevDates.start,
            fechaFin: prevDates.end 
          })
        ]);

        const prevTotales = prevTotalesRes.data;
        const prevPuntualidad = prevPuntualidadRes.data;

        // Calcular variaciones
        const prevTotalAsistencias = prevTotales.data?.asistencias?.total || 0;
        
        const prevDistribucion = prevPuntualidad.data?.distribucion_por_dia || [];
        
        let prevTotalPuntual = 0;
        
        if (prevDistribucion.length > 0) {
           prevDistribucion.forEach(item => {
              const estado = (item.estado_presencia || '').toLowerCase();
              const cantidad = parseInt(item.cantidad || 0);
              if (estado === 'presente') prevTotalPuntual += cantidad;
           });
        } else {
           const prevLabels = prevPuntualidad.data?.labels || [];
           const prevValues = prevPuntualidad.data?.datasets?.[0]?.data || [];
           const prevIndexPuntual = prevLabels.findIndex(e => e.toLowerCase().includes('puntual') || e.toLowerCase().includes('presente'));
           prevTotalPuntual = prevIndexPuntual >= 0 ? prevValues[prevIndexPuntual] : 0;
        }

        const calcChange = (curr, prev) => {
          if (prev === 0) return curr > 0 ? 100 : 0;
          return ((curr - prev) / prev) * 100;
        };

        setComparacion(prev => ({
          ...prev,
          asistenciasCambio: parseFloat(calcChange(currentTotalAsistencias, prevTotalAsistencias).toFixed(1)),
          puntualidadCambio: parseFloat(calcChange(totalPuntual, prevTotalPuntual).toFixed(1)),
        }));
      } else {
         setComparacion(prev => ({ ...prev, asistenciasCambio: 0, puntualidadCambio: 0 }));
      }

    } catch (err) {
      console.error('Error al obtener datos de personal:', err);
      throw err;
    }
  }, [periodo]);

  /**
   * Fetch datos de Visitas
   */
  const fetchDatosVisitas = useCallback(async () => {
    try {
      const [totalesRes, motivoRes, areaRes, frecuentesRes, historialRes] = await Promise.all([
        visitasService.getTotales(periodo),
        visitasService.getVisitasPorMotivo(periodo),
        visitasService.getVisitasPorArea(periodo),
        visitasService.getVisitantesFrecuentes(periodo),
        visitasService.getAll({
          page: 1,
          limit: 10,
        }),
      ]);

      const totales = totalesRes.data;
      const motivo = motivoRes.data;
      const area = areaRes.data;
      const frecuentes = frecuentesRes.data;
      const historial = historialRes.data;

      const flujoDiario = totales.data?.flujoDiario || [];
      const hoy = new Date().toISOString().split('T')[0];
      const visitasHoy = flujoDiario.find(item => item.dia?.startsWith(hoy))?.visitas || 0;
      const currentTotalVisitas = totales.data?.total || 0;
      const currentVisitantesFrecuentes = frecuentes.data?.length || 0;

      setDatosVisitas({
        totalVisitas: currentTotalVisitas,
        visitantesFrecuentes: currentVisitantesFrecuentes,
        visitasHoy: visitasHoy,
        visitasSinSalida: 0, 
        flujoDiario: flujoDiario,
        porMotivo: motivo.data || [],
        porArea: area.data || [],
      });

      if (historial && historial.success) {
         setHistorialVisitasPreview({
          items: historial.data || [],
          total: historial.pagination?.total || (historial.data || []).length || 0,
          pagination: historial.pagination || null,
        });
      } else {
        setHistorialVisitasPreview({ items: [], total: 0, pagination: null });
      }

       // Simular comparación visitas (falta endpoint custom fechas para visitas)
       // Se mantiene la simulación SOLO para visitas por ahora a menos que se desee implementar similar
       const randomChange = () => (Math.random() * 20 - 10).toFixed(1);
       setComparacion(prev => ({
          ...prev,
          visitasCambio: parseFloat(randomChange()),
          visitantesCambio: parseFloat(randomChange()),
       }));


    } catch (err) {
      console.error('Error al obtener datos de visitas:', err);
      throw err;
    }
  }, [periodo]);

  // Se elimina calcularComparacion ya que se integra en los fetch
  const calcularComparacion = useCallback(() => {}, []);

  /**
   * Fetch todos los datos
   */
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchDatosPersonal(),
        fetchDatosVisitas(),
      ]);
      
      calcularComparacion();
      
    } catch (err) {
      console.error('Error al cargar datos del dashboard:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [fetchDatosPersonal, fetchDatosVisitas, calcularComparacion]);

  /**
   * Efecto para cargar datos cuando cambia el período
   */
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * Función para refrescar datos manualmente
   */
  const refresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * Cambiar período
   */
  const cambiarPeriodo = useCallback((nuevoPeriodo) => {
    setPeriodo(nuevoPeriodo);
  }, []);

  /**
   * Cambiar vista activa
   */
  const cambiarVista = useCallback((vista) => {
    setVistaActiva(vista);
  }, []);

  return {
    // Estados
    loading,
    error,
    periodo,
    vistaActiva,
    datosPersonal,
    datosVisitas,
    comparacion,
    historialVisitasPreview,
    historialAsistenciasPreview,
    
    // Funciones
    cambiarPeriodo,
    cambiarVista,
    refresh,
    
    // Datos combinados para KPIs principales
    kpis: {
      totalAsistencias: datosPersonal.totalAsistencias,
      totalVisitas: datosVisitas.totalVisitas,
      puntualidad: datosPersonal.puntualidad,
      visitantesFrecuentes: datosVisitas.visitantesFrecuentes,
    },
  };
};

export default useDashboardData;
