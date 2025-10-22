import { useState, useEffect, useCallback } from 'react';
import { visitasService } from '../services/api';

const useVisitasPersonal = (initialPeriod = 'mes') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(initialPeriod);
  const [totalVisitas, setTotalVisitas] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitasService.getVisitasPorPersonal(periodo);
      if (response.data.success) {
        const datos = response.data.data;
        
        // Calcular total de visitas
        const total = datos.reduce((sum, item) => sum + parseInt(item.visitas), 0);
        setTotalVisitas(total);
        
        // Transformar datos para Chart.js Doughnut
        const chartData = {
          labels: datos.map(item => item.nombre_personal),
          datasets: [{
            data: datos.map(item => parseInt(item.visitas))
          }]
        };
        
        setData(chartData);
      } else {
        setError(response.data.message || 'Error al cargar estadísticas por personal');
      }
    } catch (err) {
      console.error('Error fetching visitas por personal:', err);
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

export default useVisitasPersonal;

