import { useEffect } from 'react';
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
  
  // Fallback to login if role is unknown
  return <Navigate to="/login" replace />;
};

// Layout
import MainLayout from './components/MainLayout';

// Public Pages
import LoginPage from './pages/LoginPage';

// Protected Pages
import DashboardAdminPage from './pages/DashboardAdminPage';
import DashboardRRHHPage from './pages/DashboardRRHHPage';
import DashboardVigilantePage from './pages/DashboardVigilantePage';
import PersonalAsistenciaPage from './pages/PersonalAsistenciaPage';
import ProfilePage from './pages/ProfilePage';

// Catalog Pages
import AreasPage from './pages/AreasPage';
import TiposDocumentoPage from './pages/TiposDocumentoPage';
import MotivosVisitaPage from './pages/MotivosVisitaPage';
import TiposContratoPage from './pages/TiposContratoPage';
import MotivosSalidaPage from './pages/MotivosSalidaPage';
import CargosPage from './pages/CargosPage';
import PersonalPage from './pages/PersonalPage';
import UsuariosPage from './pages/UsuariosPage';
import CrearPersonalPage from './pages/CrearPersonalPage';
import PapeletasPage from './pages/PapeletasPage';
import VigilantePapeletasPage from './pages/VigilantePapeletasPage';
import AdminCatalogosPage from './pages/AdminCatalogosPage';

// Routes Configuration
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  const { isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* Admin Routes */}
            <Route path="/admin">
              <Route index element={<ProtectedRoute allowedRoles={['admin']} element={<DashboardAdminPage />} />} />
              
              {/* Catalog Routes */}
              <Route path="areas" element={<ProtectedRoute allowedRoles={['admin']} element={<AreasPage />} />} />
              <Route path="tipos-documento" element={<ProtectedRoute allowedRoles={['admin']} element={<TiposDocumentoPage />} />} />
              <Route path="motivos-visita" element={<ProtectedRoute allowedRoles={['admin']} element={<MotivosVisitaPage />} />} />
              <Route path="tipos-contrato" element={<ProtectedRoute allowedRoles={['admin']} element={<TiposContratoPage />} />} />
              <Route path="motivos-salida" element={<ProtectedRoute allowedRoles={['admin']} element={<MotivosSalidaPage />} />} />
              <Route path="cargos" element={<ProtectedRoute allowedRoles={['admin']} element={<CargosPage />} />} />
              <Route path="catalogos" element={<ProtectedRoute allowedRoles={['admin']} element={<AdminCatalogosPage />} />} />
              
              <Route path="usuarios" element={<ProtectedRoute allowedRoles={['admin']} element={<UsuariosPage />} />} />
            </Route>
            
            {/* RRHH Routes */}
            <Route path="/rrhh">
              <Route index element={<ProtectedRoute allowedRoles={['rrhh']} element={<DashboardRRHHPage />} />} />
              <Route path="personal" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PersonalPage />} />} />
              <Route path="personal/crear" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="personal/editar/:id" element={<ProtectedRoute allowedRoles={['rrhh']} element={<CrearPersonalPage />} />} />
              <Route path="papeletas" element={<ProtectedRoute allowedRoles={['rrhh']} element={<PapeletasPage />} />} />
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
