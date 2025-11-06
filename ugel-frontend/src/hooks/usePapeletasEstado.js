import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para estadísticas de estado de papeletas
 * Retorna distribución por estado y flujo diario
 */
const usePapeletasEstado = (initialPeriod = 'mes') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(initialPeriod);
  const [totalPapeletas, setTotalPapeletas] = useState(0);

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
        `http://localhost:3000/api/papeletas-salida/estadisticas/estado?${params.toString()}`,
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
        const { flujo_diario, total } = result.data;

        // Transformar datos al formato Chart.js para gráfico de líneas
        const labels = flujo_diario.map(item => {
          const fecha = new Date(item.dia);
          return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
        });

        const values = flujo_diario.map(item => parseInt(item.total, 10));

        const chartData = {
          labels,
          datasets: [{
            label: 'Papeletas',
            data: values
          }]
        };

        setData(chartData);
        setTotalPapeletas(total);
      }
    } catch (err) {
      console.error('Error al obtener estadísticas de estado:', err);
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
    totalPapeletas,
    refetch: fetchData
  };
};

export default usePapeletasEstado;
