import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usuariosService } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import {
  UserCircleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ProfilePage = () => {
  useDocumentTitle('Mi Perfil - COAC-UGEL');
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Estados para formulario de datos personales
  const [formData, setFormData] = useState({
    nombre_usuario: user?.nombre_usuario || '',
    email: user?.email || '',
  });

  // Estados para formulario de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Estados de visibilidad de contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  // Validaciones
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Handlers para formulario de datos personales
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProfileForm = () => {
    const newErrors = {};

    if (!formData.nombre_usuario || formData.nombre_usuario.trim() === '') {
      newErrors.nombre_usuario = 'El nombre de usuario es requerido';
    } else if (/\s/.test(formData.nombre_usuario)) {
      newErrors.nombre_usuario = 'El nombre de usuario no puede contener espacios';
    } else if (formData.nombre_usuario.trim().length < 3) {
      newErrors.nombre_usuario = 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!formData.email || formData.email.trim() === '') {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) return;

    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Transformar datos al formato que espera el backend
      const dataToSend = {
        nombreUsuario: formData.nombre_usuario.trim(),
        email: formData.email.trim(),
      };
      
      const response = await usuariosService.updatePerfil(dataToSend);
      
      if (response.data.success) {
        setSuccessMessage('Perfil actualizado exitosamente');
        if (updateUser) {
          updateUser({
            ...user,
            nombre_usuario: formData.nombre_usuario,
            email: formData.email,
          });
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(response.data.message || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      setErrorMessage(
        error.response?.data?.message || 
        'Error al actualizar el perfil. Por favor, intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handlers para formulario de contraseña
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validatePasswordForm = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Debe confirmar la nueva contraseña';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (passwordData.currentPassword === passwordData.newPassword && passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña debe ser diferente a la actual';
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;

    setLoadingPassword(true);
    setPasswordSuccessMessage('');
    setPasswordErrorMessage('');

    try {
      const response = await usuariosService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      if (response.data.success) {
        setPasswordSuccessMessage('Contraseña actualizada exitosamente');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setPasswordSuccessMessage(''), 5000);
      } else {
        setPasswordErrorMessage(response.data.message || 'Error al actualizar la contraseña');
      }
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      setPasswordErrorMessage(
        error.response?.data?.message || 
        'Error al actualizar la contraseña. Por favor, intente nuevamente.'
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    // Keep page background and padding but avoid forcing full viewport height here.
    // The layout component is responsible for the main min-h-screen and top offset.
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header tipo Bootstrap: título a la izq, botón a la der */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-blue-700 flex items-center gap-2">
              Mi Perfil
            </h1>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>

        {/* Alertas globales opcionales (similar a Laravel) */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>¡Éxito!</strong> {successMessage}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between">
            <div className="flex items-start">
              <XCircleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {errorMessage}
              </p>
            </div>
          </div>
        )}

        {/* Grid Layout principal: izquierda info, derecha formularios */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda - Información del Usuario */}
          <div className="lg:col-span-1">
            <Card className="h-sm">
              <div className="text-center">
                {/* Avatar */}
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <UserCircleIcon className="h-20 w-20 text-blue-600" />
                </div>

                {/* Nombre y email */}
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {user?.nombre_usuario || 'Usuario'}
                </h2>
                <p className="text-sm text-gray-500 mb-3">
                  {user?.email || 'email@ejemplo.com'}
                </p>

                {/* Rol */}
                <div className="flex justify-center mb-4">
                  <Badge variant={user?.activo ? 'success' : 'danger'} className="px-3 py-1">
                    <ShieldCheckIcon className="h-4 w-4 mr-1 inline-block" />
                    {user?.rol || 'Usuario'}
                  </Badge>
                </div>

                {/* Información adicional */}
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-3 text-left">
                    <div className="flex items-start">
                      <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Estado</p>
                        <p className="text-sm text-gray-900">
                          {user?.activo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              Inactivo
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Fecha de Registro</p>
                        <p className="text-sm text-gray-900">
                          {formatDate(user?.fecha_creacion)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Última Actualización</p>
                        <p className="text-sm text-gray-900">
                          {formatDate(user?.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Columna Derecha - Formularios */}
          <div className="lg:col-span-2 space-y-6">
            {/* Formulario de Datos Personales */}
            <Card>
              <div className="border-b border-gray-100 pb-3 mb-4 flex items-center">
                <UserCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Editar información personal
                </h3>
              </div>

              <form onSubmit={handleUpdateProfile}>
                {/* Fila de inputs como col-md-6 / col-md-6 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Nombre de Usuario"
                      name="nombre_usuario"
                      value={formData.nombre_usuario}
                      onChange={handleInputChange}
                      error={errors.nombre_usuario}
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>

                  <div>
                    <Input
                      label="Correo Electrónico"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      error={errors.email}
                      placeholder="Tu email electrónico"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-[160px]"
                  >
                    {loading ? 'Guardando...' : 'Guardar información'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Formulario de Cambio de Contraseña */}
            <Card>
              <div className="border-b border-gray-100 pb-3 mb-4 flex items-center">
                <KeyIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Cambiar contraseña
                </h3>
              </div>

              {passwordSuccessMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">{passwordSuccessMessage}</p>
                </div>
              )}

              {passwordErrorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <XCircleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{passwordErrorMessage}</p>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Para cambiar tu contraseña, completa los siguientes campos.
                Si no deseas cambiarla, déjalos en blanco.
              </p>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fila 1: Contraseña actual (col 1) */}
                <div className="relative">
                  <Input
                    label="Contraseña Actual"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.currentPassword}
                    placeholder="Ingrese su contraseña actual"
                  />
                </div>

                {/* Fila 1: Nueva contraseña (col 2) */}
                <div className="relative">
                  <Input
                    label="Nueva Contraseña"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.newPassword}
                    placeholder="Nueva contraseña"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    La contraseña debe tener al menos 8 caracteres.
                  </p>
                </div>

                {/* Fila 2: Confirmar contraseña (col 1) */}
                <div className="relative">
                  <Input
                    label="Confirmar Nueva Contraseña"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.confirmPassword}
                    placeholder="Confirma tu contraseña"
                  />
                </div>
                {/* Fila 2: Botón (col 2, alineado a la altura del input) */}
                <div className="flex items-end justify-start md:justify-end">
                  <Button
                    type="submit"
                    disabled={loadingPassword}
                    className="w-full md:w-auto md:min-w-[180px]"
                  >
                    {loadingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </Button>
                </div>
              </div>
            </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
