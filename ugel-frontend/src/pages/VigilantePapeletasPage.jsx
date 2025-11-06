import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Card from "../components/Card";
import TableGenerica from "../components/TableGenerica";
import Button from "../components/Button";
import ModalDetalles from "../components/ModalDetalles";
import Notification from "../components/Notification";
import TabView from "../components/TabView";
import { EyeIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon } from "@heroicons/react/24/outline";
import { papeletasSalidaService } from "../services/api";
import { 
  PanelSeleccionEstadisticas,
  PapeletasEstadoCard,
  PapeletasMotivosCard,
  PapeletasHorasCard,
  PapeletasAreasCard
} from "../components/papeletas_estadisticas";

/**
 * Vista Vigilante — Papeletas de Salida
 * - Solo muestra papeletas en estado APROBADO y EN_CURSO
 * - Permite registrar salida (APROBADO -> EN_CURSO) y retorno (EN_CURSO -> FINALIZADO)
 * - Tabla simplificada: Código, Personal, Motivo, Salida Programada, Retorno Programada, Estado, Acción
 */
const VigilantePapeletasPage = () => {
  // ---------- STATE ----------
  const [loading, setLoading] = useState(true);
  const [papeletas, setPapeletas] = useState([]);
  const [activeTab, setActiveTab] = useState("todas"); // todas | aprobado | en_curso | finalizado | estadisticas
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Estado para la categoría de estadísticas
  const [categoriaEstadisticas, setCategoriaEstadisticas] = useState('estado');

  // Modales
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPapeleta, setSelectedPapeleta] = useState(null);
  const [notification, setNotification] = useState(null);

  // Bloqueo de cargas simultáneas
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // ---------- LOADERS ----------
  const loadPapeletas = async (opts = {}) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { page = pagination.page, limit = pagination.limit } = opts;
      const q = search || "";

      // Map tabs -> estado backend
      const estadoByTab = {
        aprobado: "APROBADO",
        en_curso: "EN_CURSO",
        finalizado: "FINALIZADO",
      };

      let allData = [];
      
      if (activeTab === "todas") {
        // Para "todas", hacer dos llamadas simples para obtener papeletas APROBADO y EN_CURSO
        // Usar un límite razonable (100) en lugar de 1000 para evitar errores 400
        try {
          const [aprobadoRes, enCursoRes] = await Promise.all([
            papeletasSalidaService.getAll({
              page: 1,
              limit: 100, // Límite razonable
              q: q || "",
              estado: "APROBADO",
            }),
            papeletasSalidaService.getAll({
              page: 1,
              limit: 100, // Límite razonable
              q: q || "",
              estado: "EN_CURSO",
            }),
          ]);
          
          const aprobadoData = aprobadoRes?.data?.data || aprobadoRes?.data || [];
          const enCursoData = enCursoRes?.data?.data || enCursoRes?.data || [];
          
          // Combinar y ordenar por fecha de solicitud descendente
          allData = [...(Array.isArray(aprobadoData) ? aprobadoData : []), ...(Array.isArray(enCursoData) ? enCursoData : [])]
            .sort((a, b) => {
              const fechaA = new Date(a.fecha_solicitud || 0);
              const fechaB = new Date(b.fecha_solicitud || 0);
              return fechaB - fechaA;
            });
        } catch (err) {
          console.error("Error cargando papeletas para tab 'todas':", err);
          allData = [];
        }
      } else {
        // Para tabs específicos, traer solo ese estado
        const params = {
          page,
          limit,
          q: q || "",
          estado: estadoByTab[activeTab],
        };

        const res = await papeletasSalidaService.getAll(params);
        allData = res?.data?.data || res?.data || [];
      }

      // Filtrar solo estados permitidos para vigilante según el tab
      let filteredData = [];
      if (activeTab === "todas") {
        filteredData = Array.isArray(allData) 
          ? allData.filter((p) => ["APROBADO", "EN_CURSO"].includes(p.estado))
          : [];
      } else if (activeTab === "finalizado") {
        filteredData = Array.isArray(allData) 
          ? allData.filter((p) => p.estado === "FINALIZADO")
          : [];
      } else {
        filteredData = Array.isArray(allData) 
          ? allData.filter((p) => p.estado === estadoByTab[activeTab])
          : [];
      }

      // Aplicar paginación en frontend para "todas"
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = activeTab === "todas" 
        ? filteredData.slice(startIndex, endIndex)
        : filteredData;

      setPapeletas(paginatedData);
      setPagination({
        page,
        limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
      });
    } catch (e) {
      console.error("Error cargando papeletas:", e);
      setPapeletas([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Efecto consolidado para cargar papeletas
  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si hay búsqueda, aplicar debounce
    if (search) {
      searchTimeoutRef.current = setTimeout(() => {
        loadPapeletas({ page: 1 });
      }, 500);
    } else {
      // Sin búsqueda, cargar inmediatamente
      loadPapeletas({ page: 1 });
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search]);

  // ---------- UI HELPERS ----------
  const estadoBadge = (estado) => {
    const map = {
      APROBADO: ["bg-green-100", "text-green-800", "Aprobado"],
      EN_CURSO: ["bg-blue-100", "text-blue-800", "En curso"],
      FINALIZADO: ["bg-gray-100", "text-gray-800", "Finalizado"],
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

  // ---------- TABLE DATA TRANSFORM ----------
  const rows = useMemo(
    () =>
      papeletas.map((ps) => ({
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
    [papeletas],
  );

  // ---------- ACTIONS ----------
  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setTimeout(() => {
      setSelectedPapeleta(null);
    }, 300);
  }, []);

  const onVerDetalle = useCallback((ps) => {
    if (!ps) {
      console.error('onVerDetalle: ps es null o undefined');
      return;
    }
    setSelectedPapeleta(ps);
    setIsDetailModalOpen(true);
  }, []);

  const onRegistrarSalida = async (id) => {
    try {
      await papeletasSalidaService.registrarSalida(id);
      setNotification({
        message: "Salida registrada exitosamente",
        type: "success",
        duration: 2500,
      });
      await loadPapeletas();
      if (isDetailModalOpen) {
        handleCloseDetailModal();
      }
    } catch (e) {
      console.error("Error al registrar salida:", e);
      const errorMessage = 
        e?.response?.data?.message || 
        e?.response?.data?.error || 
        e.message ||
        "No se pudo registrar la salida. Inténtalo nuevamente.";
      setNotification({
        message: errorMessage,
        type: "error",
        duration: 4000,
      });
    }
  };

  const onRegistrarRetorno = async (id) => {
    try {
      await papeletasSalidaService.registrarRetorno(id);
      setNotification({
        message: "Retorno registrado exitosamente",
        type: "success",
        duration: 2500,
      });
      await loadPapeletas();
      if (isDetailModalOpen) {
        handleCloseDetailModal();
      }
    } catch (e) {
      console.error("Error al registrar retorno:", e);
      const errorMessage = 
        e?.response?.data?.message || 
        e?.response?.data?.error || 
        e.message ||
        "No se pudo registrar el retorno. Inténtalo nuevamente.";
      setNotification({
        message: errorMessage,
        type: "error",
        duration: 4000,
      });
    }
  };

  // ---------- TABLE COLUMNS ----------
  const columns = [
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
      render: (row) => {
        const est = String(row?.estado || "").trim().toUpperCase();
        const esAprobado = est === "APROBADO";
        const esEnCurso = est === "EN_CURSO";
        
        return (
          <div className="flex justify-left space-x-1">
            {/* Botón Ver - siempre visible */}
            <button
              onClick={() => onVerDetalle(row.raw)}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              title="Ver Detalles"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            {/* Botón Registrar Salida - solo si estado es APROBADO */}
            {esAprobado && (
              <button
                onClick={() => onRegistrarSalida(row.raw?.id || row.id)}
                className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                title="Registrar Salida"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </button>
            )}
            
            {/* Botón Registrar Retorno - solo si estado es EN_CURSO */}
            {esEnCurso && (
              <button
                onClick={() => onRegistrarRetorno(row.raw?.id || row.id)}
                className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                title="Registrar Retorno"
              >
                <ArrowLeftOnRectangleIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ---------- TABS ----------
  // Los contadores se calculan en el servidor, por ahora usamos los datos cargados
  // En una implementación real, podrías hacer llamadas separadas para obtener los contadores
  const counts = useMemo(() => {
    // Para simplificar, usamos los datos actuales
    // En producción, podrías hacer llamadas separadas para obtener los totales reales
    const c = {
      todas: papeletas.filter((p) => ["APROBADO", "EN_CURSO"].includes(p.estado)).length,
      aprobado: papeletas.filter((p) => p.estado === "APROBADO").length,
      en_curso: papeletas.filter((p) => p.estado === "EN_CURSO").length,
      finalizado: papeletas.filter((p) => p.estado === "FINALIZADO").length,
    };
    return c;
  }, [papeletas]);

  const tabs = [
    { key: "todas", label: "Todas", count: counts.todas },
    { key: "aprobado", label: "Aprobado", count: counts.aprobado },
    { key: "en_curso", label: "En curso", count: counts.en_curso },
    { key: "finalizado", label: "Finalizado", count: counts.finalizado },
    { key: "estadisticas", label: "Estadísticas", icon: null, isStatsButton: true },
  ];

  // ---------- RENDER ----------
  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Papeletas de Salida — Vigilante</h1>
              <p className="mt-1 text-sm text-gray-500">
                Registre las salidas y retornos del personal autorizado.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Contenido según pestaña activa */}
          {activeTab === "estadisticas" ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Panel selector de estadísticas (izquierda) */}
              <div className="lg:col-span-1">
                <PanelSeleccionEstadisticas 
                  categoriaActiva={categoriaEstadisticas}
                  onCategoriaChange={setCategoriaEstadisticas}
                />
              </div>
              
              {/* Contenido de la estadística seleccionada (derecha) */}
              <div className="lg:col-span-3">
                {categoriaEstadisticas === 'estado' && <PapeletasEstadoCard />}
                {categoriaEstadisticas === 'motivos' && <PapeletasMotivosCard />}
                {categoriaEstadisticas === 'horas' && <PapeletasHorasCard />}
                {categoriaEstadisticas === 'areas' && <PapeletasAreasCard />}
              </div>
            </div>
          ) : (
            <Card>
              <TableGenerica
                columns={columns}
                data={rows}
                isLoading={loading}
                emptyMessage="No hay papeletas para mostrar"
                searchable={true}
                searchPlaceholder="Buscar por código de papeleta..."
                searchValue={search}
                onSearch={(value) => {
                  setSearch(value);
                }}
                pagination={true}
                itemsPerPage={pagination.limit}
                currentPage={pagination.page}
                totalItems={pagination.total}
                onPageChange={(newPage) => loadPapeletas({ page: newPage })}
              />
            </Card>
          )}
        </div>
      </div>

      {/* Modal de Detalles */}
      <ModalDetalles
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        data={selectedPapeleta}
        title="Detalles de Papeleta de Salida"
        size="lg"
        fields={[
          {
            key: 'codigo_papeleta',
            label: 'Código de Papeleta',
            render: (value, data) => {
              return value || data?.codigo_papeleta || '—';
            }
          },
          {
            key: 'solicitante',
            label: 'Solicitante',
            render: (value, data) => {
              const nombres = data?.solicitante_nombres || data?.nombres || '';
              const apellidos = data?.solicitante_apellidos || data?.apellidos || '';
              const nombreCompleto = `${nombres} ${apellidos}`.trim();
              return nombreCompleto || '—';
            }
          },
          {
            key: 'nombre_motivo',
            label: 'Motivo de Salida',
            render: (value, data) => {
              return value || data?.nombre_motivo || data?.motivo || '—';
            }
          },
          {
            key: 'fecha_hora_salida_programada',
            label: 'Fecha y Hora de Salida Programada',
            render: (value, data) => {
              const fechaValue = value || data?.fecha_hora_salida_programada;
              if (!fechaValue) return '—';
              try {
                const fecha = new Date(fechaValue);
                return fecha.toLocaleString('es-PE');
              } catch {
                return fechaValue;
              }
            }
          },
          {
            key: 'fecha_hora_retorno_programada',
            label: 'Fecha y Hora de Retorno Programada',
            render: (value, data) => {
              const fechaValue = value || data?.fecha_hora_retorno_programada;
              if (!fechaValue) return '—';
              try {
                const fecha = new Date(fechaValue);
                return fecha.toLocaleString('es-PE');
              } catch {
                return fechaValue;
              }
            }
          },
          {
            key: 'fecha_hora_salida_real',
            label: 'Fecha y Hora de Salida Real',
            render: (value, data) => {
              const fechaValue = value || data?.fecha_hora_salida_real;
              if (!fechaValue) return 'No registrada';
              try {
                const fecha = new Date(fechaValue);
                return fecha.toLocaleString('es-PE');
              } catch {
                return fechaValue;
              }
            }
          },
          {
            key: 'fecha_hora_retorno_real',
            label: 'Fecha y Hora de Retorno Real',
            render: (value, data) => {
              const fechaValue = value || data?.fecha_hora_retorno_real;
              if (!fechaValue) return 'No registrada';
              try {
                const fecha = new Date(fechaValue);
                return fecha.toLocaleString('es-PE');
              } catch {
                return fechaValue;
              }
            }
          },
          {
            key: 'estado',
            label: 'Estado',
            render: (value, data) => {
              const estadoValue = value || data?.estado;
              const estadoMap = {
                APROBADO: 'Aprobado',
                EN_CURSO: 'En curso',
                FINALIZADO: 'Finalizado'
              };
              return estadoMap[estadoValue] || estadoValue || '—';
            }
          },
        ]}
      />

      {/* Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};

export default VigilantePapeletasPage;

