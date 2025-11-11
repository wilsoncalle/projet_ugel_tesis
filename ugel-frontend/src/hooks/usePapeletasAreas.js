import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para estadísticas de áreas y colaboradores con más papeletas
 */
const usePapeletasAreas = (initialPeriod = 'mes') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(initialPeriod);
  const [porPersona, setPorPersona] = useState([]);

  // Calcular fechas según el período
  const calcularFechas = useCallback((periodo) => {
    const hoy = new Date();
    let fechaInicio, fechaFin;

    switch (periodo) {
      case 'hoy':
        fechaInicio = fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        fechaInicio = inicioSemana.toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'anio':
        fechaInicio = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0];
        fechaFin = hoy.toISOString().split('T')[0];
        break;
      case 'todo':
      default:
        fechaInicio = null;
        fechaFin = null;
        break;
    }

    return { fechaInicio, fechaFin };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { fechaInicio, fechaFin } = calcularFechas(periodo);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      params.append('periodo', periodo);

      const response = await fetch(
        `/api/papeletas-salida/estadisticas/areas?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const { por_area } = result.data;
        
        // Transformar datos al formato esperado por EstadisticasCard
        const transformedData = por_area.map(item => ({
          nombre_area: item.nombre_area,
          papeletas: parseInt(item.total_papeletas)
        }));
        
        setData(transformedData);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas de áreas:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [periodo, calcularFechas]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo,
    refetch: fetchData
  };
};

export default usePapeletasAreas;
