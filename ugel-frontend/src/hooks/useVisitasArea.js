import { useState, useEffect, useCallback } from 'react';
import { visitasService } from '../services/api';

/**
 * Custom hook para manejar estadísticas de visitas por área
 * @returns {Object} Estado y funciones para manejar las estadísticas
 */
const useVisitasArea = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('todo');

  // Función para obtener datos del backend
  const fetchData = useCallback(async (periodoSeleccionado) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[useVisitasArea] Obteniendo datos para periodo: ${periodoSeleccionado}`);
      
      // Llamar al endpoint del backend
      const response = await fetch(`http://localhost:3000/api/visitas/por-area?periodo=${periodoSeleccionado}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('[useVisitasArea] Datos obtenidos:', result.data);
        setData(result.data || []);
      } else {
        throw new Error(result.message || 'Error al obtener estadísticas');
      }
      
    } catch (err) {
      console.error('[useVisitasArea] Error obteniendo datos:', err);
      setError(err.message || 'Error al cargar estadísticas');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos cuando cambie el periodo
  useEffect(() => {
    fetchData(periodo);
  }, [periodo, fetchData]);

  // Función para cambiar el periodo
  const handlePeriodoChange = useCallback((nuevoPeriodo) => {
    console.log(`[useVisitasArea] Cambiando periodo de ${periodo} a ${nuevoPeriodo}`);
    setPeriodo(nuevoPeriodo);
  }, [periodo]);

  // Función para recargar datos manualmente
  const reload = useCallback(() => {
    fetchData(periodo);
  }, [fetchData, periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo: handlePeriodoChange,
    reload
  };
};

export default useVisitasArea;
