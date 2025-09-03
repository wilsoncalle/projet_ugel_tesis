/**
 * Middleware para manejo centralizado de errores
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const logger = require('../utils/logger');
const config = require('../config');

/**
 * Clase personalizada para errores de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Maneja errores de validación de Joi
 * @param {Error} error - Error de Joi
 * @returns {Object} Respuesta de error formateada
 */
const handleJoiValidationError = (error) => {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context.value
  }));
  
  return {
    error: 'Datos de entrada inválidos',
    details: errors,
    statusCode: 400
  };
};

/**
 * Maneja errores de PostgreSQL
 * @param {Error} error - Error de PostgreSQL
 * @returns {Object} Respuesta de error formateada
 */
const handleDatabaseError = (error) => {
  logger.error('Error de base de datos:', {
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,
    column: error.column
  });
  
  // Mapear códigos de error comunes de PostgreSQL
  switch (error.code) {
    case '23505': // unique_violation
      return {
        error: 'El registro ya existe',
        details: 'Ya existe un registro con estos datos únicos',
        statusCode: 409
      };
    
    case '23503': // foreign_key_violation
      return {
        error: 'Referencia inválida',
        details: 'El registro referenciado no existe',
        statusCode: 400
      };
    
    case '23502': // not_null_violation
      return {
        error: 'Campo requerido faltante',
        details: `El campo ${error.column} es requerido`,
        statusCode: 400
      };
    
    case '42P01': // undefined_table
      return {
        error: 'Tabla no encontrada',
        details: 'Error en la estructura de la base de datos',
        statusCode: 500
      };
    
    default:
      return {
        error: 'Error de base de datos',
        details: 'Ha ocurrido un error interno',
        statusCode: 500
      };
  }
};

/**
 * Maneja errores de JWT
 * @param {Error} error - Error de JWT
 * @returns {Object} Respuesta de error formateada
 */
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return {
      error: 'Token inválido',
      details: 'El token de autenticación es inválido',
      statusCode: 401
    };
  }
  
  if (error.name === 'TokenExpiredError') {
    return {
      error: 'Token expirado',
      details: 'El token de autenticación ha expirado',
      statusCode: 401
    };
  }
  
  return {
    error: 'Error de autenticación',
    details: 'Token de autenticación inválido',
    statusCode: 401
  };
};

/**
 * Middleware principal de manejo de errores
 * @param {Error} error - Error capturado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const errorHandler = (error, req, res, next) => {
  let errorResponse = {
    error: error.message || 'Error interno del servidor',
    statusCode: error.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };
  
  // Manejar diferentes tipos de errores
  if (error.isJoi) {
    const joiError = handleJoiValidationError(error);
    errorResponse = { ...errorResponse, ...joiError };
  } else if (error.code && error.code.startsWith('23')) {
    // Errores de PostgreSQL
    const dbError = handleDatabaseError(error);
    errorResponse = { ...errorResponse, ...dbError };
  } else if (error.name && error.name.includes('JsonWebToken')) {
    // Errores de JWT
    const jwtError = handleJWTError(error);
    errorResponse = { ...errorResponse, ...jwtError };
  } else if (error instanceof AppError) {
    // Errores personalizados de la aplicación
    errorResponse.statusCode = error.statusCode;
  }
  
  // Log del error
  if (errorResponse.statusCode >= 500) {
    logger.error('Error interno del servidor:', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } else {
    logger.warn('Error de cliente:', {
      error: error.message,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
  }
  
  // En desarrollo, incluir stack trace
  if (config.nodeEnv === 'development' && errorResponse.statusCode >= 500) {
    errorResponse.stack = error.stack;
  }
  
  // Enviar respuesta de error
  res.status(errorResponse.statusCode).json({
    success: false,
    ...errorResponse
  });
};

/**
 * Middleware para capturar errores asíncronos
 * @param {Function} fn - Función asíncrona
 * @returns {Function} Middleware que captura errores
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};
