import { useState } from 'react';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import Popover from '../Popover';
import FiltrosVisitas from './FiltrosVisitas';
import TablaVisitas from './TablaVisitas';
import { UsersIcon, ClockIcon } from '@heroicons/react/24/outline';

const VisitantesTabla = ({
  visitantesActivos,
  visitantesEnEspera,
  historialVisitas,
  activeTab,
  onTabChange,
  onBuscarHistorial,
  onRegistrarSalida,
  filtros,
  vistaPreviaVisitante,
  vistaPreviaVisita,
  historialPagination,
  onHistorialPageChange
}) => {
  console.log('=== VISITANTES TABLA RENDERIZANDO ===');
  console.log('onRegistrarSalida es función:', typeof onRegistrarSalida);
  console.log('onRegistrarSalida:', onRegistrarSalida);
  console.log('Visitantes activos:', visitantesActivos);
  console.log('Visitantes en espera:', visitantesEnEspera);
  console.log('=== FIN VISITANTES TABLA ===');
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);
  const [modalAbierto, setModalAbierto] = useState({});

  const handleTabClick = (tab) => {
    onTabChange(tab);
    if (tab === 'historial' && !filtrosExpanded) {
      setFiltrosExpanded(true);
    }
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'activos': {
        console.log('=== DATOS DE VISITANTES ACTIVOS ===');
        console.log('visitantesActivos:', visitantesActivos);
        console.log('visitantesEnEspera:', visitantesEnEspera);
        
        let data = [...visitantesActivos, ...visitantesEnEspera];
        
        // Añadir vista previa si existe y no está vacía
        if (vistaPreviaVisitante && Object.values(vistaPreviaVisitante).some(val => val)) {
          // Crear un objeto combinado con la información del visitante y la visita
          const previewData = {
            ...vistaPreviaVisitante,
            isPreview: true // Marca para identificar que es una vista previa
          };
          
          // Añadir datos de la visita si existen
          if (vistaPreviaVisita) {
            if (vistaPreviaVisita.empleado) {
              previewData.empleadoVisitado = vistaPreviaVisita.empleado;
              previewData.personal_nombres = vistaPreviaVisita.empleado.nombres;
              previewData.personal_apellidos = vistaPreviaVisita.empleado.apellidos;
            }
            
            if (vistaPreviaVisita.motivo) {
              previewData.motivo = vistaPreviaVisita.motivo;
              previewData.nombre_motivo = vistaPreviaVisita.motivo.label;
              // Agregar campos adicionales para compatibilidad
              previewData.motivo_nombre = vistaPreviaVisita.motivo.label;
              previewData.motivo_visita_nombre = vistaPreviaVisita.motivo.label;
              previewData.motivo_visita = vistaPreviaVisita.motivo.label;
              previewData.motivo_descripcion = vistaPreviaVisita.motivo.label;
            }
            
            if (vistaPreviaVisita.lugar) {
              console.log('=== CONSTRUYENDO VISTA PREVIA DEL LUGAR ===');
              console.log('vistaPreviaVisita.lugar:', vistaPreviaVisita.lugar);
              console.log('vistaPreviaVisita.lugarId:', vistaPreviaVisita.lugarId);
              
              previewData.lugar = vistaPreviaVisita.lugar;
              previewData.nombre_area = vistaPreviaVisita.lugar;
              // Agregar campos adicionales para compatibilidad
              previewData.area = vistaPreviaVisita.lugar;
              previewData.area_nombre = vistaPreviaVisita.lugar;
              previewData.area_destino = vistaPreviaVisita.lugar;
              previewData.area_destino_nombre = vistaPreviaVisita.lugar;
            }
          }
          
          // Agregar la vista previa al principio del array
          console.log('=== VISTA PREVIA CONSTRUIDA ===');
          console.log('previewData completo:', previewData);
          console.log('previewData.motivo:', previewData.motivo);
          console.log('previewData.nombre_motivo:', previewData.nombre_motivo);
          data = [previewData, ...data];
        }
        
        return data;
      }
      case 'historial':
        return historialVisitas;
      default:
        return [];
    }
  };

  const getColumns = () => {
    const baseColumns = [
      {
        key: 'visitante',
        label: 'Visitante',
        render: (row) => {
          console.log('Renderizando visitante, row:', row);
          
          // Verificar si estamos en visitantes activos o historial
          let nombres = '';
          let apellidos = '';
          let tipoDoc = 'DNI';
          let numDoc = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              nombres = row.nombres || '';
              apellidos = row.apellidos || '';
              tipoDoc = row.tipoDocumento?.nombre_completo || 'DNI';
              numDoc = row.numeroDocumento || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              // Verificar si tenemos un objeto visitante anidado
              if (row.visitante && typeof row.visitante === 'object') {
                nombres = row.visitante.nombres || '';
                apellidos = row.visitante.apellidos || '';
                tipoDoc = row.visitante.tipoDocumento?.nombre_completo || 'DNI';
                numDoc = row.visitante.numeroDocumento || '';
              } else {
                nombres = row.nombres || row.visitante_nombres || '';
                apellidos = row.apellidos || row.visitante_apellidos || '';
                tipoDoc = row.tipo_documento_codigo || 'DNI';
                numDoc = row.numeroDocumento || row.numero_documento || '';
              }
            }
          } 
          // Para historial (formato plano)
          else {
            nombres = row.visitante_nombres || '';
            apellidos = row.visitante_apellidos || '';
            tipoDoc = row.tipo_documento_codigo || 'DNI';
            numDoc = row.numero_documento || '';
          }
          
          return (
            <div>
              <div className="font-medium text-gray-900">
                {nombres} {apellidos}
              </div>
              <div className="text-sm text-gray-500">
                {tipoDoc}: {numDoc}
              </div>
            </div>
          );
        }
      },
      {
        key: 'empleado',
        label: 'Empleado Visitado',
        render: (row) => {
          console.log('Renderizando empleado, row:', row);
          
          let empleadoNombre = '';
          let empleadoApellido = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              const empleado = row.empleado || {};
              return (
                <div className="text-sm">
                  {empleado.label || '-'}
                </div>
              );
            } 
            // Si es un visitante activo (de la API)
            else {
              // Verificar si tenemos un objeto empleadoVisitado anidado
              if (row.empleadoVisitado && typeof row.empleadoVisitado === 'object') {
                empleadoNombre = row.empleadoVisitado.nombres || '';
                empleadoApellido = row.empleadoVisitado.apellidos || '';
              } else {
                empleadoNombre = row.personal_nombres || '';
                empleadoApellido = row.personal_apellidos || '';
              }
            }
          } 
          // Para historial (formato plano)
          else {
            empleadoNombre = row.personal_nombres || '';
            empleadoApellido = row.personal_apellidos || '';
          }
          
          return (
            <div className="text-sm">
              {`${empleadoNombre} ${empleadoApellido}` || '-'}
            </div>
          );
        }
      },
      {
        key: 'motivo',
        label: 'Motivo',
        render: (row) => {
          console.log('Renderizando motivo, row:', row);
          
          let motivoNombre = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              const motivo = row.motivo || {};
              motivoNombre = motivo.label || '';
            } 
                    // Si es un visitante activo (de la API)
        else {
          console.log('=== DEPURANDO MOTIVO PARA VISITANTE ACTIVO ===');
          console.log('Row completo:', row);
          console.log('row.motivo:', row.motivo);
          console.log('row.nombre_motivo:', row.nombre_motivo);
          console.log('row.motivo_nombre:', row.motivo_nombre);
          console.log('row.motivo_visita_nombre:', row.motivo_visita_nombre);
          console.log('row.motivo_visita:', row.motivo_visita);
          console.log('row.motivo_descripcion:', row.motivo_descripcion);
          
          // Verificar si tenemos un objeto motivo anidado
          if (row.motivo && typeof row.motivo === 'object') {
            motivoNombre = row.motivo.label || row.motivo.nombre_motivo || row.motivo.nombre || '';
            console.log('Motivo encontrado en objeto anidado:', motivoNombre);
            console.log('Valor final del motivo (objeto):', motivoNombre);
          } else {
            // Buscar el motivo en diferentes campos posibles
            motivoNombre = row.nombre_motivo || 
                          row.motivo_nombre || 
                          row.motivo_visita_nombre ||
                          row.motivo_visita ||
                          row.motivo_descripcion ||
                          (row.motivo && row.motivo.label) ||
                          '';
            console.log('Motivo encontrado en campos planos:', motivoNombre);
            console.log('Valor final del motivo (campos planos):', motivoNombre);
          }
        }
          } 
          // Para historial (formato plano)
          else {
            motivoNombre = row.nombre_motivo || '';
            console.log('Motivo encontrado en historial:', motivoNombre);
          }
          
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {motivoNombre || '-'}
            </span>
          );
        }
      },
      {
        key: 'lugar',
        label: 'Lugar',
        render: (row) => {
          console.log('Renderizando lugar, row:', row);
          
          let lugar = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              lugar = row.lugar || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              console.log('=== DEPURANDO LUGAR PARA VISITANTE ACTIVO ===');
              console.log('Row completo:', row);
              console.log('row.lugar:', row.lugar);
              console.log('row.nombre_area:', row.nombre_area);
              console.log('row.area:', row.area);
              console.log('row.area_nombre:', row.area_nombre);
              console.log('row.area_destino:', row.area_destino);
              console.log('row.area_destino_nombre:', row.area_destino_nombre);
              
              // Buscar el lugar en diferentes campos posibles
              // Priorizar nombres sobre IDs
              lugar = row.nombre_area || 
                     row.area_nombre ||
                     row.area_destino_nombre ||
                     row.lugarNombre ||
                     row.lugar || 
                     row.area || 
                     row.area_destino ||
                     '';
              
              console.log('Lugar encontrado:', lugar);
              console.log('Valor final del lugar:', lugar);
            }
          } 
          // Para historial (formato plano)
          else {
            lugar = row.nombre_area || '';
            console.log('Lugar encontrado en historial:', lugar);
          }
          
          return (
            <div className="text-sm text-gray-900">{lugar || '-'}</div>
          );
        }
      },
      {
        key: 'fecha',
        label: 'Fecha',
        render: (row) => {
          console.log('Renderizando fecha, row:', row);
          
          let fechaStr = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              fechaStr = row.fechaIngreso || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              try {
                const fechaIngreso = row.fechaIngreso || row.fecha_ingreso;
                if (fechaIngreso) {
                  const fecha = new Date(fechaIngreso);
                  if (!isNaN(fecha.getTime())) {
                    fechaStr = fecha.toLocaleDateString('es-PE');
                  } else {
                    fechaStr = fechaIngreso;
                  }
                }
              } catch (e) {
                console.error('Error al formatear fecha:', e);
              }
            }
          } 
          // Para historial (formato plano)
          else {
            try {
              const fechaIngreso = row.fecha_ingreso;
              if (fechaIngreso) {
                const fecha = new Date(fechaIngreso);
                if (!isNaN(fecha.getTime())) {
                  fechaStr = fecha.toLocaleDateString('es-PE');
                } else {
                  fechaStr = fechaIngreso;
                }
              }
            } catch (e) {
              console.error('Error al formatear fecha:', e);
            }
          }
          
          return (
            <div className="text-sm text-gray-900">
              {fechaStr || '-'}
            </div>
          );
        }
      },
      {
        key: 'horaIngreso',
        label: 'Hora Ingreso',
        render: (row) => {
          console.log('Renderizando hora ingreso, row:', row);
          
          let horaFormateada = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if (visitantesEnEspera.some(v => v.id === row.id)) {
              horaFormateada = row.horaIngreso || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              try {
                // Intentar extraer la hora del campo horaIngreso directo
                if (row.horaIngreso) {
                  horaFormateada = row.horaIngreso.substring(0, 5);
                }
                // O intentar extraer la hora de fecha_ingreso
                else if (row.fecha_ingreso) {
                  const fecha = new Date(row.fecha_ingreso);
                  if (!isNaN(fecha.getTime())) {
                    horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                  }
                }
              } catch (e) {
                console.error('Error al formatear hora de ingreso:', e);
              }
            }
          } 
          // Para historial (formato plano)
          else {
            try {
              const fechaIngreso = row.fecha_ingreso;
              if (fechaIngreso) {
                const fecha = new Date(fechaIngreso);
                if (!isNaN(fecha.getTime())) {
                  horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                }
              }
            } catch (e) {
              console.error('Error al formatear hora de ingreso:', e);
            }
          }
          
          return (
            <div className="text-sm text-gray-900">
              {horaFormateada || '-'}
            </div>
          );
        }
      }
    ];

    if (activeTab === 'historial') {
      baseColumns.push({
        key: 'horaSalida',
        label: 'Hora Salida',
        render: (row) => {
          console.log('Renderizando hora salida, row:', row);
          
          // Extraer la hora de la fecha_salida
          let horaFormateada = '';
          try {
            const fechaSalida = row.fecha_salida;
            if (fechaSalida) {
              const fecha = new Date(fechaSalida);
              if (!isNaN(fecha.getTime())) {
                horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
              }
            }
          } catch (e) {
            console.error('Error al formatear hora de salida:', e);
          }
          
          return (
            <div className="text-sm text-gray-900">
              {horaFormateada || '-'}
            </div>
          );
        }
      });
    } else {
      baseColumns.push({
        key: 'acciones',
        label: 'Salida',
        render: (row) => {
          console.log('=== RENDERIZANDO ACCIONES PARA ROW ===');
          console.log('Row ID:', row.id);
          console.log('Empleado visitado:', row.empleadoVisitado);
          console.log('Visitantes en espera:', visitantesEnEspera);
          
          // Verificar si es un visitante en espera (sin empleadoVisitado completo)
          const isEnEspera = !row.empleadoVisitado?.nombres || visitantesEnEspera.some(v => v.id === row.id);
          
          console.log('¿Es en espera?', isEnEspera);
          console.log('Condición 1 - Sin empleado:', !row.empleadoVisitado?.nombres);
          console.log('Condición 2 - En visitantes en espera:', visitantesEnEspera.some(v => v.id === row.id));
          
          if (isEnEspera) {
            console.log('Mostrando "En espera" para row ID:', row.id);
            return (
              <span className="text-sm text-gray-400 italic">
                En espera
              </span>
            );
          }
          
          console.log('Mostrando botón "Registrar" para row ID:', row.id);
          
                     return (
             <div className="relative">
               <button 
                 className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                 onClick={() => {
                   console.log('=== BOTÓN REGISTRAR CLICKEADO ===');
                   console.log('Row ID:', row.id);
                   console.log('Row completo:', row);
                   console.log('Empleado visitado:', row.empleadoVisitado);
                   console.log('Visitantes en espera:', visitantesEnEspera);
                                       // Toggle del estado del modal para esta fila específica
                    setModalAbierto(prev => ({
                      ...prev,
                      [row.id]: !prev[row.id]
                    }));
                 }}
               >
                 Registrar
               </button>
               
                               {/* Modal simple en lugar de Popover */}
                {modalAbierto[row.id] && (
                 <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[250px]">
                   <div className="text-center space-y-3">
                     <p className="text-sm text-gray-700">
                       ¿Confirmar salida de <strong>{row.visitante_nombres} {row.visitante_apellidos}</strong>?
                     </p>
                     <div className="flex space-x-2">
                       <button
                         onClick={() => {
                           console.log('=== BOTÓN CONFIRMAR SALIDA CLICKEADO ===');
                           console.log('Row ID:', row.id);
                           console.log('Llamando a onRegistrarSalida...');
                           console.log('onRegistrarSalida es función:', typeof onRegistrarSalida);
                           console.log('Antes de llamar a onRegistrarSalida');
                           onRegistrarSalida(row.id);
                           console.log('Después de llamar a onRegistrarSalida');
                                                       setModalAbierto(prev => ({
                              ...prev,
                              [row.id]: false
                            }));
                         }}
                         className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                       >
                         Confirmar Salida
                       </button>
                       <button
                         onClick={() => setModalAbierto(prev => ({
                           ...prev,
                           [row.id]: false
                         }))}
                         className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors"
                       >
                         Cancelar
                       </button>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           );
        }
      });
    }

    return baseColumns;
  };

  const countActivos = visitantesActivos.length;

  return (
    <div className="h-full flex flex-col">
      {/* Pestañas */}
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm flex-1 flex flex-col">
        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <nav className="-mb-px flex space-x-2 px-6">
            <button
              onClick={() => handleTabClick('activos')}
              className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'activos'
                  ? 'border-primary-500 text-primary-700 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${activeTab === 'activos' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <UsersIcon className={`h-4 w-4 ${activeTab === 'activos' ? 'text-primary-600' : 'text-gray-500'}`} />
                </div>
                <span>Visitantes Activos</span>
                {countActivos > 0 && (
                  <Badge variant={activeTab === 'activos' ? 'primary' : 'default'} size="sm">
                    {countActivos}
                  </Badge>
                )}
              </div>
            </button>
            
            <button
              onClick={() => handleTabClick('historial')}
              className={`py-4 px-6 border-b-3 font-semibold text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === 'historial'
                  ? 'border-primary-500 text-primary-700 bg-white shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-1.5 rounded-lg ${activeTab === 'historial' ? 'bg-primary-100' : 'bg-gray-200'}`}>
                  <ClockIcon className={`h-4 w-4 ${activeTab === 'historial' ? 'text-primary-600' : 'text-gray-500'}`} />
                </div>
                <span>Historial de Visitas</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Contenido de las pestañas */}
        <div className="p-4 flex-1 flex flex-col">
          {activeTab === 'historial' && (
            <div className="mb-4">
              <FiltrosVisitas
                filtros={filtros}
                onBuscar={onBuscarHistorial}
                isExpanded={filtrosExpanded}
                onToggleExpanded={setFiltrosExpanded}
                historialPagination={historialPagination}
                onHistorialPageChange={onHistorialPageChange}
              />
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <TablaVisitas
            data={getTabData()}
            columns={getColumns()}
            visitantesEnEspera={visitantesEnEspera}
            onRegistrarSalida={onRegistrarSalida}
              emptyMessage={
                activeTab === 'activos'
                  ? 'No hay visitantes activos en este momento'
                  : 'No se encontraron registros para los filtros aplicados'
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VisitantesTabla;
