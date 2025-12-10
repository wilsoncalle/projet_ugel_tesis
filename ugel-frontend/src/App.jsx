import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// ============================================
// SOLO IMPORTACIONES CRÍTICAS (NO LAZY)
// ============================================
// Public Pages (mínimo necesario para login móvil)
import MobileLoginPage from './pages/MobileLoginPage';

// ============================================
// LAZY LOADING - TODO LO DEMÁS
// ============================================
// Layout (solo se carga cuando se necesita)
const MainLayout = lazy(() => import('./components/MainLayout'));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));

// Public Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Protected Pages - Admin
const DashboardAdminPage = lazy(() => import('./pages/DashboardAdminPage'));
const AreasPage = lazy(() => import('./pages/AreasPage'));
const TiposDocumentoPage = lazy(() => import('./pages/TiposDocumentoPage'));
const MotivosVisitaPage = lazy(() => import('./pages/MotivosVisitaPage'));
const TiposContratoPage = lazy(() => import('./pages/TiposContratoPage'));
const CargosPage = lazy(() => import('./pages/CargosPage'));
const UsuariosPage = lazy(() => import('./pages/UsuariosPage'));
const AdminCatalogosPage = lazy(() => import('./pages/AdminCatalogosPage'));
const ConfigAsistenciaPage = lazy(() => import('./pages/ConfigAsistenciaPage'));
const ReniecProvidersPage = lazy(() => import('./pages/ReniecProvidersPage'));

// Protected Pages - RRHH
const DashboardRRHHPage = lazy(() => import('./pages/DashboardRRHHPage'));
const PersonalPage = lazy(() => import('./pages/PersonalPage'));
const CrearPersonalPage = lazy(() => import('./pages/CrearPersonalPage'));
const PapeletasPage = lazy(() => import('./pages/PapeletasPage'));
const GestionJustificacionesPage = lazy(() => import('./pages/GestionJustificacionesPage'));
const ReportesRRHHPage = lazy(() => import('./pages/ReportesRRHHPage'));

// Protected Pages - Vigilante
const DashboardVigilantePage = lazy(() => import('./pages/DashboardVigilantePage'));
const VigilantePapeletasPage = lazy(() => import('./pages/VigilantePapeletasPage'));

// Protected Pages - Personal
const MisVisitasPage = lazy(() => import('./pages/MisVisitasPage'));
const MiAsistenciaPersonalPage = lazy(() => import('./pages/MiAsistenciaPersonalPage'));

// Protected Pages - Shared
const PersonalAsistenciaPage = lazy(() => import('./pages/PersonalAsistenciaPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Mobile Scanner
const MobileScannerPage = lazy(() => import('./pages/MobileScannerPage'));

// Default Redirect Component
const DefaultRedirect = () => {
  const { user } = useAuth();
  const role = user?.rol?.toLowerCase() || '';
  
  if (role.includes('admin')) return <Navigate to="/admin" replace />;
  if (role.includes('rrhh')) return <Navigate to="/rrhh" replace />;
  if (role.includes('vigilante')) return <Navigate to="/vigilante" replace />;
  if (role.includes('personal')) return <Navigate to="/mis-visitas" replace />;
  
  return <Navigate to="/login" replace />;
};

// Routes Configuration
import ProtectedRoute from './routes/ProtectedRoute';
import { useSystemNotifications } from './hooks/useSystemNotifications';

// Loading fallback component
const LoadingFallback = ({ text = "Cargando..." }) => (
  <div className="h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600">{text}</p>
    </div>
  </div>
);

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
        <Route 
          path="/login" 
          element={!isAuthenticated ? (
            <Suspense fallback={<LoadingFallback />}>
              <LoginPage />
            </Suspense>
          ) : <Navigate to="/" />} 
        />
        
        {/* Mobile-optimized Login (lightweight - NO lazy, carga inmediato) */}
        <Route path="/m/login" element={!isAuthenticated ? <MobileLoginPage /> : <Navigate to="/escaner-movil" />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Mobile Scanner with Lazy Loading */}
          <Route 
            path="/escaner-movil" 
            element={
              <Suspense fallback={
                <div className="h-screen bg-black flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white text-sm">Cargando escáner...</p>
                  </div>
                </div>
              }>
                <MobileScannerPage />
              </Suspense>
            } 
          />
          
          {/* All other routes wrapped in MainLayout */}
          <Route element={
            <Suspense fallback={<LoadingFallback />}>
              <MainLayout />
            </Suspense>
          }>
            {/* Admin Routes */}
            <Route path="/admin">
              <Route index element={<ProtectedRoute allowedRoles={['admin']} element={<DashboardAdminPage />} />} />
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
              <Route path="reportes" element={<ProtectedRoute allowedRoles={['rrhh']} element={<ReportesRRHHPage />} />} />
              <Route path="personal" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PersonalPage />} />} />
              <Route path="personal/crear" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="personal/editar/:id" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="papeletas" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PapeletasPage />} />} />
              <Route path="justificaciones" element={<ProtectedRoute allowedRoles={['rrhh']} element={<GestionJustificacionesPage />} />} />
              <Route path="asistencia-personal" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PersonalAsistenciaPage />} />} />
            </Route>
            
            {/* Vigilante Routes */}
            <Route path="/vigilante">
              <Route index element={<ProtectedRoute allowedRoles={['vigilante']} element={<DashboardVigilantePage />} />} />
              <Route path="asistencia-personal" element={<ProtectedRoute allowedRoles={['vigilante']} element={<PersonalAsistenciaPage />} />} />
              <Route path="papeletas" element={<ProtectedRoute allowedRoles={['vigilante']} element={<VigilantePapeletasPage />} />} />
            </Route>
            
            {/* Personal Routes */}
            <Route path="/mis-visitas" element={<ProtectedRoute allowedRoles={['personal', 'admin']} element={<MisVisitasPage />} />} />
            <Route path="/mi-asistencia" element={<ProtectedRoute allowedRoles={['personal']} element={<MiAsistenciaPersonalPage />} />} />
            
            {/* Shared Routes */}
            <Route path="/perfil" element={<ProtectedRoute element={<ProfilePage />} />} />
            
            {/* Root redirect */}
            <Route path="/" element={<DefaultRedirect />} />
          </Route>
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      
      {/* Lazy load OfflineIndicator */}
      <Suspense fallback={null}>
        <OfflineIndicator />
      </Suspense>
    </>
  );
}

export default App;
