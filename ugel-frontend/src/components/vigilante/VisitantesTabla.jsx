import { useState, useMemo, useCallback } from 'react';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import Popover from '../Popover';
import TabView from '../TabView';
import FiltrosVisitas from './FiltrosVisitas';
import TableGenerica from '../TableGenerica';
import ModalDetalles from '../ModalDetalles';
import { UsersIcon, ClockIcon, ArrowRightOnRectangleIcon, TrashIcon, EyeIcon, DocumentTextIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

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
  
  // Estados para el modal de detalles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleTabClick = (tab) => {
    onTabChange(tab);
    if (tab === 'historial' && !filtrosExpanded) {
      setFiltrosExpanded(true);
    }
  };

  // Funciones para manejar el modal de detalles
  const handleOpenModal = useCallback((item) => {
    console.log('Abriendo modal para item:', item);
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    // Limpiar selectedItem después de un delay para que la animación termine
    setTimeout(() => {
      setSelectedItem(null);
    }, 300); // 300ms coincide con la duración de la animación
  }, []);

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
            personal_cargo: vistaPreviaVisita?.empleado?.cargo || '',
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
          totalItems: historialPagination?.totalItems || data.length, // Usar total del backend o datos locales
          totalPages: historialPagination?.totalPages || Math.ceil(data.length / (historialPagination?.itemsPerPage || 15)), // Calcular si no hay totalPages
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
        key: 'cargo',
        label: 'Cargo',
        minWidth: getColumnWidths('120px', '200px'),
        maxWidth: getColumnWidths('180px', '280px'),
        width: getColumnWidths('20%', '35%'),
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }
          
          let cargo = '';
          
          // Para visitantes activos (estructura diferente)
          if (activeTab === 'activos') {
            console.log('VisitantesTabla - Row completo para activos:', row);
            // Si es un visitante en espera (local)
            if ((visitantesEnEspera || []).some(v => v.id === row.id)) {
              console.log('VisitantesTabla - Es visitante en espera, cargo:', row.empleado?.cargo);
              cargo = row.empleado?.cargo || '';
            } 
            // Si es un visitante activo (de la API)
            else {
              console.log('VisitantesTabla - Es visitante activo, personal_cargo:', row.personal_cargo);
              console.log('VisitantesTabla - empleadoVisitado:', row.empleadoVisitado);
              // Usar la estructura transformada del dashboard
              cargo = row.personal_cargo || row.empleadoVisitado?.cargo || '';
            }
          } 
          // Para historial (formato plano)
          else {
            console.log('VisitantesTabla - Row completo para historial:', row);
            cargo = row.personal_cargo || '';
          }
          
          console.log('VisitantesTabla - Cargo final:', cargo);
          
          return (
            <div 
              className="text-sm text-gray-900" 
              title={cargo}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {cargo || '-'}
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
        minWidth: '110px',
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
            <div className="flex justify-center space-x-1">
              {/* Botón Ver Detalles - siempre visible */}
              <button
                onClick={() => handleOpenModal(row)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Ver Detalles"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              
              {/* Botones específicos según el estado */}
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

    // Add actions column for historial
    if (activeTab === 'historial') {
      baseColumns.push({
        key: 'actions',
        label: 'Ver',
        minWidth: '60px',
        maxWidth: '80px',
        width: '80px',
        sticky: 'right',
        stickyOffset: '0px',
        render: (row) => {
          // Safety check: if row is undefined/null, return empty content
          if (!row) {
            return null;
          }
          
          return (
            <div className="flex justify-center">
              <button
                onClick={() => handleOpenModal(row)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Ver Detalles"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            </div>
          );
        }
      });
    }

    return baseColumns;
  }, [activeTab, visitantesEnEspera, onRegistrarSalida, handleOpenModal]);

  const countActivos = visitantesActivos.length;

  // Función para exportar a Excel o PDF
  const handleExport = (format) => {
    try {
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      
      // Construir los query params a partir de los filtros actuales
      const params = new URLSearchParams();
      
      if (filtros.busqueda) params.append('q', filtros.busqueda);
      if (filtros.empleadoId) params.append('personalVisitadoId', filtros.empleadoId);
      if (filtros.motivoId) params.append('motivoVisitaId', filtros.motivoId);
      if (filtros.lugar) params.append('areaId', filtros.lugar);
      if (filtros.fechaDesde) params.append('fechaInicio', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaFin', filtros.fechaHasta);
      
      // Construir la URL completa del endpoint de exportación
      const queryString = params.toString();
      const url = `http://localhost:3000/api/visitas/export/${format}${queryString ? '?' + queryString : ''}`;
      
      // Crear un enlace temporal para la descarga con autenticación
      const link = document.createElement('a');
      link.style.display = 'none';
      
      // Hacer la petición con fetch para incluir el token
      fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Error al exportar el archivo');
        }
        return response.blob();
      })
      .then(blob => {
        // Crear URL temporal para el blob
        const blobUrl = window.URL.createObjectURL(blob);
        link.href = blobUrl;
        
        // Establecer el nombre del archivo
        const fecha = new Date().toISOString().slice(0, 10);
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        link.download = `Reporte_Visitas_${fecha}.${extension}`;
        
        // Agregar al DOM, hacer clic y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar la URL del blob
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch(error => {
        console.error('Error al exportar:', error);
        alert('Error al exportar el archivo. Por favor, intente nuevamente.');
      });
      
    } catch (error) {
      console.error('Error al construir la URL de exportación:', error);
      alert('Error al exportar el archivo. Por favor, intente nuevamente.');
    }
  };

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
            <div className="flex items-center space-x-3">
              {/* Botones de exportación - Solo visible en historial */}
              {activeTab === 'historial' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExport('excel')}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    title="Exportar a Excel"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">Excel</span>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    title="Exportar a PDF"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">PDF</span>
                  </button>
                </div>
              )}
              
              {visitantesEnEspera.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-amber-600 font-medium">
                    {visitantesEnEspera.length} en espera
                  </span>
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                </div>
              )}
            </div>
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
      
      {/* Modal de detalles */}
      <ModalDetalles
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={selectedItem}
        title={`Detalles de ${activeTab === 'activos' ? 'Visitante Activo' : 'Visita'}`}
        size="lg"
        fields={[
          {
            key: 'visitante_nombres',
            label: 'Visitante',
            render: (value, data) => `${data.visitante_nombres || ''} ${data.visitante_apellidos || ''}`.trim()
          },
          {
            key: 'numero_documento',
            label: 'Documento',
            render: (value, data) => `${data.tipo_documento_codigo || 'DNI'}: ${value || ''}`
          },
          {
            key: 'personal_nombres',
            label: 'Empleado Visitado',
            render: (value, data) => `${data.personal_nombres || ''} ${data.personal_apellidos || ''}`.trim()
          },
          {
            key: 'personal_cargo',
            label: 'Cargo del Empleado',
            render: (value) => value || 'Sin cargo asignado'
          },
          {
            key: 'nombre_motivo',
            label: 'Motivo de Visita',
            render: (value) => value || 'No especificado'
          },
          {
            key: 'nombre_area',
            label: 'Área de Destino',
            render: (value) => value || 'No especificada'
          },
          {
            key: 'fecha_ingreso',
            label: 'Fecha y Hora de Ingreso',
            render: (value) => {
              if (!value) return 'No especificada';
              try {
                const fecha = new Date(value);
                return fecha.toLocaleString('es-PE');
              } catch {
                return value;
              }
            }
          },
          {
            key: 'fecha_salida',
            label: 'Fecha y Hora de Salida',
            render: (value) => {
              if (!value) return 'Visita activa';
              try {
                const fecha = new Date(value);
                return fecha.toLocaleString('es-PE');
              } catch {
                return value;
              }
            }
          },
          {
            key: 'usuario_ingreso',
            label: 'Registrado por',
            render: (value) => value || 'No especificado'
          }
        ]}
      />
    </div>
  );
};

export default VisitantesTabla;
