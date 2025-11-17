import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Card from "../components/Card";
import TableGenerica from "../components/TableGenerica";
import Button from "../components/Button";
import ModalGenerico from "../components/ModalGenerico";
import ModalDetalles from "../components/ModalDetalles";
import FormularioGenerico from "../components/FormularioGenerico";
import Notification from "../components/Notification";
import TabView from "../components/TabView";
import SelectCustom from "../components/SelectCustom";
import DatePicker from "../components/DatePicker";
import { EyeIcon, CheckCircleIcon, XCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  papeletasSalidaService,
  motivosSalidaService,
  personalService,
} from "../services/api";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/**
 * Vista RRHH — Papeletas de Salida
 * - Tabla de gestión: Código | Solicitante | Motivo | Salida Programada | Estado | Acciones (Aprobar/Rechazar si SOLICITADO)
 * - Modal "Nueva Papeleta": solicitante, motivo, salida programada, retorno programado, sustento
 */
const PapeletasPage = () => {
  useDocumentTitle('Gestión de Papeletas - COAC-UGEL');
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRechazoModalOpen, setIsRechazoModalOpen] = useState(false);
  const [selectedPapeleta, setSelectedPapeleta] = useState(null);
  const [papeletaADecidirid, setPapeletaADecidir] = useState(null);
  const [observacionRechazo, setObservacionRechazo] = useState("");
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

  // Cargar combos al inicio
  useEffect(() => {
    loadCombos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      render: (row) => {
        const est = String(row?.estado || "").trim().toUpperCase();
        const puedeDecidir = est === "SOLICITADO";
        const puedeCancelar = est === "APROBADO" || est === "EN_CURSO";
        
        return (
          <div className="flex justify-left space-x-1">
            {/* Botón Ver - siempre visible */}
            <button
              onClick={() => {
                console.log('Ver detalles - row:', row);
                console.log('Ver detalles - row.raw:', row.raw);
                onVerDetalle(row.raw);
              }}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              title="Ver Detalles"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            
            {/* Botones de acción según estado */}
            {puedeDecidir && (
              <>
                <button
                  onClick={() => onDecidir(row.raw?.id || row.id, "APROBAR")}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  title="Aprobar"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDecidir(row.raw?.id || row.id, "RECHAZAR")}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Rechazar"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </>
            )}
            
            {puedeCancelar && (
              <button
                onClick={() => onDecidir(row.raw?.id || row.id, "CANCELAR")}
                className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                title="Cancelar"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // ---------- ACTIONS ----------
  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
    setTimeout(() => {
      setSelectedPapeleta(null);
    }, 300);
  }, []);

  const onVerDetalle = useCallback((ps) => {
    console.log('onVerDetalle - ps:', ps);
    if (!ps) {
      console.error('onVerDetalle: ps es null o undefined');
      return;
    }
    setSelectedPapeleta(ps);
    setIsDetailModalOpen(true);
  }, []);

  const onDecidir = async (id, accion) => {
    // Si es RECHAZAR, abrir modal para observación
    if (accion === "RECHAZAR") {
      setPapeletaADecidir(id);
      setObservacionRechazo("");
      setIsRechazoModalOpen(true);
      return;
    }

    try {
      // Usar el método correcto según la acción
      if (accion === "CANCELAR") {
        await papeletasSalidaService.cancelar(id, {
          observacionAutorizacion: null
        });
      } else {
        await papeletasSalidaService.decidir(id, {
          accion, // 'APROBAR'
        });
      }
      
      const mensajes = {
        APROBAR: "aprobada",
        RECHAZAR: "rechazada",
        CANCELAR: "cancelada"
      };
      setNotification({
        message: `Papeleta ${mensajes[accion] || "actualizada"} correctamente`,
        type: "success",
        duration: 2500,
      });
      await loadPapeletas();
      // Cerrar modal de detalles si está abierto
      if (isDetailModalOpen) {
        handleCloseDetailModal();
      }
    } catch (e) {
      console.error("Error al decidir:", e);
      const errorMessage = 
        e?.response?.data?.message || 
        e?.response?.data?.error || 
        JSON.stringify(e?.response?.data) || 
        e.message ||
        "No se pudo completar la acción. Inténtalo nuevamente.";
      setNotification({
        message: errorMessage,
        type: "error",
        duration: 4000,
      });
    }
  };

  // ---------- RECHAZO MODAL ----------
  const handleConfirmarRechazo = async () => {
    if (!papeletaADecidirid) return;

    try {
      await papeletasSalidaService.decidir(papeletaADecidirid, {
        accion: "RECHAZAR",
        observacionAutorizacion: observacionRechazo.trim() || null,
      });

      setNotification({
        message: "Papeleta rechazada correctamente",
        type: "success",
        duration: 2500,
      });
      
      setIsRechazoModalOpen(false);
      setPapeletaADecidir(null);
      setObservacionRechazo("");
      
      await loadPapeletas();
      
      if (isDetailModalOpen) {
        handleCloseDetailModal();
      }
    } catch (e) {
      console.error("Error al rechazar:", e);
      const errorMessage = 
        e?.response?.data?.message || 
        e?.response?.data?.error || 
        e.message ||
        "No se pudo rechazar la papeleta.";
      setNotification({
        message: errorMessage,
        type: "error",
        duration: 4000,
      });
    }
  };

  const handleCancelarRechazo = () => {
    setIsRechazoModalOpen(false);
    setPapeletaADecidir(null);
    setObservacionRechazo("");
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

      // Validar que las fechas estén presentes
      if (!values.fechaHoraSalidaProgramada || !values.fechaHoraRetornoProgramada) {
        setFormError("Las fechas de salida y retorno programadas son requeridas.");
        return;
      }

      // Asegurar formato ISO correcto para las fechas
      let fechaSalida = values.fechaHoraSalidaProgramada;
      let fechaRetorno = values.fechaHoraRetornoProgramada;

      // Si la fecha viene en formato 'yyyy-MM-dd HH:mm', convertir a ISO
      if (typeof fechaSalida === 'string' && fechaSalida.includes(' ')) {
        fechaSalida = fechaSalida.replace(' ', 'T') + ':00';
      }
      // Si no tiene la parte de tiempo, agregarla
      if (typeof fechaSalida === 'string' && !fechaSalida.includes('T')) {
        fechaSalida = fechaSalida + 'T00:00:00';
      }
      // Asegurar formato completo ISO (agregar segundos si faltan)
      if (typeof fechaSalida === 'string' && fechaSalida.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        fechaSalida = fechaSalida + ':00';
      }

      if (typeof fechaRetorno === 'string' && fechaRetorno.includes(' ')) {
        fechaRetorno = fechaRetorno.replace(' ', 'T') + ':00';
      }
      if (typeof fechaRetorno === 'string' && !fechaRetorno.includes('T')) {
        fechaRetorno = fechaRetorno + 'T00:00:00';
      }
      if (typeof fechaRetorno === 'string' && fechaRetorno.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        fechaRetorno = fechaRetorno + ':00';
      }

      // Validar que la fecha de retorno sea mayor que la fecha de salida
      const fechaSalidaISO = fechaSalida.includes('T') 
        ? fechaSalida 
        : fechaSalida.includes(' ') 
          ? fechaSalida.replace(' ', 'T') + ':00'
          : fechaSalida + 'T00:00:00';
      
      const fechaRetornoISO = fechaRetorno.includes('T') 
        ? fechaRetorno 
        : fechaRetorno.includes(' ') 
          ? fechaRetorno.replace(' ', 'T') + ':00'
          : fechaRetorno + 'T00:00:00';
      
      try {
        const fechaSalidaDate = new Date(fechaSalidaISO);
        const fechaRetornoDate = new Date(fechaRetornoISO);
        
        if (isNaN(fechaSalidaDate.getTime()) || isNaN(fechaRetornoDate.getTime())) {
          setFormError("Las fechas proporcionadas no son válidas.");
          return;
        }
        
        if (fechaRetornoDate <= fechaSalidaDate) {
          setFormError("La fecha y hora de retorno debe ser posterior a la fecha y hora de salida.");
          return;
        }
      } catch (e) {
        console.error("Error validando fechas:", e);
        setFormError("Error al validar las fechas. Por favor, verifica los datos.");
        return;
      }

      // Map a backend
      const payload = {
        personalSolicitanteId: Number(values.personalSolicitanteId),
        motivoSalidaId: Number(values.motivoSalidaId),
        fechaHoraSalidaProgramada: fechaSalida,
        fechaHoraRetornoProgramada: fechaRetorno,
        sustentoSolicitud: values.sustentoSolicitud || null,
      };

      console.log('Payload enviado:', payload);

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
      console.error("Error response:", e?.response?.data);
      console.error("Error details:", e?.response?.data?.details);
      
      // Extraer mensaje de error más detallado
      let errorMessage = "No se pudo registrar la papeleta. Revisa los datos.";
      
      if (e?.response?.data) {
        const errorData = e.response.data;
        
        // Si hay detalles de validación de Joi (formato del errorHandler)
        if (errorData.details && Array.isArray(errorData.details)) {
          console.log("Detalles de validación:", errorData.details);
          const errorMessages = errorData.details.map(detail => {
            const fieldName = detail.field || 'campo';
            const message = detail.message || 'Error de validación';
            const value = detail.value !== undefined ? ` (valor: ${detail.value})` : '';
            return `${fieldName}: ${message}${value}`;
          });
          errorMessage = errorData.error 
            ? `${errorData.error}\n${errorMessages.join('\n')}`
            : errorMessages.join('\n');
        }
        // Si hay un mensaje directo
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Si hay un error general
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Si hay un array de errores
        else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(err => err.message || err).join(', ');
        }
        // Si hay un objeto con detalles
        else if (typeof errorData === 'object') {
          const errorDetails = Object.entries(errorData)
            .filter(([key]) => key !== 'success' && key !== 'statusCode' && key !== 'timestamp' && key !== 'path' && key !== 'method')
            .map(([key, value]) => {
              if (typeof value === 'object') {
                return `${key}: ${JSON.stringify(value)}`;
              }
              return `${key}: ${value}`;
            })
            .join(', ');
          errorMessage = errorDetails || errorMessage;
        }
      }
      
      setFormError(errorMessage);
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
      required: true,
      render: ({ value, onChange, error, formData }) => {
        const raw = value || "";
        const [datePartRaw, timePartRaw] = raw.split("T");
        const datePart = datePartRaw || "";
        const timePart = (timePartRaw || "").slice(0, 5);
        // DatePicker ahora devuelve 'yyyy-MM-dd HH:mm', necesitamos convertir a formato ISO
        const handleDate = (d) => {
          // Si d incluye hora (formato 'yyyy-MM-dd HH:mm'), convertir a formato ISO
          if (d.includes(' ')) {
            const [date, time] = d.split(' ');
            onChange(`${date}T${time}:00`);
          } else {
            // Si solo es fecha, mantener el comportamiento anterior
            onChange(`${d}T${timePart || "00:00"}`);
          }
        };
        const handleTime = (t) => onChange(`${datePart || new Date().toISOString().slice(0,10)}T${t}`);
        // Pasar el valor completo al DatePicker si tiene hora, sino solo la fecha
        const datePickerValue = datePart && timePart ? `${datePart} ${timePart}` : datePart;
        return (
          <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Salida Programada</label>
            <DatePicker value={datePickerValue} onChange={handleDate} type="salida" />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
      }
    },
    {
      name: "fechaHoraRetornoProgramada",
      label: "Retorno Programado",
      required: true,
      render: ({ value, onChange, error, formData }) => {
        const raw = value || "";
        const [datePartRaw, timePartRaw] = raw.split("T");
        const datePart = datePartRaw || "";
        const timePart = (timePartRaw || "").slice(0, 5);
        
        // Obtener la fecha de salida para establecer restricciones
        const fechaSalidaRaw = formData?.fechaHoraSalidaProgramada || "";
        let minDate = null;
        let minHour = null;
        let minMinute = null;
        
        if (fechaSalidaRaw) {
          // Parsear la fecha de salida
          const fechaSalidaISO = fechaSalidaRaw.includes('T') 
            ? fechaSalidaRaw 
            : fechaSalidaRaw.includes(' ') 
              ? fechaSalidaRaw.replace(' ', 'T') + ':00'
              : fechaSalidaRaw + 'T00:00:00';
          
          try {
            const fechaSalida = new Date(fechaSalidaISO);
            if (!isNaN(fechaSalida.getTime())) {
              // Establecer minDate como el día siguiente si es el mismo día
              // o el mismo día si la hora de retorno puede ser mayor
              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);
              const fechaSalidaDay = new Date(fechaSalida);
              fechaSalidaDay.setHours(0, 0, 0, 0);
              
              // Si la fecha de salida es hoy o futura, usar esa fecha como mínimo
              if (fechaSalidaDay >= hoy) {
                minDate = fechaSalida.toISOString().slice(0, 10); // 'yyyy-MM-dd'
                
                // Si es el mismo día, la hora mínima debe ser mayor que la hora de salida
                const fechaRetornoDay = datePart ? new Date(datePart + 'T00:00:00') : null;
                if (fechaRetornoDay && fechaRetornoDay.getTime() === fechaSalidaDay.getTime()) {
                  // Mismo día: hora mínima = hora de salida + 1 minuto
                  minHour = fechaSalida.getHours();
                  minMinute = fechaSalida.getMinutes() + 1;
                  if (minMinute >= 60) {
                    minHour += 1;
                    minMinute = 0;
                  }
                } else {
                  // Día diferente: puede empezar desde minHour (7:00)
                  minHour = 7;
                  minMinute = 0;
                }
              }
            }
          } catch (e) {
            console.error("Error parseando fecha de salida:", e);
          }
        }
        
        // DatePicker ahora devuelve 'yyyy-MM-dd HH:mm', necesitamos convertir a formato ISO
        const handleDate = (d) => {
          // Si d incluye hora (formato 'yyyy-MM-dd HH:mm'), convertir a formato ISO
          if (d.includes(' ')) {
            const [date, time] = d.split(' ');
            onChange(`${date}T${time}:00`);
          } else {
            // Si solo es fecha, mantener el comportamiento anterior
            onChange(`${d}T${timePart || "00:00"}`);
          }
        };
        const handleTime = (t) => onChange(`${datePart || new Date().toISOString().slice(0,10)}T${t}`);
        // Pasar el valor completo al DatePicker si tiene hora, sino solo la fecha
        const datePickerValue = datePart && timePart ? `${datePart} ${timePart}` : datePart;
        return (
          <div className="w-full space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Retorno Programada</label>
            <DatePicker 
              value={datePickerValue} 
              onChange={handleDate} 
              type="retorno"
              minDate={minDate}
              minHour={minHour !== null ? minHour : undefined}
              minMinute={minMinute !== null ? minMinute : undefined}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
        );
      }
    },
    {
      name: "sustentoSolicitud",
      label: "Sustento / Justificación",
      render: ({ value, onChange, error }) => {
        const textAreaRef = useRef(null);
        const handleChange = (e) => {
          onChange(e.target.value);
          const el = textAreaRef.current;
          if (el) {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }
        };
        return (
          <div className="w-full space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-3">Sustento / Justificación</label>
            <textarea
              ref={textAreaRef}
              value={value || ''}
              onChange={handleChange}
              placeholder="Explique el motivo con claridad…"
              maxLength={250}
              rows={3}
              className={`
                w-full px-3 py-2 border rounded-lg shadow-sm text-sm resize-none overflow-hidden
                ${error ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'}
              `}
              style={{ height: 'auto' }}
            />
            <div className="mt-1 text-xs text-gray-500 text-right">{(value?.length || 0)}/250</div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>
        );
      },
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
              console.log('Modal - codigo_papeleta:', value, 'data:', data);
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
            key: 'sustento_solicitud',
            label: 'Sustento / Justificación',
            render: (value, data) => {
              return value || data?.sustento_solicitud || 'No especificado';
            }
          },
          {
            key: 'estado',
            label: 'Estado',
            render: (value, data) => {
              const estadoValue = value || data?.estado;
              const estadoMap = {
                SOLICITADO: 'Solicitado',
                APROBADO: 'Aprobado',
                EN_CURSO: 'En curso',
                FINALIZADO: 'Finalizado',
                RECHAZADO: 'Rechazado',
                CANCELADO: 'Cancelado'
              };
              return estadoMap[estadoValue] || estadoValue || '—';
            }
          },
          {
            key: 'observacion_autorizacion',
            label: 'Observación de Autorización',
            render: (value, data) => {
              const observacion = value || data?.observacion_autorizacion;
              const estado = data?.estado;
              
              // Solo mostrar si hay observación o si está rechazado
              if (!observacion && estado !== 'RECHAZADO') return null;
              
              return (
                <div className={`p-3 rounded-lg ${
                  estado === 'RECHAZADO' 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">
                    {observacion || 'Sin observación especificada'}
                  </p>
                </div>
              );
            }
          },
          {
            key: 'fecha_solicitud',
            label: 'Fecha de Solicitud',
            render: (value, data) => {
              const fechaValue = value || data?.fecha_solicitud;
              if (!fechaValue) return '—';
              try {
                const fecha = new Date(fechaValue);
                return fecha.toLocaleString('es-PE');
              } catch {
                return fechaValue;
              }
            }
          }
        ]}
      />

      {/* Modal de Rechazo con Observación */}
      <ModalGenerico
        isOpen={isRechazoModalOpen}
        onClose={handleCancelarRechazo}
        title="Rechazar Papeleta de Salida"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Está seguro de que desea rechazar esta papeleta? Puede agregar una observación explicando el motivo del rechazo (opcional).
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observación (Opcional)
            </label>
            <textarea
              value={observacionRechazo}
              onChange={(e) => setObservacionRechazo(e.target.value)}
              placeholder="Escriba el motivo del rechazo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {observacionRechazo.length}/500 caracteres
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              onClick={handleCancelarRechazo}
              variant="outline"
              size="md"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarRechazo}
              variant="danger"
              size="md"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Rechazar Papeleta
            </Button>
          </div>
        </div>
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
