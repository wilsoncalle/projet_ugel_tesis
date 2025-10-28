import { useState, useMemo, useCallback } from 'react';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import TabView from '../TabView';
import TableGenerica from '../TableGenerica';
import ModalDetalles from '../ModalDetalles';
import { UsersIcon, ClockIcon, EyeIcon, UserMinusIcon, TrashIcon, DocumentTextIcon, DocumentArrowDownIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const PersonalTabla = ({
  personalActivo,
  personalEnEspera,
  historialPersonal,
  activeTab,
  onTabChange,
  onBuscarHistorial,
  onRegistrarBaja,
  onEliminarDeEspera,
  filtros,
  vistaPreviaPersona,
  historialPagination,
  onHistorialPageChange,
  activosPagination,
  onActivosPageChange,
  categoriaEstadisticas
}) => {
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleTabClick = (tab) => {
    onTabChange(tab);
    if (tab === 'historial' && !filtrosExpanded) {
      setFiltrosExpanded(true);
    }
  };

  const handleOpenModal = useCallback((item) => {
    console.log('Abriendo modal para item:', item);
    setSelectedItem(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedItem(null);
    }, 300);
  }, []);

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'activos': {
        let data = [...(personalActivo || []), ...(personalEnEspera || [])];
        
        // Agregar vista previa si tiene datos válidos (igual que VisitantesTabla)
        if (vistaPreviaPersona && 
            vistaPreviaPersona.nombres && 
            vistaPreviaPersona.apellidos && 
            vistaPreviaPersona.numeroDocumento) {
          
          const previewData = {
            id: 'preview',
            nombres: vistaPreviaPersona.nombres,
            apellidos: vistaPreviaPersona.apellidos,
            tipo_documento: vistaPreviaPersona.tipoDocumento?.nombre_completo || 'DNI',
            numero_documento: vistaPreviaPersona.numeroDocumento,
            cargo_nombre: vistaPreviaPersona.cargo_nombre || '',
            area_nombre: vistaPreviaPersona.area_nombre || '',
            tipo_contrato_nombre: vistaPreviaPersona.tipo_contrato_nombre || '',
            activo: true,
            isPreview: true
          };
          
          data = [previewData, ...data];
        }
        
        return data;
      }
      case 'historial':
        return historialPersonal || [];
      default:
        return [];
    }
  }, [activeTab, personalActivo, personalEnEspera, historialPersonal, vistaPreviaPersona]);
  
  const getPaginationProps = useCallback(() => {
    const data = getTabData();
    const totalItems = data.length;
    
    switch (activeTab) {
      case 'activos':
        return {
          pagination: true,
          itemsPerPage: activosPagination?.itemsPerPage || 10,
          currentPage: activosPagination?.currentPage || 1,
          totalItems: totalItems,
          onPageChange: onActivosPageChange
        };
      case 'historial':
        return {
          pagination: true,
          itemsPerPage: historialPagination?.itemsPerPage || 15,
          currentPage: historialPagination?.currentPage || 1,
          totalItems: historialPagination?.totalItems || data.length,
          totalPages: historialPagination?.totalPages || Math.ceil(data.length / (historialPagination?.itemsPerPage || 15)),
          onPageChange: onHistorialPageChange
        };
      default:
        return { pagination: false };
    }
  }, [activeTab, activosPagination, historialPagination, onActivosPageChange, onHistorialPageChange, getTabData]);

  const getColumns = useMemo(() => {
    const getColumnWidths = (baseWidth, historialWidth) => {
      return activeTab === 'historial' ? historialWidth : baseWidth;
    };

    const baseColumns = [
      {
        key: 'personal',
        label: 'Personal',
        minWidth: getColumnWidths('200px', '240px'),
        maxWidth: getColumnWidths('250px', '300px'),
        width: getColumnWidths('30%', '35%'),
        render: (row) => {
          if (!row) return <div>-</div>;
          
          const nombreCompleto = `${row.nombres || ''} ${row.apellidos || ''}`.trim();
          const documentoCompleto = `${row.tipo_documento || 'DNI'}: ${row.numero_documento || ''}`;
          
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
        key: 'cargo',
        label: 'Cargo',
        minWidth: getColumnWidths('150px', '180px'),
        maxWidth: getColumnWidths('200px', '240px'),
        width: getColumnWidths('25%', '30%'),
        render: (row) => {
          if (!row) return <div className="text-sm">-</div>;
          
          // Buscar cargo en múltiples campos posibles
          const cargo = row.cargo_nombre || row.cargo || row.cargoNombre || '-';
          
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
              {cargo}
            </div>
          );
        }
      },
      {
        key: 'area',
        label: 'Área',
        minWidth: getColumnWidths('120px', '150px'),
        maxWidth: getColumnWidths('180px', '220px'),
        width: getColumnWidths('20%', '25%'),
        render: (row) => {
          if (!row) return <div className="text-sm">-</div>;
          
          // Buscar área en múltiples campos posibles
          const area = row.area_nombre || row.area || row.areaNombre || row.nombre_area || '-';
          
          return (
            <div 
              className="text-sm text-gray-900" 
              title={area}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {area}
            </div>
          );
        }
      },
      {
        key: 'estado',
        label: 'Estado',
        minWidth: getColumnWidths('100px', '100px'),
        maxWidth: getColumnWidths('120px', '120px'),
        width: getColumnWidths('120px', '120px'),
        render: (row) => {
          if (!row) return null;
          
          const activo = row.activo !== false;
          
          return (
            <Badge
              variant={activo ? 'success' : 'danger'}
              className={activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
            >
              {activo ? 'Activo' : 'Cesado'}
            </Badge>
          );
        }
      }
    ];

    // Agregar columna de acciones
    if (activeTab === 'activos') {
      baseColumns.push({
        key: 'actions',
        label: 'Acciones',
        minWidth: '120px',
        maxWidth: '140px',
        width: '140px',
        sticky: 'right',
        stickyOffset: '0px',
        render: (row) => {
          if (!row) return null;
          
          const enEspera = (personalEnEspera || []).some(p => p.id === row.id);
          const isPreview = row.isPreview === true;
          
          if (isPreview) return null;
          
          return (
            <div className="flex justify-center space-x-1">
              <button
                onClick={() => handleOpenModal(row)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Ver Detalles"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              
              {enEspera ? (
                <button
                  onClick={() => {
                    if (onEliminarDeEspera) {
                      onEliminarDeEspera(row.id);
                    }
                  }}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Eliminar de lista"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => onRegistrarBaja(row.id, row)}
                  className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors"
                  title="Registrar Baja"
                >
                  <UserMinusIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      });
    }

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
          if (!row) return null;
          
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
  }, [activeTab, personalEnEspera, onRegistrarBaja, handleOpenModal]);

  const countActivos = (personalActivo || []).length + (personalEnEspera || []).length;

  // Función para exportar
  const handleExport = (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filtros.busqueda) params.append('q', filtros.busqueda);
      if (filtros.cargoId) params.append('cargoId', filtros.cargoId);
      if (filtros.areaId) params.append('areaId', filtros.areaId);
      if (filtros.activo !== undefined) params.append('activo', filtros.activo);
      if (filtros.fechaDesde) params.append('fechaInicio', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaFin', filtros.fechaHasta);
      
      const queryString = params.toString();
      const url = `http://localhost:3000/api/personal/export/${format}${queryString ? '?' + queryString : ''}`;
      
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
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        
        const fecha = new Date().toISOString().slice(0, 10);
        const extension = format === 'excel' ? 'xlsx' : 'pdf';
        link.download = `Reporte_Personal_${fecha}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
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
      label: 'Personal Activo',
      icon: <UsersIcon className="h-4 w-4" />,
      count: countActivos
    },
    {
      key: 'historial',
      label: 'Historial de Movimientos',
      icon: <ClockIcon className="h-4 w-4" />
    },
    {
      key: 'estadisticas',
      label: 'Estadísticas',
      icon: null,
      isStatsButton: true
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <Card className="shadow-lg border border-gray-200 bg-card flex-1 flex flex-col rounded-2xl">
        <div className="p-0 flex flex-col h-full">
          {/* Título de la sección */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Gestión de Personal</h2>
            <div className="flex items-center space-x-3">
              {/* Dropdown de exportación - Solo visible en historial */}
              {activeTab === 'historial' && (
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-amber-500 text-amber-600 rounded-full hover:bg-amber-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    <span className="text-sm font-semibold">Exportar</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${exportDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {exportDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setExportDropdownOpen(false)}
                      />
                      
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20 animate-fadeIn">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleExport('excel');
                              setExportDropdownOpen(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-green-50 transition-colors group"
                          >
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                              <DocumentTextIcon className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-green-700">Excel</div>
                              <div className="text-xs text-green-600">Formato .xlsx</div>
                            </div>
                          </button>
                          
                          <div className="border-t border-gray-100 mx-2"></div>
                          
                          <button
                            onClick={() => {
                              handleExport('pdf');
                              setExportDropdownOpen(false);
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 transition-colors group"
                          >
                            <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                              <DocumentArrowDownIcon className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-red-700">PDF</div>
                              <div className="text-xs text-red-600">Formato .pdf</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {personalEnEspera.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-amber-600 font-medium">
                    {personalEnEspera.length} en espera
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
            <div className="flex-1 flex flex-col">
              {/* Indicadores arriba de la tabla, dentro del contenedor blanco */}
              {activeTab !== 'estadisticas' && (
                <div className="px-4 pt-2 pb-2">
                  <IndicadoresPersonal 
                    personalActivo={personalActivo}
                    personalEnEspera={personalEnEspera}
                    historialPersonal={historialPersonal}
                    activeTab={activeTab}
                  />
                </div>
              )}

              {/* Contenido de las pestañas */}
              <div className="flex-1" style={{ maxWidth: '100%' }}>
                {activeTab === 'estadisticas' ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-4">📊</div>
                      <p>Estadísticas de personal (próximamente)</p>
                    </div>
                  </div>
                ) : (
                  <TableGenerica
                    columns={getColumns}
                    data={getTabData()}
                    isRowInWaiting={(row) => 
                      (personalEnEspera || []).some(p => p.id === row.id)
                    }
                    {...getPaginationProps()}
                    emptyMessage={
                      activeTab === 'activos'
                        ? 'No hay personal activo en este momento'
                        : 'No se encontraron registros para los filtros aplicados'
                    }
                  />
                )}
              </div>
            </div>
          </TabView>
        </div>
      </Card>
      
      {/* Modal de detalles */}
      <ModalDetalles
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={selectedItem}
        title={`Detalles de ${activeTab === 'activos' ? 'Personal Activo' : 'Personal'}`}
        size="lg"
        fields={[
          {
            key: 'nombres',
            label: 'Nombres Completos',
            render: (value, data) => `${data.nombres || ''} ${data.apellidos || ''}`.trim()
          },
          {
            key: 'numero_documento',
            label: 'Documento',
            render: (value, data) => `${data.tipo_documento || 'DNI'}: ${value || ''}`
          },
          {
            key: 'cargo_nombre',
            label: 'Cargo',
            render: (value) => value || 'No asignado'
          },
          {
            key: 'area_nombre',
            label: 'Área de Destino',
            render: (value) => value || 'No asignada'
          },
          {
            key: 'tipo_contrato_nombre',
            label: 'Tipo de Contrato',
            render: (value) => value || 'No especificado'
          },
          {
            key: 'activo',
            label: 'Estado',
            render: (value) => value !== false ? 'Activo' : 'Cesado/Inactivo'
          },
          {
            key: 'fecha_creacion',
            label: 'Fecha de Alta',
            render: (value) => {
              if (!value) return 'No especificada';
              try {
                const fecha = new Date(value);
                return fecha.toLocaleString('es-PE');
              } catch {
                return value;
              }
            }
          }
        ]}
      />
    </div>
  );
};

// Componente de indicadores de personal
const IndicadoresPersonal = ({ personalActivo, personalEnEspera, historialPersonal, activeTab }) => {
  const estadisticas = {
    activos: (personalActivo || []).length,
    enEspera: (personalEnEspera || []).length,
    historial: (historialPersonal || []).length,
    total: (personalActivo || []).length + (personalEnEspera || []).length
  };

  const items = activeTab === 'activos' ? [
    { key: 'activos', label: 'Activos', value: estadisticas.activos, icon: UsersIcon, chip: 'bg-green-100 text-green-700 border-green-200' },
    { key: 'enEspera', label: 'En Espera', value: estadisticas.enEspera, icon: ClockIcon, chip: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { key: 'total', label: 'Total', value: estadisticas.total, icon: UsersIcon, chip: 'bg-blue-100 text-blue-700 border-blue-200' },
  ] : [
    { key: 'historial', label: 'Registros', value: estadisticas.historial, icon: ClockIcon, chip: 'bg-gray-100 text-gray-700 border-gray-200' },
  ];

  return (
    <div className="w-full">
      <div className={`grid gap-2 ${activeTab === 'activos' ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {items.map(({ key, label, value, icon: Icon, chip }) => (
          <div key={key} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${chip}`}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalTabla;

