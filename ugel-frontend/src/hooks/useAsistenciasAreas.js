import { useState, useEffect } from 'react';

const useAsistenciasAreas = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');

  useEffect(() => {
    const fetchAsistenciasAreas = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/asistencia-personal/estadisticas/areas?periodo=${periodo}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Error al obtener estadísticas por áreas');
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Extraer el array por_area
          const porArea = result.data.por_area || [];
          setData(porArea);
        }
      } catch (err) {
        console.error('Error al obtener estadísticas por áreas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsistenciasAreas();
  }, [periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo
  };
};

export default useAsistenciasAreas;
