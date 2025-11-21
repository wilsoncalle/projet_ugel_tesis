import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  Hash,
} from "lucide-react";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { visitasService } from "../../services/api";
import CalendarioVisitas from "./CalendarioVisitas";
import TabView from "../TabView";

const ModalVisitanteDetalle = ({ isOpen, onClose, visitante, periodo }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vistaActiva, setVistaActiva] = useState("calendario");

  const tabs = [
    { key: "calendario", label: "Calendario de Visitas", icon: <Calendar className="h-4 w-4" /> },
    { key: "lista", label: "Historial Detallado", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (isOpen && visitante) fetchDetalle();
  }, [isOpen, visitante, periodo]);

  const fetchDetalle = async () => {
    if (!visitante?.visitante_id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await visitasService.getVisitanteDetalle(
        visitante.visitante_id,
        periodo
      );
      if (response.data.success) setDetalle(response.data.data);
      else setError("Error al cargar el detalle del visitante");
    } catch (err) {
      console.error("Error fetching visitante detalle:", err);
      setError("No se pudo cargar el detalle del visitante");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- HEADER --- */}
        <div className=" text-gray-800 p-5 flex justify-between items-start">
          <div className="flex-1">
            {/* Nombre y documento */}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-200 rounded-lg">
                <User className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold leading-tight">
                  {visitante?.visitante || "Visitante"}
                </h2>
                <p className="text-gray-500 text-xs">
                  {visitante?.tipo_documento || "DNI"}:{" "}
                  {visitante?.numero_documento || "N/A"}
                </p>
              </div>
            </div>

            {/* --- MÉTRICAS RÁPIDAS (compactas) --- */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  titulo: "Total Visitas",
                  valor: detalle?.total_visitas || visitante?.num_visitas || 0,
                  icono: <User className="h-4 w-4" />,
                },
                {
                  titulo: "Última Visita",
                  valor: detalle?.ultima_visita
                    ? new Date(detalle.ultima_visita).toLocaleDateString("es-ES")
                    : "N/A",
                  icono: <Calendar className="h-4 w-4" />,
                },
                {
                  titulo: "Días Distintos",
                  valor: detalle?.visitas_por_fecha?.length || 0,
                  icono: <Hash className="h-4 w-4" />,
                },
              ].map((metrica, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="p-2 bg-gray-50 rounded-lg text-gray-600 flex-shrink-0">
                    {metrica.icono}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {metrica.titulo}
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {metrica.valor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* --- TABS --- */}
        <div className="px-6 bg-white ">
          <TabView tabs={tabs} activeTab={vistaActiva} onTabChange={setVistaActiva} />
        </div>

        {/* --- CONTENIDO --- */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Cargando detalle...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-red-600">
              <p>{error}</p>
              <button
                onClick={fetchDetalle}
                className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm"
              >
                Reintentar
              </button>
            </div>
          ) : vistaActiva === "calendario" ? (
            <div className="flex flex-col items-start space-y-6">
              <CalendarioVisitas
                visitasPorFecha={detalle?.visitas_por_fecha || []}
                compact={true}
              />
              {detalle?.dias_semana?.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-5 w-full max-w-md">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Días más visitados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detalle.dias_semana.map((dia, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {dia}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {detalle?.visitas_por_fecha?.length > 0 ? (
                detalle.visitas_por_fecha.map((visita, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all rounded-xl p-5"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-gray-700 font-semibold">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(visita.fecha), "EEEE d 'de' MMMM yyyy", { locale: es })}
                      </div>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {visita.visitas_dia}{" "}
                        {visita.visitas_dia === 1 ? "visita" : "visitas"}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {visita.detalles.map((det, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-center gap-2 text-gray-700 font-medium mb-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              {det.hora_ingreso}{" "}
                              {det.hora_salida && `→ ${det.hora_salida}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{det.area || "Sin área"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{det.personal || "Sin asignar"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <TrendingUp className="h-4 w-4 text-gray-400" />
                            <span>{det.motivo || "Sin motivo"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No hay visitas registradas en este período.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ModalVisitanteDetalle;
