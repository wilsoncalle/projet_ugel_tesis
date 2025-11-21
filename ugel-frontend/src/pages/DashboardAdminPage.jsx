import React, { useCallback, useState, useMemo } from 'react';
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
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Componentes del dashboard
import { 
  KPICard, 
  ViewToggle, 
  LoadingDashboard, 
  ErrorDashboard 
} from '../components/dashboard';
import SelectCustom from '../components/SelectCustom';

// Widgets y modales de historial
import DashboardHistorialWidget from '../components/dashboard/DashboardHistorialWidget';
import HistorialVisitasModal from '../components/dashboard/modals/HistorialVisitasModal';
import HistorialAsistenciasModal from '../components/dashboard/modals/HistorialAsistenciasModal';

// Columnas reutilizables para tablas compactas
import getHistorialVisitasColumns from '../components/vigilante/columns/historialVisitasColumns.jsx';
import getHistorialAsistenciasColumns from '../components/personal/columns/historialAsistenciasColumns.jsx';

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

// Otros componentes
import ModalDetalles from '../components/ModalDetalles';

// Utilidades
import { exportToCSV, formatDate } from '../utils/dashboardUtils';

/**
 * Dashboard Administrativo Principal
 * Integra estadísticas de Personal y Visitas en una vista unificada
 */
