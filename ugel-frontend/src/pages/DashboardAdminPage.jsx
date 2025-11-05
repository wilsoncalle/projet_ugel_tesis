import React, { useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  AlertCircle
} from 'lucide-react';

// Hooks
import useDashboardData from '../hooks/useDashboardData';

// Componentes del dashboard
import { 
  KPICard, 
  DashboardFilters, 
  ViewToggle, 
  LoadingDashboard, 
  ErrorDashboard 
} from '../components/dashboard';

// Componentes de estadísticas de Personal
import {
  AsistenciasTotalesCard,
  AusenciasCard,
  PuntualidadCard,
  AreasCard,
  PersonalCard,
  CalendarioAsistencias,
} from '../components/personal_estadisticas';

// Componentes de estadísticas de Visitas
import {
  VisitasTotalesCard,
  VisitasMotivoCard,
  VisitasAreaCard,
  VisitasPersonalCard,
  VisitantesFrecuentesCard,
  CalendarioVisitas,
} from '../components/vigilante_estadisticas';

// Utilidades
import { exportToCSV, formatDate } from '../utils/dashboardUtils';

/**
 * Dashboard Administrativo Principal
 * Integra estadísticas de Personal y Visitas en una vista unificada
 */
const DashboardAdminPage = () => {
  const {
    loading,
    error,
    periodo,
    vistaActiva,
    datosPersonal,
    datosVisitas,
    comparacion,
    kpis,
    cambiarPeriodo,
    cambiarVista,
    refresh,
  } = useDashboardData();

  /**
   * Maneja la exportación de datos
   */
  const handleExport = useCallback(() => {
    const fecha = formatDate(new Date(), 'long');
    
    if (vistaActiva === 'personal') {
      const dataExport = [
        {
          Métrica: 'Total Asistencias',
          Valor: datosPersonal.totalAsistencias,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Total Ausencias',
          Valor: datosPersonal.totalAusencias,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Puntualidad',
          Valor: datosPersonal.puntualidad,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Tardanzas',
          Valor: datosPersonal.tardanzas,
          Período: periodo,
          Fecha: fecha,
        },
      ];
      
      exportToCSV(dataExport, `estadisticas-personal-${periodo}-${Date.now()}.csv`);
    } else {
      const dataExport = [
        {
          Métrica: 'Total Visitas',
          Valor: datosVisitas.totalVisitas,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Visitantes Frecuentes',
          Valor: datosVisitas.visitantesFrecuentes,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Visitas Hoy',
          Valor: datosVisitas.visitasHoy,
          Período: periodo,
          Fecha: fecha,
        },
        {
          Métrica: 'Visitas Sin Salida',
          Valor: datosVisitas.visitasSinSalida,
          Período: periodo,
          Fecha: fecha,
        },
      ];
      
      exportToCSV(dataExport, `estadisticas-visitas-${periodo}-${Date.now()}.csv`);
    }
  }, [vistaActiva, datosPersonal, datosVisitas, periodo]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header del Dashboard */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Dashboard Administrativo
              </h1>
              <p className="text-slate-600">
                Vista unificada de estadísticas de personal y visitas
              </p>
            </div>
          </div>
        </div>

        {/* Filtros Globales */}
        <DashboardFilters
          periodo={periodo}
          onPeriodoChange={cambiarPeriodo}
          onRefresh={refresh}
          onExport={handleExport}
          loading={loading}
        />

        {/* KPIs Principales - Siempre visibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Asistencias"
            value={kpis.totalAsistencias}
            change={comparacion.asistenciasCambio}
            icon={UserCheck}
            colorScheme="blue"
            subtitle="Personal registrado"
          />
          
          <KPICard
            title="Total Visitas"
            value={kpis.totalVisitas}
            change={comparacion.visitasCambio}
            icon={Users}
            colorScheme="green"
            subtitle="Visitantes ingresados"
          />
          
          <KPICard
            title="Puntualidad"
            value={kpis.puntualidad}
            change={comparacion.puntualidadCambio}
            icon={Clock}
            colorScheme="purple"
            subtitle="Asistencias a tiempo"
          />
          
          <KPICard
            title="Visitantes Frecuentes"
            value={kpis.visitantesFrecuentes}
            change={comparacion.visitantesCambio}
            icon={TrendingUp}
            colorScheme="orange"
            subtitle="Visitantes recurrentes"
          />
        </div>

        {/* Toggle de Vista */}
        <ViewToggle
          vistaActiva={vistaActiva}
          onCambiarVista={cambiarVista}
        />

        {/* Contenido según Vista Activa */}
        {vistaActiva === 'personal' ? (
          <>
            {/* Sección de Personal */}
            <div className="space-y-6">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Personal
                </h2>
              </div>

              {/* Grid de tarjetas de Personal */}
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
                  <CalendarioAsistencias />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Sección de Visitas */}
            <div className="space-y-6">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Visitas
                </h2>
              </div>

              {/* Grid de tarjetas de Visitas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visitas Totales */}
                <div className="lg:col-span-2">
                  <VisitasTotalesCard />
                </div>

                {/* Por Motivo */}
                <VisitasMotivoCard />

                {/* Por Área */}
                <VisitasAreaCard />

                {/* Por Personal */}
                <VisitasPersonalCard />

                {/* Visitantes Frecuentes */}
                <VisitantesFrecuentesCard />

                {/* Calendario */}
                <div className="lg:col-span-2">
                  <CalendarioVisitas />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer informativo */}
        <div className="mt-12 p-6 bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Información del Dashboard
              </h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p>
                  • Los datos se actualizan automáticamente según el período seleccionado
                </p>
                <p>
                  • Haz clic en el botón "Actualizar" para refrescar los datos manualmente
                </p>
                <p>
                  • Usa el botón "Exportar" para descargar los datos en formato CSV
                </p>
                <p>
                  • Haz clic en el ícono de maximizar en cada tarjeta para ver más detalles
                </p>
                <p>
                  • Los indicadores de tendencia (↑ ↓) comparan con el período anterior
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardAdminPage;
