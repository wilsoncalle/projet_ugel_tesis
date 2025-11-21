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
  const fetchDatosPersonal = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch paralelo de todas las estadísticas de personal
      const [totalesRes, ausenciasRes, puntualidadRes, areasRes, historialRes] = await Promise.all([
        fetch(`/api/asistencia-personal/estadisticas/totales?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/asistencia-personal/estadisticas/ausencias?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/asistencia-personal/estadisticas/puntualidad?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/asistencia-personal/estadisticas/areas?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        asistenciaPersonalService.getAll({
          page: 1,
          limit: 10,
        }),
      ]);

      const totales = await totalesRes.json();
      const ausencias = await ausenciasRes.json();
      const puntualidad = await puntualidadRes.json();
      const areas = await areasRes.json();
      const historial = historialRes.data;

      // Procesar datos - Nueva estructura con asistencias/inasistencias/permisos
      const asistenciasData = totales.data?.asistencias || {};
      const inasistenciasData = totales.data?.inasistencias || {};
      const permisosData = totales.data?.permisos || {};
      
      const flujoDiario = asistenciasData.flujo_diario || [];
      const flujoDiarioInasistencias = inasistenciasData.flujo_diario || [];
      const flujoDiarioPermisos = permisosData.flujo_diario || [];
      
      // Combinar todos los flujos diarios por fecha
      const flujoDiarioCompleto = combinarFlujosDiarios(
        flujoDiario,
        flujoDiarioInasistencias,
        flujoDiarioPermisos
      );
      
      const estadosPuntualidad = puntualidad.data?.labels || [];
      const valoresPuntualidad = puntualidad.data?.datasets?.[0]?.data || [];
      
      // Calcular puntualidad y tardanzas
      const indexPuntual = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('puntual'));
      const indexTardanza = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('tardanza'));
      
      const totalPuntual = indexPuntual >= 0 ? valoresPuntualidad[indexPuntual] : 0;
      const totalTardanza = indexTardanza >= 0 ? valoresPuntualidad[indexTardanza] : 0;

      setDatosPersonal({
        totalAsistencias: asistenciasData.total || 0,
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

      // Preview de historial de asistencias (primeras 10 filas según backend)
      if (historial && historial.success) {
        const items = historial.data || [];
        setHistorialAsistenciasPreview({
          items,
          total: historial.pagination?.total || items.length || 0,
          pagination: historial.pagination || null,
        });
      } else {
        setHistorialAsistenciasPreview({ items: [], total: 0, pagination: null });
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
      const token = localStorage.getItem('token');
      
      // Fetch paralelo de todas las estadísticas de visitas
      const [totalesRes, motivoRes, areaRes, frecuentesRes, historialRes] = await Promise.all([
        fetch(`/api/visitas/totales?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/visitas/por-motivo?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/visitas/por-area?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/visitas/visitantes-frecuentes?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        visitasService.getAll({
          page: 1,
          limit: 10,
        }),
      ]);

      const totales = await totalesRes.json();
      const motivo = await motivoRes.json();
      const area = await areaRes.json();
      const frecuentes = await frecuentesRes.json();
      const historial = historialRes.data;

      const flujoDiario = totales.data?.flujoDiario || [];
      
      // Calcular visitas de hoy del flujo diario
      const hoy = new Date().toISOString().split('T')[0];
      const visitasHoy = flujoDiario.find(item => item.dia?.startsWith(hoy))?.visitas || 0;

      setDatosVisitas({
        totalVisitas: totales.data?.total || 0,
        visitantesFrecuentes: frecuentes.data?.length || 0,
        visitasHoy: visitasHoy,
        visitasSinSalida: 0, // Este dato no está disponible en el endpoint actual
        flujoDiario: flujoDiario,
        porMotivo: motivo.data || [],
        porArea: area.data || [],
      });

      // Preview de historial de visitas (primeras 10 filas según backend)
      if (historial && historial.success) {
        const items = historial.data || [];
        setHistorialVisitasPreview({
          items,
          total: historial.pagination?.total || items.length || 0,
          pagination: historial.pagination || null,
        });
      } else {
        setHistorialVisitasPreview({ items: [], total: 0, pagination: null });
      }

    } catch (err) {
      console.error('Error al obtener datos de visitas:', err);
      throw err;
    }
  }, [periodo]);

  /**
   * Calcular comparación con período anterior
   */
  const calcularComparacion = useCallback(() => {
    // Simulación de comparación (en producción, esto vendría del backend)
    // Por ahora, generamos cambios aleatorios para demostración
    const randomChange = () => (Math.random() * 20 - 10).toFixed(1);
    
    setComparacion({
      asistenciasCambio: parseFloat(randomChange()),
      visitasCambio: parseFloat(randomChange()),
      puntualidadCambio: parseFloat(randomChange()),
      visitantesCambio: parseFloat(randomChange()),
    });
  }, []);

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
