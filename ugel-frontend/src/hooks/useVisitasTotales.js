import { useState, useEffect } from 'react';

const useVisitasTotales = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [totalVisitas, setTotalVisitas] = useState(0);

  useEffect(() => {
    const fetchVisitasTotales = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:3000/api/visitas/totales?periodo=${periodo}`,
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
          const flujoDiario = result.data.flujoDiario || [];
          const total = result.data.total || 0;

          // Formatear datos para el gráfico
          const labels = flujoDiario.map(item => {
            const fecha = new Date(item.dia);
            return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          });

          const values = flujoDiario.map(item => parseInt(item.visitas, 10));

          setData({
            labels,
            datasets: [{
              label: 'Visitas',
              data: values
            }]
          });

          setTotalVisitas(total);
        }
      } catch (err) {
        console.error('Error al obtener estadísticas totales:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitasTotales();
  }, [periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo,
    totalVisitas
  };
};

export default useVisitasTotales;

