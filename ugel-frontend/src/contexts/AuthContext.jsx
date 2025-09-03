import { createContext, useState, useCallback } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on app load
  const checkAuth = useCallback(() => {
    try {
      const storedUser = authService.getCurrentUser();
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Authentication check failed:', error);
      setLoading(false);
    }
  }, []);

  // Login function
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login(credentials);
      console.log('Login response:', response); // Debug
      
      // Extraer datos de la respuesta según la estructura correcta
      const { data } = response;
      const token = data.data?.token;
      const userData = data.data?.usuario;
      
      if (!token || !userData) {
        throw new Error('Formato de respuesta inválido');
      }
      
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error); // Debug
      
      // Determinar el mensaje de error apropiado
      let errorMessage = 'Error de autenticación';
      
      if (error.response) {
        // Error de respuesta del servidor
        errorMessage = error.response.data?.message || 'Credenciales incorrectas';
      } else if (error.request) {
        // Error de red (no se recibió respuesta)
        errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
      } else if (error.message) {
        // Error de solicitud
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Update user data
  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Check if user has a specific role
  const hasRole = (requiredRoles) => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    
    const userRole = user.rol?.toLowerCase() || '';
    
    return requiredRoles.some(role => 
      userRole.includes(role.toLowerCase())
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        login,
        logout,
        checkAuth,
        updateUser,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
