import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import TableGenerica from "../components/TableGenerica";
import ModalDetalles from "../components/ModalDetalles";
import TabView from "../components/TabView";
import DateRangeFilter from "../components/DateRangeFilter";
import { EyeIcon } from "@heroicons/react/24/outline";
import { papeletasSalidaService } from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import {
  PanelSeleccionEstadisticas,
  PapeletasEstadoCard,
  PapeletasMotivosCard,
  PapeletasHorasCard,
  PapeletasAreasCard,
} from "../components/papeletas_estadisticas";

/**
 * Vista RRHH — Papeletas (solo lectura, fuente Mongo)
 * Campos: Código de Papeleta, Solicitante, Motivo de Salida, Salida Programada,
 * Retorno Programado y Estado.
 */
const PapeletasPage = () => {
  useDocumentTitle("Papeletas - COAC-UGEL");

  const [loading, setLoading] = useState(true);
  const [papeletas, setPapeletas] = useState([]);
  const [activeTab, setActiveTab] = useState("todas"); // todas | aprobado | en_curso | finalizado | estadisticas
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const [tabCounts, setTabCounts] = useState({
    todas: 0,
    aprobado: 0,
    en_curso: 0,
    finalizado: 0,
  });

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [semanaUI, setSemanaUI] = useState(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPapeleta, setSelectedPapeleta] = useState(null);
  const [categoriaEstadisticas, setCategoriaEstadisticas] = useState("estado");

  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  const loadPapeletas = useCallback(
    async (opts = {}) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;
      setLoading(true);
      try {
        const { page = pagination.page, limit = pagination.limit } = opts;

        const params = {};
        if (fechaDesde) params.fechaInicio = fechaDesde;
        if (fechaHasta) params.fechaFin = fechaHasta;

        const response = await papeletasSalidaService.getExternas(params);
        let allData = response?.data?.data || [];

        const counts = {
          todas: allData.length,
          aprobado: allData.filter((p) => p.estado === "APROBADO").length,
          en_curso: allData.filter((p) => p.estado === "EN_CURSO").length,
          finalizado: allData.filter((p) => p.estado === "FINALIZADO").length,
        };
        setTabCounts(counts);

        const term = search.toLowerCase();
        if (term) {
          allData = allData.filter((p) => {
            const fullName = `${p.solicitante_nombres || ""} ${p.solicitante_apellidos || ""}`.toLowerCase();
            return (
              (p.codigo_papeleta || "").toLowerCase().includes(term) ||
              fullName.includes(term) ||
              (p.nombre_motivo || p.motivo || "").toLowerCase().includes(term)
            );
          });
        }

        const filtered =
          activeTab === "aprobado"
            ? allData.filter((p) => p.estado === "APROBADO")
            : activeTab === "en_curso"
            ? allData.filter((p) => p.estado === "EN_CURSO")
            : activeTab === "finalizado"
            ? allData.filter((p) => p.estado === "FINALIZADO")
            : allData;

        setPapeletas(filtered);
        setPagination({
          page,
          limit,
          total: filtered.length,
        });
      } catch (error) {
        console.error("Error cargando papeletas externas:", error);
        setPapeletas([]);
        setPagination((prev) => ({ ...prev, total: 0 }));
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [activeTab, fechaDesde, fechaHasta, pagination.page, pagination.limit, search],
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => loadPapeletas({ page: 1 }), 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [activeTab, search, loadPapeletas]);

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

  const estadoBadge = (estado) => {
    const map = {
      APROBADO: ["bg-green-100", "text-green-800", "Aprobado"],
      EN_CURSO: ["bg-blue-100", "text-blue-800", "En curso"],
      FINALIZADO: ["bg-gray-100", "text-gray-800", "Finalizado"],
    };
    const [bg, tx, txt] = map[estado] || ["bg-zinc-100", "text-zinc-800", estado || "—"];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${tx}`}>{txt}</span>;
  };

  const rows = useMemo(
    () =>
      papeletas.map((ps) => ({
        id: ps.id,
        codigo: ps.codigo_papeleta || "—",
        solicitante:
          `${ps.solicitante_nombres || ""} ${ps.solicitante_apellidos || ""}`.trim() ||
          `${ps.nombres || ""} ${ps.apellidos || ""}`.trim() ||
          "—",
        motivo: ps.nombre_motivo || ps.motivo || "—",
        salidaProgramada: fmtDateTime(ps.fecha_hora_salida_programada),
        retornoProgramada: fmtDateTime(ps.fecha_hora_retorno_programada),
        estado: ps.estado || "—",
        raw: ps,
      })),
    [papeletas],
  );

  const onVerDetalle = useCallback((ps) => {
    if (!ps) return;
    setSelectedPapeleta(ps);
    setIsDetailModalOpen(true);
  }, []);

  const columns = [
    { key: "codigo", title: "Código", className: "whitespace-nowrap" },
    { key: "solicitante", title: "Solicitante" },
    { key: "motivo", title: "Motivo" },
    { key: "salidaProgramada", title: "Salida Programada", className: "whitespace-nowrap" },
    { key: "retornoProgramada", title: "Retorno Programada", className: "whitespace-nowrap" },
    { key: "estado", title: "Estado", render: (row) => estadoBadge(row.estado) },
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

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setTimeout(() => setSelectedPapeleta(null), 300);
  }, []);

  const tabs = [
    { key: "todas", label: `Todas (${tabCounts.todas})` },
    { key: "aprobado", label: `Aprobado (${tabCounts.aprobado})` },
    { key: "en_curso", label: `En curso (${tabCounts.en_curso})` },
    { key: "finalizado", label: `Finalizado (${tabCounts.finalizado})` },
    { key: "estadisticas", label: "Estadísticas" },
  ];

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Papeletas de Salida</h1>
            <p className="text-sm text-gray-500">
              Vista de solo lectura alimentada desde MongoDB (código, solicitante, motivo, horarios y estado).
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <DateRangeFilter
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            onFechaDesdeChange={(value) => {
              setFechaDesde(value || "");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onFechaHastaChange={(value) => {
              setFechaHasta(value || "");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onClear={() => {
              setFechaDesde("");
              setFechaHasta("");
              setSemanaUI(null);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            semanaUIProp={semanaUI}
            onSemanaChange={setSemanaUI}
          />
        </div>

        <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "estadisticas" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              {categoriaEstadisticas === "estado" && <PapeletasEstadoCard />}
              {categoriaEstadisticas === "motivos" && <PapeletasMotivosCard />}
              {categoriaEstadisticas === "horas" && <PapeletasHorasCard />}
              {categoriaEstadisticas === "areas" && <PapeletasAreasCard />}
            </div>
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
              searchPlaceholder="Buscar por código o solicitante..."
              searchValue={search}
              onSearch={(value) => setSearch(value)}
              pagination={true}
              itemsPerPage={pagination.limit}
              currentPage={pagination.page}
              totalItems={pagination.total}
              onPageChange={(newPage) => loadPapeletas({ page: newPage })}
            />
          </Card>
        )}
      </div>

      <ModalDetalles
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        data={selectedPapeleta}
        title="Detalles de Papeleta"
        size="lg"
        fields={[
          {
            key: "codigo_papeleta",
            label: "Código de Papeleta",
            render: (value, data) => value || data?.codigo_papeleta || "—",
          },
          {
            key: "solicitante",
            label: "Solicitante",
            render: (value, data) => {
              const nombres = data?.solicitante_nombres || data?.nombres || "";
              const apellidos = data?.solicitante_apellidos || data?.apellidos || "";
              const nombreCompleto = `${nombres} ${apellidos}`.trim();
              return nombreCompleto || "—";
            },
          },
          {
            key: "nombre_motivo",
            label: "Motivo de Salida",
            render: (value, data) => value || data?.nombre_motivo || data?.motivo || "—",
          },
          {
            key: "fecha_hora_salida_programada",
            label: "Salida Programada",
            render: (value, data) => fmtDateTime(value || data?.fecha_hora_salida_programada),
          },
          {
            key: "fecha_hora_retorno_programada",
            label: "Retorno Programado",
            render: (value, data) => fmtDateTime(value || data?.fecha_hora_retorno_programada),
          },
          {
            key: "estado",
            label: "Estado",
            render: (value) => value || "—",
          },
        ]}
      />
    </div>
  );
};

export default PapeletasPage;
