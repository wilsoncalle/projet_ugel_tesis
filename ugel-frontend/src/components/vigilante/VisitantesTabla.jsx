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
  filtros,
  vistaPreviaVisitante,
  vistaPreviaVisita,
  historialPagination,
  onHistorialPageChange,
  activosPagination,
  onActivosPageChange
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

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'activos': {
        console.log('=== DATOS DE VISITANTES ACTIVOS ===');
        console.log('visitantesActivos:', visitantesActivos);
        console.log('visitantesEnEspera:', visitantesEnEspera);
        
        let data = [...(visitantesActivos || []), ...(visitantesEnEspera || [])];
        console.log('Data combinada:', data);
        
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
        
        console.log('Data final retornada:', data);
        return data;
      }
      case 'historial':
        console.log('=== DATOS DE HISTORIAL ===');
        console.log('historialVisitas:', historialVisitas);
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
        console.log('=== PAGINACIÓN ACTIVOS ===');
        console.log('activosPagination:', activosPagination);
        console.log('data.length (totalItems):', totalItems);
        console.log('activosProps:', activosProps);
        return activosProps;
      case 'historial':
        const historialProps = {
          pagination: true,
          itemsPerPage: historialPagination?.itemsPerPage || 10,
          currentPage: historialPagination?.currentPage || 1,
          totalItems: totalItems, // Usar el total real de datos
          onPageChange: onHistorialPageChange
        };
        console.log('=== PAGINACIÓN HISTORIAL ===');
        console.log('historialPagination:', historialPagination);
        console.log('data.length (totalItems):', totalItems);
        console.log('historialProps:', historialProps);
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
            console.warn('Row is undefined/null in visitante render function');
            return (
              <div>
                <div className="font-medium text-gray-900">-</div>
                <div className="text-sm text-gray-500">-</div>
              </div>
            );
          }
          
          console.log('Renderizando visitante, row:', row);
          
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
            console.warn('Row is undefined/null in empleado render function');
            return <div className="text-sm">-</div>;
          }
          
          console.log('Renderizando empleado, row:', row);
          
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
            console.warn('Row is undefined/null in motivo render function');
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">-</span>;
          }
          
          console.log('Renderizando motivo, row:', row);
          
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
            console.warn('Row is undefined/null in lugar render function');
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          console.log('Renderizando lugar, row:', row);
          
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
            console.warn('Row is undefined/null in hora ingreso render function');
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          console.log('Renderizando hora ingreso, row:', row);
          
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
            console.warn('Row is undefined/null in fecha render function');
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          console.log('Renderizando fecha, row:', row);
          
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
            console.warn('Row is undefined/null in hora salida render function');
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          console.log('Renderizando hora salida, row:', row);
          
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
            console.warn('Row is undefined/null in actions render function');
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
              <button
                onClick={() => {
                  setModalAbierto(prev => ({
                    ...prev,
                    [row.id]: !prev[row.id]
                  }));
                }}
                className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
              >
                Registrar Salida
              </button>
              
              {/* Modal simple en lugar de Popover */}
              {modalAbierto[row.id] && (
                <div className="absolute left-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[250px]">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-gray-700">
                      ¿Confirmar salida de <strong>{row.visitante_nombres || row.nombres || ''} {row.visitante_apellidos || row.apellidos || ''}</strong>?
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
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Gestión de Visitantes</h2>
          
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
                {...(() => {
                  const paginationProps = getPaginationProps();
                  console.log('=== PROPS DE PAGINACIÓN ENVIADAS ===');
                  console.log('paginationProps:', paginationProps);
                  return paginationProps;
                })()}
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
