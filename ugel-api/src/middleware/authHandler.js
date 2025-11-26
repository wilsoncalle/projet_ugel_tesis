/**
 * Middleware para manejo de autenticación y autorización
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('./errorHandler');

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  // Obtener token del header Authorization
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  if (!token) {
    throw new AppError('Token de acceso requerido', 401);
  }
  
  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      nombreUsuario: decoded.nombreUsuario,
      email: decoded.email,
      rol: decoded.rol,
      activo: decoded.activo,
      personalId: decoded.personalId || decoded.personal_id || null
    };
    
    logger.debug(`Usuario autenticado: ${decoded.nombreUsuario} (${decoded.rol})`);
    next();
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expirado', 401);
    } else if (error.name === 'JsonWebTokenError') {
      throw new AppError('Token inválido', 401);
    } else {
      throw new AppError('Error de autenticación', 401);
    }
  }
});

/**
 * Middleware para verificar si el usuario está activo
 */
const requireActiveUser = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new AppError('Usuario no autenticado', 401);
  }
  
  if (!req.user.activo) {
    throw new AppError('Usuario inactivo', 403);
  }
  
  next();
});

/**
 * Middleware para verificar roles específicos
 * @param {...string} allowedRoles - Roles permitidos
 * @returns {Function} Middleware de autorización
 */
const requireRoles = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }
    
    if (!allowedRoles.includes(req.user.rol)) {
      logger.warn(`Acceso denegado para usuario ${req.user.nombreUsuario} con rol ${req.user.rol}. Roles requeridos: ${allowedRoles.join(', ')}`);
      throw new AppError('No tienes permisos para realizar esta acción', 403);
    }
    
    next();
  });
};

/**
 * Middleware para verificar que el usuario sea administrador
 */
const requireAdmin = requireRoles('Administrador');

/**
 * Middleware para verificar que el usuario sea administrador o RRHH
 */
const requireAdminOrRRHH = requireRoles('Administrador', 'RRHH');

/**
 * Middleware para verificar que el usuario pueda modificar solo sus propios datos
 * @param {string} userIdParam - Nombre del parámetro que contiene el ID del usuario
 * @returns {Function} Middleware de autorización
 */
const requireOwnershipOrAdmin = (userIdParam = 'id') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new AppError('Usuario no autenticado', 401);
    }
    
    const targetUserId = parseInt(req.params[userIdParam]);
    const currentUserId = req.user.id;
    const userRole = req.user.rol;
    
    // Administradores pueden modificar cualquier usuario
    if (userRole === 'Administrador') {
      return next();
    }
    
    // Los usuarios solo pueden modificar sus propios datos
    if (currentUserId !== targetUserId) {
      throw new AppError('Solo puedes modificar tus propios datos', 403);
    }
    
    next();
  });
};

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Datos del usuario
 * @returns {string} Token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    nombreUsuario: user.nombre_usuario,
    email: user.email,
    rol: user.rol,
    activo: user.activo,
    personalId: user.personal_id || user.personalId || null
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'ugel-api',
    audience: 'ugel-frontend'
  });
};

/**
 * Verifica si un token es válido sin lanzar errores
 * @param {string} token - Token a verificar
 * @returns {Object|null} Payload del token o null si es inválido
 */
const verifyTokenSilent = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  requireActiveUser,
  requireRoles,
  requireAdmin,
  requireAdminOrRRHH,
  requireOwnershipOrAdmin,
  generateToken,
  verifyTokenSilent
};
