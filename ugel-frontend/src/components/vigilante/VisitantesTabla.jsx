import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Card from '../Card';
import Badge from '../Badge';
import Button from '../Button';
import Popover from '../Popover';
import TabView from '../TabView';
import FiltrosVisitas from './FiltrosVisitas';
import TableGenerica from '../TableGenerica';
import ModalDetalles from '../ModalDetalles';
import QuickSearchBar from '../QuickSearchBar';
import {
  UsersIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import {
  VisitasAreaCard,
  VisitasMotivoCard,
  VisitasTotalesCard,
  VisitasPersonalCard,
  VisitantesFrecuentesCard
} from '../vigilante_estadisticas';
import { formatHora } from '../../utils/dateHelpers';

const VisitantesTabla = ({
  visitantesActivos,
  visitantesEnEspera,
  visitasPendientes = [], // Nueva prop para visitas pendientes de IndexedDB
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
  onActivosPageChange,
  categoriaEstadisticas // Nueva prop para la categoría de estadísticas
}) => {
  const [filtrosExpanded, setFiltrosExpanded] = useState(false);

  // Estados para el modal de detalles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Estado para el dropdown de exportación
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const handleTabClick = (tab) => {
    onTabChange(tab);
    if (tab === 'historial' && !filtrosExpanded) {
      setFiltrosExpanded(true);
    }
    if (tab === 'estadisticas') {
      console.log('Navegando a estadísticas');
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
    setTimeout(() => {
      setSelectedItem(null);
    }, 300);
  }, []);

  // Estado para forzar actualización cada minuto (para lógica de tiempo "No Show")
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto
    return () => clearInterval(timer);
  }, []);

  // Notificación de visitantes no presentados (> 10 min) - SOLO PARA VIGILANTE
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    if (activeTab === 'activos' && visitantesActivos) {
      visitantesActivos.forEach(v => {
        // Solo para pendientes y que tengan fecha de ingreso
        if (v.fecha_ingreso && (v.estado_visita === 'PENDIENTE' || !v.estado_visita)) {
           try {
             // Asegurar fecha válida
             const fechaIngreso = new Date(v.fecha_ingreso);
             if (!isNaN(fechaIngreso.getTime())) {
               const diff = (currentTime - fechaIngreso) / 60000;
               
               if (diff > 10 && !notifiedRef.current.has(v.id)) {
                 toast.error(
                   (t) => (
                     <div 
                       className="flex flex-col relative pr-4 cursor-pointer hover:bg-red-50 transition-colors rounded p-1"
                       onClick={() => handleOpenModal(v)}
                     >
                       <button 
                         onClick={(e) => { e.stopPropagation(); toast.dismiss(t.id); }}
                         className="absolute -top-1 -right-2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
                         title="Cerrar notificación"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                       </button>
                       <span className="font-bold pr-2">¡Alerta de Visitante!</span>
                       <span>El visitante {v.visitante_nombres} {v.visitante_apellidos} no se ha presentado.</span>
                       <span className="text-xs mt-1">Han pasado más de 10 minutos.</span>
                       <span className="text-xs text-blue-600 mt-1 underline">Ver detalles</span>
                     </div>
                   ),
                   { 
                     duration: 8000, 
                     position: 'top-right', 
                     style: { border: '2px solid #ef4444' } 
                   }
                 );
                 notifiedRef.current.add(v.id);
               }
             }
           } catch (e) {
             console.error("Error checking date for notification", e);
           }
        }
      });
    }
  }, [visitantesActivos, activeTab, currentTime, handleOpenModal]);

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'activos': {
        let data = [...(visitantesActivos || []), ...(visitantesEnEspera || [])];

        if (
          vistaPreviaVisitante &&
          vistaPreviaVisitante.nombres &&
          vistaPreviaVisitante.apellidos &&
          vistaPreviaVisitante.numeroDocumento
        ) {
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
            fecha_ingreso: new Date().toISOString(), // Use ISO for consistency
            hora_ingreso: formatHora(new Date()),
            isPreview: true,
            estado_visita: 'PENDIENTE'
          };

          data = [previewData, ...data];
        }

        // --- LÓGICA DE NO PRESENTADO (10 MIN) ---
        const now = currentTime;
        data = data.map(item => {
           let isNoShow = false;
           // Solo aplicar a visitas reales (con ID numérico y fecha_ingreso) y pendientes
           if (item.fecha_ingreso && (item.estado_visita === 'PENDIENTE' || !item.estado_visita) && !item.isPreview) {
               try {
                   const ingreso = new Date(item.fecha_ingreso);
                   const diffMins = (now - ingreso) / 60000;
                   if (diffMins > 10) {
                       isNoShow = true;
                   }
               } catch (e) { console.error("Error parsing date", e); }
           }
           return { ...item, isNoShow };
        });

        // Ordenar: Primero los No Presentó, luego el resto (manteniendo orden temporal inverso o por defecto)
        data.sort((a, b) => {
            if (a.isPreview) return -1; // Preview siempre primero visualmente antes que nada? O después de alertas? 
            // Mejor: Preview primero, luego Advertencias "No Show", luego normales.
            if (a.isPreview) return -1;
            if (b.isPreview) return 1;

            if (a.isNoShow && !b.isNoShow) return -1;
            if (!a.isNoShow && b.isNoShow) return 1;
            
            // Default sort by ID desc or Date desc if needed, assuming API sends them sorted.
            // If API sends sorted, this stable sort keeps relative order of rest.
            return 0; 
        });

        return data;
      }
      case 'historial':
        return historialVisitas || [];
      default:
        return [];
    }
  }, [
    activeTab,
    visitantesActivos,
    visitantesEnEspera,
    historialVisitas,
    vistaPreviaVisitante,
    vistaPreviaVisita,
    currentTime
  ]);

  const getPaginationProps = useCallback(() => {
    const data = getTabData();
    const totalItemsLocal = data.length;

    if (activeTab === 'activos') {
      const itemsPerPage = activosPagination?.itemsPerPage || 10;
      const currentPage = activosPagination?.currentPage || 1;
      const totalItems = totalItemsLocal;

      if (!totalItems || totalItems <= itemsPerPage) {
        return { pagination: false };
      }

      return {
        pagination: true,
        itemsPerPage,
        currentPage,
        totalItems,
        onPageChange: onActivosPageChange
      };
    }

    if (activeTab === 'historial') {
      const itemsPerPage = historialPagination?.itemsPerPage || 15;

      const totalItems =
        historialPagination?.totalItems ?? historialPagination?.total ?? totalItemsLocal;

      const totalPages =
        historialPagination?.totalPages ?? Math.ceil((totalItems || 0) / itemsPerPage);

      if (!totalItems || totalItems <= itemsPerPage) {
        return { pagination: false };
      }

      return {
        pagination: true,
        itemsPerPage,
        currentPage: historialPagination?.currentPage || 1,
        totalItems,
        totalPages,
        onPageChange: onHistorialPageChange
      };
    }

    return { pagination: false };
  }, [
    activeTab,
    activosPagination,
    historialPagination,
    onActivosPageChange,
    onHistorialPageChange,
    getTabData
  ]);

  /**
   * - Misma lógica que tu versión original (activos/historial, en espera, offline, etc.)
   * - Anchos MUCHO más ajustados para `historial` para reducir scroll horizontal.
   */
    const getColumns = useMemo(() => {
    // Regla: para historial usamos anchos más compactos
    const getColumnWidths = (baseWidth, historialWidth) =>
      activeTab === 'historial' ? historialWidth : baseWidth;

    const baseColumns = [
      {
        key: 'visitante',
        label: 'Visitante',
        minWidth: getColumnWidths('180px', '180px'),
        maxWidth: getColumnWidths('200px', '240px'),
        width: getColumnWidths('25%', '25%'),
        render: (row) => {
          if (!row) {
            return (
              <div>
                <div className="font-medium text-gray-900">-</div>
                <div className="text-sm text-gray-500">-</div>
              </div>
            );
          }

          let nombres = '';
          let apellidos = '';
          let tipoDoc = 'DNI';
          let numDoc = '';

          if (activeTab === 'activos') {
            if ((visitantesEnEspera || []).some((v) => v.id === row.id)) {
              nombres = row.nombres || '';
              apellidos = row.apellidos || '';
              tipoDoc = row.tipoDocumento?.nombre_completo || 'DNI';
              numDoc = row.numeroDocumento || '';
            } else {
              nombres = row.visitante_nombres || row.nombres || '';
              apellidos = row.visitante_apellidos || row.apellidos || '';
              tipoDoc = row.tipo_documento_codigo || 'DNI';
              numDoc = row.numero_documento || row.numeroDocumento || '';
            }
          } else {
            nombres = row.visitante_nombres || row.nombres || '';
            apellidos = row.visitante_apellidos || row.apellidos || '';
            tipoDoc = row.tipo_documento_codigo || 'DNI';
            numDoc = row.numero_documento || '';
          }

          const nombreCompleto = `${nombres} ${apellidos}`.trim();
          const documentoCompleto = `${tipoDoc}: ${numDoc}`;

          return (
            <div className="max-w-full">
              <div
                className="font-medium text-gray-900 break-words"
                title={nombreCompleto}
              >
                {nombreCompleto}
              </div>
              <div
                className="text-sm text-gray-500 break-words"
                title={documentoCompleto}
              >
                {documentoCompleto}
              </div>
            </div>
          );
        }
      },
      {
        key: 'empleado',
        label: 'Empleado',
        minWidth: getColumnWidths('120px', '150px'),
        maxWidth: getColumnWidths('180px', '200px'),
        width: getColumnWidths('20%', '20%'),
        render: (row) => {
          if (!row) {
            return <div className="text-sm">-</div>;
          }

          let empleadoNombre = '';
          let empleadoApellido = '';

          if (activeTab === 'activos') {
            if ((visitantesEnEspera || []).some((v) => v.id === row.id)) {
              const empleado = row.empleado || {};
              return <div className="text-sm">{empleado.label || '-'}</div>;
            } else {
              empleadoNombre = row.personal_nombres || '';
              empleadoApellido = row.personal_apellidos || '';
            }
          } else {
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
        minWidth: getColumnWidths('120px', '140px'),
        maxWidth: getColumnWidths('180px', '180px'),
        width: getColumnWidths('20%', '15%'),
        render: (row) => {
          if (!row) {
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                -
              </span>
            );
          }

          let motivoNombre = '';

          if (activeTab === 'activos') {
            if ((visitantesEnEspera || []).some((v) => v.id === row.id)) {
              const motivo = row.motivo || {};
              motivoNombre = motivo.label || '';
            } else {
              motivoNombre = row.nombre_motivo || '';
            }
          } else {
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
        minWidth: getColumnWidths('120px', '140px'),
        maxWidth: getColumnWidths('180px', '180px'),
        width: getColumnWidths('20%', '15%'),
        render: (row) => {
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }

          let cargo = '';

          if (activeTab === 'activos') {
            console.log('VisitantesTabla - Row completo para activos:', row);
            if ((visitantesEnEspera || []).some((v) => v.id === row.id)) {
              console.log(
                'VisitantesTabla - Es visitante en espera, cargo:',
                row.empleado?.cargo
              );
              cargo = row.empleado?.cargo || '';
            } else if (row._isOffline || row._isPending) {
              console.log(
                'VisitantesTabla - Es visita offline, cargo:',
                row.personal_cargo
              );
              cargo = row.personal_cargo || 'Sin cargo';
            } else {
              console.log(
                'VisitantesTabla - Es visitante activo, personal_cargo:',
                row.personal_cargo
              );
              console.log('VisitantesTabla - empleadoVisitado:', row.empleadoVisitado);
              cargo =
                row.personal_cargo ||
                row.empleadoVisitado?.cargo ||
                row.cargo_nombre ||
                row.cargo ||
                '';
            }
          } else {
            console.log('VisitantesTabla - Row completo para historial:', row);
            cargo = row.personal_cargo || row.cargo_nombre || row.cargo || '';
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
        minWidth: getColumnWidths('120px', '130px'),
        maxWidth: getColumnWidths('180px', '180px'),
        width: getColumnWidths('20%', '15%'),
        render: (row) => {
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }

          let lugar = '';

          if (activeTab === 'activos') {
            lugar = row.nombre_area || '';
          } else {
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
        minWidth: '70px',
        maxWidth: '80px',
        width: '70px',
        render: (row) => {
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }

          let horaFormateada = '';

          if (activeTab === 'activos') {
            if ((visitantesEnEspera || []).some((v) => v.id === row.id)) {
              horaFormateada = formatHora(row.horaIngreso);
            } else {
              horaFormateada = formatHora(
                row.hora_ingreso || row.horaIngreso || row.fecha_ingreso
              );
            }
          } else {
            horaFormateada =
              formatHora(row.hora_ingreso || row.horaIngreso || row.fecha_ingreso) ||
              '00:00';
          }

          return (
            <div className="text-sm text-gray-900 px-1">
              {horaFormateada || '-'}
            </div>
          );
        }
      },
      {
        key: 'estado',
        label: 'Estado',
        minWidth: '100px',
        maxWidth: '110px',
        width: '100px',
        render: (row) => {
          if (!row) return <div className="text-sm text-gray-900">-</div>;

          const estado = row.estado_visita || 'PENDIENTE';

          let badgeColor = 'bg-gray-100 text-gray-800';
          let label = 'Pendiente';

          if (row.isNoShow) {
             badgeColor = 'bg-red-600 text-white animate-pulse'; // Rojo intenso y pulsante
             label = 'No Presentado';
          } else {
             switch (estado) {
                case 'ACEPTADO':
                  badgeColor = 'bg-green-100 text-green-800';
                  label = 'Aceptado';
                  break;
                case 'RECHAZADO':
                  badgeColor = 'bg-red-100 text-red-800';
                  label = 'Rechazado';
                  break;
                case 'DELEGADO':
                  badgeColor = 'bg-blue-100 text-blue-800';
                  label = 'Delegado';
                  break;
                case 'FINALIZADO':
                  badgeColor = 'bg-gray-100 text-gray-800';
                  label = 'Finalizado';
                  break;
                case 'PENDIENTE':
                default:
                  badgeColor = 'bg-yellow-100 text-yellow-800';
                  label = 'Pendiente';
                  break;
             }
          }
          
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
            >
              {label}
            </span>
          );
        }
      }
    ];

    if (activeTab === 'historial') {
      // 1) FECHA ANTES DE INGRESO
      const fechaColumn = {
        key: 'fecha',
        label: 'Fecha',
        minWidth: '100px',
        maxWidth: '100px',
        width: '100px',
        render: (row) => {
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
      };

      const horaIngresoIndex = baseColumns.findIndex(
        (col) => col.key === 'horaIngreso'
      );
      if (horaIngresoIndex !== -1) {
        baseColumns.splice(horaIngresoIndex, 0, fechaColumn);
      } else {
        baseColumns.push(fechaColumn);
      }

      // 2) SALIDA
      baseColumns.push({
        key: 'horaSalida',
        label: 'Salida',
        minWidth: '70px',
        maxWidth: '80px',
        width: '70px',
        render: (row) => {
          if (!row) {
            return <div className="text-sm text-gray-900">-</div>;
          }

          const horaFormateada = formatHora(row.fecha_salida || row.hora_salida);

          return (
            <div className="text-sm text-gray-900 px-1">
              {horaFormateada || '-'}
            </div>
          );
        }
      });

      // 3) BOTÓN VER IGUAL AL DEL SEGUNDO COMPONENTE
      baseColumns.push({
        key: 'actions',
        label: 'Ver',
        minWidth: '60px',
        maxWidth: '80px',
        width: '80px',
        sticky: 'right',
        stickyOffset: '0px',
        render: (row) => {
          if (!row) {
            return null;
          }

          return (
            <div className="flex justify-left">
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
    } else {
      // Acciones para activos (ya tenía el botón correcto)
      baseColumns.push({
        key: 'actions',
        label: 'Acciones',
        minWidth: '90px',
        maxWidth: '110px',
        width: '100px',
        sticky: 'right',
        stickyOffset: '0px',
        render: (row) => {
          if (!row) {
            return null;
          }

          const enEspera = (visitantesEnEspera || []).some((v) => v.id === row.id);
          const isPreview = row.isPreview === true;
          const isOfflinePending = row._isOffline || row._isPending;

          if (isPreview) {
            return null;
          }

          return (
            <div className="flex justify-left space-x-1">
              <button
                onClick={() => handleOpenModal(row)}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                title="Ver Detalles"
              >
                <EyeIcon className="h-4 w-4" />
              </button>

              {enEspera && !isOfflinePending ? (
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
                  title={
                    isOfflinePending
                      ? 'Registrar Salida (Offline)'
                      : 'Registrar Salida'
                  }
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
  }, [
    activeTab,
    visitantesEnEspera,
    onRegistrarSalida,
    onEliminarVisitanteEspera,
    handleOpenModal
  ]);


  const countActivos =
    (visitantesActivos || []).length + (visitantesEnEspera || []).length;

  // Función para exportar a Excel o PDF
  const handleExport = (format) => {
    try {
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();

      if (filtros.busqueda) params.append('q', filtros.busqueda);
      if (filtros.empleadoId) params.append('personalVisitadoId', filtros.empleadoId);
      if (filtros.motivoId) params.append('motivoVisitaId', filtros.motivoId);
      if (filtros.lugar) params.append('areaId', filtros.lugar);
      if (filtros.fechaDesde) params.append('fechaInicio', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaFin', filtros.fechaHasta);

      const queryString = params.toString();
      const url = `/api/visitas/export/${format}${
        queryString ? '?' + queryString : ''
      }`;

      const link = document.createElement('a');
      link.style.display = 'none';

      fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Error al exportar el archivo');
          }
          return response.blob();
        })
        .then((blob) => {
          const blobUrl = window.URL.createObjectURL(blob);
          link.href = blobUrl;

          const fecha = new Date().toISOString().slice(0, 10);
          const extension = format === 'excel' ? 'xlsx' : 'pdf';
          link.download = `Reporte_Visitas_${fecha}.${extension}`;

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          window.URL.revokeObjectURL(blobUrl);
        })
        .catch((error) => {
          console.error('Error al exportar:', error);
          alert('Error al exportar el archivo. Por favor, intente nuevamente.');
        });
    } catch (error) {
      console.error('Error al construir la URL de exportación:', error);
      alert('Error al exportar el archivo. Por favor, intente nuevamente.');
    }
  };

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
          <div className="px-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Gestión de Visitantes
              </h2>
              <div className="flex items-center space-x-3">
                {activeTab === 'activos' && (
                  <div className="w-80">
                    <QuickSearchBar
                      data={visitantesActivos || []}
                      activeTab={activeTab}
                      onSelect={(item) => {
                        if (onRegistrarSalida) {
                          onRegistrarSalida(item.id, item);
                        }
                      }}
                      placeholder="Buscar visitante activo..."
                    />
                  </div>
                )}

                {activeTab === 'historial' && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setExportDropdownOpen(!exportDropdownOpen)
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-white border-2 border-amber-500 text-amber-600 rounded-full hover:bg-amber-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      <span className="text-sm font-semibold">Exportar</span>
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          exportDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
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
                                <div className="text-sm font-semibold text-green-700">
                                  Excel
                                </div>
                                <div className="text-xs text-green-600">
                                  Formato .xlsx
                                </div>
                              </div>
                            </button>

                            <div className="border-t border-gray-100 mx-2" />

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
                                <div className="text-sm font-semibold text-red-700">
                                  PDF
                                </div>
                                <div className="text-xs text-red-600">
                                  Formato .pdf
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {visitantesEnEspera.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-amber-600 font-medium">
                      {visitantesEnEspera.length} en espera
                    </span>
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <TabView
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabClick}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1" style={{ maxWidth: '100%' }}>
              {activeTab === 'estadisticas' ? (
                categoriaEstadisticas === 'areas' ? (
                  <VisitasAreaCard />
                ) : categoriaEstadisticas === 'motivos' ? (
                  <VisitasMotivoCard />
                ) : categoriaEstadisticas === 'total-visitas' ? (
                  <VisitasTotalesCard />
                ) : categoriaEstadisticas === 'personal' ? (
                  <VisitasPersonalCard />
                ) : categoriaEstadisticas === 'visitantes' ? (
                  <VisitantesFrecuentesCard />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p>Seleccione una categoría de estadísticas</p>
                    </div>
                  </div>
                )
              ) : (
                <TableGenerica
                  columns={getColumns}
                  data={getTabData()}
                  isRowInWaiting={(row) =>
                    (visitantesEnEspera || []).some((v) => v.id === row.id)
                  }
                  {...getPaginationProps()}
                  emptyMessage={
                    activeTab === 'activos'
                      ? 'No hay visitantes activos en este momento'
                      : 'No se encontraron registros para los filtros aplicados'
                  }
                  cellPadding="px-2"
                />
              )}
            </div>
          </TabView>
        </div>
      </Card>

      <ModalDetalles
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={selectedItem}
        title={`Detalles de ${
          activeTab === 'activos' ? 'Visitante Activo' : 'Visita'
        }`}
        size="lg"
        fields={[
          {
            key: 'visitante_nombres',
            label: 'Visitante',
            render: (value, data) =>
              `${data.visitante_nombres || ''} ${
                data.visitante_apellidos || ''
              }`.trim()
          },
          {
            key: 'numero_documento',
            label: 'Documento',
            render: (value, data) =>
              `${data.tipo_documento_codigo || 'DNI'}: ${value || ''}`
          },
          {
            key: 'personal_nombres',
            label: 'Empleado Visitado',
            render: (value, data) =>
              `${data.personal_nombres || ''} ${
                data.personal_apellidos || ''
              }`.trim()
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
            label: 'Registrado por',
            render: (value) => value || 'No especificado'
          },
          {
            key: 'fecha_aceptacion',
            label: 'Fecha de Aceptación',
            render: (value) => {
              if (!value) return '-';
              try {
                return new Date(value).toLocaleString('es-PE');
              } catch { return value; }
            }
          },
          {
            key: 'fecha_rechazo',
            label: 'Fecha de Rechazo',
            render: (value) => {
              if (!value) return '-';
              try {
                return new Date(value).toLocaleString('es-PE');
              } catch { return value; }
            }
          },
          {
            key: 'delegado_por_nombres',
            label: 'Delegado Por',
            render: (value, data) => {
              if (!data.delegado_por_id && !value) return '-';
              const nombre = data.delegado_por_nombres || '';
              const apellido = data.delegado_por_apellidos || '';
              const full = `${nombre} ${apellido}`.trim();
              return full || 'ID: ' + (data.delegado_por_id || '-');
            }
          },
          {
            key: 'fecha_delegacion',
            label: 'Fecha de Delegación',
            render: (value) => {
              if (!value) return '-';
              try {
                return new Date(value).toLocaleString('es-PE');
              } catch { return value; }
            }
          },
          {
            key: 'fecha_fin_atencion',
            label: 'Fin de Atención',
            render: (value) => {
              if (!value) return '-';
              try {
                return new Date(value).toLocaleString('es-PE');
              } catch { return value; }
            }
          }
        ]}
      />
    </div>
  );
};

export default VisitantesTabla;
