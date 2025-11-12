import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Users, ClipboardCheck, FileText, Pin } from 'lucide-react';
import { papeletasSalidaService } from '../services/api';

// Anchos del sidebar (colapsado / expandido) en px
const SIDEBAR_WIDTH_COLLAPSED = 56;   // barra estrecha (iconos)
const SIDEBAR_WIDTH_EXPANDED = 224;   // “55 aprox” de ancho visual

// Hook personalizado para persistir estado booleano
const usePersistentBool = (key, initial = false) => {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initial;
    const saved = window.localStorage.getItem(key);
    return saved === null ? initial : saved === 'true';
  });
  
  useEffect(() => {
    window.localStorage.setItem(key, value);
  }, [key, value]);
  
  return [value, setValue];
};

// Componente de elemento de navegación con soporte para sidebar Edge
const NavItem = ({ to, icon, label, badge, end = false, isExpanded }) => (
  <li>
    <NavLink 
      to={to}
      end={end}
      className={({ isActive }) => {
        const baseClasses =
          'group flex items-center mx-2 my-1 rounded-2xl px-2.5 py-2 text-sm font-medium ' +
          'whitespace-nowrap overflow-hidden transition-all duration-200 ease-out';
        const activeClasses = isActive 
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600';
        return `${baseClasses} ${activeClasses}`;
      }}
    >
      {({ isActive }) => (
        <>
          <span className="flex-shrink-0 min-w-[24px] text-center mr-2.5 text-lg">
            {icon}
          </span>

          {/* Texto del item: una sola línea, recortado si es largo */}
          <span
            className={[
              'sidebar-text inline-flex items-center',
              'whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px]',
              'transform transition-all duration-200 ease-out',
              isExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-1.5 pointer-events-none'
            ].join(' ')}
          >
            {label}
          </span>

          {/* Badge solo visible expandido */}
          {badge && (
            <span
              className={[
                'ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px]',
                'px-1.5 text-[10px] font-semibold leading-none rounded-full',
                'transform transition-all duration-200 ease-out',
                isExpanded
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 translate-x-1 pointer-events-none',
                isActive ? 'text-blue-100 bg-blue-700' : 'text-gray-700 bg-gray-300'
              ].join(' ')}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  </li>
);

// Componente de encabezado de sección
const SectionHeader = ({ title, isExpanded }) => (
  <h3
    className={[
      'text-[0.68rem] font-semibold text-blue-600 uppercase',
      'tracking-[0.18em] mb-2 mt-5 px-5',
      'whitespace-nowrap overflow-hidden text-ellipsis',
      'transition-opacity duration-150 ease-out',
      isExpanded ? 'opacity-100' : 'opacity-0'
    ].join(' ')}
  >
    {title}
  </h3>
);

// Sidebar para Administradores
const AdminSidebar = ({ isExpanded }) => (
  <>
    <div className="mb-4">
      <SectionHeader title="Administración" isExpanded={isExpanded} />
      <ul className="space-y-0.5">
        <NavItem 
          to="/admin" 
          end
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          } 
          label="Dashboard Principal" 
        />
      </ul>
    </div>
    
    <div className="mb-4">
      <SectionHeader title="Configuración" isExpanded={isExpanded} />
      <ul className="space-y-0.5">
        <NavItem 
          to="/admin/areas" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          } 
          label="Áreas" 
        />
        <NavItem 
          to="/admin/tipos-documento" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          } 
          label="Tipos de Documento" 
        />
        <NavItem 
          to="/admin/tipos-contrato" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          } 
          label="Tipos de Contrato" 
        />
        <NavItem 
          to="/admin/motivos-visita" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          } 
          label="Motivos de Visita" 
        />
        <NavItem 
          to="/admin/motivos-salida" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          } 
          label="Motivos de Salida" 
        />
        <NavItem 
          to="/admin/cargos" 
          isExpanded={isExpanded}
          icon={
            <svg
              className="h-5 w-5"
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
    
    <div className="mb-4">
      <SectionHeader title="Gestión de Usuarios" isExpanded={isExpanded} />
      <ul className="space-y-0.5">
        <NavItem 
          to="/admin/usuarios" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          } 
          label="Usuarios" 
        />
      </ul>
    </div>
  </>
);

