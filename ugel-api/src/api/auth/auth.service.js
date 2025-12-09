/**
 * Servicio para autenticación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const bcrypt = require('bcryptjs');
const repository = require('./auth.repository');
const personalRepository = require('../personal/personal.repository');
const { generateToken, verifyTokenSilent } = require('../../middleware/authHandler');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Registrar un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Object} Usuario creado y token
 */
const registerUser = async (userData) => {
  const { nombreUsuario, email, contrasena, rol } = userData;
  
  // Verificar si el usuario ya existe
  const existingUser = await repository.findByUsernameOrEmail(nombreUsuario, email);
  if (existingUser) {
    if (existingUser.nombre_usuario === nombreUsuario) {
      throw new AppError('El nombre de usuario ya está en uso', 409);
    }
    if (existingUser.email === email) {
      throw new AppError('El email ya está registrado', 409);
    }
  }
  
  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(contrasena, config.security.bcryptRounds);
  
  // Crear el usuario
  const newUser = await repository.create({
    nombre_usuario: nombreUsuario,
    hash_contrasena: hashedPassword,
    email,
    rol
  });
  
  // Generar token
  const token = generateToken(newUser);
  
  // Remover datos sensibles
  const { hash_contrasena, ...userWithoutPassword } = newUser;
  
  logger.info(`Usuario registrado: ${newUser.nombre_usuario} con rol ${newUser.rol}`);
  
  return {
    usuario: userWithoutPassword,
    token
  };
};

/**
 * Iniciar sesión de usuario
 * @param {Object} loginData - Datos de login
 * @returns {Object} Usuario y token
 */
const loginUser = async (loginData) => {
  const { nombreUsuario, contrasena } = loginData;
  
  // Buscar usuario por nombre de usuario
  const user = await repository.findByUsername(nombreUsuario);
  if (!user) {
    throw new AppError('Credenciales inválidas', 401);
  }
  
  // Verificar si el usuario está bloqueado
  // Primero, verificar si el último intento fallido fue hace mucho tiempo y resetear si es necesario
  if (user.intentos_fallidos > 0 && user.ultimo_intento_fallido) {
    const lastFailedTime = new Date(user.ultimo_intento_fallido).getTime();
    const currentTime = Date.now();
    const timeWindow = config.security.failedAttemptsWindow || 30 * 60 * 1000; // Default 30 min
    
    if (currentTime - lastFailedTime > timeWindow) {
      await repository.resetFailedAttempts(user.id);
      user.intentos_fallidos = 0;
      user.bloqueado_hasta = null;
      logger.info(`Intentos fallidos reseteados por expiración de tiempo para usuario: ${user.nombre_usuario}`);
    }
  }
  
  // Verificar si el usuario está bloqueado (después del posible reset)
  if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
    const remainingTime = Math.ceil((new Date(user.bloqueado_hasta) - new Date()) / 1000 / 60);
    throw new AppError(`Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingTime} minutos`, 403);
  }

  // Verificar si el usuario está activo
  if (!user.activo) {
    throw new AppError('Usuario inactivo. Contacta al administrador', 403);
  }
  
  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(contrasena, user.hash_contrasena);
  
  if (!isPasswordValid) {
    // Incrementar intentos fallidos
    const failedAttempts = await repository.incrementFailedAttempts(user.id);
    
    // Verificar si se debe bloquear
    if (failedAttempts >= config.security.maxLoginAttempts) {
      const lockoutTime = new Date(Date.now() + config.security.lockoutTime);
      await repository.lockUser(user.id, lockoutTime);
      throw new AppError(`Cuenta bloqueada por demasiados intentos fallidos. Intente nuevamente en ${config.security.lockoutTime / 60000} minutos`, 403);
    }
    
    throw new AppError(`Credenciales inválidas. Intentos restantes: ${config.security.maxLoginAttempts - failedAttempts}`, 401);
  }
  
  // Resetear intentos fallidos si el login es exitoso
  if (user.intentos_fallidos > 0 || user.bloqueado_hasta) {
    await repository.resetFailedAttempts(user.id);
  }
  
  // Buscar personal asociado al usuario
  let personalId = user.personal_id || null;
  let personalNombres = null;
  let personalApellidos = null;
  
  // Si no hay personal_id en el usuario, intentar buscarlo por documento (si el nombre de usuario es un DNI)
  if (!personalId) {
    try {
      const nombreUsuario = user.nombre_usuario;
      // Si el nombre de usuario es un DNI de 8 dígitos, buscar personal por documento
      if (nombreUsuario && /^\d{8}$/.test(nombreUsuario)) {
        const personal = await personalRepository.findByDocumento('DNI', nombreUsuario);
        if (personal) {
          personalId = personal.id;
          personalNombres = personal.nombres;
          personalApellidos = personal.apellidos;
          logger.info(`Personal encontrado para usuario ${nombreUsuario}: ID ${personalId}`);
        }
      }
    } catch (error) {
      logger.warn(`No se pudo obtener personal para usuario ${user.nombre_usuario}: ${error.message}`);
    }
  } else {
    // Si ya tiene personal_id, obtener los datos del personal
    try {
      const personal = await personalRepository.findById(personalId);
      if (personal) {
        personalNombres = personal.nombres;
        personalApellidos = personal.apellidos;
      }
    } catch (error) {
      logger.warn(`No se pudieron obtener datos del personal ID ${personalId}: ${error.message}`);
    }
  }
  
  // Agregar personalId y datos de personal al objeto user para incluirlo en el token
  const userWithPersonal = {
    ...user,
    personal_id: personalId,
    personal_nombres: personalNombres,
    personal_apellidos: personalApellidos
  };
  
  // Generar token
  const token = generateToken(userWithPersonal);
  
  // Remover datos sensibles pero incluir datos de personal en la respuesta
  const { hash_contrasena, ...userWithoutPassword } = userWithPersonal;
  
  logger.info(`Login exitoso para usuario: ${user.nombre_usuario}${personalId ? ` (Personal ID: ${personalId})` : ''}`);
  
  return {
    usuario: userWithoutPassword,
    token
  };
};