const DashboardAdminPage = () => {
  useDocumentTitle('Dashboard Admin - COAC-UGEL');
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
    historialVisitasPreview,
    historialAsistenciasPreview,
  } = useDashboardData();

  // Estado para modales de historial
  const [showVisitasModal, setShowVisitasModal] = useState(false);
  const [showAsistenciasModal, setShowAsistenciasModal] = useState(false);

  // Estado para detalles desde widgets de historial
  const [selectedHistorialItem, setSelectedHistorialItem] = useState(null);
  const [selectedHistorialTipo, setSelectedHistorialTipo] = useState(null);

  // Columnas para widgets compactos (con columna de acciones "Ver")
  const visitasColumnsDashboard = useMemo(
    () =>
      getHistorialVisitasColumns({
        handleOpenModal: (row) => {
          setSelectedHistorialTipo('visita');
          setSelectedHistorialItem(row);
        },
      }),
    []
  );

  const asistenciasColumnsDashboard = useMemo(
    () =>
      getHistorialAsistenciasColumns({
        handleOpenModal: (row) => {
          setSelectedHistorialTipo('asistencia');
          setSelectedHistorialItem(row);
        },
      }),
    []
  );

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

  // Configuración del widget de historial según la vista activa
  const historialTitle = vistaActiva === 'personal'
    ? 'Historial de asistencias'
    : 'Historial de visitas';

  const historialData = vistaActiva === 'personal'
    ? (historialAsistenciasPreview?.items || [])
    : (historialVisitasPreview?.items || []);

  const historialColumns = vistaActiva === 'personal'
    ? asistenciasColumnsDashboard
    : visitasColumnsDashboard;

  const onExpandHistorial = vistaActiva === 'personal'
    ? () => setShowAsistenciasModal(true)
    : () => setShowVisitasModal(true);

  const emptyMessageHistorial = vistaActiva === 'personal'
    ? 'No hay asistencias registradas para el período seleccionado'
    : 'No hay visitas registradas para el período seleccionado';

  // Fields para ModalDetalles de VISITAS (mismo diseño que VisitantesTabla e HistorialVisitasModal)
  const visitaDetalleFields = [
    {
      key: 'visitante_nombres',
      label: 'Visitante',
      render: (value, dataRow) =>
        `${dataRow.visitante_nombres || ''} ${
          dataRow.visitante_apellidos || ''
        }`.trim(),
    },
    {
      key: 'numero_documento',
      label: 'Documento',
      render: (value, dataRow) =>
        `${dataRow.tipo_documento_codigo || 'DNI'}: ${value || ''}`,
    },
    {
      key: 'personal_nombres',
      label: 'Empleado Visitado',
      render: (value, dataRow) =>
        `${dataRow.personal_nombres || ''} ${
          dataRow.personal_apellidos || ''
        }`.trim(),
    },
    {
      key: 'personal_cargo',
      label: 'Cargo del Empleado',
      render: (value) => value || 'Sin cargo asignado',
    },
    {
      key: 'nombre_motivo',
      label: 'Motivo de Visita',
      render: (value) => value || 'No especificado',
    },
    {
      key: 'nombre_area',
      label: 'Área de Destino',
      render: (value) => value || 'No especificada',
    },
    {
      key: 'fecha_ingreso',
      label: 'Fecha y Hora de Ingreso',
      render: (value) => {
        if (!value) return 'No especificada';
        try {
          const fecha = new Date(value);
          return fecha.toLocaleString('es-PE');
        } catch {
          return value;
        }
      },
    },
    {
      key: 'fecha_salida',
      label: 'Fecha y Hora de Salida',
      render: (value) => {
        if (!value) return 'Visita activa';
        try {
          const fecha = new Date(value);
          return fecha.toLocaleString('es-PE');
        } catch {
          return value;
        }
      },
    },
    {
      key: 'usuario_ingreso',
      label: 'Registrado por',
      render: (value) => value || 'No especificado',
    },
  ];

  // Fields para ModalDetalles de ASISTENCIAS (mismo diseño que PersonalAsistenciaPage e HistorialAsistenciasModal)
  const asistenciaDetalleFields = [
    {
      key: 'personal_nombres',
      label: 'Personal',
      render: (value, dataRow) =>
        `${dataRow.personal_nombres || ''} ${
          dataRow.personal_apellidos || ''
        }`.trim(),
    },
    {
      key: 'personal_numero_documento',
      label: 'Documento',
      render: (value, dataRow) =>
        `${dataRow.personal_tipo_documento || 'DNI'}: ${value || ''}`,
    },
    {
      key: 'personal_cargo_nombre',
      label: 'Cargo',
      render: (value) => value || 'Sin cargo asignado',
    },
    {
      key: 'personal_area_nombre',
      label: 'Área',
      render: (value, dataRow) => {
        const area =
          value ||
          dataRow?.personal_area_nombre ||
          dataRow?.area_nombre ||
          dataRow?.area;
        return area || 'Sin área asignada';
      },
    },
    {
      key: 'estado_presencia',
      label: 'Estado de Presencia',
      render: (value) => value || 'No especificado',
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (value) => {
        if (!value) return 'No especificada';
        try {
          const fecha = new Date(value);
          return fecha.toLocaleDateString('es-PE');
        } catch {
          return value;
        }
      },
    },
    {
      key: 'hora_ingreso',
      label: 'Hora de Ingreso',
      render: (value) => {
        if (!value) return 'No registrada';
        return value.substring(0, 5);
      },
    },
    {
      key: 'hora_salida',
      label: 'Hora de Salida',
      render: (value) => {
        if (!value) return 'Sin salida registrada';
        return value.substring(0, 5);
      },
    },
    {
      key: 'usuario_registro',
      label: 'Registrado por',
      render: (value) => value || 'No especificado',
    },
  ];

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
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* Header del Dashboard con Filtros Integrados */}
        <div className="px-0 pt-2">
          {/* Título */}
          <h1 className="text-2xl font-bold text-slate-800">
            Dashboard Administrativo
          </h1>
        </div>

        {/* Toggle de Vista */}
        <ViewToggle
          vistaActiva={vistaActiva}
          onCambiarVista={cambiarVista}
        />

        {/* KPIs Principales - Siempre visibles */}
        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <DashboardHistorialWidget
            title={historialTitle}
            data={historialData}
            columns={historialColumns}
            onExpand={onExpandHistorial}
            emptyMessage={emptyMessageHistorial}
          />
        </div>

        {/* Contenido según Vista Activa */}
        {vistaActiva === 'personal' ? (
          <>
            {/* Sección de Personal */}
            <div className="space-y-4">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
                {/* <UserCheck className="w-6 h-6" /> */}
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Personal
                </h2>
              </div>

              {/* Asistencias Totales + Historial de visitas (preview) */}
              <div>
                <AsistenciasTotalesCard />
              </div>

              {/* Grid de tarjetas de Personal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
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
            <div className="space-y-4">
              
              {/* Título de sección */}
              <div className="flex items-center gap-3">
               {/* <Users className="w-6 h-6 "/> */}
                <h2 className="text-2xl font-bold text-slate-800">
                  Estadísticas de Visitas
                </h2>
              </div>

              {/* Grid de tarjetas de Visitas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Visitas Totales + Historial de asistencias (preview) */}
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

        {/* Modales de historial completos */}
        <HistorialVisitasModal
          isOpen={showVisitasModal}
          onClose={() => setShowVisitasModal(false)}
        />
        <HistorialAsistenciasModal
          isOpen={showAsistenciasModal}
          onClose={() => setShowAsistenciasModal(false)}
        />

        {/* Modal de detalles desde widgets de historial */}
        <ModalDetalles
          isOpen={!!selectedHistorialItem}
          onClose={() => {
            setSelectedHistorialItem(null);
            setSelectedHistorialTipo(null);
          }}
          data={selectedHistorialItem || {}}
          title={
            selectedHistorialTipo === 'visita'
              ? 'Detalles de Visita'
              : selectedHistorialTipo === 'asistencia'
              ? 'Detalles de Asistencia'
              : 'Detalles'
          }
          size="lg"
          fields={
            selectedHistorialTipo === 'visita'
              ? visitaDetalleFields
              : selectedHistorialTipo === 'asistencia'
              ? asistenciaDetalleFields
              : []
          }
        />
      </div>
    </div>
  );
};

export default DashboardAdminPage;
