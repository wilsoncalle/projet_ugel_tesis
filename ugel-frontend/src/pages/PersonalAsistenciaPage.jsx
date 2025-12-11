import { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from "framer-motion";

import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import SelectCustom from '../components/SelectCustom';
import Badge from '../components/Badge';
import TabView from '../components/TabView';
import TableGenerica from '../components/TableGenerica';
import ModalDetalles from '../components/ModalDetalles';
import ModalGenerico from '../components/ModalGenerico';
import AsistenciaPersonalCalendario from '../components/AsistenciaPersonalCalendario';
import DateRangeFilter from '../components/DateRangeFilter';
import QuickSearchBar from '../components/QuickSearchBar';
import { asistenciaPersonalService, personalService, tiposDocumentoService, areasService, asistenciaConfigService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MagnifyingGlassIcon, ClockIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, UserGroupIcon, CalendarIcon, DocumentArrowDownIcon, ChevronDownIcon, DocumentTextIcon, XMarkIcon, EyeIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { AsistenciasTotalesCard, PuntualidadCard, AusenciasCard, AreasCard, PersonalCard, PanelSeleccionEstadisticas } from '../components/personal_estadisticas';
import { registrarIngresoPersonalWithOfflineSupport, registrarSalidaPersonalWithOfflineSupport } from '../services/offlineApiService';
import { getPendingIngresosPersonal, getPendingSalidasPersonal } from '../utils/offlineDB';

// Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
  exit: { opacity: 0 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

const PersonalAsistenciaPage = () => {
  useDocumentTitle('Asistencia de Personal - COAC-UGEL');
  const { user } = useAuth();

  // Normaliza registros "Ausente" sin hora_ingreso/salida (creados antes de hora_entrada) para mostrarlos vacíos
  const limpiarAusentesTempranos = (asistencias = []) =>
    asistencias.map((a) => {
      const sinIngreso = !a.hora_ingreso && !a.hora_salida;
      if (sinIngreso && a.estado_presencia === 'Ausente') {
        return { ...a, estado_presencia: '' };
      }
      return a;
    });
  
  // Estados principales
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [historialAsistencias, setHistorialAsistencias] = useState([]);
  const [activeTab, setActiveTab] = useState('hoy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para catálogos (optimización - cargar una sola vez)
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [areas, setAreas] = useState([]);
  
  // Estados para el modal de detalles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  
  // Estados del formulario de registro
  const [personalSeleccionado, setPersonalSeleccionado] = useState(null);
  const [personalOptions, setPersonalOptions] = useState([]);
  
  // Estados para filtros de historial
  const [filtros, setFiltros] = useState({
    busqueda: '',
    personalId: '',
    estadoPresencia: '',
    areaId: '',
    cargoId: '',
    fechaDesde: null,
    fechaHasta: null
  });
  
  // Estado para la semana seleccionada
  const [semanaUI, setSemanaUI] = useState(null);
  
  // Paginación
  const [historialPagination, setHistorialPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15
  });
  
  const [hoyPagination, setHoyPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });
  
  // Estado para exportación
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  
  // Estado para categoría de estadísticas
  const [categoriaEstadisticas, setCategoriaEstadisticas] = useState('total-asistencias');
  
  // Referencias
  const registroFormRef = useRef(null);
  const searchTimeout = useRef(null);
  const documentoInputRef = useRef(null);

  // Hook para detectar números y enfocar automáticamente al campo de documento
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Solo procesar si estamos en el tab de "hoy" (registro de ingreso)
      if (activeTab !== 'hoy') return;
      
      // Solo procesar si no estamos ya en un input o textarea
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Detectar si se presionó una tecla numérica (0-9)
      if (event.key >= '0' && event.key <= '9') {
        // Prevenir el comportamiento por defecto
        event.preventDefault();
        
        // Enfocar al campo de número de documento
        if (documentoInputRef.current) {
          documentoInputRef.current.focus();
          
          // Si el campo está vacío, agregar el número presionado
          if (!documentoInputRef.current.value) {
            documentoInputRef.current.value = event.key;
            // Disparar el evento onChange para que se actualice el estado
            const changeEvent = new Event('input', { bubbles: true });
            documentoInputRef.current.dispatchEvent(changeEvent);
          }
        }
      }
    };

    // Agregar el listener
    document.addEventListener('keydown', handleKeyDown);

    // Limpiar el listener al desmontar
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab]);

  // Cargar catálogos una sola vez (optimización)
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [tiposResp, areasResp] = await Promise.all([
          tiposDocumentoService.getAll(),
          areasService.getAll()
        ]);

        if (tiposResp.data.success) {
          const tiposData = tiposResp.data.data.map(tipo => ({
            value: tipo.id.toString(),
            label: tipo.nombre_completo || tipo.nombre
          }));
          setTiposDocumento(tiposData);
        }

        if (areasResp.data.success) {
          const areasData = areasResp.data.data.map(area => ({
            value: area.id.toString(),
            label: area.nombre_area || area.nombre
          }));
          setAreas(areasData);
        }
      } catch (error) {
        console.error('Error al cargar catálogos:', error);
      }
    };

    cargarCatalogos();
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    cargarPersonalActivo();
    cargarAsistenciasHoy();
    cacheAsistenciaConfig();
    
    // Cargar historial inicial
    const filtrosIniciales = {
      busqueda: '',
      personalId: '',
      estadoPresencia: '',
      fechaDesde: null,
      fechaHasta: null
    };
    ejecutarBusqueda(filtrosIniciales, 1);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const cacheAsistenciaConfig = async () => {
    if (!navigator.onLine) return;
    try {
      const response = await asistenciaConfigService.getGlobal();
      if (response.data?.success && response.data.data) {
        localStorage.setItem('asistenciaConfigOffline', JSON.stringify(response.data.data));
      }
    } catch (error) {
      console.warn('No se pudo cachear la configuración de asistencia', error);
    }
  };

  const cargarPersonalActivo = async () => {
    try {
      const response = await personalService.getAll();
      
      if (response.data.success) {
        const personalData = response.data.data.map(p => {
          const personalItem = {
            value: p.id.toString(),
            label: `${p.nombres} ${p.apellidos}`,
            cargo_nombre: p.cargo_nombre || 'Sin cargo',
            area_nombre: p.area_nombre || 'Sin área',
            numero_documento: p.numero_documento,
            tipo_documento: p.tipo_documento,
            cargo_id: p.cargo_id,
            area_destino_id: p.area_destino_id,
            // Datos adicionales para autocompletado - múltiples campos posibles
            tipo_documento_id: p.tipo_documento_id || p.tipoDocumentoId || p.tipo_documento_id,
            area_id: p.area_id || p.areaDestinoId || p.area_destino_id,
            nombres: p.nombres,
            apellidos: p.apellidos,
            // Agregar el tipo de documento como string para búsqueda alternativa
            tipo_documento_nombre: p.tipo_documento
          };
          
          return personalItem;
        });
        
        setPersonalOptions(personalData);
      }
    } catch (error) {
      console.error('Error al cargar personal:', error);
    }
  };

  const cargarAsistenciasHoy = async () => {
    try {
      setLoading(true);
      setError('');

      let dataServer = [];
      try {
        const response = await asistenciaPersonalService.getHoy({
          page: 1,
          limit: 100
        });
        if (response.data.success) {
          dataServer = response.data.data || [];
        }
      } catch (e) {
        console.warn('No se pudo cargar asistencias desde el servidor, usando datos previos/locales', e);
        // Fallback a cache local si existe
        try {
          const cached = localStorage.getItem('cache_asistencia_hoy');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) {
              dataServer = parsed.data;
            }
          } else {
            dataServer = asistenciasHoy || [];
          }
        } catch (err) {
          dataServer = asistenciasHoy || [];
        }
      }

      const ingresosOffline = await getPendingIngresosPersonal();
      const salidasOffline = await getPendingSalidasPersonal();

      const dataLocal = ingresosOffline.map(item => ({
        personal_id: item.personalId,
        personal_nombres: item.personalData?.nombres || '',
        personal_apellidos: item.personalData?.apellidos || '',
        personal_numero_documento: item.personalData?.numero_documento || item.personalData?.numeroDocumento || '',
        personal_tipo_documento: item.personalData?.tipo_documento || 'DNI',
        personal_cargo_nombre: item.personalData?.cargo_nombre || item.personalData?.cargo || '',
        personal_area_nombre: item.personalData?.area_nombre || item.personalData?.area || '',
        hora_ingreso: item.horaIngreso,
        hora_salida: null,
        estado_presencia: item.estado_presencia || 'Presente offline',
        isOffline: true
      }));

      const baseCombinada = [...dataServer];

      dataLocal.forEach((localRow) => {
        const idx = baseCombinada.findIndex(
          (row) => String(row.personal_id || row.personalId) === String(localRow.personal_id)
        );
        if (idx >= 0) {
          baseCombinada[idx] = {
            ...baseCombinada[idx],
            hora_ingreso: localRow.hora_ingreso,
            hora_salida: localRow.hora_salida,
            estado_presencia: localRow.estado_presencia,
            isOffline: true
          };
        } else {
          baseCombinada.push(localRow);
        }
      });

      const dataCombinada = baseCombinada.map(row => {
        const salidaPendiente = salidasOffline.find(
          (s) => String(s.personalId) === String(row.personal_id || row.personalId)
        );
        if (salidaPendiente) {
          return { ...row, hora_salida: salidaPendiente.horaSalida, isOffline: true };
        }
        return row;
      });

      setAsistenciasHoy(limpiarAusentesTempranos(dataCombinada));
      // Cachear resultado final para usarlo en offline
      try {
        localStorage.setItem('cache_asistencia_hoy', JSON.stringify({ ts: Date.now(), data: dataCombinada }));
      } catch (e) {
        console.warn('No se pudo cachear asistencia de hoy', e);
      }
      
      setHoyPagination(prev => ({
        ...prev,
        totalItems: dataCombinada.length || 0,
        totalPages: Math.ceil((dataCombinada.length || 0) / prev.itemsPerPage)
      }));
    } catch (error) {
      console.error('Error al cargar asistencias de hoy:', error);
      setError('Error al cargar asistencias del día');
    } finally {
      setLoading(false);
    }
  };

  const registrarIngreso = async (personalSeleccionado) => {
    if (!personalSeleccionado) {
      setError('Debe seleccionar un personal');
      return;
    }
    
    try {
      setLoading(true);
      const response = await registrarIngresoPersonalWithOfflineSupport(
        personalSeleccionado,
        (id) => asistenciaPersonalService.registrarIngreso(parseInt(id))
      );
      
      if (response.data.success) {
        setPersonalSeleccionado(null);
        if (response.data.offline) {
          const saved = response.data.data;
          const nuevoOffline = {
            personal_id: saved.personalId,
            personal_nombres: saved.personalData?.nombres || '',
            personal_apellidos: saved.personalData?.apellidos || '',
            personal_numero_documento: saved.personalData?.numero_documento || saved.personalData?.numeroDocumento || '',
            personal_tipo_documento: saved.personalData?.tipo_documento || 'DNI',
            personal_cargo_nombre: saved.personalData?.cargo_nombre || saved.personalData?.cargo || '',
            personal_area_nombre: saved.personalData?.area_nombre || saved.personalData?.area || '',
            hora_ingreso: saved.horaIngreso,
            hora_salida: null,
            estado_presencia: saved.estado_presencia || 'Presente offline',
            isOffline: true
          };
          setAsistenciasHoy(prev => {
            const lista = prev || [];
            const idx = lista.findIndex(
              (row) => String(row.personal_id || row.personalId) === String(saved.personalId)
            );
            if (idx >= 0) {
              const copia = [...lista];
              copia[idx] = { ...copia[idx], ...nuevoOffline };
              return limpiarAusentesTempranos(copia);
            }
            return limpiarAusentesTempranos([...lista, nuevoOffline]);
          });
          console.warn('Ingreso de personal guardado en modo offline');
        } else {
          await cargarAsistenciasHoy();
        }
      } else {
        // No mostrar error global si ya existe registro, ya que el formulario muestra la advertencia
        // setError(response.data.message);
      }
    } catch (error) {
      setError(error.response?.data?.error || error.response?.data?.message || 'Error al registrar ingreso');
    } finally {
      setLoading(false);
    }
  };
  
  const registrarSalida = async (personalId) => {
    try {
      const response = await registrarSalidaPersonalWithOfflineSupport(
        personalId,
        (id) => asistenciaPersonalService.registrarSalida(id)
      );
      
      if (response.data.success) {
        await cargarAsistenciasHoy();
        if (activeTab === 'historial') {
          handleBuscarHistorial(filtros, historialPagination.currentPage);
        }
        if (response.data.offline) {
          console.warn('Salida de personal guardada en modo offline');
        }
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error al registrar salida');
    }
  };

  const handleBuscarHistorial = async (filtrosData, page = 1) => {
    try {
      setLoading(true);
      setError('');
      setFiltros(filtrosData);
      
      const params = {
        page: page,
        limit: 15
      };
      
      if (filtrosData.busqueda) params.q = filtrosData.busqueda;
      if (filtrosData.personalId) params.personalId = filtrosData.personalId;
      if (filtrosData.estadoPresencia) params.estadoPresencia = filtrosData.estadoPresencia;
      if (filtrosData.areaId) params.areaId = filtrosData.areaId;
      if (filtrosData.cargoId) params.cargoId = filtrosData.cargoId;
      if (filtrosData.fechaDesde) params.fechaInicio = filtrosData.fechaDesde;
      if (filtrosData.fechaHasta) params.fechaFin = filtrosData.fechaHasta;
      
      let historialData = [];
      let paginationLocal = null;
      let fromCache = false;

      if (navigator.onLine) {
        const response = await asistenciaPersonalService.getAll(params);
        
        if (response.data.success) {
          historialData = response.data.data || [];
          if (response.data.pagination) {
            paginationLocal = {
              currentPage: response.data.pagination.page || page,
              totalPages: response.data.pagination.totalPages || 1,
              totalItems: response.data.pagination.total || 0,
              itemsPerPage: response.data.pagination.limit || 15
            };
          }
          // Cachear
          try {
            localStorage.setItem('cache_asistencia_historial', JSON.stringify({
              ts: Date.now(),
              data: historialData,
              pagination: paginationLocal,
              filtros: filtrosData
            }));
          } catch (e) {
            console.warn('No se pudo cachear historial de asistencia', e);
          }
        } else {
          setError('Error al buscar en el historial');
        }
      } else {
        // Offline: usar cache si existe
        try {
          const cached = localStorage.getItem('cache_asistencia_historial');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.data)) {
              historialData = parsed.data;
              paginationLocal = parsed.pagination || null;
              fromCache = true;
            }
          }
        } catch (e) {
          console.warn('No se pudo leer cache de historial de asistencia', e);
        }
      }

      if (historialData) {
        setHistorialAsistencias(historialData);
      }
      if (paginationLocal) {
        setHistorialPagination(paginationLocal);
      } else if (historialData) {
        setHistorialPagination(prev => ({
          ...prev,
          currentPage: fromCache ? prev.currentPage : page,
          totalPages: 1,
          totalItems: historialData.length,
          itemsPerPage: prev.itemsPerPage
        }));
      }
      
    } catch (err) {
      console.error('Error al buscar historial:', err);
      // Intentar cache como último recurso
      try {
        const cached = localStorage.getItem('cache_asistencia_historial');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.data)) {
            setHistorialAsistencias(parsed.data);
            if (parsed.pagination) setHistorialPagination(parsed.pagination);
          }
        }
      } catch (e) {
        // ignore
      }
      setError('Error al buscar en el historial');
    } finally {
      setLoading(false);
    }
  };

  const handleHistorialPageChange = (newPage) => {
    setHistorialPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
    handleBuscarHistorial(filtros, newPage);
  };

  const ejecutarBusqueda = async (filtrosCompletos, page = 1) => {
    setHistorialPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
    
    setFiltros(filtrosCompletos);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      handleBuscarHistorial(filtrosCompletos, page);
    }, 300);
  };

  const handleFiltrosChange = (nuevosFiltros) => {
    const filtrosCompletos = {
      ...filtros,
      ...nuevosFiltros
    };
    
    ejecutarBusqueda(filtrosCompletos, 1);
  };

  const handleFechaDesdeChange = (fecha, fechaHasta = null) => {
    // Si viene fechaHasta, es porque se seleccionó un rango completo (semana) o un solo día específico
    if (fechaHasta) {
      // Si fecha === fechaHasta, es un solo día específico (chip de día)
      // Si fecha !== fechaHasta, es un rango completo (semana)
      const filtrosCompletos = {
        ...filtros,
        fechaDesde: fecha,
        fechaHasta: fechaHasta
      };
      
      // Actualizar directamente sin debounce para rangos de semana o días específicos
      setFiltros(filtrosCompletos);
      setHistorialPagination(prev => ({ ...prev, currentPage: 1 }));
      handleBuscarHistorial(filtrosCompletos, 1);
    } else {
      // Comportamiento normal para selección individual
      const filtrosCompletos = {
        ...filtros,
        fechaDesde: fecha
      };
      ejecutarBusqueda(filtrosCompletos, 1);
    }
  };

  const handleFechaHastaChange = (fecha, fechaDesde = null) => {
    // Si viene fechaDesde, es porque se seleccionó un rango completo (semana) o un solo día
    // En este caso, el handleFechaDesdeChange ya manejó todo, así que ignoramos
    if (fechaDesde) {
      return;
    }
    
    // Comportamiento normal para selección individual
    const filtrosCompletos = {
      ...filtros,
      fechaHasta: fecha
    };
    ejecutarBusqueda(filtrosCompletos, 1);
  };
  
  const handleHoyPageChange = (newPage) => {
    setHoyPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    if (tab === 'historial') {
      // Calcular semana actual (lunes a domingo)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      // Obtener el lunes de esta semana
      const dayOfWeek = hoy.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lunesSemanaActual = new Date(hoy);
      lunesSemanaActual.setDate(hoy.getDate() - daysToMonday);
      lunesSemanaActual.setHours(0, 0, 0, 0);
      
      // Obtener el domingo de esta semana
      const domingoSemanaActual = new Date(lunesSemanaActual);
      domingoSemanaActual.setDate(lunesSemanaActual.getDate() + 6);
      
      // Si el domingo está en el futuro, usar hoy como límite
      const finSemana = domingoSemanaActual > hoy ? hoy : domingoSemanaActual;
      
      // Formatear fechas como YYYY-MM-DD
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const fechaHoy = formatDate(hoy);
      const fechaLunes = formatDate(lunesSemanaActual);
      const fechaDomingo = formatDate(finSemana);
      
      // Calcular el índice de la semana en el mes actual
      const firstDayOfMonth = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const firstMondayOfMonth = new Date(firstDayOfMonth);
      const dowFirstDay = firstDayOfMonth.getDay();
      const toSubtractFirstDay = dowFirstDay === 0 ? 6 : dowFirstDay - 1;
      firstMondayOfMonth.setDate(firstDayOfMonth.getDate() - toSubtractFirstDay);
      
      // Calcular qué semana es en el mes (S1, S2, etc.)
      const diffTime = lunesSemanaActual.getTime() - firstMondayOfMonth.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7);
      
      // Construir payload de la semana (similar a buildWeekPayload en DateRangeFilter)
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(lunesSemanaActual);
        day.setDate(lunesSemanaActual.getDate() + i);
        return day;
      });
      
      const monthDate = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const monthName = monthNames[monthDate.getMonth()];
      const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      const semanaPayload = {
        start: fechaLunes,
        end: fechaDomingo,
        monthName: monthNameCapitalized,
        weekIndex: weekIndex + 1,
        days: days.map((d) => {
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const dayShortNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
          const dayOfWeek = d.getDay();
          return {
            date: formatDate(d),
            labelShort: dayShortNames[dayOfWeek],
            labelLong: dayNames[dayOfWeek]
          };
        })
      };
      
      // Establecer la semana en semanaUI y el día actual
      setSemanaUI(semanaPayload);
      handleFechaDesdeChange(fechaHoy, fechaHoy);
    } else {
      const filtrosVacios = {
        busqueda: '',
        personalId: '',
        estadoPresencia: '',
        fechaDesde: null,
        fechaHasta: null
      };
      ejecutarBusqueda(filtrosVacios, 1);
    }
  };

  // Funciones para manejar el modal de detalles
  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Limpiar selectedItem después de un delay para que la animación termine
    setTimeout(() => {
      setSelectedItem(null);
    }, 300); // 300ms coincide con la duración de la animación
  };

  // Obtener estadísticas según el tab activo
  const estadisticas = useMemo(() => {
    const data = activeTab === 'historial' ? historialAsistencias : asistenciasHoy;
    
    return {
      total: data.length,
      presentes: data.filter(a => a.estado_presencia === 'Presente').length,
      tardes: data.filter(a => a.estado_presencia === 'Tarde' || a.estado_presencia === 'Tardanza').length,
      ausentes: data.filter(a => a.estado_presencia === 'Ausente').length,
      permisos: data.filter(a => a.estado_presencia === 'Permiso').length
    };
  }, [activeTab, asistenciasHoy, historialAsistencias]);

  // Obtener datos de tabla según el tab activo
  const getTabData = () => {
    switch (activeTab) {
      case 'hoy':
        return asistenciasHoy || [];
      case 'historial':
        return historialAsistencias || [];
      default:
        return [];
    }
  };

  // Configurar columnas según el tab
  const getColumns = () => {
    // Función para obtener anchos según el tab activo (igual que VisitantesTabla)
    const getColumnWidths = (baseWidth, historialWidth) => {
      return activeTab === 'historial' ? historialWidth : baseWidth;
    };

    const baseColumns = [
      {
        key: 'personal',
        label: 'Personal',
        minWidth: getColumnWidths('180px', '220px'),
        maxWidth: getColumnWidths('200px', '260px'),
        width: getColumnWidths('25%', '30%'),
        render: (row) => {
          if (!row) return <div>-</div>;
          
          const nombreCompleto = `${row.personal_nombres || ''} ${row.personal_apellidos || ''}`.trim();
          const documentoCompleto = `${row.personal_tipo_documento || 'DNI'}: ${row.personal_numero_documento || ''}`;
          
          return (
            <div className="max-w-full">
              <div className="font-medium text-gray-900 break-words">{nombreCompleto}</div>
              <div className="text-sm text-gray-500 break-words">{documentoCompleto}</div>
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
          if (!row) return <div>-</div>;
          
          // Buscar cargo en múltiples campos posibles
          let cargo = row.personal_cargo_nombre || row.cargo_nombre || row.cargo;
          
          // Si no se encuentra cargo en la fila, buscarlo en personalOptions por personal_id
          if (!cargo && row.personal_id) {
            const personalEncontrado = personalOptions.find(p => p.value === row.personal_id.toString());
            cargo = personalEncontrado?.cargo_nombre || '-';
          }
          
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
        key: 'area',
        label: 'Área',
        minWidth: getColumnWidths('120px', '200px'),
        maxWidth: getColumnWidths('180px', '280px'),
        width: getColumnWidths('20%', '35%'),
        render: (row) => {
          if (!row) return <div>-</div>;
          
          // Buscar área en múltiples campos posibles
          let area = row.personal_area_nombre || row.area_nombre || row.area;
          
          // Si no se encuentra área en la fila, buscarla en personalOptions por personal_id
          if (!area && row.personal_id) {
            const personalEncontrado = personalOptions.find(p => p.value === row.personal_id.toString());
            area = personalEncontrado?.area_nombre || '-';
          }
          
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
              {area || '-'}
            </div>
          );
        }
      },
      {
        key: 'hora_ingreso',
        label: 'Ingreso',
        minWidth: getColumnWidths('60px', '60px'),
        maxWidth: getColumnWidths('80px', '80px'),
        width: getColumnWidths('80px', '80px'),
        render: (row) => {
          if (!row) return <div>-</div>;
          let horaFormateada = row.hora_ingreso || '-';
          if (horaFormateada !== '-' && horaFormateada.includes(':')) {
            // Quitar segundos si los tiene
            horaFormateada = horaFormateada.substring(0, 5);
          }
          return <div className="text-sm text-gray-900 px-1">{horaFormateada}</div>;
        }
      },
      {
        key: 'estado_presencia',
        label: 'Estado',
        minWidth: getColumnWidths('120px', '120px'),
        maxWidth: getColumnWidths('120px', '120px'),
        width: getColumnWidths('120px', '120px'),
        render: (row) => {
          if (!row) return null;
          return <EstadoBadge estado={row.estado_presencia} />;
        }
      }
    ];

    // Solo agregar fecha y hora de salida en historial
    if (activeTab === 'historial') {
      baseColumns.splice(3, 0, {
        key: 'fecha',
        label: 'Fecha',
        minWidth: getColumnWidths('110px', '110px'),
        maxWidth: getColumnWidths('110px', '110px'),
        width: getColumnWidths('110px', '110px'),
        render: (row) => {
          if (!row || !row.fecha) return <div>-</div>;
          try {
            const fecha = new Date(row.fecha);
            return <div className="text-sm text-gray-900 px-1">{fecha.toLocaleDateString('es-PE')}</div>;
          } catch {
            return <div className="text-sm text-gray-900 px-1">{row.fecha}</div>;
          }
        }
      });

      baseColumns.push({
        key: 'hora_salida',
        label: 'Salida',
        minWidth: getColumnWidths('60px', '80px'),
        maxWidth: getColumnWidths('80px', '80px'),
        width: getColumnWidths('80px', '80px'),
        render: (row) => {
          if (!row) return <div>-</div>;
          let horaFormateada = row.hora_salida || '-';
          if (horaFormateada !== '-' && horaFormateada.includes(':')) {
            // Quitar segundos si los tiene
            horaFormateada = horaFormateada.substring(0, 5);
          }
          return <div className="text-sm text-gray-900 px-1">{horaFormateada}</div>;
        }
      });
    }

    // Agregar columna de acciones solo para "hoy"
    if (activeTab === 'hoy') {
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
          
          const tieneSalida = row.hora_salida;
          const tieneIngreso = row.hora_ingreso;
          const esAusente = row.estado_presencia === 'Ausente';
          
          // Solo mostrar botón de salida si tiene ingreso, no es ausente y no tiene salida
          const puedeRegistrarSalida = tieneIngreso && !esAusente && !tieneSalida;
          
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
              
              {/* Botón Registrar Salida - solo si tiene ingreso, no es ausente y no tiene salida */}
              {puedeRegistrarSalida && (
                <button
                  onClick={() => registrarSalida(row.personal_id)}
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

    // Agregar columna de acciones para historial
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
  };

  // Configurar paginación según el tab
  const getPaginationProps = () => {
    switch (activeTab) {
      case 'hoy':
        return {
          pagination: true,
          itemsPerPage: hoyPagination.itemsPerPage,
          currentPage: hoyPagination.currentPage,
          totalItems: hoyPagination.totalItems,
          onPageChange: handleHoyPageChange
        };
      case 'historial':
        return {
          pagination: true,
          itemsPerPage: historialPagination.itemsPerPage,
          currentPage: historialPagination.currentPage,
          totalItems: historialPagination.totalItems,
          totalPages: historialPagination.totalPages,
          onPageChange: handleHistorialPageChange
        };
      default:
        return { pagination: false };
    }
  };

  // Función para exportar
  const handleExport = (format) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filtros.busqueda) params.append('q', filtros.busqueda);
      if (filtros.personalId) params.append('personalId', filtros.personalId);
      if (filtros.estadoPresencia) params.append('estadoPresencia', filtros.estadoPresencia);
      if (filtros.fechaDesde) params.append('fechaInicio', filtros.fechaDesde);
      if (filtros.fechaHasta) params.append('fechaFin', filtros.fechaHasta);
      
      const queryString = params.toString();
      const url = `/api/asistencia-personal/export/${format}${queryString ? '?' + queryString : ''}`;
      
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
        link.download = `Reporte_Asistencia_${fecha}.${extension}`;
        
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

  // Configuración de tabs
  const tabs = [
    {
      key: 'hoy',
      label: 'Asistencia de Hoy',
      icon: <ClockIcon className="h-4 w-4" />,
      count: estadisticas.total
    },
    {
      key: 'historial',
      label: 'Historial de Asistencias',
      icon: <CalendarIcon className="h-4 w-4" />
    },
    {
      key: 'estadisticas',
      label: 'Estadísticas',
      icon: null,
      isStatsButton: true
    }
  ];

  return (
    <div className="h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Error Messages */}
      <div className="flex-shrink-0">
        {error && (
          <div className="mx-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 mt-0 bg-gray-50">
        <div className="flex gap-4 min-h-0">
          {/* Columna Izquierda - Tabla (70%) */}
          <div className="w-[70%] overflow-x-auto">
            <Card className="shadow-lg border border-gray-200 bg-card flex-1 flex flex-col rounded-2xl">
              <div className="p-0 flex flex-col h-full">
                {/* Título y estadísticas */}
                <div className="px-0">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-800">Control de Asistencia de Personal</h2>
                    
                    <div className="flex items-center space-x-3">
                      {/* Barra de búsqueda rápida - Solo en pestaña de asistencia de hoy */}
                      {activeTab === 'hoy' && (
                        <div className="w-80">
                          <QuickSearchBar
                            data={asistenciasHoy.filter(a => 
                              a.hora_ingreso && 
                              !a.hora_salida && 
                              a.estado_presencia !== 'Ausente'
                            ) || []}
                            activeTab={activeTab}
                            onSelect={(item) => {
                              if (item.personal_id) {
                                registrarSalida(item.personal_id);
                              }
                            }}
                            placeholder="Buscar personal activo..."
                          />
                        </div>
                      )}
                      
                      {/* Dropdown de exportación - Solo en historial */}
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
                              
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20">
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
                    </div>
                  </div>
                </div>
                
                {/* TabView */}
                <TabView 
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  className="flex-1 flex flex-col"
                >
                  <div className="flex-1 flex flex-col">
                    {activeTab === 'estadisticas' ? (
                      // Mostrar estadísticas cuando estemos en el tab de estadísticas
                      categoriaEstadisticas === 'total-asistencias' ? (
                        <AsistenciasTotalesCard />
                      ) : categoriaEstadisticas === 'puntualidad' ? (
                        <PuntualidadCard />
                      ) : categoriaEstadisticas === 'ausencias' ? (
                        <AusenciasCard />
                      ) : categoriaEstadisticas === 'areas' ? (
                        <AreasCard />
                      ) : categoriaEstadisticas === 'personal' ? (
                        <PersonalCard />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <p>Seleccione una categoría de estadísticas</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        {/* Indicadores arriba de la tabla, dentro del contenedor blanco */}
                        <div className="px-0 pt-0 pb-2">
                          <IndicadoresAsistencia 
                            estadisticas={estadisticas} 
                            showCalendarButton={activeTab === 'historial'}
                            onCalendarClick={() => setIsCalendarModalOpen(true)}
                          />
                        </div>

                        <div className="flex-1">
                          <TableGenerica
                            columns={getColumns()}
                            data={getTabData()}
                            {...getPaginationProps()}
                            emptyMessage={
                              activeTab === 'hoy'
                                ? 'No hay asistencias registradas hoy'
                                : 'No se encontraron registros para los filtros aplicados'
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                </TabView>
              </div>
            </Card>
          </div>
          
          {/* Columna Derecha - Formulario (30%) */}
          <div className="w-[30%] pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {activeTab === 'estadisticas' ? (
                  <motion.div variants={itemVariants}>
                    <PanelSeleccionEstadisticas
                      categoriaActiva={categoriaEstadisticas}
                      onCategoriaChange={setCategoriaEstadisticas}
                    />
                  </motion.div>
                ) : activeTab === 'historial' ? (
                  <>
                    <motion.div variants={itemVariants}>
                      <DateRangeFilter
                        fechaDesde={filtros.fechaDesde}
                        fechaHasta={filtros.fechaHasta}
                        onFechaDesdeChange={handleFechaDesdeChange}
                        onFechaHastaChange={handleFechaHastaChange}
                        onClear={() => {
                          const filtrosCompletos = {
                            ...filtros,
                            fechaDesde: null,
                            fechaHasta: null,
                          };
                          setSemanaUI(null); // limpiar chips al limpiar fechas
                          ejecutarBusqueda(filtrosCompletos, 1);
                        }}
                        onSemanaChange={(info) => setSemanaUI(info)}
                        semanaUIProp={semanaUI}
                        className="mb-4"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants}>
                      <FormularioBusquedaHistorial
                        filtros={filtros}
                        onBuscar={handleFiltrosChange}
                        personalOptions={personalOptions}
                        loading={loading}
                        tiposDocumento={tiposDocumento}
                        areas={areas}
                      />
                    </motion.div>
                  </>
                ) : (
                  <motion.div variants={itemVariants}>
                    <FormularioRegistroIngreso
                      personalOptions={personalOptions}
                      personalSeleccionado={personalSeleccionado}
                      onPersonalChange={setPersonalSeleccionado}
                      onRegistrarIngreso={registrarIngreso}
                      loading={loading}
                      tiposDocumento={tiposDocumento}
                      areas={areas}
                      documentoInputRef={documentoInputRef}
                      asistenciasHoy={asistenciasHoy}
                    />
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* Modal de Calendario Mensual */}
      <ModalGenerico
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        title="Calendario Mensual de Asistencia"
        size="full"
      >
        <AsistenciaPersonalCalendario />
      </ModalGenerico>

      {/* Modal de detalles */}
      <ModalDetalles
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        data={selectedItem}
        title={`Detalles de ${activeTab === 'hoy' ? 'Asistencia' : 'Asistencia'}`}
        size="lg"
        fields={[
          {
            key: 'personal_nombres',
            label: 'Personal',
            render: (value, data) => `${data.personal_nombres || ''} ${data.personal_apellidos || ''}`.trim()
          },
          {
            key: 'personal_numero_documento',
            label: 'Documento',
            render: (value, data) => `${data.personal_tipo_documento || 'DNI'}: ${value || ''}`
          },
          {
            key: 'personal_cargo_nombre',
            label: 'Cargo',
            render: (value, data) => {
              // Buscar cargo en personalOptions si no está en la fila
              if (value) return value;
              if (data.personal_id) {
                const personalEncontrado = personalOptions.find(p => p.value === data.personal_id.toString());
                return personalEncontrado?.cargo_nombre || 'Sin cargo asignado';
              }
              return 'Sin cargo asignado';
            }
          },
          {
            key: 'personal_area_nombre',
            label: 'Área',
            render: (value, data) => {
              // Buscar área en personalOptions si no está en la fila
              if (value) return value;
              if (data.personal_id) {
                const personalEncontrado = personalOptions.find(p => p.value === data.personal_id.toString());
                return personalEncontrado?.area_nombre || 'Sin área asignada';
              }
              return 'Sin área asignada';
            }
          },
          {
            key: 'estado_presencia',
            label: 'Estado de Presencia',
            render: (value) => value || 'No especificado'
          },
          {
            key: 'fecha',
            label: 'Fecha',
            render: (value) => {
              if (!value) return 'No especificada';
              try {
                const fecha = new Date(value);
                return fecha.toLocaleDateString('es-PE');
              } catch {
                return value;
              }
            }
          },
          {
            key: 'hora_ingreso',
            label: 'Hora de Ingreso',
            render: (value) => {
              if (!value) return 'No registrada';
              return value.substring(0, 5); // Quitar segundos
            }
          },
          {
            key: 'hora_salida',
            label: 'Hora de Salida',
            render: (value) => {
              if (!value) return 'Sin salida registrada';
              return value.substring(0, 5); // Quitar segundos
            }
          },
          {
            key: 'usuario_registro',
            label: 'Registrado por',
            render: (value) => value || 'No especificado'
          }
        ]}
      />
    </div>
  );
};

// Componente: Formulario de registro de ingreso
const FormularioRegistroIngreso = ({ personalOptions, personalSeleccionado, onPersonalChange, onRegistrarIngreso, loading, tiposDocumento, areas, documentoInputRef, asistenciasHoy }) => {
  const [formData, setFormData] = useState({
    personalSeleccionado: null,
    tipoDocumento: '',
    numeroDocumento: '',
    area: ''
  });

  // Filtrar personal que ya tiene asistencia registrada (Presente, Tarde/Tardanza)
  const personalOptionsFiltrados = useMemo(() => {
    return personalOptions.filter(p => {
      // Buscar si el personal tiene asistencia hoy
      const asistencia = asistenciasHoy.find(a => String(a.personal_id) === String(p.value));
      
      // Si no tiene asistencia, mostrarlo
      if (!asistencia) return true;
      
      // Si tiene asistencia, verificar su estado
      // Excluir si ya registró ingreso o tiene estado Presente/Tarde/Tardanza
      const tieneIngreso = !!asistencia.hora_ingreso;
      const estadoExcluido = ['Presente', 'Tarde', 'Tardanza'].includes(asistencia.estado_presencia);
      
      if (tieneIngreso || estadoExcluido) {
        return false;
      }
      
      // Si está como Ausente o sin ingreso registrado, permitir seleccionarlo
      return true;
    });
  }, [personalOptions, asistenciasHoy]);

  // Seleccionar DNI por defecto cuando se cargan los tipos
  useEffect(() => {
    if (tiposDocumento.length > 0 && !formData.tipoDocumento) {
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label?.toLowerCase().includes('dni') ||
        tipo.label?.toLowerCase().includes('documento nacional')
      );
      if (tipoDNI) {
        setFormData(prev => ({ ...prev, tipoDocumento: tipoDNI.value }));
      }
    }
  }, [tiposDocumento, formData.tipoDocumento]);

  // Estados para búsqueda automática
  const [buscandoPersonal, setBuscandoPersonal] = useState(false);
  const [documentoYaBuscado, setDocumentoYaBuscado] = useState('');
  
  // Estados para mensajes informativos
  const [mensajePersonal, setMensajePersonal] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  // Función para verificar si el personal ya tiene asistencia registrada hoy
  const verificarAsistenciaHoy = (personalId) => {
    const asistenciaExistente = asistenciasHoy.find(a => a.personal_id === parseInt(personalId));
    return asistenciaExistente;
  };

  // Función para limpiar mensajes
  const limpiarMensajes = () => {
    setMensajePersonal('');
    setTipoMensaje('');
  };

  // Búsqueda automática con debounce (igual que RegistroForm.jsx)
  useEffect(() => {
    const documentoActual = `${formData.tipoDocumento}-${formData.numeroDocumento}`;
    
    // Solo buscar si tenemos número de documento con al menos 8 caracteres,
    // no estamos buscando actualmente, y no hemos buscado este documento específico antes
    if (formData.numeroDocumento && 
        formData.numeroDocumento.length >= 8 &&
        !buscandoPersonal &&
        documentoActual !== documentoYaBuscado) {
      
      // Usar setTimeout para evitar múltiples llamadas
      const timeoutId = setTimeout(() => {
        buscarPersonalPorDocumento();
      }, 500); // Esperar 500ms después del último cambio
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.tipoDocumento, formData.numeroDocumento, buscandoPersonal, documentoYaBuscado]);

  // Función para buscar personal por documento (igual que buscarVisitante en RegistroForm.jsx)
  const buscarPersonalPorDocumento = async () => {
    if (!formData.numeroDocumento) {
      return;
    }

    const documentoActual = `${formData.tipoDocumento}-${formData.numeroDocumento}`;
    
    setBuscandoPersonal(true);

    try {
      // Buscar en la lista local primero
      const personalEncontrado = personalOptions.find(p => {
        const numeroCoincide = p.numero_documento === formData.numeroDocumento;
        
        // Solo verificar tipo si ya tenemos un personal seleccionado (para evitar deseleccionar)
        let tipoCoincide = true;
        if (formData.personalSeleccionado && formData.tipoDocumento) {
          // Si ya hay un personal seleccionado, solo verificar tipo si es necesario
          if (formData.personalSeleccionado.value === p.value) {
            // Es el mismo personal, no verificar tipo para evitar deselección
            tipoCoincide = true;
          } else {
            // Es otro personal, verificar tipo normalmente
            if (p.tipo_documento_id) {
              tipoCoincide = p.tipo_documento_id.toString() === formData.tipoDocumento;
            } else {
              const tipoSeleccionado = tiposDocumento.find(t => t.value === formData.tipoDocumento);
              if (tipoSeleccionado && p.tipo_documento_nombre) {
                tipoCoincide = p.tipo_documento_nombre.toLowerCase().includes(tipoSeleccionado.label.toLowerCase()) ||
                             tipoSeleccionado.label.toLowerCase().includes(p.tipo_documento_nombre.toLowerCase());
              }
            }
          }
        }
        
        return numeroCoincide && tipoCoincide;
      });

      if (personalEncontrado) {
        // Verificar si ya tiene asistencia registrada hoy
        const asistenciaExistente = verificarAsistenciaHoy(personalEncontrado.value);
        
        if (asistenciaExistente) {
          // Si tiene horaIngreso, mostrar que ya tiene asistencia registrada
          if (asistenciaExistente.hora_ingreso) {
            const estadoTexto = asistenciaExistente.estado_presencia || 'Sin estado';
            setMensajePersonal(`${personalEncontrado.label} ya tiene asistencia registrada hoy - Estado: ${estadoTexto}`);
            setTipoMensaje('warning');
          } else {
            // Si no tiene horaIngreso pero tiene registro (estado Ausente), permitir actualizar
            setMensajePersonal(`${personalEncontrado.label} está marcado como ausente. Puede registrar su ingreso ahora.`);
            setTipoMensaje('info');
          }
        } else {
          setMensajePersonal('');
          setTipoMensaje('');
        }
        
        // Buscar el tipo de documento correcto
        let tipoDocumentoAsignado = '';
        if (personalEncontrado.tipo_documento_id) {
          tipoDocumentoAsignado = personalEncontrado.tipo_documento_id.toString();
        } else if (personalEncontrado.tipo_documento_nombre) {
          // Buscar por nombre del tipo de documento
          const tipoEncontrado = tiposDocumento.find(t => {
            const labelLower = t.label.toLowerCase();
            const buscandoLower = personalEncontrado.tipo_documento_nombre.toLowerCase();
            
            // Buscar por coincidencia exacta primero
            if (labelLower === buscandoLower) {
              return true;
            }
            
            // Buscar por coincidencia parcial
            if (labelLower.includes(buscandoLower) || buscandoLower.includes(labelLower)) {
              return true;
            }
            
            // Buscar por palabras clave comunes
            if (buscandoLower === 'dni' && (labelLower.includes('documento nacional') || labelLower.includes('dni'))) {
              return true;
            }
            
            return false;
          });
          
          if (tipoEncontrado) {
            tipoDocumentoAsignado = tipoEncontrado.value;
          }
        }
        
        // Autocompletar todos los campos
        setFormData(prev => ({
          ...prev,
          personalSeleccionado: personalEncontrado,
          // Solo asignar tipo de documento si no hay uno seleccionado o si es diferente
          tipoDocumento: prev.tipoDocumento || tipoDocumentoAsignado,
          area: personalEncontrado.area_id?.toString() || personalEncontrado.area_destino_id?.toString() || ''
        }));
        
        setDocumentoYaBuscado(documentoActual);
      } else {
        // Si no se encuentra, limpiar selección
        setFormData(prev => ({
          ...prev,
          personalSeleccionado: null,
          area: ''
        }));
        setDocumentoYaBuscado(documentoActual);
        setMensajePersonal('Personal no encontrado con ese número de documento');
        setTipoMensaje('error');
      }
    } catch (error) {
      console.error('Error al buscar personal:', error);
      setMensajePersonal('Error al buscar personal. Intente nuevamente.');
      setTipoMensaje('error');
    } finally {
      setBuscandoPersonal(false);
    }
  };

  // Función para limpiar búsqueda
  const limpiarBusqueda = () => {
    setMensajePersonal('');
    setTipoMensaje('');
    setDocumentoYaBuscado('');
  };

  // Función para limpiar el formulario completo
  const handleLimpiarFormulario = () => {
    // Buscar DNI en los tipos disponibles o usar el primer tipo
    let tipoPorDefecto = tiposDocumento[0]?.value || '1'; // Fallback
    if (tiposDocumento.length > 0) {
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label && (
          tipo.label.toLowerCase().includes('dni') || 
          tipo.label.toLowerCase().includes('documento nacional')
        )
      );
      tipoPorDefecto = tipoDNI ? tipoDNI.value : tiposDocumento[0].value;
    }
    
    const newFormData = {
      personalSeleccionado: null,
      tipoDocumento: tipoPorDefecto, // Preservar tipo de documento por defecto
      numeroDocumento: '',
      area: ''
    };
    
    setFormData(newFormData);
    limpiarBusqueda(); // Limpiar estado de búsqueda y mensajes
  };

  // Sincronizar estado local con el padre (selección -> prop)
  useEffect(() => {
    if (onPersonalChange) {
      onPersonalChange(formData.personalSeleccionado);
    }
  }, [formData.personalSeleccionado]);

  // Sincronizar prop con estado local (prop null -> limpiar)
  useEffect(() => {
    if (personalSeleccionado === null && formData.personalSeleccionado !== null) {
      handleLimpiarFormulario();
    }
  }, [personalSeleccionado]);

  const handleFormChange = (field, value) => {
    let validatedValue = value;
    
    // Validate document number to only accept numbers
    if (field === 'numeroDocumento') {
      validatedValue = value.replace(/[^0-9]/g, '');
      
      // If DNI, limit to 8 digits
      const tipoDNI = tiposDocumento.find(tipo => 
        tipo.label?.toLowerCase().includes('dni') ||
        tipo.label?.toLowerCase().includes('documento nacional')
      );
      
      if (tipoDNI && formData.tipoDocumento === tipoDNI.value) {
        validatedValue = validatedValue.slice(0, 8);
      } else {
        validatedValue = validatedValue.slice(0, 20);
      }
    }
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [field]: validatedValue || value
      };

      // Limpiar búsqueda solo cuando cambie número de documento (no tipo de documento)
      if (field === 'numeroDocumento') {
        limpiarBusqueda();
      }

      // Autocompletado bidireccional
      if (field === 'personalSeleccionado' && value) {
        // Cuando se selecciona personal, autocompletar todos los campos
        const personal = personalOptions.find(p => p.value === value.value);
        if (personal) {
          // Verificar si ya tiene asistencia registrada hoy
          const asistenciaExistente = verificarAsistenciaHoy(value.value);
          
          if (asistenciaExistente) {
            // Si tiene horaIngreso, mostrar que ya tiene asistencia registrada
            if (asistenciaExistente.hora_ingreso) {
              const estadoTexto = asistenciaExistente.estado_presencia || 'Sin estado';
              setMensajePersonal(`${personal.label} ya tiene asistencia registrada hoy - Estado: ${estadoTexto}`);
              setTipoMensaje('warning');
            } else {
              // Si no tiene horaIngreso pero tiene registro (estado Ausente), permitir actualizar
              setMensajePersonal(`${personal.label} está marcado como ausente. Puede registrar su ingreso ahora.`);
              setTipoMensaje('info');
            }
          } else {
            setMensajePersonal('');
            setTipoMensaje('');
          }
          
          newFormData.numeroDocumento = personal.numero_documento || '';
          
          // Asignar tipo de documento - buscar por ID primero, luego por nombre
          let tipoDocumentoAsignado = '';
          if (personal.tipo_documento_id) {
            tipoDocumentoAsignado = personal.tipo_documento_id.toString();
          } else if (personal.tipo_documento_nombre) {
            // Buscar por nombre del tipo de documento
            const tipoEncontrado = tiposDocumento.find(t => 
              t.label.toLowerCase().includes(personal.tipo_documento_nombre.toLowerCase()) ||
              personal.tipo_documento_nombre.toLowerCase().includes(t.label.toLowerCase())
            );
            if (tipoEncontrado) {
              tipoDocumentoAsignado = tipoEncontrado.value;
            }
          }
          
          newFormData.tipoDocumento = tipoDocumentoAsignado;
          newFormData.area = personal.area_id?.toString() || personal.area_destino_id?.toString() || '';
        }
      } else if (field === 'personalSeleccionado' && !value) {
        // Si se deselecciona el personal, limpiar mensajes
        limpiarMensajes();
      }

      return newFormData;
    });
  };

  return (
    <Card className="shadow-lg border border-gray-200 bg-white rounded-2xl">
      <div className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-800">
          Registrar Ingreso
        </h3>
        
                    {/* Seleccionar Personal */}
                    <SelectCustom
                      label="Seleccionar Personal *"
                      value={formData.personalSeleccionado}
                      onChange={(selectedOption) => handleFormChange('personalSeleccionado', selectedOption)}
                      options={personalOptionsFiltrados}
                      placeholder="Buscar personal..."
                      isSearchable={true}
                      menuWidth="auto"
                    />
        
        {/* Tipo de Documento y Número */}
        <div className="grid grid-cols-2 gap-3">
          <SelectCustom
            label="Tipo de Documento"
            value={tiposDocumento.find(tipo => tipo.value === formData.tipoDocumento)}
            onChange={(selectedOption) => handleFormChange('tipoDocumento', selectedOption?.value || '')}
            options={tiposDocumento}
            placeholder="Seleccione..."
            isClearable={false}
          />
          
                       <div className="flex flex-col">
                         <label className="block text-sm font-medium text-gray-700 mb-1">
                           Número de Documento *
                         </label>
                         <div className="flex mt-auto">
                           <Input
                             ref={documentoInputRef}
                             value={formData.numeroDocumento}
                             onChange={(e) => handleFormChange('numeroDocumento', e.target.value)}
                             placeholder=""
                             maxLength={(() => {
                               const tipoDNI = tiposDocumento.find(tipo => 
                                 tipo.label?.toLowerCase().includes('dni') ||
                                 tipo.label?.toLowerCase().includes('documento nacional')
                               );
                               return (tipoDNI && formData.tipoDocumento === tipoDNI.value) ? "8" : "20";
                             })()}
                             className="rounded-r-none border-r-0"
                             style={{ borderTopRightRadius: '0', borderBottomRightRadius: '0' }}
                           />
                           <Button
                             onClick={buscarPersonalPorDocumento}
                             disabled={!formData.tipoDocumento || !formData.numeroDocumento || buscandoPersonal}
                             className="rounded-l-none border-l-0 bg-blue-600 hover:bg-blue-700 text-white px-3"
                             size="sm"
                           >
                             {buscandoPersonal ? (
                               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                             ) : (
                               <MagnifyingGlassIcon className="h-4 w-4" />
                             )}
                           </Button>
                         </div>
                       </div>
        </div>
        
        {/* Área */}
        <SelectCustom
          label="Área"
          value={areas.find(area => area.value === formData.area)}
          onChange={(selectedOption) => handleFormChange('area', selectedOption?.value || '')}
          options={areas}
          placeholder="Seleccione área..."
          isClearable={true}
        />
        
        {/* Mensaje de estado de la búsqueda */}
        {mensajePersonal && (
          <div className={`p-2 rounded-lg border text-xs ${
            tipoMensaje === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            tipoMensaje === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            tipoMensaje === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{mensajePersonal}</span>
              <Button
                variant="ghost"
                onClick={limpiarMensajes}
                className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6"
                size="sm"
              >
                ×
              </Button>
            </div>
          </div>
        )}
        
                    {/* Información del personal seleccionado */}
                    {/* {formData.personalSeleccionado && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">Personal seleccionado:</div>
                        <div className="text-sm font-medium text-gray-900">{formData.personalSeleccionado.label}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          <span className="font-medium">Cargo:</span> {formData.personalSeleccionado.cargo_nombre}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Área:</span> {formData.personalSeleccionado.area_nombre}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Documento:</span> {formData.personalSeleccionado.tipo_documento}: {formData.personalSeleccionado.numero_documento}
                        </div>
                      </div>
                    ) */}
        
        {/* Botones de registro y limpieza */}
        <div className="flex gap-2">
          <Button
            onClick={() => onRegistrarIngreso(formData.personalSeleccionado)}
            disabled={!formData.personalSeleccionado || loading}
            className="flex-1"
            size="lg"
          >
            <CheckCircleIcon className="h-5 w-5 inline mr-2" />
            Registrar Ingreso
          </Button>
          <Button
            variant="outline"
            onClick={handleLimpiarFormulario}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
            size="lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Componente: Formulario de búsqueda para historial
const FormularioBusquedaHistorial = ({ filtros, onBuscar, personalOptions, loading, tiposDocumento, areas }) => {
  const [formFiltros, setFormFiltros] = useState({
    busqueda: '',
    personalId: '',
    estadoPresencia: '',
    areaId: '',
    cargoId: '',
    ...filtros
  });

  // Estados para cargar cargos
  const [cargos, setCargos] = useState([]);
  const [cargosFiltrados, setCargosFiltrados] = useState([]);
  const [areasFiltradas, setAreasFiltradas] = useState([]);
  const [personalFiltrado, setPersonalFiltrado] = useState([]);

  // Cargar cargos al montar el componente
  useEffect(() => {
    const cargarCargos = async () => {
      try {
        const response = await import('../services/api').then(module => module.cargosService.getAll());
        if (response.data.success) {
          const cargosData = response.data.data.map(cargo => ({
            value: cargo.id.toString(),
            label: cargo.nombre_cargo || cargo.nombre
          }));
          setCargos(cargosData);
          setCargosFiltrados(cargosData); // Inicializar con todos los cargos
        }
      } catch (error) {
        console.error('Error al cargar cargos:', error);
      }
    };

    cargarCargos();
  }, []);

  // Inicializar áreas filtradas con todas las áreas
  useEffect(() => {
    setAreasFiltradas(areas);
  }, [areas]);

  // Inicializar personal filtrado con todo el personal
  useEffect(() => {
    setPersonalFiltrado(personalOptions);
  }, [personalOptions]);

  // Función para obtener cargos de un área específica
  const obtenerCargosDeArea = (areaId) => {
    if (!areaId) {
      return cargos; // Retornar todos los cargos si no hay área seleccionada
    }
    
    // Filtrar personal por área y obtener cargos únicos
    const personalDelArea = personalOptions.filter(personal => 
      (personal.area_id?.toString() === areaId || personal.area_destino_id?.toString() === areaId)
    );
    
    // Obtener cargos únicos del personal de esa área
    const cargosUnicos = [...new Set(personalDelArea.map(p => p.cargo_id).filter(Boolean))];
    
    return cargos.filter(cargo => cargosUnicos.includes(cargo.value));
  };

  // Función para obtener áreas de un cargo específico
  const obtenerAreasDeCargo = (cargoId) => {
    if (!cargoId) {
      return areas; // Retornar todas las áreas si no hay cargo seleccionado
    }
    
    // Filtrar personal por cargo y obtener áreas únicas
    const personalDelCargo = personalOptions.filter(personal => 
      personal.cargo_id?.toString() === cargoId
    );
    
    // Obtener áreas únicas del personal de ese cargo
    const areasUnicas = [...new Set(personalDelCargo.map(p => 
      p.area_id?.toString() || p.area_destino_id?.toString()
    ).filter(Boolean))];
    
    return areas.filter(area => areasUnicas.includes(area.value));
  };

  // Función para filtrar personal por área y cargo
  const filtrarPersonal = (areaId, cargoId) => {
    let personalFiltrado = personalOptions;
    
    // Filtrar por área si está seleccionada
    if (areaId) {
      personalFiltrado = personalFiltrado.filter(personal => 
        personal.area_id?.toString() === areaId || 
        personal.area_destino_id?.toString() === areaId
      );
    }
    
    // Filtrar por cargo si está seleccionado
    if (cargoId) {
      personalFiltrado = personalFiltrado.filter(personal => 
        personal.cargo_id?.toString() === cargoId
      );
    }
    
    return personalFiltrado;
  };

  const handleChange = (field, value) => {
    const newFiltros = {
      ...formFiltros,
      [field]: value
    };
    
    // Implementar vinculación automática entre área y cargo (igual que RegistroForm.jsx)
    if (field === 'areaId') {
      // Cuando se selecciona un área, filtrar cargos disponibles en esa área
      const cargosDisponibles = obtenerCargosDeArea(value);
      setCargosFiltrados(cargosDisponibles);
      
      // Si había un cargo seleccionado que no está disponible en la nueva área, limpiarlo
      if (newFiltros.cargoId && !cargosDisponibles.find(c => c.value === newFiltros.cargoId)) {
        newFiltros.cargoId = '';
      }
      
      // Filtrar personal por área y cargo actual
      const personalFiltradoPorArea = filtrarPersonal(value, newFiltros.cargoId);
      setPersonalFiltrado(personalFiltradoPorArea);
      
    } else if (field === 'cargoId') {
      // Cuando se selecciona un cargo, filtrar áreas disponibles para ese cargo
      const areasDisponibles = obtenerAreasDeCargo(value);
      setAreasFiltradas(areasDisponibles);
      
      // Si había un área seleccionada que no está disponible para el nuevo cargo, limpiarla
      if (newFiltros.areaId && !areasDisponibles.find(a => a.value === newFiltros.areaId)) {
        newFiltros.areaId = '';
      }
      
      // Filtrar personal por área y cargo actual
      const personalFiltradoPorCargo = filtrarPersonal(newFiltros.areaId, value);
      setPersonalFiltrado(personalFiltradoPorCargo);
      
    } else if (field === 'personalId' && value) {
      // Si selecciona personal, autocompletar área y cargo
      const personal = personalOptions.find(p => p.value === value);
      if (personal) {
        // Autocompletar área si está disponible
        if (personal.area_id || personal.area_destino_id) {
          const areaId = personal.area_id?.toString() || personal.area_destino_id?.toString();
          newFiltros.areaId = areaId;
        }
        
        // Autocompletar cargo si está disponible
        if (personal.cargo_id) {
          newFiltros.cargoId = personal.cargo_id.toString();
        }
      }
    }
    
    setFormFiltros(newFiltros);
  };

  const handleBuscar = () => {
    onBuscar(formFiltros);
  };

  const handleLimpiar = () => {
    const filtrosLimpios = {
      busqueda: '',
      personalId: '',
      estadoPresencia: '',
      areaId: '',
      cargoId: ''
    };
    setFormFiltros(filtrosLimpios);
    // Restaurar listas completas al limpiar
    setCargosFiltrados(cargos);
    setAreasFiltradas(areas);
    setPersonalFiltrado(personalOptions);
    onBuscar(filtrosLimpios);
  };

  const estadosOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'Presente', label: 'Presente' },
    { value: 'Tarde', label: 'Tardanza' },
    { value: 'Ausente', label: 'Ausente' },
    { value: 'Permiso', label: 'Permiso' }
  ];

  return (
    <Card className="shadow-lg border border-gray-200 bg-white rounded-2xl">
      <div className="p-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-800">
          Buscar Asistencias
        </h3>
        
        {/* Seleccionar personal específico */}
        <SelectCustom
          label="Seleccionar Personal"
          value={personalFiltrado.find(p => p.value === formFiltros.personalId) || null}
          onChange={(selectedOption) => handleChange('personalId', selectedOption?.value || '')}
          options={[{ value: '', label: 'Todo el personal' }, ...personalFiltrado]}
          placeholder="Seleccione..."
          isSearchable={true}
          menuWidth="auto"
        />
        
        {/* Área y Cargo - lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <SelectCustom
            label="Área"
            value={areasFiltradas.find(a => a.value === formFiltros.areaId) || null}
            onChange={(selectedOption) => handleChange('areaId', selectedOption?.value || '')}
            options={[{ value: '', label: 'Todas las áreas' }, ...areasFiltradas]}
            placeholder="Seleccione área..."
            isSearchable={true}
            menuWidth="auto"
          />
          <SelectCustom
            label="Cargo"
            value={cargosFiltrados.find(c => c.value === formFiltros.cargoId) || null}
            onChange={(selectedOption) => handleChange('cargoId', selectedOption?.value || '')}
            options={[{ value: '', label: 'Todos los cargos' }, ...cargosFiltrados]}
            placeholder="Seleccione cargo..."
            isSearchable={true}
            menuWidth="auto"
          />
        </div>
        
        {/* Filtro por estado */}
        <SelectCustom
          label="Estado de Presencia"
          value={estadosOptions.find(e => e.value === formFiltros.estadoPresencia) || null}
          onChange={(selectedOption) => handleChange('estadoPresencia', selectedOption?.value || '')}
          options={estadosOptions}
          placeholder="Todos"
        />
        
        {/* Botones */}
        <div className="flex gap-2">
          <Button
            onClick={handleBuscar}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
          >
            Buscar Personal
          </Button>
          <Button
            variant="outline"
            onClick={handleLimpiar}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3"
            size="lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Badge para estados de presencia
const EstadoBadge = ({ estado }) => {
  if (!estado) return <span className="text-gray-900 text-sm">-</span>;

  const configs = {
    'Presente': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
    'Tarde': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
    'Tardanza': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon }, // Mismo color que Tarde
    'Ausente': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
    'Permiso': { bg: 'bg-blue-100', text: 'text-blue-800', icon: ExclamationTriangleIcon }
  };
  
  const config = configs[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircleIcon };
  const Icon = config.icon;
  const isOfflineLabel = typeof estado === 'string' && estado.toLowerCase().includes('offline');
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {!isOfflineLabel && <Icon className="h-3 w-3 mr-1" />}
      {estado}
    </span>
  );
};

// Componente de indicadores de asistencia
const IndicadoresAsistencia = ({ estadisticas, showCalendarButton, onCalendarClick }) => {
    const items = [
      { key: 'presentes', label: 'Presentes', value: estadisticas.presentes, icon: CheckCircleIcon, chip: 'bg-white text-green-600 border-green-300' },
      { key: 'tardes',    label: 'Tardanzas', value: estadisticas.tardes,    icon: ClockIcon,       chip: 'bg-white text-amber-600 border-amber-300' },
      { key: 'ausentes',  label: 'Ausentes',  value: estadisticas.ausentes,  icon: XCircleIcon,     chip: 'bg-white text-red-600 border-red-300' },
      { key: 'permisos',  label: 'Permisos',  value: estadisticas.permisos,  icon: ExclamationTriangleIcon, chip: 'bg-white text-blue-600 border-blue-300' },
    ];

  return (
    <div className="w-full flex gap-4">
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${showCalendarButton ? 'flex-1' : 'w-full'}`}>
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
      
      {showCalendarButton && (
      <div className="flex-none">
        <Button 
          onClick={onCalendarClick}
          className="!bg-white !text-blue-600 !border !border-blue-600 hover:!bg-blue-600/10 h-full transition-colors"
          leftIcon={<CalendarIcon className="h-4 w-4" />}
        >
          Calendario Mensual
        </Button>
      </div>
    )}
    </div>
  );
};

export default PersonalAsistenciaPage;