/**
 * Refrescar token de acceso
 * @param {string} token - Token actual
 * @returns {Object} Nuevo token
 */
const refreshToken = async (token) => {
  if (!token) {
    throw new AppError('Token requerido para renovar', 401);
  }
  
  // Verificar token actual
  const decoded = verifyTokenSilent(token);
  if (!decoded) {
    throw new AppError('Token inválido', 401);
  }
  
  // Buscar usuario actual
  const user = await repository.findById(decoded.id);
  if (!user || !user.activo) {
    throw new AppError('Usuario no encontrado o inactivo', 401);
  }
  
  // Generar nuevo token
  const newToken = generateToken(user);
  
  logger.info(`Token renovado para usuario: ${user.nombre_usuario}`);
  
  return {
    token: newToken
  };
};

/**
 * Cambiar contraseña de usuario
 * @param {number} userId - ID del usuario
 * @param {string} currentPassword - Contraseña actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Object} Resultado de la operación
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Buscar usuario
  const user = await repository.findById(userId);
  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }
  
  // Verificar contraseña actual
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.hash_contrasena);
  if (!isCurrentPasswordValid) {
    throw new AppError('Contraseña actual incorrecta', 400);
  }
  
  // Hashear nueva contraseña
  const hashedNewPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);
  
  // Actualizar contraseña
  await repository.updatePassword(userId, hashedNewPassword);
  
  logger.info(`Contraseña cambiada para usuario ID: ${userId}`);
  
  return {
    message: 'Contraseña actualizada exitosamente'
  };
};

/**
 * Verificar si un usuario tiene permisos específicos
 * @param {number} userId - ID del usuario
 * @param {string} requiredRole - Rol requerido
 * @returns {boolean} True si tiene permisos
 */
const hasPermission = async (userId, requiredRole) => {
  const user = await repository.findById(userId);
  if (!user || !user.activo) {
    return false;
  }
  
  // Administrador tiene todos los permisos
  if (user.rol === 'Administrador') {
    return true;
  }
  
  return user.rol === requiredRole;
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  changePassword,
  hasPermission
};
