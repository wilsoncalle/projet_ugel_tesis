import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  UserCheck, 
  Clock, 
  CheckCircle,
  XCircle,
  TrendingUp,
  Eye,
  Users
} from 'lucide-react';

// Hooks
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Componentes del dashboard
import { 
  KPICard, 
  ViewToggle, 
  LoadingDashboard, 
  ErrorDashboard 
} from '../components/dashboard';
import SelectCustom from '../components/SelectCustom';
import DashboardHistorialWidget from '../components/dashboard/DashboardHistorialWidget';
import HistorialAsistenciasModal from '../components/dashboard/modals/HistorialAsistenciasModal';
import HistorialPapeletasModal from '../components/dashboard/modals/HistorialPapeletasModal';

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

// Componentes para la tabla de papeletas
import TableGenerica from "../components/TableGenerica";
import ModalDetalles from "../components/ModalDetalles";
import TabView from "../components/TabView";
import { papeletasSalidaService, asistenciaPersonalService } from "../services/api";

// Columnas reutilizables
import getHistorialAsistenciasColumns from '../components/personal/columns/historialAsistenciasColumns.jsx';

// Utilidades
import { exportToCSV, formatDate } from '../utils/dashboardUtils';

/**
 * Combina flujos diarios de asistencias, inasistencias y permisos
 */
const combinarFlujosDiarios = (asistencias, inasistencias, permisos) => {
  const mapaFechas = new Map();

  // Procesar asistencias
  asistencias.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).asistencias = parseInt(item.asistencias || 0);
  });

  // Procesar inasistencias
  inasistencias.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).inasistencias = parseInt(item.inasistencias || 0);
  });

  // Procesar permisos
  permisos.forEach(item => {
    const fecha = item.dia;
    if (!mapaFechas.has(fecha)) {
      mapaFechas.set(fecha, { dia: fecha, asistencias: 0, inasistencias: 0, permisos: 0 });
    }
    mapaFechas.get(fecha).permisos = parseInt(item.permisos || 0);
  });

  // Convertir a array y ordenar por fecha
  return Array.from(mapaFechas.values()).sort((a, b) => 
    new Date(a.dia) - new Date(b.dia)
  );
};

/**
 * Dashboard de Recursos Humanos
 * Integra estadísticas de Papeletas de Salida y Asistencias del Personal
 */
