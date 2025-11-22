import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import { LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const LoginPage = () => {
  useDocumentTitle('Iniciar Sesión - COAC-UGEL');
  const [credentials, setCredentials] = useState({
    nombreUsuario: '',
    contrasena: '',
  });
  const [errors, setErrors] = useState({});
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!credentials.nombreUsuario.trim()) newErrors.nombreUsuario = 'El usuario es requerido';
    if (!credentials.contrasena) newErrors.contrasena = 'La contraseña es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    try {
      const result = await login(credentials);
      if (result?.success) {
        const user = JSON.parse(localStorage.getItem('user'));
        const role = user?.rol?.toLowerCase() || '';
        if (role.includes('admin')) navigate('/admin');
        else if (role.includes('rrhh')) navigate('/rrhh');
        else if (role.includes('vigilante')) navigate('/vigilante');
        else navigate('/admin');
      }
    } catch (err) {
      console.error('Error inesperado:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
      {/* Fondo decorativo sutil */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

      {/* Contenedor principal del login */}
      <div className="relative z-10 w-full max-w-md px-6 sm:px-8 py-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl transition-all duration-300">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            COAC
          </h1>
          <p className="mt-2 text-lg font-semibold text-blue-600">UGEL</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Usuario"
            id="nombreUsuario"
            name="nombreUsuario"
            type="text"
            value={credentials.nombreUsuario}
            onChange={handleChange}
            error={errors.nombreUsuario}
            leftIcon={<UserIcon className="h-5 w-5 text-gray-400" />}
          />

          <Input
            label="Contraseña"
            id="contrasena"
            name="contrasena"
            type="password"
            value={credentials.contrasena}
            onChange={handleChange}
            error={errors.contrasena}
            leftIcon={<LockClosedIcon className="h-5 w-5 text-gray-400" />}
          />

          <Button
            type="submit"
            isLoading={loading}
            isFullWidth
            size="lg"
            className="mt-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md rounded-full transition-all duration-200"
          >
            Iniciar Sesión
          </Button>
        </form>
      </div>

      {/* ===== FOOTER INSTITUCIONAL ===== */}
      <footer className="absolute bottom-6 text-center text-gray-500 text-sm">
        <p className="font-medium">Sistema Integral de Control de Acceso UGEL</p>
        <p className="mt-1">© {new Date().getFullYear()} UGEL. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default LoginPage;
