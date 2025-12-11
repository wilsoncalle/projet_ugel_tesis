import { useState, useEffect } from 'react';

const useAsistenciasAusencias = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');

  useEffect(() => {
    const fetchAsistenciasAusencias = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `/api/papeletas-salida/estadisticas/motivos?periodo=${periodo}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Error al obtener estadísticas de salidas');
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Adaptar respuesta del endpoint de papeletas (por_motivo)
          const porTipo = result.data.por_motivo || result.data.por_tipo || [];
          
          // Formatear datos para el gráfico de pie
          const labels = porTipo.map(item => item.nombre_motivo || item.tipo_ausencia);
          const values = porTipo.map(item => parseInt(item.total || item.cantidad, 10));

          setData({
            labels,
            datasets: [{
              label: 'Ausencias',
              data: values
            }]
          });
        }
      } catch (err) {
        console.error('Error al obtener estadísticas de salidas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAsistenciasAusencias();
  }, [periodo]);

  return {
    data,
    loading,
    error,
    periodo,
    setPeriodo
  };
};

export default useAsistenciasAusencias;