// Sidebar para Recursos Humanos
const RRHHSidebar = ({ papeletasActivasCount = 0, isExpanded }) => (
  <>
    <div className="mb-4">
      <SectionHeader title="Recursos Humanos" isExpanded={isExpanded} />
      <ul className="space-y-0.5">
        <NavItem 
          to="/rrhh" 
          end
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          } 
          label="Dashboard RRHH"
        />
        <NavItem 
          to="/rrhh/personal" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          } 
          label="Gestión de Personal" 
        />
        <NavItem 
          to="/rrhh/papeletas" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
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
const BasicSidebar = ({ isExpanded }) => (
  <>
    <div className="mb-4">
      <SectionHeader title="Navegación" isExpanded={isExpanded} />
      <ul className="space-y-0.5">
        <NavItem 
          to="/" 
          isExpanded={isExpanded}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          } 
          label="Inicio" 
        />
      </ul>
    </div>
  </>
);

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pinned, setPinned] = usePersistentBool('sidebarPinned', false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [papeletasActivasCount, setPapeletasActivasCount] = useState(0);
  
  const userRole = user?.rol?.toLowerCase() || '';
  const isVigilanteRoute =
    location.pathname.startsWith('/vigilante') ||
    (userRole.includes('vigilante') && location.pathname === '/perfil');

  // Determinar si el sidebar debe estar expandido (hover, pin o abierto en móvil)
  const isExpanded = pinned || isHovered || sidebarOpen;

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
        const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const weekday = weekdays[now.getDay()];
        const formattedDate = `${weekday}, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
        setCurrentDate(formattedDate);
      }
    };

    updateDate();
    const intervalId = setInterval(updateDate, 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Cargar papeletas activas
  useEffect(() => {
    const cargarPapeletasActivas = async () => {
      try {
        const aprobadasResponse = await papeletasSalidaService.getAll({
          estado: 'APROBADO',
          page: 1,
          limit: 1
        });
        
        const enCursoResponse = await papeletasSalidaService.getAll({
          estado: 'EN_CURSO',
          page: 1,
          limit: 1
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
    const intervalId = setInterval(cargarPapeletasActivas, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Aplicar estado pinned sin transiciones al montar / cambiar
  useLayoutEffect(() => {
    if (isVigilanteRoute) return;
    const sidebar = sidebarRef.current;
    const main = mainRef.current;
    if (!sidebar || !main) return;

    sidebar.style.transition = 'none';
    main.style.transition = 'none';
    
    if (pinned) {
      main.classList.add('content-shifted');
    } else {
      main.classList.remove('content-shifted');
    }

    // Forzar reflow
    // eslint-disable-next-line no-unused-expressions
    sidebar.offsetWidth;

    requestAnimationFrame(() => {
      sidebar.style.transition = '';
      main.style.transition = '';
    });
  }, [pinned, isVigilanteRoute]);

  // Restaurar y guardar scroll
  useEffect(() => {
    if (isVigilanteRoute) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const saved = window.localStorage.getItem('sidebarScrollPosition');
    if (saved) sidebar.scrollTop = parseInt(saved, 10);

    const handler = () => {
      window.localStorage.setItem('sidebarScrollPosition', sidebar.scrollTop);
    };
    
    sidebar.addEventListener('scroll', handler);
    return () => sidebar.removeEventListener('scroll', handler);
  }, [isVigilanteRoute]);

  // Cerrar sidebar móvil al pasar a desktop
  useEffect(() => {
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[30] bg-white bg-opacity-70 backdrop-blur-md shadow-sm border-b border-gray-200">
        <div className="container-fluid px-6 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
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
                  <span className="text-lg font-bold text-blue-700">COAC-UGEL</span>
                  <span className="text-xs text-gray-500">{currentDate}</span>
                </div>
                
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
                        <span
                          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold leading-none rounded-full ${
                            location.pathname === '/vigilante/papeletas'
                              ? 'text-blue-700 bg-blue-100'
                              : 'text-gray-700 bg-gray-200'
                          }`}
                        >
                          {papeletasActivasCount}
                        </span>
                      )}
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative user-menu-container">
                <button 
                  className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none hover:bg-gray-100 px-3 py-2 rounded-full transition-colors duration-150"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-1">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{user?.nombre_usuario || 'Usuario'}</span>
                    <span className="text-xs text-gray-500">{user?.rol || 'Sin rol'}</span>
                  </div>
                  <svg
                    className={`h-4 w-4 ml-2 transform transition-transform ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/perfil');
                        setUserMenuOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <svg className="h-4 w-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Mi perfil
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      <svg className="h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
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
      
      {/* Sidebar Edge */}
      {!isVigilanteRoute && (
        <>
          <aside 
            ref={sidebarRef}
            className={`
              sidebar-edge fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] bg-white shadow-lg 
              overflow-y-auto overflow-x-hidden
            `}
            style={{
              width: isExpanded ? `${SIDEBAR_WIDTH_EXPANDED}px` : `${SIDEBAR_WIDTH_COLLAPSED}px`,
              transform: sidebarOpen ? 'translateX(0)' : undefined
            }}
            onMouseEnter={() => !sidebarOpen && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Botón Pin */}
            <button
              className={[
                'sidebar-pin-button absolute top-2.5 right-2.5',
                'bg-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer',
                'transition-all duration-200 hover:bg-gray-100 z-[101]',
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              ].join(' ')}
              onClick={() => setPinned(prev => !prev)}
              title={pinned ? 'Desfijar menú lateral' : 'Fijar menú lateral'}
            >
              <Pin
                className={`
                  h-4 w-4 transition-transform duration-150 
                  ${pinned ? 'rotate-[-45deg] text-blue-600' : 'text-gray-600'}
                `}
              />
            </button>

            {/* Botón cerrar móvil */}
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
            
            <div className="px-0 py-4">
              {userRole.includes('admin') && (
                <AdminSidebar isExpanded={isExpanded} />
              )}
              {userRole.includes('rrhh') && (
                <RRHHSidebar
                  papeletasActivasCount={papeletasActivasCount}
                  isExpanded={isExpanded}
                />
              )}
              {!userRole && (
                <BasicSidebar isExpanded={isExpanded} />
              )}
            </div>
          </aside>

          {/* Overlay móvil */}
          {sidebarOpen && (
            <div 
              className="sidebar-overlay fixed inset-0 z-10 bg-black bg-opacity-50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </>
      )}
      
      {/* Contenido principal */}
      <main 
        ref={mainRef}
        className={`
          main-content-edge min-h-screen transition-all duration-200 ease-out
          ${isVigilanteRoute ? 'pt-20 ml-0' : 'pt-16'}
        `}
        style={{
          marginLeft: !isVigilanteRoute
            ? (pinned ? `${SIDEBAR_WIDTH_EXPANDED}px` : `${SIDEBAR_WIDTH_COLLAPSED}px`)
            : '0'
        }}
      >
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

      <style>{`
        .sidebar-edge {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          transform: translateZ(0);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          will-change: width, transform;
          transition: width 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.18s ease-out;
          box-shadow: 0 4px 8px rgba(15, 23, 42, 0.05);
        }

        .sidebar-edge:hover {
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
        }

        .sidebar-edge::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-edge::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-edge::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .sidebar-edge::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        @media (max-width: 768px) {
          .sidebar-edge {
            transform: translateX(-100%);
          }

          .sidebar-edge.sidebar-mobile-visible {
            transform: translateX(0) !important;
          }

          .main-content-edge {
            margin-left: 0 !important;
          }

          .main-content-edge.content-shifted {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
