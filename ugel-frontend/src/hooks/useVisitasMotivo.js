import { useState, useEffect, useCallback } from 'react';
import { visitasService } from '../services/api';

const useVisitasMotivo = (initialPeriod = 'todo') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(initialPeriod);
  const [totalVisitas, setTotalVisitas] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitasService.getVisitasPorMotivo(periodo);
      if (response.data.success) {
        const datos = response.data.data;
        
        // Calcular total de visitas
        const total = datos.reduce((sum, item) => sum + parseInt(item.count), 0);
        setTotalVisitas(total);
        
        // Transformar datos para Chart.js Doughnut
        const chartData = {
          labels: datos.map(item => item.nombre_motivo),
          datasets: [{
            data: datos.map(item => parseInt(item.count)),
            porcentajes: datos.map(item => parseFloat(item.porcentaje))
          }]
        };
        
        setData(chartData);
      } else {
        setError(response.data.message || 'Error al cargar estadísticas por motivo');
      }
    } catch (err) {
      console.error('Error fetching visitas por motivo:', err);
      setError('No se pudieron cargar las estadísticas. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { 
    data, 
    loading, 
    error, 
    periodo, 
    setPeriodo, 
    totalVisitas,
    refetch: fetchData 
  };
};

export default useVisitasMotivo;
