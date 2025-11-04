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
  
  // Verificar si el usuario está activo
  if (!user.activo) {
    throw new AppError('Usuario inactivo. Contacta al administrador', 403);
  }
  
  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(contrasena, user.hash_contrasena);
  if (!isPasswordValid) {
    throw new AppError('Credenciales inválidas', 401);
  }
  
  // Buscar personal asociado al usuario
  let personalId = user.personal_id || null;
  
  // Si no hay personal_id en el usuario, intentar buscarlo por documento (si el nombre de usuario es un DNI)
  if (!personalId) {
    try {
      const nombreUsuario = user.nombre_usuario;
      // Si el nombre de usuario es un DNI de 8 dígitos, buscar personal por documento
      if (nombreUsuario && /^\d{8}$/.test(nombreUsuario)) {
        const personal = await personalRepository.findByDocumento('DNI', nombreUsuario);
        if (personal) {
          personalId = personal.id;
          logger.info(`Personal encontrado para usuario ${nombreUsuario}: ID ${personalId}`);
        }
      }
    } catch (error) {
      logger.warn(`No se pudo obtener personal para usuario ${user.nombre_usuario}: ${error.message}`);
    }
  }
  
  // Agregar personalId al objeto user para incluirlo en el token
  const userWithPersonal = {
    ...user,
    personal_id: personalId
  };
  
  // Generar token
  const token = generateToken(userWithPersonal);
  
  // Remover datos sensibles
  const { hash_contrasena, ...userWithoutPassword } = user;
  
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
