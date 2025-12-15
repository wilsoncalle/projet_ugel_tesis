import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Clock, CheckCircle, XCircle, Forward, LogOut, MapPin, Briefcase, FileText, Calendar } from 'lucide-react';

const ModalDetallesVisita = ({ isOpen, onClose, data, title = "Detalles de Visita" }) => {
  // Construir línea de tiempo de eventos
  const timeline = useMemo(() => {
    if (!data) return [];
    
    const events = [];
    
    // 1. Registro de llegada
    if (data.fecha_ingreso) {
      events.push({
        tipo: 'LLEGADA',
        fecha: data.fecha_ingreso,
        icono: <LogOut className="h-5 w-5 transform rotate-180" />,
        color: 'blue',
        titulo: 'Llegada del Visitante',
        descripcion: 'Registro de ingreso al sistema'
      });
    }
    
    // 2. Aceptación
    if (data.fecha_aceptacion) {
      events.push({
        tipo: 'ACEPTACION',
        fecha: data.fecha_aceptacion,
        icono: <CheckCircle className="h-5 w-5" />,
        color: 'green',
        titulo: 'Visita Aceptada',
        descripcion: `Aceptada por ${data.personal_nombres || ''} ${data.personal_apellidos || ''}`.trim() || 'Personal'
      });
    }
    
    // 3. Rechazo
    if (data.fecha_rechazo) {
      events.push({
        tipo: 'RECHAZO',
        fecha: data.fecha_rechazo,
        icono: <XCircle className="h-5 w-5" />,
        color: 'red',
        titulo: 'Visita Rechazada',
        descripcion: data.motivo_rechazo || 'Sin motivo especificado'
      });
    }
    
    // 4. Delegación
    if (data.fecha_delegacion && data.delegado_por_id) {
      const delegadoPor = `${data.delegado_por_nombres || ''} ${data.delegado_por_apellidos || ''}`.trim();
      events.push({
        tipo: 'DELEGACION',
        fecha: data.fecha_delegacion,
        icono: <Forward className="h-5 w-5" />,
        color: 'purple',
        titulo: 'Visita Delegada',
        descripcion: delegadoPor ? `Delegada a ${delegadoPor}` : 'Delegada a otro personal'
      });
    }
    
    // 5. Fin de atención
    if (data.fecha_fin_atencion) {
      events.push({
        tipo: 'FIN_ATENCION',
        fecha: data.fecha_fin_atencion,
        icono: <CheckCircle className="h-5 w-5" />,
        color: 'amber',
        titulo: 'Fin de Atención',
        descripcion: 'Visita finalizada'
      });
    }
    
    // 6. Salida
    if (data.fecha_salida) {
      events.push({
        tipo: 'SALIDA',
        fecha: data.fecha_salida,
        icono: <LogOut className="h-5 w-5" />,
        color: 'gray',
        titulo: 'Salida del Visitante',
        descripcion: 'Registro de salida del sistema'
      });
    }
    
    // Ordenar por fecha
    return events.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [data]);
  
  if (!isOpen || !data) return null;
  
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[color] || colors.gray;
  };
  
  const visitanteNombre = `${data.visitante_nombres || ''} ${data.visitante_apellidos || ''}`.trim();
  const personalNombre = `${data.personal_nombres || ''} ${data.personal_apellidos || ''}`.trim();
  const delegadoNombre = `${data.delegado_por_nombres || ''} ${data.delegado_por_apellidos || ''}`.trim();
  
  const modalContent = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">{visitanteNombre || 'Visitante'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información del Visitante */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Información del Visitante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Nombre Completo</p>
                <p className="text-sm font-medium text-gray-900">{visitanteNombre || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Documento</p>
                <p className="text-sm font-medium text-gray-900">
                  {data.tipo_documento_codigo || 'DNI'}: {data.numero_documento || '-'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Información de la Visita */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detalles de la Visita
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Personal Visitado</p>
                <p className="text-sm font-medium text-gray-900">{personalNombre || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Cargo</p>
                <p className="text-sm font-medium text-gray-900">{data.personal_cargo || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Motivo de Visita</p>
                <p className="text-sm font-medium text-gray-900">{data.nombre_motivo || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Área de Destino</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  {data.nombre_area || '-'}
                </p>
              </div>
              {delegadoNombre && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Delegado a</p>
                  <p className="text-sm font-medium text-purple-700 flex items-center gap-1">
                    <Forward className="h-3 w-3" />
                    {delegadoNombre}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Línea de Tiempo */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Trazabilidad de la Visita
            </h3>
            
            {timeline.length > 0 ? (
              <div className="relative">
                {/* Línea vertical */}
                <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200" />
                
                {/* Eventos */}
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={index} className="relative flex gap-4">
                      {/* Icono */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white z-10 ${getColorClasses(event.color)}`}>
                        {event.icono}
                      </div>
                      
                      {/* Contenido */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-900">{event.titulo}</h4>
                          <span className="text-xs font-medium text-gray-500">{formatTime(event.fecha)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{event.descripcion}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(event.fecha)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay eventos registrados</p>
              </div>
            )}
          </div>
          
          {/* Información Adicional */}
          {data.observaciones && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">Observaciones</h4>
              <p className="text-sm text-amber-800">{data.observaciones}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
};

export default ModalDetallesVisita;
