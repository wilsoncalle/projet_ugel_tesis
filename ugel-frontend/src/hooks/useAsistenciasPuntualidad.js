import { useState, useEffect } from 'react';

const useAsistenciasPuntualidad = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');

  useEffect(() => {
    const fetchAsistenciasPuntualidad = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/asistencia-personal/estadisticas/puntualidad?periodo=${periodo}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Error al obtener estadísticas de puntualidad');
        }

        const result = await response.json();

        if (result.success && result.data) {
          const distribucionPorDia = result.data.distribucion_por_dia || result.data.distribucion || [];
          
          // Agrupar por estado de presencia sumando todas las cantidades
          const agrupado = distribucionPorDia.reduce((acc, item) => {
            const estado = item.estado_presencia;
            if (!acc[estado]) {
              acc[estado] = 0;
            }
            acc[estado] += parseInt(item.cantidad, 10);
            return acc;
          }, {});
          
          // Formatear datos para el gráfico de pie
          const labels = Object.keys(agrupado);
          const values = Object.values(agrupado);

          setData({
            labels,
            datasets: [{
              label: 'Asistencias',
              data: values
            }]
          });
        }
      } catch (err) {
        console.error('Error al obtener estadísticas de puntualidad:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsistenciasPuntualidad();
  }, [periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo
  };
};

export default useAsistenciasPuntualidad;
