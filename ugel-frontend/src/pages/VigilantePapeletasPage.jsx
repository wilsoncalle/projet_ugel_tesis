import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Card from "../components/Card";
import TableGenerica from "../components/TableGenerica";
import ModalDetalles from "../components/ModalDetalles";
import TabView from "../components/TabView";
import SelectCustom from "../components/SelectCustom";
import { EyeIcon } from "@heroicons/react/24/outline";
import { papeletasSalidaService } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { 
  PanelSeleccionEstadisticas,
  PapeletasEstadoCard,
  PapeletasMotivosCard,
  PapeletasHorasCard,
  PapeletasAreasCard
} from "../components/papeletas_estadisticas";

/**
 * Vista Vigilante — Papeletas de Salida
 * - Solo consulta papeletas externas (Mongo) en estado APROBADO/EN_CURSO/FINALIZADO
 * - Tabla de solo lectura: Código, Personal, Motivo, Salida Programada, Retorno Programada, Estado
 */
const VigilantePapeletasPage = () => {
  useDocumentTitle('Papeletas - COAC-UGEL');
  // ---------- STATE ----------
  const [loading, setLoading] = useState(true);
  const [papeletas, setPapeletas] = useState([]);
  const [activeTab, setActiveTab] = useState("aprobado"); // todas | aprobado | en_curso | finalizado | estadisticas
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [tabCounts, setTabCounts] = useState({
    todas: 0,
    aprobado: 0,
    en_curso: 0,
    finalizado: 0,
  });

  // Estado para la categoría de estadísticas
  const [categoriaEstadisticas, setCategoriaEstadisticas] = useState('estado');

  // Estados para filtro de año y mes
  const hoy = useMemo(() => new Date(), []);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  // Modales
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPapeleta, setSelectedPapeleta] = useState(null);

  // Bloqueo de cargas simultáneas
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Opciones de año
  const yearOptions = useMemo(() => {
    const currentYear = hoy.getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 4; y--) {
      years.push({ value: y, label: y.toString() });
    }
    return years;
  }, [hoy]);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Setiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' },
    ],
    []
  );

  const handleChangeYear = (option) => {
    if (!option) return;
    setAnio(option.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleChangeMonth = (option) => {
    if (!option) return;
    setMes(option.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ---------- LOADERS ----------
  const loadPapeletas = async (opts = {}) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { page = pagination.page, limit = pagination.limit } = opts;
      const q = search.toLowerCase() || "";

      // 🔹 Construir params para backend con fechas calculadas del año/mes
      const params = {};
      
      // Calcular primer y último día del mes seleccionado
      const primerDia = new Date(anio, mes - 1, 1);
      const ultimoDia = new Date(anio, mes, 0);
      
      // Formatear a YYYY-MM-DD
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      params.fechaInicio = formatDate(primerDia);
      params.fechaFin = formatDate(ultimoDia);

      // Llamar DIRECTAMENTE al nuevo endpoint de MongoDB para obtener datos externos
      const response = await papeletasSalidaService.getExternas(params);
      
      let allData = response.data?.data || []; 

      // Calcular contadores con TODOS los datos (antes de filtrar por tab)
      const newCounts = {
        todas: allData.filter((p) => ["APROBADO", "EN_CURSO"].includes(p.estado)).length,
        aprobado: allData.filter((p) => p.estado === "APROBADO").length,
        en_curso: allData.filter((p) => p.estado === "EN_CURSO").length,
        finalizado: allData.filter((p) => p.estado === "FINALIZADO").length,
      };
      setTabCounts(newCounts);

      // Filtro de búsqueda en frontend
      if (q) {
        allData = allData.filter(p => 
           p.codigo_papeleta?.toLowerCase().includes(q) ||
           p.solicitante_nombres?.toLowerCase().includes(q) ||
           p.solicitante_apellidos?.toLowerCase().includes(q)
        );
      }

      // Aplicar lógica de Tabs
      let filteredData = [];
      if (activeTab === "todas") {
          filteredData = allData;
      } else {
          // MongoDB devuelve estado "APROBADO" (mayúscula)
          filteredData = allData.filter(p => p.estado === activeTab.toUpperCase());
      }

      // Paginación en Frontend (MongoDB trae todo el array)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      setPapeletas(paginatedData);
      setPagination({
        page,
        limit,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / limit),
      });
    } catch (e) {
      console.error("Error cargando papeletas externas:", e);
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
  }, [activeTab, search, anio, mes]);

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
      render: (row) => (
        <button
          onClick={() => onVerDetalle(row.raw)}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          title="Ver Detalles"
        >
          <EyeIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  // ---------- TABS ----------
  const tabs = [
    // { key: "todas", label: "Todas", count: tabCounts.todas },
    { key: "aprobado", label: "Aprobado", count: tabCounts.aprobado },
    { key: "en_curso", label: "En curso", count: tabCounts.en_curso },
    { key: "finalizado", label: "Finalizado", count: tabCounts.finalizado },
    { key: "estadisticas", label: "Estadísticas", icon: null, isStatsButton: true },
  ];

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <div className="flex-1 px-6 py-3">
        <div className="space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Papeletas de Salida</h1>
              <p className="mt-1 text-sm text-gray-500">
                Registre las salidas y retornos del personal autorizado.
              </p>
            </div>
          </div>



          <div className="space-y-1">
            {/* Tabs */}
            <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Contenido según pestaña activa */}
            {activeTab === "estadisticas" ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Contenido de la estadística seleccionada (izquierda) */}
              <div className="lg:col-span-3">
                {categoriaEstadisticas === 'estado' && <PapeletasEstadoCard />}
                {categoriaEstadisticas === 'motivos' && <PapeletasMotivosCard />}
                {categoriaEstadisticas === 'horas' && <PapeletasHorasCard />}
                {categoriaEstadisticas === 'areas' && <PapeletasAreasCard />}
              </div>
              
              {/* Panel selector de estadísticas (derecha) */}
              <div className="lg:col-span-1">
                <PanelSeleccionEstadisticas 
                  categoriaActiva={categoriaEstadisticas}
                  onCategoriaChange={setCategoriaEstadisticas}
                />
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
                actions={
                  <div className="flex items-center gap-2">
                    <div className="w-32">
                      <SelectCustom
                        label="Año"
                        hideLabel
                        options={yearOptions}
                        value={yearOptions.find((y) => y.value === anio) || null}
                        onChange={handleChangeYear}
                        isSearchable={false}
                        placeholder="Año"
                      />
                    </div>
                    <div className="w-32">
                      <SelectCustom
                        label="Mes"
                        hideLabel
                        options={monthOptions}
                        value={monthOptions.find((m) => m.value === mes) || null}
                        onChange={handleChangeMonth}
                        isSearchable={false}
                        placeholder="Mes"
                      />
                    </div>
                  </div>
                }
              />
            </Card>
          )}
          </div>
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
            label: 'Salida Programada',
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
            label: 'Retorno Programado',
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
            key: 'tiempo_restante',
            label: 'Tiempo Restante',
            render: (value, data) => {
              const retornoStr = data?.fecha_hora_retorno_programada;
              if (!retornoStr) return '-';
              
              const retorno = new Date(retornoStr);
              const now = new Date();
              
              if (now > retorno) return 'Vencido';
              
              const diff = retorno - now;
              const days = Math.floor(diff / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              
              if (days > 0) return `${days} días, ${hours} horas`;
              return `${hours} horas`;
            }
          },
          // {
          //   key: 'fecha_hora_salida_real',
          //   label: 'Fecha y Hora de Salida Real',
          //   render: (value, data) => {
          //     const fechaValue = value || data?.fecha_hora_salida_real;
          //     if (!fechaValue) return 'No registrada';
          //     try {
          //       const fecha = new Date(fechaValue);
          //       return fecha.toLocaleString('es-PE');
          //     } catch {
          //       return fechaValue;
          //     }
          //   }
          // },
          // {
          //   key: 'fecha_hora_retorno_real',
          //   label: 'Fecha y Hora de Retorno Real',
          //   render: (value, data) => {
          //     const fechaValue = value || data?.fecha_hora_retorno_real;
          //     if (!fechaValue) return 'No registrada';
          //     try {
          //       const fecha = new Date(fechaValue);
          //       return fecha.toLocaleString('es-PE');
          //     } catch {
          //       return fechaValue;
          //     }
          //   }
          // },
          {
              label: 'Estado',
              key: 'estado',
              render: (val) => (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    val === 'APROBADO'
                      ? 'bg-green-100 text-green-800'
                      : val === 'EN_CURSO'
                      ? 'bg-blue-100 text-blue-800'
                      : val === 'FINALIZADO'
                      ? 'bg-gray-100 text-gray-800'
                      : val === 'RECHAZADO'
                      ? 'bg-red-100 text-red-800'
                      : val === 'CANCELADO'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {val === 'EN_CURSO' ? 'En Curso' : val}
                </span>
              ),
            },
        ]}
      />

    </div>
  );
};

export default VigilantePapeletasPage;
