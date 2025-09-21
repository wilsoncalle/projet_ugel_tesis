import { useState, useMemo, useCallback } from 'react';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import Popover from '../Popover';
import TabView from '../TabView';
import FiltrosVisitas from './FiltrosVisitas';
import TableGenerica from '../TableGenerica';
import { UsersIcon, ClockIcon } from '@heroicons/react/24/outline';

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
          itemsPerPage: historialPagination?.itemsPerPage || 10,
          currentPage: historialPagination?.currentPage || 1,
          totalItems: totalItems, // Usar el total real de datos
          onPageChange: onHistorialPageChange
        };
        return historialProps;
      default:
        return { pagination: false };
    }
  }, [activeTab, activosPagination, historialPagination, onActivosPageChange, onHistorialPageChange, getTabData]);

  const getColumns = useMemo(() => {
    const baseColumns = [
      {
        key: 'visitante',
        label: 'Visitante',
        className: 'min-w-[200px]',
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
        className: 'w-[150px] max-w-[150px]',
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
          
          return (
            <div className="text-sm truncate" title={`${empleadoNombre} ${empleadoApellido}`}>
              {`${empleadoNombre} ${empleadoApellido}` || '-'}
            </div>
          );
        }
      },
      {
        key: 'motivo',
        label: 'Motivo',
        className: 'min-w-[150px]',
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {motivoNombre || '-'}
            </span>
          );
        }
      },
      {
        key: 'lugar',
        label: 'Lugar',
        className: 'min-w-[150px]',
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
            <div className="text-sm text-gray-900">{lugar || '-'}</div>
          );
        }
      },
      {
        key: 'horaIngreso',
        label: 'Hora Ingreso',
        className: 'min-w-[80px]',
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
            <div className="text-sm text-gray-900 px-2">
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
        className: 'min-w-[80px]',
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
            <div className="text-sm text-gray-900 px-2">
              {fechaStr || '-'}
            </div>
          );
        }
      });
      
      baseColumns.push({
        key: 'horaSalida',
        label: 'Hora Salida',
        className: 'min-w-[80px]',
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
            <div className="text-sm text-gray-900 px-2">
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
        className: 'min-w-[150px]',
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
            <div className="relative">
              {enEspera ? (
                <button
                  onClick={() => {
                    if (onEliminarVisitanteEspera) {
                      onEliminarVisitanteEspera(row.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              ) : (
                <button
                  onClick={() => {
                    onRegistrarSalida(row.id, row);
                  }}
                  className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-2xl hover:bg-primary-700 transition-colors"
                >
                  Registrar Salida
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
                minTableWidth={activeTab === 'activos' ? '1100px' : '1100px'}
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
