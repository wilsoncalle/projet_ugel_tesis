import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles, element }) => {
  const { isAuthenticated, user, loading, hasRole } = useAuth();
  const location = useLocation();

  // Show loading state if authentication check is in progress
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If element is provided, this is a leaf route
  if (element) {
    // Check role-based access
    if (allowedRoles && !hasRole(allowedRoles)) {
      // Redirect to appropriate dashboard based on user role
      const userRole = user.rol?.toLowerCase() || '';
      
      if (userRole.includes('admin')) {
        return <Navigate to="/admin" replace />;
      } else if (userRole.includes('rrhh')) {
        return <Navigate to="/rrhh" replace />;
      } else if (userRole.includes('vigilante')) {
        return <Navigate to="/vigilante" replace />;
      } else {
        // Fallback to login if role is unknown
        return <Navigate to="/login" replace />;
      }
    }
    
    // If user has the required role, render the provided element
    return element;
  }

  // If no element is provided, this is a wrapper route
  return <Outlet />;
};

export default ProtectedRoute;