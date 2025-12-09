import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import OfflineIndicator from './components/OfflineIndicator';

// Default Redirect Component
const DefaultRedirect = () => {
  const { user } = useAuth();
  const role = user?.rol?.toLowerCase() || '';
  
  if (role.includes('admin')) return <Navigate to="/admin" replace />;
  if (role.includes('rrhh')) return <Navigate to="/rrhh" replace />;
  if (role.includes('vigilante')) return <Navigate to="/vigilante" replace />;
  if (role.includes('personal')) return <Navigate to="/mis-visitas" replace />;
  
  // Fallback to login if role is unknown
  return <Navigate to="/login" replace />;
};

// Layout
import MainLayout from './components/MainLayout';

// Public Pages
import LoginPage from './pages/LoginPage';
import MobileLoginPage from './pages/MobileLoginPage';

// Protected Pages
import DashboardAdminPage from './pages/DashboardAdminPage';
import DashboardRRHHPage from './pages/DashboardRRHHPage';
import DashboardVigilantePage from './pages/DashboardVigilantePage';
import PersonalAsistenciaPage from './pages/PersonalAsistenciaPage';
import ProfilePage from './pages/ProfilePage';
import AreasPage from './pages/AreasPage';
import TiposDocumentoPage from './pages/TiposDocumentoPage';
import MisVisitasPage from './pages/MisVisitasPage';
import MiAsistenciaPersonalPage from './pages/MiAsistenciaPersonalPage';
import MotivosVisitaPage from './pages/MotivosVisitaPage';
import TiposContratoPage from './pages/TiposContratoPage';
import CargosPage from './pages/CargosPage';
import PersonalPage from './pages/PersonalPage';
import UsuariosPage from './pages/UsuariosPage';
import CrearPersonalPage from './pages/CrearPersonalPage';
import PapeletasPage from './pages/PapeletasPage';
import VigilantePapeletasPage from './pages/VigilantePapeletasPage';
import AdminCatalogosPage from './pages/AdminCatalogosPage';
import ConfigAsistenciaPage from './pages/ConfigAsistenciaPage';
import GestionJustificacionesPage from './pages/GestionJustificacionesPage';
import ReniecProvidersPage from './pages/ReniecProvidersPage';

// Lazy load mobile scanner for better performance
const MobileScannerPage = lazy(() => import('./pages/MobileScannerPage'));

// Routes Configuration
import ProtectedRoute from './routes/ProtectedRoute';

import { useSystemNotifications } from './hooks/useSystemNotifications';

function App() {
  const { isAuthenticated, checkAuth } = useAuth();
  
  // Activar notificaciones del sistema
  useSystemNotifications();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        
        {/* Mobile-optimized Login (lightweight) */}
        <Route path="/m/login" element={!isAuthenticated ? <MobileLoginPage /> : <Navigate to="/escaner-movil" />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Mobile Scanner with Lazy Loading */}
          <Route 
            path="/escaner-movil" 
            element={
              <ProtectedRoute 
                element={
                  <Suspense 
                    fallback={
                      <div className="h-screen bg-black flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-white text-sm">Cargando escáner...</p>
                        </div>
                      </div>
                    }
                  >
                    <MobileScannerPage />
                  </Suspense>
                } 
              />
            } 
          />
          <Route element={<MainLayout />}>
            {/* Admin Routes */}
            <Route path="/admin">
              <Route index element={<ProtectedRoute allowedRoles={['admin']} element={<DashboardAdminPage />} />} />
              
              {/* Catalog Routes */}
              <Route path="areas" element={<ProtectedRoute allowedRoles={['admin']} element={<AreasPage />} />} />
              <Route path="tipos-documento" element={<ProtectedRoute allowedRoles={['admin']} element={<TiposDocumentoPage />} />} />
              <Route path="motivos-visita" element={<ProtectedRoute allowedRoles={['admin']} element={<MotivosVisitaPage />} />} />
              <Route path="tipos-contrato" element={<ProtectedRoute allowedRoles={['admin']} element={<TiposContratoPage />} />} />

              <Route path="cargos" element={<ProtectedRoute allowedRoles={['admin']} element={<CargosPage />} />} />
              <Route path="catalogos" element={<ProtectedRoute allowedRoles={['admin']} element={<AdminCatalogosPage />} />} />
              
              <Route path="usuarios" element={<ProtectedRoute allowedRoles={['admin']} element={<UsuariosPage />} />} />
              <Route path="config-asistencia" element={<ProtectedRoute allowedRoles={['admin']} element={<ConfigAsistenciaPage />} />} />
              <Route path="reniec-proveedores" element={<ProtectedRoute allowedRoles={['admin']} element={<ReniecProvidersPage />} />} />
            </Route>
            
            {/* RRHH Routes */}
            <Route path="/rrhh">
              <Route index element={<ProtectedRoute allowedRoles={['rrhh']} element={<DashboardRRHHPage />} />} />
              <Route path="personal" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PersonalPage />} />} />
              <Route path="personal/crear" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="personal/editar/:id" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="papeletas" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PapeletasPage />} />} />
              <Route path="justificaciones" element={<ProtectedRoute allowedRoles={['rrhh']} element={<GestionJustificacionesPage />} />} />
              {/* Usuarios es solo para Admin; no registrar aquí */}
            </Route>

            {/* Vigilante Routes */}
            <Route path="/vigilante">
              <Route index element={<ProtectedRoute allowedRoles={['vigilante']} element={<DashboardVigilantePage />} />} />
              <Route path="asistencia" element={<ProtectedRoute allowedRoles={['vigilante']} element={<PersonalAsistenciaPage />} />} />
              <Route path="papeletas" element={<ProtectedRoute allowedRoles={['vigilante']} element={<VigilantePapeletasPage />} />} />
            </Route>
            
            {/* Ruta de Perfil - Accesible para todos los roles autenticados */}
            <Route path="/perfil" element={<ProtectedRoute element={<ProfilePage />} />} />
            <Route path="/mis-visitas" element={<ProtectedRoute element={<MisVisitasPage />} />} />
            <Route path="/mi-asistencia" element={<ProtectedRoute element={<MiAsistenciaPersonalPage />} />} />
            
            {/* Default Redirect Based on Role */}
            <Route path="/" element={<ProtectedRoute element={<DefaultRedirect />} />} />
          </Route>
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      {/* Indicador de estado offline/online */}
      {isAuthenticated && <OfflineIndicator />}
    </>
  );
}

export default App;
