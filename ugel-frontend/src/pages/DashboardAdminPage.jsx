import React, { useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Download,
  AlertCircle
} from 'lucide-react';

// Hooks
import useDashboardData from '../hooks/useDashboardData';

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
      ];
      
      exportToCSV(dataExport, `estadisticas-visitas-${periodo}-${Date.now()}.csv`);
    }
  }, [vistaActiva, datosPersonal, datosVisitas, periodo]);

  // Formatear datos para calendario de asistencias
  const formatearDatosCalendarioAsistencias = (flujoDiario) => {
    if (!flujoDiario || flujoDiario.length === 0) return [];
    
    return flujoDiario
      .filter(item => {
        const total = (item.asistencias || 0) + (item.inasistencias || 0) + (item.permisos || 0);
        return total > 0; // Solo días con algún registro
      })
      .map(item => {
        const numAsistencias = parseInt(item.asistencias || 0);
        const numInasistencias = parseInt(item.inasistencias || 0);
        const numPermisos = parseInt(item.permisos || 0);
        const total = numAsistencias + numInasistencias + numPermisos;
        
        const detalles = [];
        
        // Agregar asistencias (Presente/Tardanza)
        // Aproximadamente 70% Presente, 30% Tardanza
        const numPresentes = Math.floor(numAsistencias * 0.7);
        const numTardanzas = numAsistencias - numPresentes;
        
        for (let i = 0; i < Math.min(numPresentes, 2); i++) {
          detalles.push({
            estado_presencia: 'Presente',
            hora_ingreso: `0${7 + i}:${15 + (i * 5)}`.slice(-5),
            personal: `Personal ${i + 1}`,
            area: 'Ver detalles'
          });
        }
        
        for (let i = 0; i < Math.min(numTardanzas, 1); i++) {
          detalles.push({
            estado_presencia: 'Tardanza',
            hora_ingreso: `09:${20 + (i * 10)}`,
            personal: `Personal ${numPresentes + i + 1}`,
            area: 'Ver detalles'
          });
        }
        
        // Agregar inasistencias
        for (let i = 0; i < Math.min(numInasistencias, 2); i++) {
          detalles.push({
            estado_presencia: 'Ausente',
            hora_ingreso: '--:--',
            personal: `Personal ${numAsistencias + i + 1}`,
            area: 'Ver detalles'
          });
        }
        
        // Agregar permisos
        for (let i = 0; i < Math.min(numPermisos, 1); i++) {
          detalles.push({
            estado_presencia: 'Permiso',
            hora_ingreso: '--:--',
            personal: `Personal ${numAsistencias + numInasistencias + i + 1}`,
            area: 'Ver detalles'
          });
        }
        
        // Si hay más registros, agregar indicador
        const mostrados = detalles.length;
        if (total > mostrados) {
          detalles.push({
            estado_presencia: 'Presente',
            hora_ingreso: '--:--',
            personal: `+${total - mostrados} más`,
            area: 'Ver todos los detalles'
          });
        }
        
        return {
          fecha: item.dia || item.fecha,
          asistencias_dia: total,
          detalles: detalles
        };
      });
  };

  // Formatear datos para calendario de visitas
  const formatearDatosCalendarioVisitas = (flujoDiario) => {
    if (!flujoDiario || flujoDiario.length === 0) return [];
    
    return flujoDiario
      .filter(item => (item.visitas || item.total || 0) > 0) // Solo días con visitas
      .map(item => {
        const numVisitas = item.visitas || item.total || 0;
        // Crear detalles simulados basados en el número de visitas
        const detalles = Array.from({ length: Math.min(numVisitas, 5) }, (_, i) => ({
          hora_ingreso: `${8 + i}:${(i * 15) % 60}`.padStart(5, '0'),
          hora_salida: i % 2 === 0 ? `${10 + i}:${(i * 15) % 60}`.padStart(5, '0') : null,
          area: `Área ${i + 1}`,
          personal: `Personal visitado ${i + 1}`,
          motivo: ['Reunión', 'Trámite', 'Consulta', 'Entrega'][i % 4]
        }));
        
        return {
          fecha: item.dia || item.fecha,
          visitas_dia: numVisitas,
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
                Dashboard Administrativo
              </h1>
              <p className="text-sm text-slate-500">
                Vista unificada de estadísticas de personal y visitas
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
           {/*   <button
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Actualizar datos"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              {/* Botón de exportar */}
          {/*    <button
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
                {/* <UserCheck className="w-6 h-6" /> */}
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Personal
                </h2>
              </div>

              {/* Asistencias Totales - Ocupa todo el ancho con layout interno */}
              <AsistenciasTotalesCard />

              {/* Grid de tarjetas de Personal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
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
                  <CalendarioAsistencias asistenciasPorFecha={formatearDatosCalendarioAsistencias(datosPersonal.flujoDiarioCompleto)} />
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
               {/* <Users className="w-6 h-6 "/> */}
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
                  <CalendarioVisitas visitasPorFecha={formatearDatosCalendarioVisitas(datosVisitas.flujoDiario)} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardAdminPage;
