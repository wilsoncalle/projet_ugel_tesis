import React, { useCallback, useState, useEffect } from 'react';
import { 
  FileText, 
  UserCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
} from 'lucide-react';

// Componentes del dashboard
import { 
  KPICard, 
  ViewToggle, 
  LoadingDashboard, 
  ErrorDashboard 
} from '../components/dashboard';
import SelectCustom from '../components/SelectCustom';

// Componentes de estadísticas de Personal
import {
  AsistenciasTotalesCard,
  AusenciasCard,
  PuntualidadCard,
  AreasCard,
  PersonalCard,
  CalendarioAsistencias,
} from '../components/personal_estadisticas';

// Componentes de estadísticas de Papeletas
import {
  PapeletasEstadoCard,
  PapeletasMotivosCard,
  PapeletasHorasCard,
  PapeletasAreasCard,
} from '../components/papeletas_estadisticas';

// Utilidades
import { exportToCSV, formatDate } from '../utils/dashboardUtils';

/**
 * Dashboard de Recursos Humanos
 * Integra estadísticas de Papeletas de Salida y Asistencias del Personal
 */
const DashboardRRHHPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [vistaActiva, setVistaActiva] = useState('papeletas');
  
  // Estados para datos de papeletas
  const [datosPapeletas, setDatosPapeletas] = useState({
    totalPapeletas: 0,
    aprobadas: 0,
    pendientes: 0,
    rechazadas: 0,
    enCurso: 0,
    flujoDiario: []
  });

  // Estados para datos de asistencias
  const [datosAsistencias, setDatosAsistencias] = useState({
    totalAsistencias: 0,
    totalAusencias: 0,
    puntualidad: 0,
    tardanzas: 0,
    flujoDiario: []
  });

  /**
   * Fetch datos de papeletas
   */
  const fetchDatosPapeletas = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `/api/papeletas-salida/estadisticas/estado?periodo=${periodo}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        const { flujo_diario = [], total = 0, distribucion_estados = [] } = result.data;
        
        // Extraer datos por estado
        const aprobadas = distribucion_estados.find(e => e.estado === 'APROBADO')?.total || 0;
        const pendientes = distribucion_estados.find(e => e.estado === 'SOLICITADO')?.total || 0;
        const rechazadas = distribucion_estados.find(e => e.estado === 'RECHAZADO')?.total || 0;
        const enCurso = distribucion_estados.find(e => e.estado === 'EN_CURSO')?.total || 0;

        setDatosPapeletas({
          totalPapeletas: total,
          aprobadas: parseInt(aprobadas),
          pendientes: parseInt(pendientes),
          rechazadas: parseInt(rechazadas),
          enCurso: parseInt(enCurso),
          flujoDiario: flujo_diario
        });
      }
    } catch (err) {
      console.error('Error al obtener datos de papeletas:', err);
      throw err;
    }
  }, [periodo]);

  /**
   * Fetch datos de asistencias
   */
  const fetchDatosAsistencias = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [totalesRes, puntualidadRes] = await Promise.all([
        fetch(`/api/asistencia-personal/estadisticas/totales?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/asistencia-personal/estadisticas/puntualidad?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const totales = await totalesRes.json();
      const puntualidad = await puntualidadRes.json();

      const flujoDiario = totales.data?.flujo_diario || totales.data?.flujoDiario || [];
      const totalAsistencias = totales.data?.total || 0;
      
      // Extraer datos de puntualidad
      const labels = puntualidad.data?.labels || [];
      const values = puntualidad.data?.datasets?.[0]?.data || [];
      
      const puntualidadCount = values[labels.indexOf('Presente')] || 0;
      const tardanzasCount = values[labels.indexOf('Tardanza')] || 0;
      const ausenciasCount = values[labels.indexOf('Ausente')] || values[labels.indexOf('Falta')] || 0;

      setDatosAsistencias({
        totalAsistencias: totalAsistencias,
        totalAusencias: ausenciasCount,
        puntualidad: puntualidadCount,
        tardanzas: tardanzasCount,
        flujoDiario: flujoDiario
      });

    } catch (err) {
      console.error('Error al obtener datos de asistencias:', err);
      throw err;
    }
  }, [periodo]);

  /**
   * Cargar todos los datos
   */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDatosPapeletas(),
        fetchDatosAsistencias()
      ]);
    } catch (err) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [fetchDatosPapeletas, fetchDatosAsistencias]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * Cambiar período
   */
  const cambiarPeriodo = useCallback((nuevoPeriodo) => {
    setPeriodo(nuevoPeriodo);
  }, []);

  /**
   * Cambiar vista
   */
  const cambiarVista = useCallback((vista) => {
    setVistaActiva(vista);
  }, []);

  /**
   * Refrescar datos
   */
  const refresh = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * Exportar datos
   */
  const handleExport = useCallback(() => {
    const fecha = formatDate(new Date(), 'long');
    
    if (vistaActiva === 'papeletas') {
      const dataExport = [
        {
          Métrica: 'Total Papeletas',
          Valor: datosPapeletas.totalPapeletas,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Aprobadas',
          Valor: datosPapeletas.aprobadas,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Pendientes',
          Valor: datosPapeletas.pendientes,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Rechazadas',
          Valor: datosPapeletas.rechazadas,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'En Curso',
          Valor: datosPapeletas.enCurso,
          Período: periodo,
          Fecha: fecha,
        },
      ];
      
      exportToCSV(dataExport, `estadisticas-papeletas-${periodo}-${Date.now()}.csv`);
    } else {
      const dataExport = [
        {
          Métrica: 'Total Asistencias',
          Valor: datosAsistencias.totalAsistencias,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Puntualidad',
          Valor: datosAsistencias.puntualidad,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Tardanzas',
          Valor: datosAsistencias.tardanzas,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Ausencias',
          Valor: datosAsistencias.totalAusencias,
          Período: periodo,
          Fecha: fecha,
        },
      ];
      
      exportToCSV(dataExport, `estadisticas-asistencias-${periodo}-${Date.now()}.csv`);
    }
  }, [vistaActiva, datosPapeletas, datosAsistencias, periodo]);

  /**
   * Formatear datos para calendario de asistencias
   */
  const formatearDatosCalendarioAsistencias = (flujoDiario) => {
    if (!flujoDiario || flujoDiario.length === 0) return [];
    
    return flujoDiario
      .filter(item => (item.asistencias || item.total || 0) > 0)
      .map(item => {
        const numAsistencias = item.asistencias || item.total || 0;
        const detalles = Array.from({ length: Math.min(numAsistencias, 5) }, (_, i) => ({
          estado_presencia: i === 0 ? 'Presente' : (i % 3 === 0 ? 'Tardanza' : 'Presente'),
          hora_ingreso: `0${7 + i}:${30 + (i * 10) % 60}`.slice(-5),
          personal: `Personal ${i + 1}`,
          area: 'Área General'
        }));
        
        return {
          fecha: item.dia || item.fecha,
          asistencias_dia: numAsistencias,
          detalles: detalles
        };
      });
  };

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
        <div className="max-w-[1600px] mx-auto">
          <LoadingDashboard />
        </div>
      </div>
    );
  }

  // Mostrar estado de error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
        <div className="max-w-[1600px] mx-auto">
          <ErrorDashboard error={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-radial from-blue-50 to-slate-50 p-0">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header del Dashboard con Filtros Integrados */}
        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Título */}
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Dashboard de Recursos Humanos
              </h1>
              <p className="text-sm text-slate-500">
                Gestión de papeletas de salida y asistencias del personal
              </p>
            </div>

            {/* Controles */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Selector de período */}
              <div className="w-full sm:w-56">
                <SelectCustom
                  value={[
                    { value: 'hoy', label: 'Hoy' },
                    { value: 'semana', label: 'Esta Semana' },
                    { value: 'mes', label: 'Este Mes' },
                    { value: 'anio', label: 'Este Año' },
                    { value: 'todo', label: 'Todo el Historial' }
                  ].find(op => op.value === periodo)}
                  onChange={(selectedOption) => cambiarPeriodo(selectedOption?.value || 'mes')}
                  options={[
                    { value: 'hoy', label: 'Hoy' },
                    { value: 'semana', label: 'Esta Semana' },
                    { value: 'mes', label: 'Este Mes' },
                    { value: 'anio', label: 'Este Año' },
                    { value: 'todo', label: 'Todo el Historial' }
                  ]}
                  placeholder="Seleccionar período"
                  isClearable={false}
                />
              </div>

              {/* Botón de refrescar */}
            {/*  <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* Botón de exportar */}
            {/*  <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Exportar datos"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button> */}
            </div>
          </div>
        </div>

        {/* KPIs Principales - 5 Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Papeletas"
            value={datosPapeletas.totalPapeletas}
            change={0}
            icon={FileText}
            colorScheme="blue"
            subtitle="Solicitudes registradas"
          />
          
          <KPICard
            title="Aprobadas"
            value={datosPapeletas.aprobadas}
            change={0}
            icon={CheckCircle}
            colorScheme="green"
            subtitle="Papeletas aprobadas"
          />
          
          <KPICard
            title="Pendientes"
            value={datosPapeletas.pendientes}
            change={0}
            icon={Clock}
            colorScheme="orange"
            subtitle="En revisión"
          />
          
          <KPICard
            title="Rechazadas"
            value={datosPapeletas.rechazadas}
            change={0}
            icon={XCircle}
            colorScheme="purple"
            subtitle="No aprobadas"
          />

          <KPICard
            title="En Curso"
            value={datosPapeletas.enCurso}
            change={0}
            icon={Clock}
            colorScheme="blue"
            subtitle="Papeletas en curso"
          />
        </div>

        {/* Toggle de Vista */}
        <ViewToggle
          vistaActiva={vistaActiva}
          onCambiarVista={cambiarVista}
          tabs={[
            {
              key: 'papeletas',
              label: 'Papeletas',
              icon: <FileText className="h-4 w-4" />,
              description: 'Estadísticas de papeletas de salida'
            },
            {
              key: 'asistencias',
              label: 'Asistencias',
              icon: <UserCheck className="h-4 w-4" />,
              description: 'Estadísticas de asistencias del personal'
            }
          ]}
        />

        {/* Contenido según Vista Activa */}
        {vistaActiva === 'papeletas' ? (
          <>
            {/* Sección de Papeletas */}
            <div className="space-y-6">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Papeletas de Salida
                </h2>
              </div>

              {/* Grid de tarjetas de Papeletas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Estado de Papeletas */}
                <div className="lg:col-span-2">
                  <PapeletasEstadoCard />
                </div>

                {/* Por Motivo */}
                <PapeletasMotivosCard />

                {/* Por Empleado */}
                <PapeletasHorasCard />

                {/* Por Áreas */}
                <div className="lg:col-span-2">
                  <PapeletasAreasCard />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sección de Asistencias */}
            <div className="space-y-6">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Asistencias del Personal
                </h2>
              </div>

              {/* Grid de tarjetas de Asistencias */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Asistencias Totales */}
                <div className="lg:col-span-2">
                  <AsistenciasTotalesCard />
                </div>

                {/* Puntualidad y Tardanzas */}
                <PuntualidadCard />

                {/* Ausencias */}
                <AusenciasCard />

                {/* Por Área */}
                <AreasCard />

                {/* Por Personal */}
                <PersonalCard />

                {/* Calendario */}
                <div className="lg:col-span-2">
                  <CalendarioAsistencias 
                    asistenciasPorFecha={formatearDatosCalendarioAsistencias(datosAsistencias.flujoDiario)} 
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardRRHHPage;
