import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';

const LoginPage = () => {
  const [credentials, setCredentials] = useState({
    nombreUsuario: '',
    contrasena: '',
  });
  const [errors, setErrors] = useState({});
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!credentials.nombreUsuario.trim()) {
      newErrors.nombreUsuario = 'El usuario es requerido';
    }
    
    if (!credentials.contrasena) {
      newErrors.contrasena = 'La contraseña es requerida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    // Ya no necesitamos prevenir el envío del formulario porque no estamos usando un formulario
    
    if (!validateForm()) return;
    
    try {
      console.log('Attempting login with credentials:', { ...credentials, contrasena: '***' });
      const result = await login(credentials);
      
      if (result && result.success) {
        console.log('Login successful, redirecting...');
        // Redirect based on user role
        const user = JSON.parse(localStorage.getItem('user'));
        console.log('User data:', user); // Debug
        
        const role = user?.rol?.toLowerCase() || '';
        
        if (role.includes('admin')) {
          navigate('/admin');
        } else if (role.includes('rrhh')) {
          navigate('/rrhh');
        } else if (role.includes('vigilante')) {
          navigate('/vigilante');
        } else {
          console.log('Unknown role:', role);
          navigate('/admin'); // Default fallback
        }
      } else {
        // El login falló pero no queremos que se recargue la página
        console.error('Login failed:', result?.error || 'Unknown error');
        // El error ya se establece en el AuthContext, no necesitamos hacer nada más aquí
      }
    } catch (error) {
      // Capturar cualquier error inesperado
      console.error('Unexpected error during login:', error);
      // No hacemos nada más, para evitar que la página se recargue
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Sistema de Control de Acceso</h1>
          <h2 className="mt-2 text-xl font-bold text-primary-600">UGEL</h2>
        </div>
        
        <Card>
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <Input
              label="Usuario"
              id="nombreUsuario"
              name="nombreUsuario"
              type="text"
              autoComplete="username"
              value={credentials.nombreUsuario}
              onChange={handleChange}
              error={errors.nombreUsuario}
              leftIcon={
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <Input
              label="Contraseña"
              id="contrasena"
              name="contrasena"
              type="password"
              autoComplete="current-password"
              value={credentials.contrasena}
              onChange={handleChange}
              error={errors.contrasena}
              leftIcon={
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              }
            />
            
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={loading}
              isFullWidth
              size="lg"
            >
              Iniciar Sesión
            </Button>
          </div>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>Sistema Integral de Control de Acceso UGEL</p>
          <p className="mt-1">© {new Date().getFullYear()} UGEL. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
