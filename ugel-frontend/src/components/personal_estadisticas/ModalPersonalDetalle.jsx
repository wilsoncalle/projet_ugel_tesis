import { useState, useEffect } from "react";
import {
  X,
  User,
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import CalendarioAsistencias from "./CalendarioAsistencias";
import TabView from "../TabView";

const ModalPersonalDetalle = ({ isOpen, onClose, personal, periodo }) => {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vistaActiva, setVistaActiva] = useState("calendario");

  const tabs = [
    { key: "calendario", label: "Calendario de Asistencias", icon: <Calendar className="h-4 w-4" /> },
    { key: "lista", label: "Historial Detallado", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (isOpen && personal) fetchDetalle();
  }, [isOpen, personal, periodo]);

  const fetchDetalle = async () => {
    if (!personal?.personal_id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3000/api/asistencia-personal/estadisticas/personal-detalle/${personal.personal_id}?periodo=${periodo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar el detalle del personal');
      }
      
      const result = await response.json();
      if (result.success) {
        setDetalle(result.data);
      } else {
        setError("Error al cargar el detalle del personal");
      }
    } catch (err) {
      console.error("Error fetching personal detalle:", err);
      setError("No se pudo cargar el detalle del personal");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'presente':
        return 'text-green-600 bg-green-50';
      case 'tardanza':
        return 'text-yellow-600 bg-yellow-50';
      case 'ausente':
      case 'falta':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEstadoIcono = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'presente':
        return <CheckCircle className="h-4 w-4" />;
      case 'tardanza':
        return <AlertCircle className="h-4 w-4" />;
      case 'ausente':
      case 'falta':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* --- HEADER --- */}
        <div className="text-gray-800 p-5 flex justify-between items-start border-b border-gray-200">
          <div className="flex-1">
            {/* Nombre y documento */}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold leading-tight">
                  {personal?.personal || "Personal"}
                </h2>
                <p className="text-gray-500 text-xs">
                  {personal?.area || "Sin área asignada"}
                </p>
              </div>
            </div>

            {/* --- MÉTRICAS RÁPIDAS (compactas) --- */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  titulo: "Días Asistidos",
                  valor: detalle?.total_asistencias || personal?.dias_asistidos || 0,
                  icono: <CheckCircle className="h-4 w-4" />,
                  color: "text-green-600",
                },
                {
                  titulo: "Días Puntuales",
                  valor: detalle?.dias_puntuales || personal?.dias_puntuales || 0,
                  icono: <Clock className="h-4 w-4" />,
                  color: "text-blue-600",
                },
                {
                  titulo: "Tardanzas",
                  valor: detalle?.dias_tarde || personal?.dias_tarde || 0,
                  icono: <AlertCircle className="h-4 w-4" />,
                  color: "text-yellow-600",
                },
                {
                  titulo: "Ausencias",
                  valor: detalle?.dias_ausente || personal?.dias_ausente || 0,
                  icono: <XCircle className="h-4 w-4" />,
                  color: "text-red-600",
                },
              ].map((metrica, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className={`flex items-center gap-2 mb-1 ${metrica.color}`}>
                    {metrica.icono}
                    <span className="text-xs font-medium text-gray-600">
                      {metrica.titulo}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {metrica.valor}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* --- TABS --- */}
        <div className="px-5 pt-4">
          <TabView
            tabs={tabs}
            activeTab={vistaActiva}
            onTabChange={setVistaActiva}
          />
        </div>

        {/* --- CONTENIDO --- */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando detalle...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-600">
                <XCircle className="h-12 w-12 mx-auto mb-4" />
                <p>{error}</p>
              </div>
            </div>
          ) : vistaActiva === "calendario" ? (
            <CalendarioAsistencias asistenciasPorFecha={detalle?.asistencias_por_fecha || []} />
          ) : (
            <div className="space-y-3">
              {detalle?.historial?.length > 0 ? (
                detalle.historial.map((registro, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(registro.fecha).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(registro.estado_presencia)}`}>
                        {getEstadoIcono(registro.estado_presencia)}
                        {registro.estado_presencia}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      {registro.hora_ingreso && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>Ingreso: <span className="font-medium text-gray-900">{registro.hora_ingreso}</span></span>
                        </div>
                      )}
                      {registro.hora_salida && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span>Salida: <span className="font-medium text-gray-900">{registro.hora_salida}</span></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay registros de asistencia en este período</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalPersonalDetalle;
