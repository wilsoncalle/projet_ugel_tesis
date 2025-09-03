/**
 * Controlador para autenticación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./auth.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Registrar un nuevo usuario
 * @route POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  logger.info(`Intento de registro para usuario: ${req.body.nombreUsuario}`);
  
  const result = await service.registerUser(req.body);
  
  logger.info(`Usuario registrado exitosamente: ${result.usuario.nombreUsuario}`);
  
  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      usuario: result.usuario,
      token: result.token
    }
  });
});

/**
 * Iniciar sesión
 * @route POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { nombreUsuario } = req.body;
  logger.info(`Intento de login para usuario: ${nombreUsuario}`);
  
  const result = await service.loginUser(req.body);
  
  logger.info(`Login exitoso para usuario: ${nombreUsuario}`);
  
  res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      usuario: result.usuario,
      token: result.token
    }
  });
});

/**
 * Refrescar token de acceso
 * @route POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  logger.info('Solicitud de refresh token');
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  const result = await service.refreshToken(token);
  
  res.json({
    success: true,
    message: 'Token renovado exitosamente',
    data: {
      token: result.token
    }
  });
});

/**
 * Cerrar sesión
 * @route POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  logger.info(`Logout para usuario: ${req.user?.nombreUsuario || 'desconocido'}`);
  
  // En una implementación más completa, aquí se podría:
  // - Invalidar el token en una blacklist
  // - Limpiar sesiones en Redis
  // - Registrar la actividad de logout
  
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout
};
