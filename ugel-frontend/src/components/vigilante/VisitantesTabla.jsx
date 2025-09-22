import { useState, useMemo, useCallback } from 'react';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import Popover from '../Popover';
import TabView from '../TabView';
import FiltrosVisitas from './FiltrosVisitas';
import TableGenerica from '../TableGenerica';
import { UsersIcon, ClockIcon, ArrowRightOnRectangleIcon, TrashIcon } from '@heroicons/react/24/outline';

const VisitantesTabla = ({
  visitantesActivos,
  visitantesEnEspera,
  historialVisitas,
  activeTab,
  onTabChange,
  onBuscarHistorial,
  onRegistrarSalida,
  onEliminarVisitanteEspera, // Nueva prop para eliminar visitante de espera
  filtros,
  vistaPreviaVisitante,
  vistaPreviaVisita,
  historialPagination,
  onHistorialPageChange,
  activosPagination,
  onActivosPageChange
}) => {
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);

  const handleTabClick = (tab) => {
    onTabChange(tab);
    if (tab === 'historial' && !filtrosExpanded) {
      setFiltrosExpanded(true);
    }
  };

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'activos': {
        let data = [...(visitantesActivos || []), ...(visitantesEnEspera || [])];
        
        // Solo agregar vista previa si tiene datos válidos
        if (vistaPreviaVisitante && 
            vistaPreviaVisitante.nombres && 
            vistaPreviaVisitante.apellidos && 
            vistaPreviaVisitante.numeroDocumento) {
          
          const previewData = {
            id: 'preview',
            visitante_nombres: vistaPreviaVisitante.nombres,
            visitante_apellidos: vistaPreviaVisitante.apellidos,
            tipo_documento_codigo: 'DNI',
            numero_documento: vistaPreviaVisitante.numeroDocumento,
            personal_nombres: vistaPreviaVisita?.empleado?.nombres || '',
            personal_apellidos: vistaPreviaVisita?.empleado?.apellidos || '',
            nombre_motivo: vistaPreviaVisita?.motivo?.label || '',
            nombre_area: vistaPreviaVisita?.lugar || '',
            fecha_ingreso: new Date().toLocaleDateString(),
            hora_ingreso: new Date().toLocaleTimeString(),
            isPreview: true
          };
          
          data = [previewData, ...data];
        }
        
        return data;
      }
      case 'historial':
        return historialVisitas || [];
      default:
        return [];
    }
  }, [activeTab, visitantesActivos, visitantesEnEspera, historialVisitas, vistaPreviaVisitante, vistaPreviaVisita]);
  
  const getPaginationProps = useCallback(() => {
    const data = getTabData();
    const totalItems = data.length;
    
    switch (activeTab) {
      case 'activos':
        const activosProps = {
          pagination: true,
          itemsPerPage: activosPagination?.itemsPerPage || 10,
          currentPage: activosPagination?.currentPage || 1,
          totalItems: totalItems, // Usar el total real de datos
          onPageChange: onActivosPageChange
        };
        return activosProps;
      case 'historial':
        const historialProps = {
          pagination: true,
          itemsPerPage: historialPagination?.itemsPerPage || 15,
          currentPage: historialPagination?.currentPage || 1,
          totalItems: historialPagination?.totalItems || 0, // Solo usar el total del backend
          totalPages: historialPagination?.totalPages || 1, // Solo usar el total del backend
          onPageChange: onHistorialPageChange
        };
        return historialProps;
      default:
        return { pagination: false };
    }
  }, [activeTab, activosPagination, historialPagination, onActivosPageChange, onHistorialPageChange, getTabData]);

  const getColumns = useMemo(() => {
    // Función para obtener anchos según el tab activo
    const getColumnWidths = (baseWidth, historialWidth) => {
      return activeTab === 'historial' ? historialWidth : baseWidth;
    };

    const baseColumns = [
      {
        key: 'visitante',
        label: 'Visitante',
        minWidth: getColumnWidths('180px', '220px'),
        maxWidth: getColumnWidths('200px', '260px'),
        width: getColumnWidths('25%', '30%'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return (
              <div>
                <div className="font-medium text-gray-900">-</div>
                <div className="text-sm text-gray-500">-</div>
              </div>
            );
          }
          
          // Verificar si estamos en visitantes activos o historial
          let nombres = '';
          let apellidos = '';
          let tipoDoc = 'DNI';
          let numDoc = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if ((visitantesEnEspera || []).some(v => v.id === row.id)) {
              nombres = row.nombres || '';
              apellidos = row.apellidos || '';
              tipoDoc = row.tipoDocumento?.nombre_completo || 'DNI';
              numDoc = row.numeroDocumento || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              // Usar la estructura transformada del dashboard
              nombres = row.visitante_nombres || row.nombres || '';
              apellidos = row.visitante_apellidos || row.apellidos || '';
              tipoDoc = row.tipo_documento_codigo || 'DNI';
              numDoc = row.numero_documento || row.numeroDocumento || '';
            }
          } 
          // Para historial (formato plano)
          else {
            nombres = row.visitante_nombres || row.nombres || '';
            apellidos = row.visitante_apellidos || row.apellidos || '';
            tipoDoc = row.tipo_documento_codigo || 'DNI';
            numDoc = row.numero_documento || '';
          }
          
          const nombreCompleto = `${nombres} ${apellidos}`.trim();
          const documentoCompleto = `${tipoDoc}: ${numDoc}`;
          
          return (
            <div className="max-w-full">
              <div className="font-medium text-gray-900 break-words" title={nombreCompleto}>
                {nombreCompleto}
              </div>
              <div className="text-sm text-gray-500 break-words" title={documentoCompleto}>
                {documentoCompleto}
              </div>
            </div>
          );
        }
      },
      {
        key: 'empleado',
        label: 'Empleado Visitado',
        minWidth: getColumnWidths('120px', '200px'),
        maxWidth: getColumnWidths('180px', '280px'),
        width: getColumnWidths('20%', '35%'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm">-</div>;
          }
          
          let empleadoNombre = '';
          let empleadoApellido = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if ((visitantesEnEspera || []).some(v => v.id === row.id)) {
              const empleado = row.empleado || {};
              return (
                <div className="text-sm">
                  {empleado.label || '-'}
                </div>
              );
            } 
            // Si es un visitante activo (de la API)
            else {
              // Usar la estructura transformada del dashboard
              empleadoNombre = row.personal_nombres || '';
              empleadoApellido = row.personal_apellidos || '';
            }
          } 
          // Para historial (formato plano)
          else {
            empleadoNombre = row.personal_nombres || '';
            empleadoApellido = row.personal_apellidos || '';
          }
          
          const empleadoCompleto = `${empleadoNombre} ${empleadoApellido}`.trim();
          
          return (
            <div 
              className="text-sm line-clamp-2" 
              title={empleadoCompleto}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {empleadoCompleto || '-'}
            </div>
          );
        }
      },
      {
        key: 'motivo',
        label: 'Motivo',
        minWidth: getColumnWidths('120px', '200px'),
        maxWidth: getColumnWidths('180px', '280px'),
        width: getColumnWidths('20%', '35%'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">-</span>;
          }
          
          let motivoNombre = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if ((visitantesEnEspera || []).some(v => v.id === row.id)) {
              const motivo = row.motivo || {};
              motivoNombre = motivo.label || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              // Usar la estructura transformada del dashboard
              motivoNombre = row.nombre_motivo || '';
            }
          } 
          // Para historial (formato plano)
          else {
            motivoNombre = row.nombre_motivo || '';
          }
          
          return (
            <div className="inline-block max-w-full">
              <span 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                title={motivoNombre}
                style={{
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: '1.2',
                  width: 'fit-content'
                }}
              >
                {motivoNombre || '-'}
              </span>
            </div>
          );
        }
      },
      {
        key: 'lugar',
        label: 'Lugar',
        minWidth: getColumnWidths('120px', '200px'),
        maxWidth: getColumnWidths('180px', '280px'),
        width: getColumnWidths('20%', '35%'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          let lugar = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante activo (de la API)
            lugar = row.nombre_area || '';
          } 
          // Para historial (formato plano)
          else {
            lugar = row.nombre_area || '';
          }
          
          return (
            <div 
              className="text-sm text-gray-900" 
              title={lugar}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {lugar || '-'}
            </div>
          );
        }
      },
      {
        key: 'horaIngreso',
        label: 'Ingreso',
        minWidth: getColumnWidths('60px', '60px'),
        maxWidth: getColumnWidths('80px', '80px'),
        width: getColumnWidths('80px', '80px'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          let horaFormateada = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            // Si es un visitante en espera (local)
            if ((visitantesEnEspera || []).some(v => v.id === row.id)) {
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
                    horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
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
                  horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
              }
            } catch (e) {
              console.error('Error al formatear hora de ingreso:', e);
            }
          }
          
          return (
            <div className="text-sm text-gray-900 px-1">
              {horaFormateada || '-'}
            </div>
          );
        }
      }
    ];

    if (activeTab === 'historial') {
      // Agregar columna de fecha solo para historial
      baseColumns.push({
        key: 'fecha',
        label: 'Fecha',
        minWidth: '100px',
        maxWidth: '110px',
        width: '110px',
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          let fechaStr = '';
          
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
          
          return (
            <div className="text-sm text-gray-900 px-1">
              {fechaStr || '-'}
            </div>
          );
        }
      });
      
      baseColumns.push({
        key: 'horaSalida',
        label: 'Salida',
        minWidth: getColumnWidths('60px', '80px'),
        maxWidth: getColumnWidths('80px', '80px'),
        width: getColumnWidths('80px', '80px'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          // Extraer la hora de la fecha_salida
          let horaFormateada = '';
          try {
            const fechaSalida = row.fecha_salida;
            if (fechaSalida) {
              const fecha = new Date(fechaSalida);
              if (!isNaN(fecha.getTime())) {
                horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
              }
            }
          } catch (e) {
            console.error('Error al formatear hora de salida:', e);
          }
          
          return (
            <div className="text-sm text-gray-900 px-1">
              {horaFormateada || '-'}
            </div>
          );
        }
      });
    }

    // Add actions column for active visitors
    if (activeTab === 'activos') {
      baseColumns.push({
        key: 'actions',
        label: 'Acciones',
        minWidth: '80px',
        maxWidth: '100px',
        width: '100px',
        sticky: 'right',
        stickyOffset: '0px',
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return null;
          }
          
          const enEspera = (visitantesEnEspera || []).some(v => v.id === row.id);
          const isPreview = row.isPreview === true;
          
          // Only show actions for active visitors (not previews)
          if (isPreview) {
            return null;
          }
          
          return (
            <div className="flex justify-center">
              {enEspera ? (
                <button
                  onClick={() => {
                    if (onEliminarVisitanteEspera) {
                      onEliminarVisitanteEspera(row.id);
                    }
                  }}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Eliminar Visitante"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    onRegistrarSalida(row.id, row);
                  }}
                  className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                  title="Registrar Salida"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      });
    }

    return baseColumns;
  }, [activeTab, visitantesEnEspera, onRegistrarSalida]);

  const countActivos = visitantesActivos.length;

  // Configuración de las pestañas
  const tabs = [
    {
      key: 'activos',
      label: 'Visitantes Activos',
      icon: <UsersIcon className="h-4 w-4" />,
      count: countActivos
    },
    {
      key: 'historial',
      label: 'Historial de Visitas',
      icon: <ClockIcon className="h-4 w-4" />
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <Card className="shadow-lg border border-gray-200 bg-card flex-1 flex flex-col rounded-2xl">
        <div className="p-0 flex flex-col h-full">
          {/* Título de la sección */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Gestión de Visitantes</h2>
            {visitantesEnEspera.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-amber-600 font-medium">
                  {visitantesEnEspera.length} en espera
                </span>
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              </div>
            )}
          </div>
          
          {/* Tab Slider */}
          <TabView 
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabClick}
            className="flex-1 flex flex-col"
          >


            {/* Tabla de datos */}
            <div className="flex-1" style={{ maxWidth: '100%' }}>
              <TableGenerica
                columns={getColumns}
                data={getTabData()}
                isRowInWaiting={(row) => (visitantesEnEspera || []).some(v => v.id === row.id)}
                {...getPaginationProps()}
                emptyMessage={
                  activeTab === 'activos'
                    ? 'No hay visitantes activos en este momento'
                    : 'No se encontraron registros para los filtros aplicados'
                }
              />
            </div>
          </TabView>
        </div>
      </Card>
    </div>
  );
};

export default VisitantesTabla;
