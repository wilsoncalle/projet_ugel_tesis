import { useState, useEffect } from 'react';

const useAsistenciasTotales = () => {
  const [dataAsistencias, setDataAsistencias] = useState(null);
  const [dataInasistencias, setDataInasistencias] = useState(null);
  const [dataPermisos, setDataPermisos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [totalAsistencias, setTotalAsistencias] = useState(0);
  const [totalInasistencias, setTotalInasistencias] = useState(0);
  const [totalPermisos, setTotalPermisos] = useState(0);

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
          // Procesar datos de ASISTENCIAS
          const asistencias = result.data.asistencias || {};
          const flujoDiarioAsistencias = asistencias.flujo_diario || [];
          const labelsAsistencias = flujoDiarioAsistencias.map(item => {
            const fecha = new Date(item.dia);
            return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          });
          const valuesAsistencias = flujoDiarioAsistencias.map(item => parseInt(item.asistencias, 10));

          setDataAsistencias({
            labels: labelsAsistencias,
            datasets: [{
              label: 'Asistencias',
              data: valuesAsistencias
            }]
          });
          setTotalAsistencias(asistencias.total || 0);

          // Procesar datos de INASISTENCIAS
          const inasistencias = result.data.inasistencias || {};
          const flujoDiarioInasistencias = inasistencias.flujo_diario || [];
          const labelsInasistencias = flujoDiarioInasistencias.map(item => {
            const fecha = new Date(item.dia);
            return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          });
          const valuesInasistencias = flujoDiarioInasistencias.map(item => parseInt(item.inasistencias, 10));

          setDataInasistencias({
            labels: labelsInasistencias,
            datasets: [{
              label: 'Inasistencias',
              data: valuesInasistencias
            }]
          });
          setTotalInasistencias(inasistencias.total || 0);

          // Procesar datos de PERMISOS
          const permisos = result.data.permisos || {};
          const flujoDiarioPermisos = permisos.flujo_diario || [];
          const labelsPermisos = flujoDiarioPermisos.map(item => {
            const fecha = new Date(item.dia);
            return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
          });
          const valuesPermisos = flujoDiarioPermisos.map(item => parseInt(item.permisos, 10));

          setDataPermisos({
            labels: labelsPermisos,
            datasets: [{
              label: 'Permisos',
              data: valuesPermisos
            }]
          });
          setTotalPermisos(permisos.total || 0);
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
    dataAsistencias,
    dataInasistencias,
    dataPermisos,
    loading,
    error,
    periodo,
    setPeriodo,
    totalAsistencias,
    totalInasistencias,
    totalPermisos
  };
};

export default useAsistenciasTotales;
