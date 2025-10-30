import React, { useEffect, useMemo, useRef, useState } from "react";
import Card from "../components/Card";
import TableGenerica from "../components/TableGenerica";
import Button from "../components/Button";
import ModalGenerico from "../components/ModalGenerico";
import FormularioGenerico from "../components/FormularioGenerico";
import Notification from "../components/Notification";
import TabView from "../components/TabView";
import SelectCustom from "../components/SelectCustom";
import {
  papeletasSalidaService,
  motivosSalidaService,
  personalService,
} from "../services/api";

/**
 * Vista RRHH — Papeletas de Salida
 * - Tabla de gestión: Código | Solicitante | Motivo | Salida Programada | Estado | Acciones (Aprobar/Rechazar si SOLICITADO)
 * - Modal "Nueva Papeleta": solicitante, motivo, salida programada, retorno programado, sustento
 */
const PapeletasPage = () => {
  // ---------- STATE ----------
  const [loading, setLoading] = useState(true);
  const [papeletas, setPapeletas] = useState([]);
  const [personalOpts, setPersonalOpts] = useState([]);
  const [motivosOpts, setMotivosOpts] = useState([]);
  const [activeTab, setActiveTab] = useState("todas"); // todas | solicitado | aprobado | en_curso | finalizado | rechazado | cancelado
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modales / formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Bloqueo de cargas simultáneas
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // ---------- LOADERS ----------
  const loadCombos = async () => {
    try {
      const [perRes, motRes] = await Promise.all([
        // Alinear con otros módulos: usar getAll() que devuelve { success, data }
        personalService.getAll(),
        motivosSalidaService.getAll({ limit: 100 }),
      ]);

      // Manejar respuesta de personal - puede venir con success o sin él
      let pData = [];
      if (perRes?.data?.success) {
        pData = perRes.data.data || [];
      } else {
        pData = perRes?.data?.data || perRes?.data || [];
      }

      // Manejar respuesta de motivos - puede venir con success o sin él
      let mData = [];
      if (motRes?.data?.success) {
        mData = motRes.data.data || [];
      } else {
        mData = motRes?.data?.data || motRes?.data || [];
      }

      console.log("Personal data:", pData);
      console.log("Motivos data:", mData);

      setPersonalOpts(
        (Array.isArray(pData) ? pData : [])
          .filter((p) => p.activo !== false) // Filtrar activos por si acaso
          .map((p) => ({
            value: p.id,
            label: `${p.nombres || ''} ${p.apellidos || ''}`.trim() || 'Sin nombre',
          })),
      );

      setMotivosOpts(
        (Array.isArray(mData) ? mData : [])
          .filter((m) => m.activo !== false) // Filtrar activos en frontend
          .map((m) => ({
            value: m.id,
            label: m.nombre_motivo || m.nombre || 'Sin nombre',
          })),
      );
    } catch (error) {
      console.error("Error cargando combos:", error);
    }
  };

  const loadPapeletas = async (opts = {}) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { page = pagination.page, limit = pagination.limit } = opts;
      const q = search || "";

      // Map RRHH tabs -> estado backend
      const estadoByTab = {
        solicitado: "SOLICITADO",
        aprobado: "APROBADO",
        en_curso: "EN_CURSO",
        finalizado: "FINALIZADO",
        rechazado: "RECHAZADO",
        cancelado: "CANCELADO",
      };

      const params = {
        page,
        limit,
        q,
        orderBy: "ps.fecha_solicitud",
        orderDir: "DESC",
      };

      if (activeTab !== "todas") {
        params.estado = estadoByTab[activeTab];
      }

      const res = await papeletasSalidaService.getAll(params);
      // backend esperado: { data: { data: [...], pagination: {...} } } o { data: [...], pagination: {...} }
      const data = res?.data?.data || res?.data || [];
      const pag = res?.data?.pagination || res?.pagination || {
        page,
        limit,
        total: data.length,
        totalPages: 1,
      };

      setPapeletas(Array.isArray(data) ? data : []);
      setPagination({
        page: Number(pag.page) || page,
        limit: Number(pag.limit) || limit,
        total: Number(pag.total) || (Array.isArray(data) ? data.length : 0),
        totalPages: Number(pag.totalPages) || 1,
      });
    } catch (e) {
      console.error("Error cargando papeletas:", e);
      setPapeletas([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    (async () => {
      await loadCombos();
      await loadPapeletas({ page: 1 });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recargar al cambiar pestaña
  useEffect(() => {
    loadPapeletas({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Debounce para búsqueda
  useEffect(() => {
    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Crear nuevo timeout
    searchTimeoutRef.current = setTimeout(() => {
      loadPapeletas({ page: 1 });
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    // Cleanup
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ---------- UI HELPERS ----------
  const estadoBadge = (estado) => {
    const map = {
      SOLICITADO: ["bg-yellow-100", "text-yellow-800", "Solicitado"],
      APROBADO: ["bg-green-100", "text-green-800", "Aprobado"],
      EN_CURSO: ["bg-blue-100", "text-blue-800", "En curso"],
      FINALIZADO: ["bg-gray-100", "text-gray-800", "Finalizado"],
      RECHAZADO: ["bg-red-100", "text-red-800", "Rechazado"],
      CANCELADO: ["bg-zinc-100", "text-zinc-800", "Cancelado"],
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
        solicitante:
          `${ps.solicitante_nombres || ""} ${ps.solicitante_apellidos || ""}`.trim() ||
          `${ps.nombres || ""} ${ps.apellidos || ""}`.trim() ||
          "—",
        motivo: ps.nombre_motivo || "—",
        salidaProgramada: fmtDateTime(ps.fecha_hora_salida_programada),
        estado: ps.estado || "—",
        raw: ps,
      })),
    [papeletas],
  );

  // ---------- TABLE COLUMNS ----------
  const columns = [
    { key: "codigo", title: "Código", className: "whitespace-nowrap" },
    { key: "solicitante", title: "Solicitante" },
    { key: "motivo", title: "Motivo" },
    {
      key: "salidaProgramada",
      title: "Salida Programada",
      className: "whitespace-nowrap",
    },
    {
      key: "estado",
      title: "Estado",
      render: (row) => estadoBadge(row.estado),
    },
    {
      key: "acciones",
      title: "Acciones",
      render: (_, row) => {
        const est = row.estado;
        const puedeDecidir = est === "SOLICITADO";
        return (
          <div className="flex gap-2">
            {puedeDecidir && (
              <>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => onDecidir(row.raw.id, "APROBAR")}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDecidir(row.raw.id, "RECHAZAR")}
                >
                  Rechazar
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onVerDetalle(row.raw)}
            >
              Ver
            </Button>
          </div>
        );
      },
    },
  ];

  // ---------- ACTIONS ----------
  const onDecidir = async (id, accion) => {
    try {
      await papeletasSalidaService.decidir(id, {
        accion, // 'APROBAR' | 'RECHAZAR'
        // En backend se tomará req.user.id como autorizador, si necesitas explícito:
        // personalAutorizaId: user.personalId
      });
      setNotification({
        message: `Papeleta ${accion === "APROBAR" ? "aprobada" : "rechazada"} correctamente`,
        type: "success",
        duration: 2500,
      });
      await loadPapeletas();
    } catch (e) {
      console.error("Error al decidir:", e);
      setNotification({
        message:
          e?.response?.data?.message ||
          "No se pudo completar la acción. Inténtalo nuevamente.",
        type: "error",
        duration: 4000,
      });
    }
  };

  const onVerDetalle = (ps) => {
    // Solo lectura: abrimos modal con los campos, deshabilitados
    setFormError(null);
    setIsModalOpen(true);
    setTimeout(() => {
      const form = document.getElementById("papeleta-form");
      if (!form) return;
      // Cargamos valores actuales al form genérico mediante evento personalizado (si tu FormularioGenerico lo soporta)
      // En caso contrario, puedes reutilizar otro componente de detalle
    }, 0);
  };

  // ---------- CREATE MODAL ----------
  const openCreate = () => {
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (values) => {
    try {
      setFormError(null);

      // Map a backend
      const payload = {
        personalSolicitanteId: Number(values.personalSolicitanteId),
        motivoSalidaId: Number(values.motivoSalidaId),
        fechaHoraSalidaProgramada: values.fechaHoraSalidaProgramada, // ISO local from datetime-local
        fechaHoraRetornoProgramada: values.fechaHoraRetornoProgramada,
        sustentoSolicitud: values.sustentoSolicitud || null,
      };

      await papeletasSalidaService.create(payload);
      setNotification({
        message: "Papeleta registrada exitosamente",
        type: "success",
        duration: 2500,
      });
      closeModal();
      await loadPapeletas();
    } catch (e) {
      console.error("Error creando papeleta:", e);
      setFormError(
        e?.response?.data?.message ||
          "No se pudo registrar la papeleta. Revisa los datos.",
      );
    }
  };

  // ---------- TABS ----------
  const counts = useMemo(() => {
    const c = {
      todas: papeletas.length,
      solicitado: papeletas.filter((p) => p.estado === "SOLICITADO").length,
      aprobado: papeletas.filter((p) => p.estado === "APROBADO").length,
      en_curso: papeletas.filter((p) => p.estado === "EN_CURSO").length,
      finalizado: papeletas.filter((p) => p.estado === "FINALIZADO").length,
      rechazado: papeletas.filter((p) => p.estado === "RECHAZADO").length,
      cancelado: papeletas.filter((p) => p.estado === "CANCELADO").length,
    };
    return c;
  }, [papeletas]);

  const tabs = [
    { key: "todas", label: "Todas", count: counts.todas },
    { key: "solicitado", label: "Solicitado", count: counts.solicitado },
    { key: "aprobado", label: "Aprobado", count: counts.aprobado },
    { key: "en_curso", label: "En curso", count: counts.en_curso },
    { key: "finalizado", label: "Finalizado", count: counts.finalizado },
    { key: "rechazado", label: "Rechazado", count: counts.rechazado },
    { key: "cancelado", label: "Cancelado", count: counts.cancelado },
  ];

  // ---------- FORM FIELDS ----------
  const formFields = useMemo(() => [
    {
      name: "personalSolicitanteId",
      label: "Personal Solicitante",
      type: "select",
      required: true,
      render: ({ value, onChange, error }) => (
        <SelectCustom
          label="Personal Solicitante"
          value={personalOpts.find((o) => String(o.value) === String(value)) || null}
          onChange={(opt) => onChange(opt?.value || "")}
          options={personalOpts}
          placeholder="Seleccione..."
          isSearchable
          noOptionsMessage="Sin resultados"
        />
      ),
    },
    {
      name: "motivoSalidaId",
      label: "Motivo de Salida",
      type: "select",
      required: true,
      render: ({ value, onChange, error }) => (
        <SelectCustom
          label="Motivo de Salida"
          value={motivosOpts.find((o) => String(o.value) === String(value)) || null}
          onChange={(opt) => onChange(opt?.value || "")}
          options={motivosOpts}
          placeholder="Seleccione..."
          isSearchable
          noOptionsMessage="Sin resultados"
        />
      ),
    },
    {
      name: "fechaHoraSalidaProgramada",
      label: "Salida Programada",
      type: "datetime-local",
      required: true,
      placeholder: "",
    },
    {
      name: "fechaHoraRetornoProgramada",
      label: "Retorno Programado",
      type: "datetime-local",
      required: true,
      placeholder: "",
    },
    {
      name: "sustentoSolicitud",
      label: "Sustento / Justificación",
      type: "textarea",
      rows: 3,
      placeholder: "Explique el motivo con claridad…",
      className: "resize-none",
    },
  ], [personalOpts, motivosOpts]);

  // ---------- RENDER ----------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Papeletas de Salida — RRHH</h1>
          <p className="mt-1 text-sm text-gray-500">
            Revise, apruebe o rechace solicitudes de salida del personal.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={openCreate}>
            Nueva Papeleta
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <TabView tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Table */}
      <Card>
        <TableGenerica
          columns={columns}
          data={rows}
          isLoading={loading}
          emptyMessage="No hay papeletas para mostrar"
          searchable={true}
          searchPlaceholder="Buscar por código, solicitante, motivo..."
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

      {/* Create / Detail Modal */}
      <ModalGenerico
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Nueva Papeleta de Salida"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const form = document.getElementById("papeleta-form");
                if (form) {
                  form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
              }}
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      >
        <FormularioGenerico
          id="papeleta-form"
          fields={formFields}
          initialData={{
            fechaHoraSalidaProgramada: "",
            fechaHoraRetornoProgramada: "",
          }}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          submitText="Guardar"
          showSubmitButton={false}
          showCancelButton={false}
          externalError={formError}
          layout="grid"
        />
      </ModalGenerico>

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

export default PapeletasPage;
