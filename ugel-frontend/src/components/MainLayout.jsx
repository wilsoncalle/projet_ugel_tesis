import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Users, ClipboardCheck, FileText } from 'lucide-react';
import { papeletasSalidaService } from '../services/api';

// Componente de elemento de navegación reutilizable
const NavItem = ({ to, icon, label, badge, end = false }) => (
  <li>
    <NavLink 
      to={to}
      end={end}   // <- importante
      className={({ isActive }) =>
        `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
          isActive 
            ? 'bg-blue-100 text-blue-800' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          <span>{label}</span>
          {badge && (
            <span className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold leading-none rounded-full ${
              isActive ? 'text-blue-700 bg-blue-100' : 'text-gray-700 bg-gray-300'
            }`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  </li>
);


// Componente de encabezado de sección
const SectionHeader = ({ title }) => (
  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-6 px-3">
    {title}
  </h3>
);

// Componente de separador
const Divider = () => <hr className="my-4 border-gray-200" />;

// Sidebar para Administradores
const AdminSidebar = () => (
  <>
    <div className="mb-6">
      <SectionHeader title="Administración" />
      <ul className="space-y-2">
        <NavItem 
          to="/admin" 
          end
          icon={
            <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          } 
          label="Dashboard Principal" 
        />
      </ul>
    </div>
    
    <Divider />
    
    <div className="mb-6">
      <SectionHeader title="Configuración" />
      <ul className="space-y-2">
        <NavItem 
          to="/admin/areas" 
          icon={
            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          } 
          label="Áreas" 
        />
        <NavItem 
          to="/admin/tipos-documento" 
          icon={
            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          } 
          label="Tipos de Documento" 
        />
        <NavItem 
          to="/admin/tipos-contrato" 
          icon={
            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          } 
          label="Tipos de Contrato" 
        />
        <NavItem 
          to="/admin/motivos-visita" 
          icon={
            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          } 
          label="Motivos de Visita" 
        />
        <NavItem 
          to="/admin/motivos-salida" 
          icon={
            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          } 
          label="Motivos de Salida" 
        />
        <NavItem 
          to="/admin/cargos" 
          icon={
            <svg
              className="mr-3 h-5 w-5 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <rect x="3" y="2" width="18" height="20" rx="2" ry="2" />
              <circle cx="12" cy="10" r="3" />
              <line x1="8" y1="16" x2="16" y2="16" />
              <line x1="8" y1="19" x2="16" y2="19" />
            </svg>
          }       
          label="Cargos" 
        />
      </ul>
    </div>
    
    <Divider />
    
    <div className="mb-6">
      <SectionHeader title="Gestión de Usuarios" />
      <ul className="space-y-2">
        <NavItem 
          to="/admin/usuarios" 
          icon={
            <svg className="mr-3 h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          } 
          label="Usuarios" 
        />
      </ul>
    </div>
    
    

  </>
);

// Sidebar para Recursos Humanos
const RRHHSidebar = ({ papeletasActivasCount = 0 }) => (
  <>
    <div className="mb-6">
      <SectionHeader title="Recursos Humanos" />
      <ul className="space-y-2">
        <NavItem 
          to="/rrhh" 
          end
          icon={
            <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          } 
          label="Dashboard RRHH"
        />
        <NavItem 
          to="/rrhh/personal" 
          icon={
            <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } 
          label="Gestión de Personal" 
        />
        <NavItem 
          to="/rrhh/papeletas" 
          icon={
            <svg className="mr-3 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          } 
          label="Gestión de Papeletas"
          badge={papeletasActivasCount > 0 ? papeletasActivasCount : null}
        />
      </ul>
    </div>
  </>
);



// Sidebar básico para usuarios sin rol específico
const BasicSidebar = () => (
  <>
    <div className="mb-6">
      <SectionHeader title="Navegación" />
      <ul className="space-y-2">
        <NavItem 
          to="/" 
          icon={
            <svg className="mr-3 h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          } 
          label="Inicio" 
        />
      </ul>
    </div>
  </>
);

const MainLayout = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(
    localStorage.getItem('sidebarPinned') === 'true'
  );
  const [currentDate, setCurrentDate] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [papeletasActivasCount, setPapeletasActivasCount] = useState(0);
  
  // Determine user role for sidebar display
  const userRole = user?.rol?.toLowerCase() || '';
  
  // Verificar si estamos en la ruta del vigilante
  const isVigilanteRoute = location.pathname.startsWith('/vigilante');

  // Actualizar la fecha actual
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      };
      try {
        const formattedDate = now.toLocaleDateString('es-ES', options);
        setCurrentDate(formattedDate);
      } catch (e) {
        // Fallback manual si la API Intl no está disponible
        const weekdays = [
          'Domingo', 'Lunes', 'Martes', 'Miércoles', 
          'Jueves', 'Viernes', 'Sábado'
        ];
        const months = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        const weekday = weekdays[now.getDay()];
        const formattedDate = `${weekday}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
        setCurrentDate(formattedDate);
      }
    };

    updateDate();
    const intervalId = setInterval(updateDate, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Cargar papeletas activas (APROBADO y EN_CURSO)
  useEffect(() => {
    const cargarPapeletasActivas = async () => {
      try {
        // Cargar papeletas con estado APROBADO
        const aprobadasResponse = await papeletasSalidaService.getAll({
          estado: 'APROBADO',
          page: 1,
          limit: 1 // Solo necesitamos el total
        });
        
        // Cargar papeletas con estado EN_CURSO
        const enCursoResponse = await papeletasSalidaService.getAll({
          estado: 'EN_CURSO',
          page: 1,
          limit: 1 // Solo necesitamos el total
        });

        const totalAprobadas = aprobadasResponse.data?.pagination?.total || 0;
        const totalEnCurso = enCursoResponse.data?.pagination?.total || 0;
        const total = totalAprobadas + totalEnCurso;
        
        setPapeletasActivasCount(total);
      } catch (error) {
        console.error('Error al cargar papeletas activas:', error);
        setPapeletasActivasCount(0);
      }
    };

    cargarPapeletasActivas();
    
    // Actualizar cada 30 segundos
    const intervalId = setInterval(cargarPapeletasActivas, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Manejar el estado del sidebar
  useEffect(() => {
    // Restaurar posición de scroll
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const savedScrollPosition = localStorage.getItem('sidebarScrollPosition');
      if (savedScrollPosition) {
        sidebar.scrollTop = parseInt(savedScrollPosition);
      }
    }

    // Ajustar sidebar en cambio de tamaño de ventana
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Cerrar menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  // Toggle para el pin del sidebar (ahora controla la visibilidad en móvil)
  const togglePin = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(!sidebarOpen);
    } else {
      const newPinnedState = !isPinned;
      setIsPinned(newPinnedState);
      localStorage.setItem('sidebarPinned', newPinnedState.toString());
    }
  };

  // Guardar posición de scroll
  const handleSidebarScroll = (e) => {
    localStorage.setItem('sidebarScrollPosition', e.target.scrollTop);
  };

  // Manejar cierre de sesión
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegación superior con efecto blur */}
      <nav className="fixed top-0 left-0 right-0 z-[30] bg-white bg-opacity-70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container-fluid px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {/* Botón de hamburguesa para móvil - No mostrar en rutas de vigilante */}
              {!isVigilanteRoute && (
                <button 
                  className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 mr-3"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Toggle menu"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-800">COAC-UGEL</span>
                  <span className="text-xs text-gray-500" id="current-date">{currentDate}</span>
                </div>
                
                {/* Navegación entre Visitas, Asistencia y Papeletas */}
                {isVigilanteRoute && (
                  <div className="flex items-center gap-4 ml-4 border-b border-gray-200">
                    <NavLink
                      to="/vigilante"
                      end
                      className={({ isActive }) => `
                        flex items-center gap-2 py-3 px-2 font-medium text-sm transition-colors
                        border-b-2
                        ${isActive
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                        }
                      `}
                    >
                      <Users className="h-4 w-4" />
                      <span>Visitas</span>
                    </NavLink>
                    <NavLink
                      to="/vigilante/asistencia"
                      className={({ isActive }) => `
                        flex items-center gap-2 py-3 px-2 font-medium text-sm transition-colors
                        border-b-2
                        ${isActive
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                        }
                      `}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Asistencia</span>
                    </NavLink>
                    <NavLink
                      to="/vigilante/papeletas"
                      className={({ isActive }) => `
                        flex items-center gap-2 py-3 px-2 font-medium text-sm transition-colors
                        border-b-2
                        ${isActive
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                        }
                      `}
                    >
                      <FileText className="h-4 w-4" />
                      <span>Papeletas</span>
                      {papeletasActivasCount > 0 && (
                        <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold leading-none rounded-full ${
                          location.pathname === '/vigilante/papeletas'
                            ? 'text-blue-700 bg-blue-100'
                            : 'text-gray-700 bg-gray-200'
                        }`}>
                          {papeletasActivasCount}
                        </span>
                      )}
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Menú de usuario */}
              <div className="relative user-menu-container">
                <button 
                  className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors duration-150"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{user?.nombre || 'Usuario'}</span>
                    <span className="text-xs text-gray-500">{user?.rol || 'Sin rol'}</span>
                  </div>
                  <svg className={`h-4 w-4 ml-2 transform transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">Perfil de usuario</p>
                      <p className="text-xs text-gray-500 truncate">{user?.correo || 'usuario@ejemplo.com'}</p>
                    </div>
                    
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg className="h-4 w-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mi perfil
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg className="h-4 w-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      <svg className="h-4 w-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Ayuda y soporte
                    </a>
                    <hr className="my-1 border-gray-200" />
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Sidebar - No mostrar en rutas de vigilante */}
      {!isVigilanteRoute && (
        <aside 
          id="sidebar"
          className={`fixed left-0 top-0 z-20 h-screen w-72 bg-white shadow-lg pt-16 transition-all duration-300 
                     ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                     md:translate-x-0`}
          onScroll={handleSidebarScroll}
        >
                {/* Botón para cerrar el sidebar (solo visible en móvil) */}
        <div className="absolute right-2 top-2 md:hidden">
          <button 
            className="p-1 rounded-full hover:bg-gray-100"
            onClick={() => setSidebarOpen(false)}
            title="Cerrar menú"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Contenido del sidebar */}
        <div className="px-4 py-2 overflow-y-auto h-[calc(100vh-120px)]">
          {/* Renderizar el menú según el rol del usuario */}
          {userRole.includes('admin') && (
            <AdminSidebar />
          )}
          
          {userRole.includes('rrhh') && (
            <RRHHSidebar papeletasActivasCount={papeletasActivasCount} />
          )}
          
          {/* Si no hay rol específico o rol desconocido, mostrar un menú básico */}
          {!userRole && (
            <BasicSidebar />
          )}
        </div>
        </aside>
      )}
      
      {/* Overlay para cerrar el sidebar en móvil - No mostrar en rutas de vigilante */}
      {!isVigilanteRoute && sidebarOpen && (
        <div 
          className="fixed inset-0 z-10 bg-gray-600 bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
      
      {/* Contenido principal */}
      <main 
        className={`pt-16 min-h-screen transition-all duration-300 ease-in-out ${
          isVigilanteRoute ? 'ml-0' : 'ml-0 md:ml-72'
        }`}
      >
        {/* Contenido principal */}
        <div className={isVigilanteRoute ? 'bg-gray-50' : 'px-6 py-6 bg-gray-50'}>
          {isVigilanteRoute ? (
            <Outlet />
          ) : (
            <div className="container mx-auto">
              <Outlet />
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default MainLayout;
