import { useState, useEffect } from 'react';

const useAsistenciasTotales = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [totalAsistencias, setTotalAsistencias] = useState(0);

  useEffect(() => {
    const fetchAsistenciasTotales = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/asistencia-personal/estadisticas/totales?periodo=${periodo}`,
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
          // Transformar los datos al formato esperado por el gráfico de líneas
          const flujoDiario = result.data.flujo_diario || result.data.flujoDiario || [];
          const total = result.data.total || 0;

          // Formatear datos para el gráfico
          const labels = flujoDiario.map(item => {
            const fecha = new Date(item.dia);
            return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          });

          const values = flujoDiario.map(item => parseInt(item.asistencias, 10));

          setData({
            labels,
            datasets: [{
              label: 'Asistencias',
              data: values
            }]
          });

          setTotalAsistencias(total);
        }
      } catch (err) {
        console.error('Error al obtener estadísticas totales:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsistenciasTotales();
  }, [periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo,
    totalAsistencias
  };
};

export default useAsistenciasTotales;