const DashboardRRHHPage = () => {
  useDocumentTitle('Dashboard RRHH - COAC-UGEL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [vistaActiva, setVistaActiva] = useState('papeletas');
  
  // Estados para datos de papeletas (KPIs)
  const [datosPapeletasKPI, setDatosPapeletasKPI] = useState({
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

  // Estados para Historial Widgets
  const [historialAsistenciasPreview, setHistorialAsistenciasPreview] = useState([]);
  const [historialPapeletasPreview, setHistorialPapeletasPreview] = useState([]);
  const [showAsistenciasModal, setShowAsistenciasModal] = useState(false);
  const [showPapeletasModal, setShowPapeletasModal] = useState(false);

  // ---------- ESTADO PARA TABLA DE PAPELETAS ----------
  const [papeletasList, setPapeletasList] = useState([]);
  const [loadingPapeletasList, setLoadingPapeletasList] = useState(false);
  const [activeTabPapeletas, setActiveTabPapeletas] = useState("todas");
  const [searchPapeletas, setSearchPapeletas] = useState("");
  const [paginationPapeletas, setPaginationPapeletas] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [tabCountsPapeletas, setTabCountsPapeletas] = useState({
    todas: 0,
    aprobado: 0,
    en_curso: 0,
    finalizado: 0,
  });
  
  // Modal detalles papeleta
  const [selectedPapeleta, setSelectedPapeleta] = useState(null);
  const isLoadingPapeletasRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Estado para detalles desde widgets de historial (Asistencias)
  const [selectedHistorialItem, setSelectedHistorialItem] = useState(null);
  const [selectedHistorialTipo, setSelectedHistorialTipo] = useState(null);

  /**
   * Fetch datos de papeletas (Estadísticas KPI y Preview Historial)
   */
  const fetchDatosPapeletasKPI = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 1. Estadísticas
      const responseStats = await fetch(
        `/api/papeletas-salida/estadisticas/estado?periodo=${periodo}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const resultStats = await responseStats.json();
      
      if (resultStats.success && resultStats.data) {
        const { flujo_diario = [], total = 0, distribucion_estados = [] } = resultStats.data;
        const aprobadas = distribucion_estados.find(e => e.estado === 'APROBADO')?.total || 0;
        const pendientes = distribucion_estados.find(e => e.estado === 'SOLICITADO')?.total || 0;
        const rechazadas = distribucion_estados.find(e => e.estado === 'RECHAZADO')?.total || 0;
        const enCurso = distribucion_estados.find(e => e.estado === 'EN_CURSO')?.total || 0;

        setDatosPapeletasKPI({
          totalPapeletas: total,
          aprobadas: parseInt(aprobadas),
          pendientes: parseInt(pendientes),
          rechazadas: parseInt(rechazadas),
          enCurso: parseInt(enCurso),
          flujoDiario: flujo_diario
        });
      }

      // 2. Preview Historial (Últimas 10)
      // Reutilizamos el servicio getExternas que trae todas, y cortamos las 10 primeras
      const responseList = await papeletasSalidaService.getExternas();
      if (responseList.data && responseList.data.data) {
        // Asumimos que vienen ordenadas por fecha descendente, si no, habría que ordenar
        const allPapeletas = responseList.data.data;
        // Ordenar por fecha de creación o ID descendente si es necesario
        // Por ahora tomamos las primeras 10
        setHistorialPapeletasPreview(allPapeletas.slice(0, 10));
      }

    } catch (err) {
      console.error('Error al obtener datos de papeletas:', err);
    }
  }, [periodo]);

  /**
   * Fetch datos de asistencias (Estadísticas y Preview Historial)
   */
  const fetchDatosAsistencias = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [totalesRes, puntualidadRes, historialRes] = await Promise.all([
        fetch(`/api/asistencia-personal/estadisticas/totales?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/asistencia-personal/estadisticas/puntualidad?periodo=${periodo}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        asistenciaPersonalService.getAll({
          page: 1,
          limit: 10,
        }),
      ]);

      const totales = await totalesRes.json();
      const puntualidad = await puntualidadRes.json();
      const historial = historialRes.data;

      // Procesar datos - Nueva estructura con asistencias/inasistencias/permisos
      const asistenciasData = totales.data?.asistencias || {};
      const inasistenciasData = totales.data?.inasistencias || {};
      const permisosData = totales.data?.permisos || {};
      
      const flujoDiarioAsistencias = asistenciasData.flujo_diario || [];
      const flujoDiarioInasistencias = inasistenciasData.flujo_diario || [];
      const flujoDiarioPermisos = permisosData.flujo_diario || [];
      
      // Combinar todos los flujos diarios por fecha
      const flujoDiarioCompleto = combinarFlujosDiarios(
        flujoDiarioAsistencias,
        flujoDiarioInasistencias,
        flujoDiarioPermisos
      );

      const totalAsistencias = asistenciasData.total || 0;
      
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
        flujoDiario: flujoDiarioCompleto
      });

      // Setear historial preview
      if (historial && historial.success) {
        setHistorialAsistenciasPreview(historial.data || []);
      }

    } catch (err) {
      console.error('Error al obtener datos de asistencias:', err);
    }
  }, [periodo]);

  /**
   * Cargar lista de papeletas para la tabla principal
   */
  const loadPapeletasList = async (opts = {}) => {
    if (isLoadingPapeletasRef.current) return;
    isLoadingPapeletasRef.current = true;
    setLoadingPapeletasList(true);
    try {
      const { page = paginationPapeletas.page, limit = paginationPapeletas.limit } = opts;
      const q = searchPapeletas.toLowerCase() || "";

      const response = await papeletasSalidaService.getExternas();
      let allData = response.data?.data || []; 

      // Calcular contadores
      const newCounts = {
        todas: allData.length,
        aprobado: allData.filter((p) => p.estado === "APROBADO").length,
        en_curso: allData.filter((p) => p.estado === "EN_CURSO").length,
        finalizado: allData.filter((p) => p.estado === "FINALIZADO").length,
      };
      setTabCountsPapeletas(newCounts);

      // Filtro de búsqueda
      if (q) {
        allData = allData.filter(p => 
           p.codigo_papeleta?.toLowerCase().includes(q) ||
           p.solicitante_nombres?.toLowerCase().includes(q) ||
           p.solicitante_apellidos?.toLowerCase().includes(q) ||
           p.nombres?.toLowerCase().includes(q) ||
           p.apellidos?.toLowerCase().includes(q)
        );
      }

      // Filtro por Tab
      let filteredData = [];
      if (activeTabPapeletas === "todas") {
          filteredData = allData;
      } else {
          filteredData = allData.filter(p => p.estado === activeTabPapeletas.toUpperCase());
      }

      // Paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setPapeletasList(paginatedData);
      setPaginationPapeletas({
        page,
        limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
      });
    } catch (e) {
      console.error("Error cargando lista de papeletas:", e);
      setPapeletasList([]);
    } finally {
      setLoadingPapeletasList(false);
      isLoadingPapeletasRef.current = false;
    }
  };

  // Efecto para cargar lista de papeletas cuando cambia tab o búsqueda
  useEffect(() => {
    if (vistaActiva === 'papeletas') {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      
      if (searchPapeletas) {
        searchTimeoutRef.current = setTimeout(() => {
          loadPapeletasList({ page: 1 });
        }, 500);
      } else {
        loadPapeletasList({ page: 1 });
      }
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabPapeletas, searchPapeletas, vistaActiva]);

  /**
   * Cargar todos los datos iniciales
   */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchDatosPapeletasKPI(),
        fetchDatosAsistencias()
      ]);
    } catch (err) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [fetchDatosPapeletasKPI, fetchDatosAsistencias]);

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
   * Formatear datos para calendario de asistencias
   */
  const formatearDatosCalendarioAsistencias = (flujoDiario) => {
    if (!flujoDiario || flujoDiario.length === 0) return [];
    
    return flujoDiario
      .filter(item => {
        const total = (item.asistencias || 0) + (item.inasistencias || 0) + (item.permisos || 0);
        return total > 0;
      })
      .map(item => {
        const numAsistencias = parseInt(item.asistencias || 0);
        const numInasistencias = parseInt(item.inasistencias || 0);
        const numPermisos = parseInt(item.permisos || 0);
        const total = numAsistencias + numInasistencias + numPermisos;
        
        const detalles = [];
        
        // Simulación de detalles para el calendario
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
        
        for (let i = 0; i < Math.min(numInasistencias, 2); i++) {
          detalles.push({
            estado_presencia: 'Ausente',
            hora_ingreso: '--:--',
            personal: `Personal ${numAsistencias + i + 1}`,
            area: 'Ver detalles'
          });
        }
        
        for (let i = 0; i < Math.min(numPermisos, 1); i++) {
          detalles.push({
            estado_presencia: 'Permiso',
            hora_ingreso: '--:--',
            personal: `Personal ${numAsistencias + numInasistencias + i + 1}`,
            area: 'Ver detalles'
          });
        }
        
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

  // ---------- COLUMNAS Y HELPERS ----------
  const estadoBadge = (estado) => {
    const map = {
      APROBADO: ["bg-green-100", "text-green-800", "Aprobado"],
      EN_CURSO: ["bg-blue-100", "text-blue-800", "En curso"],
      FINALIZADO: ["bg-gray-100", "text-gray-800", "Finalizado"],
      SOLICITADO: ["bg-yellow-100", "text-yellow-800", "Solicitado"],
      RECHAZADO: ["bg-red-100", "text-red-800", "Rechazado"],
    };
    const [bg, tx, txt] = map[estado] || ["bg-zinc-100", "text-zinc-800", estado || "—"];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${tx}`}>
        {txt}
      </span>
    );
  };

  const fmtDateTime = (iso) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      const fecha = d.toLocaleDateString("es-PE");
      const hora = d.toTimeString().slice(0, 5);
      return `${fecha} ${hora}`;
    } catch {
      return iso;
    }
  };

  // Columnas para el Widget de Historial de Asistencias
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

  // Columnas para el Widget de Historial de Papeletas (Simplificadas)
  const papeletasColumnsDashboard = useMemo(() => [
    { 
      key: 'codigo', 
      title: 'Código',
      render: (row) => <span className="font-medium text-slate-700">{row.codigo_papeleta}</span>
    },
    { 
      key: 'personal', 
      title: 'Personal',
      render: (row) => {
        const nombres = row.solicitante_nombres || row.nombres || '';
        const apellidos = row.solicitante_apellidos || row.apellidos || '';
        return `${nombres} ${apellidos}`.trim();
      }
    },
    { 
      key: 'motivo', 
      title: 'Motivo',
      render: (row) => row.nombre_motivo || row.motivo || '—'
    },
    { 
      key: 'estado', 
      title: 'Estado',
      render: (row) => estadoBadge(row.estado)
    },
    {
      key: 'acciones',
      title: 'Ver',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedHistorialTipo('visita'); // Reutilizamos el tipo 'visita' o creamos 'papeleta'
            setSelectedPapeleta(row); // Usamos el estado de papeleta existente
          }}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          title="Ver detalles"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4"
          >
            <path
              d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )
    }
  ], []);

  // Columnas para la Tabla Principal de Papeletas
  const papeletasRows = useMemo(
    () =>
      papeletasList.map((ps) => ({
        id: ps.id,
        codigo: ps.codigo_papeleta || "—",
        personal:
          `${ps.solicitante_nombres || ""} ${ps.solicitante_apellidos || ""}`.trim() ||
          `${ps.nombres || ""} ${ps.apellidos || ""}`.trim() ||
          "—",
        motivo: ps.nombre_motivo || "—",
        salidaProgramada: fmtDateTime(ps.fecha_hora_salida_programada),
        retornoProgramada: fmtDateTime(ps.fecha_hora_retorno_programada),
        estado: ps.estado || "—",
        raw: ps,
      })),
    [papeletasList],
  );

  const papeletasColumns = [
    { key: "codigo", title: "Código", className: "whitespace-nowrap" },
    { key: "personal", title: "Personal" },
    { key: "motivo", title: "Motivo" },
    {
      key: "salidaProgramada",
      title: "Salida Programada",
      className: "whitespace-nowrap",
    },
    {
      key: "retornoProgramada",
      title: "Retorno Programada",
      className: "whitespace-nowrap",
    },
    {
      key: "estado",
      title: "Estado",
      render: (row) => estadoBadge(row.estado),
    },
    {
      key: "acciones",
      title: "Acción",
      render: (row) => (
        <div className="flex justify-left space-x-1">
          <button
            onClick={() => setSelectedPapeleta(row.raw)}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            title="Ver Detalles"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
            >
              <path
                d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const papeletasTabs = [
    { key: "todas", label: "Todas", count: tabCountsPapeletas.todas },
    { key: "aprobado", label: "Aprobado", count: tabCountsPapeletas.aprobado },
    { key: "en_curso", label: "En curso", count: tabCountsPapeletas.en_curso },
    { key: "finalizado", label: "Finalizado", count: tabCountsPapeletas.finalizado },
  ];

  // Fields para ModalDetalles de ASISTENCIAS
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

  // Configuración del widget de historial según la vista activa
  const historialTitle = vistaActiva === 'papeletas'
    ? 'Historial de Papeletas'
    : 'Historial de Asistencias';

  const historialData = vistaActiva === 'papeletas'
    ? historialPapeletasPreview
    : historialAsistenciasPreview;

  const historialColumns = vistaActiva === 'papeletas'
    ? papeletasColumnsDashboard
    : asistenciasColumnsDashboard;

  const onExpandHistorial = vistaActiva === 'papeletas'
    ? () => setShowPapeletasModal(true)
    : () => setShowAsistenciasModal(true);

  const emptyMessageHistorial = vistaActiva === 'papeletas'
    ? 'No hay papeletas recientes'
    : 'No hay asistencias recientes';

  // Mostrar estado de carga inicial
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
          <ErrorDashboard error={error} onRetry={fetchAllData} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-radial from-blue-50 to-slate-50 p-0">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* Header del Dashboard */}
        <div className="px-0 pt-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">
              Dashboard de Recursos Humanos
            </h1>
            
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
          </div>
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
              description: 'Estadísticas y gestión de papeletas'
            },
            {
              key: 'asistencias',
              label: 'Asistencias',
              icon: <UserCheck className="h-4 w-4" />,
              description: 'Estadísticas de asistencias del personal'
            }
          ]}
        />

        {/* SECCIÓN SUPERIOR: KPIs + Historial Widget (Estilo Admin) */}
        <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-4">
          
          {/* Columna Izquierda: KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vistaActiva === 'papeletas' ? (
              <>
                <KPICard
                  title="Total Papeletas"
                  value={datosPapeletasKPI.totalPapeletas}
                  change={0}
                  icon={FileText}
                  colorScheme="blue"
                  subtitle="Solicitudes registradas"
                />
                <KPICard
                  title="Aprobadas"
                  value={datosPapeletasKPI.aprobadas}
                  change={0}
                  icon={CheckCircle}
                  colorScheme="green"
                  subtitle="Papeletas aprobadas"
                />
                <KPICard
                  title="Pendientes"
                  value={datosPapeletasKPI.pendientes}
                  change={0}
                  icon={Clock}
                  colorScheme="orange"
                  subtitle="En revisión"
                />
                <KPICard
                  title="En Curso"
                  value={datosPapeletasKPI.enCurso}
                  change={0}
                  icon={TrendingUp}
                  colorScheme="blue"
                  subtitle="Papeletas en curso"
                />
                {/* Nota: Rechazadas se mueve a la sección de abajo o se omite en este grid compacto de 4 */}
              </>
            ) : (
              <>
                <KPICard
                  title="Total Asistencias"
                  value={datosAsistencias.totalAsistencias}
                  change={0}
                  icon={UserCheck}
                  colorScheme="blue"
                  subtitle="Personal registrado"
                />
                <KPICard
                  title="Puntualidad"
                  value={datosAsistencias.puntualidad}
                  change={0}
                  icon={Clock}
                  colorScheme="green"
                  subtitle="Asistencias a tiempo"
                />
                <KPICard
                  title="Tardanzas"
                  value={datosAsistencias.tardanzas}
                  change={0}
                  icon={Clock}
                  colorScheme="orange"
                  subtitle="Llegadas tarde"
                />
                <KPICard
                  title="Ausencias"
                  value={datosAsistencias.totalAusencias}
                  change={0}
                  icon={XCircle}
                  colorScheme="red"
                  subtitle="Faltas registradas"
                />
              </>
            )}
          </div>

          {/* Columna Derecha: Historial Widget */}
          <DashboardHistorialWidget
            title={historialTitle}
            subtitle="Últimos registros"
            data={historialData}
            columns={historialColumns}
            onExpand={onExpandHistorial}
            emptyMessage={emptyMessageHistorial}
          />
        </div>

        {/* Contenido Detallado según Vista Activa */}
        {vistaActiva === 'papeletas' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">
                Gestión de Papeletas
              </h2>
            </div>

            {/* Estadísticas Visuales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <PapeletasEstadoCard />
                 <PapeletasMotivosCard />
                 <PapeletasHorasCard />
                 <PapeletasAreasCard />
            </div>

            {/* Tabla de Papeletas */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-slate-800">Listado Completo de Papeletas</h3>
                </div>
                
                <TabView 
                  tabs={papeletasTabs} 
                  activeTab={activeTabPapeletas} 
                  onTabChange={setActiveTabPapeletas} 
                />

                <TableGenerica
                  columns={papeletasColumns}
                  data={papeletasRows}
                  isLoading={loadingPapeletasList}
                  emptyMessage="No hay papeletas para mostrar"
                  searchable={true}
                  searchPlaceholder="Buscar por código, personal..."
                  searchValue={searchPapeletas}
                  onSearch={(value) => setSearchPapeletas(value)}
                  pagination={true}
                  itemsPerPage={paginationPapeletas.limit}
                  currentPage={paginationPapeletas.page}
                  totalItems={paginationPapeletas.total}
                  onPageChange={(newPage) => loadPapeletasList({ page: newPage })}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">
                Estadísticas de Personal
              </h2>
            </div>

            {/* Asistencias Totales (Gráfico) */}
            <div>
              <AsistenciasTotalesCard />
            </div>

            {/* Grid de tarjetas de Personal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PuntualidadCard />
              <AusenciasCard />
              <AreasCard />
              <PersonalCard />
              <div className="lg:col-span-2">
                <CalendarioAsistencias 
                  asistenciasPorFecha={formatearDatosCalendarioAsistencias(datosAsistencias.flujoDiario)} 
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalles Papeleta (General) */}
        <ModalDetalles
          isOpen={!!selectedPapeleta}
          onClose={() => setSelectedPapeleta(null)}
          data={selectedPapeleta || {}}
          title="Detalles de Papeleta de Salida"
          size="lg"
          fields={[
            {
              key: 'codigo_papeleta',
              label: 'Código de Papeleta',
              render: (value, data) => value || data?.codigo_papeleta || '—'
            },
            {
              key: 'solicitante',
              label: 'Solicitante',
              render: (value, data) => {
                const nombres = data?.solicitante_nombres || data?.nombres || '';
                const apellidos = data?.solicitante_apellidos || data?.apellidos || '';
                return `${nombres} ${apellidos}`.trim() || '—';
              }
            },
            {
              key: 'nombre_motivo',
              label: 'Motivo de Salida',
              render: (value, data) => value || data?.nombre_motivo || data?.motivo || '—'
            },
            {
              key: 'fecha_hora_salida_programada',
              label: 'Salida Programada',
              render: (value, data) => fmtDateTime(value || data?.fecha_hora_salida_programada)
            },
            {
              key: 'fecha_hora_retorno_programada',
              label: 'Retorno Programada',
              render: (value, data) => fmtDateTime(value || data?.fecha_hora_retorno_programada)
            },
            {
              key: 'fecha_hora_salida_real',
              label: 'Salida Real',
              render: (value, data) => fmtDateTime(value || data?.fecha_hora_salida_real)
            },
            {
              key: 'fecha_hora_retorno_real',
              label: 'Retorno Real',
              render: (value, data) => fmtDateTime(value || data?.fecha_hora_retorno_real)
            },
            {
              key: 'estado',
              label: 'Estado',
              render: (value, data) => {
                const estadoValue = value || data?.estado;
                const estadoMap = {
                  APROBADO: 'Aprobado',
                  EN_CURSO: 'En curso',
                  FINALIZADO: 'Finalizado',
                  SOLICITADO: 'Solicitado',
                  RECHAZADO: 'Rechazado'
                };
                return estadoMap[estadoValue] || estadoValue || '—';
              }
            },
          ]}
        />

        {/* Modal de detalles desde widgets de historial (Asistencias) */}
        <ModalDetalles
          isOpen={!!selectedHistorialItem}
          onClose={() => {
            setSelectedHistorialItem(null);
            setSelectedHistorialTipo(null);
          }}
          data={selectedHistorialItem || {}}
          title="Detalles de Asistencia"
          size="lg"
          fields={asistenciaDetalleFields}
        />

        {/* Modal Completo de Historial de Asistencias */}
        <HistorialAsistenciasModal
          isOpen={showAsistenciasModal}
          onClose={() => setShowAsistenciasModal(false)}
        />

        {/* Modal Completo de Historial de Papeletas */}
        <HistorialPapeletasModal
          isOpen={showPapeletasModal}
          onClose={() => setShowPapeletasModal(false)}
        />
      </div>
    </div>
  );
};

export default DashboardRRHHPage;
