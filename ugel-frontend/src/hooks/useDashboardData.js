import { useState, useEffect, useCallback } from 'react';

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
      const [totalesRes, ausenciasRes, puntualidadRes, areasRes] = await Promise.all([
        fetch(`http://localhost:3000/api/asistencia-personal/estadisticas/totales?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/api/asistencia-personal/estadisticas/ausencias?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/api/asistencia-personal/estadisticas/puntualidad?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/api/asistencia-personal/estadisticas/areas?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      const totales = await totalesRes.json();
      const ausencias = await ausenciasRes.json();
      const puntualidad = await puntualidadRes.json();
      const areas = await areasRes.json();

      // Procesar datos
      const flujoDiario = totales.data?.flujo_diario || totales.data?.flujoDiario || [];
      const estadosPuntualidad = puntualidad.data?.labels || [];
      const valoresPuntualidad = puntualidad.data?.datasets?.[0]?.data || [];
      
      // Calcular puntualidad y tardanzas
      const indexPuntual = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('puntual'));
      const indexTardanza = estadosPuntualidad.findIndex(e => e.toLowerCase().includes('tardanza'));
      
      const totalPuntual = indexPuntual >= 0 ? valoresPuntualidad[indexPuntual] : 0;
      const totalTardanza = indexTardanza >= 0 ? valoresPuntualidad[indexTardanza] : 0;

      setDatosPersonal({
        totalAsistencias: totales.data?.total || 0,
        totalAusencias: ausencias.data?.total || 0,
        puntualidad: totalPuntual,
        tardanzas: totalTardanza,
        flujoDiario: flujoDiario,
        porArea: areas.data || [],
        porEstado: estadosPuntualidad.map((label, idx) => ({
          estado: label,
          cantidad: valoresPuntualidad[idx]
        })),
      });

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
      
      // Helper para hacer fetch con manejo de errores
      const fetchSafe = async (url) => {
        try {
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
            console.warn(`Endpoint no disponible: ${url}`);
            return { success: false, data: null };
          }
          return await response.json();
        } catch (error) {
          console.warn(`Error en endpoint: ${url}`, error);
          return { success: false, data: null };
        }
      };
      
      // Fetch paralelo de todas las estadísticas de visitas
      const [totales, motivo, area, frecuentes] = await Promise.all([
        fetchSafe(`http://localhost:3000/api/visitas/estadisticas/totales?periodo=${periodo}`),
        fetchSafe(`http://localhost:3000/api/visitas/estadisticas/motivo?periodo=${periodo}`),
        fetchSafe(`http://localhost:3000/api/visitas/estadisticas/area?periodo=${periodo}`),
        fetchSafe(`http://localhost:3000/api/visitas/estadisticas/visitantes-frecuentes?periodo=${periodo}`),
      ]);

      const flujoDiario = totales.data?.flujo_diario || totales.data?.flujoDiario || [];

      setDatosVisitas({
        totalVisitas: totales.data?.total || 0,
        visitantesFrecuentes: frecuentes.data?.length || 0,
        visitasHoy: totales.data?.hoy || 0,
        visitasSinSalida: totales.data?.sin_salida || 0,
        flujoDiario: flujoDiario,
        porMotivo: motivo.data || [],
        porArea: area.data || [],
      });

    } catch (err) {
      console.error('Error al obtener datos de visitas:', err);
      // No lanzar error, solo registrar
      setDatosVisitas({
        totalVisitas: 0,
        visitantesFrecuentes: 0,
        visitasHoy: 0,
        visitasSinSalida: 0,
        flujoDiario: [],
        porMotivo: [],
        porArea: [],
      });
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
