import { useState, useEffect, useCallback } from 'react';
import { visitasService } from '../services/api';

const useVisitantesFrecuentes = (initialPeriod = 'mes') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(initialPeriod);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await visitasService.getVisitantesFrecuentes(periodo);
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.message || 'Error al cargar visitantes frecuentes');
      }
    } catch (err) {
      console.error('Error fetching visitantes frecuentes:', err);
      setError('No se pudieron cargar los visitantes frecuentes. Intente nuevamente.');
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
    refetch: fetchData 
  };
};

export default useVisitantesFrecuentes;

