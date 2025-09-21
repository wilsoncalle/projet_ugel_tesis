/**
 * Middleware para validación de datos con Joi
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const Joi = require('joi');
const { AppError, asyncHandler } = require('./errorHandler');
const config = require('../config');

/**
 * Middleware genérico para validación con Joi
 * @param {Object} schema - Schema de validación de Joi
 * @param {string} property - Propiedad del request a validar ('body', 'params', 'query')
 * @returns {Function} Middleware de validación
 */
const validate = (schema, property = 'body') => {
  return asyncHandler(async (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Mostrar todos los errores
      allowUnknown: false, // No permitir campos desconocidos
      stripUnknown: true // Remover campos desconocidos
    });
    
    if (error) {
      throw error; // El errorHandler se encargará de formatear el error de Joi
    }
    
    // Reemplazar los datos originales con los validados y sanitizados
    req[property] = value;
    next();
  });
};

/**
 * Schemas de validación comunes
 */
const commonSchemas = {
  // Schema para ID numérico
  id: Joi.object({
    id: Joi.number().integer().positive().required()
  }),
  
  // Schema para paginación
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(config.pagination.defaultPage),
    limit: Joi.number().integer().min(1).max(config.pagination.maxLimit).default(config.pagination.defaultLimit),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }),
  
  // Schema para fechas
  dateRange: Joi.object({
    fechaInicio: Joi.date().iso().optional(),
    fechaFin: Joi.date().iso().min(Joi.ref('fechaInicio')).optional(),
    fecha: Joi.date().iso().optional()
  }),
  
  // Schema para búsqueda
  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    activo: Joi.boolean().optional()
  })
};

/**
 * Schemas específicos para cada módulo
 */
const schemas = {
  // Autenticación
  auth: {
    register: Joi.object({
      nombreUsuario: Joi.string()
        .alphanum()
        .min(3)
        .max(100)
        .required()
        .messages({
          'string.alphanum': 'El nombre de usuario solo puede contener letras y números',
          'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
          'string.max': 'El nombre de usuario no puede exceder 100 caracteres'
        }),
      email: Joi.string()
        .email()
        .max(150)
        .required()
        .messages({
          'string.email': 'Debe ser un email válido'
        }),
      contrasena: Joi.string()
        .min(config.validation.minPasswordLength)
        .max(255)
        .required()
        .messages({
          'string.min': `La contraseña debe tener al menos ${config.validation.minPasswordLength} caracteres`
        }),
      rol: Joi.string()
        .valid(...config.validation.validRoles)
        .required()
        .messages({
          'any.only': `El rol debe ser uno de: ${config.validation.validRoles.join(', ')}`
        })
    }),
    
    login: Joi.object({
      nombreUsuario: Joi.string().required(),
      contrasena: Joi.string().required()
    }),
    
    changePassword: Joi.object({
      contrasenaActual: Joi.string().required(),
      nuevaContrasena: Joi.string()
        .min(config.validation.minPasswordLength)
        .max(255)
        .required()
        .disallow(Joi.ref('contrasenaActual'))
        .messages({
          'string.min': `La contraseña debe tener al menos ${config.validation.minPasswordLength} caracteres`,
          'any.invalid': 'La nueva contraseña debe ser diferente a la actual'
        })
    })
  },
  
  // Usuarios
  usuarios: {
    create: Joi.object({
      nombreUsuario: Joi.string()
        .alphanum()
        .min(3)
        .max(100)
        .required(),
      email: Joi.string()
        .email()
        .max(150)
        .required(),
      contrasena: Joi.string()
        .min(config.validation.minPasswordLength)
        .max(255)
        .required(),
      rol: Joi.string()
        .valid(...config.validation.validRoles)
        .required()
    }),
    
    update: Joi.object({
      nombreUsuario: Joi.string()
        .alphanum()
        .min(3)
        .max(100)
        .optional(),
      email: Joi.string()
        .email()
        .max(150)
        .optional(),
      contrasena: Joi.string()
        .min(config.validation.minPasswordLength)
        .max(255)
        .optional(),
      rol: Joi.string()
        .valid(...config.validation.validRoles)
        .optional(),
      activo: Joi.boolean().optional()
    }).min(1)
  },
  
  // Personal
  personal: {
    create: Joi.object({
      tipoDocumento: Joi.string()
        .valid(...config.validation.validDocumentTypes)
        .required(),
      numeroDocumento: Joi.string()
        .min(8)
        .max(20)
        .required(),
      nombres: Joi.string()
        .min(2)
        .max(150)
        .required(),
      apellidos: Joi.string()
        .min(2)
        .max(150)
        .required(),
      areaDestinoId: Joi.number()
        .integer()
        .positive()
        .required(),
      tipoContratoId: Joi.number()
        .integer()
        .positive()
        .required()
    }),
    
    update: Joi.object({
      tipoDocumento: Joi.string()
        .valid(...config.validation.validDocumentTypes)
        .optional(),
      numeroDocumento: Joi.string()
        .min(8)
        .max(20)
        .optional(),
      nombres: Joi.string()
        .min(2)
        .max(150)
        .optional(),
      apellidos: Joi.string()
        .min(2)
        .max(150)
        .optional(),
      areaDestinoId: Joi.number()
        .integer()
        .positive()
        .optional(),
      tipoContratoId: Joi.number()
        .integer()
        .positive()
        .optional(),
      activo: Joi.boolean().optional()
    }).min(1)
  },
  
  // Visitantes
  visitantes: {
    create: Joi.object({
      tipoDocumentoId: Joi.number()
        .integer()
        .positive()
        .required(),
      numeroDocumento: Joi.string()
        .min(8)
        .max(20)
        .required(),
      nombres: Joi.string()
        .min(2)
        .max(150)
        .required(),
      apellidos: Joi.string()
        .min(2)
        .max(150)
        .required()
    }),
    
    update: Joi.object({
      tipoDocumentoId: Joi.number()
        .integer()
        .positive()
        .optional(),
      numeroDocumento: Joi.string()
        .min(8)
        .max(20)
        .optional(),
      nombres: Joi.string()
        .min(2)
        .max(150)
        .optional(),
      apellidos: Joi.string()
        .min(2)
        .max(150)
        .optional()
    }).min(1)
  },
  
  // Visitas
  visitas: {
    create: Joi.object({
      // Caso 1: Visitante existente
      visitanteId: Joi.number()
        .integer()
        .positive(),
      
      // Caso 2: Nuevo visitante
      tipoDocumentoId: Joi.number()
        .integer()
        .positive(),
      numeroDocumento: Joi.string()
        .min(8)
        .max(20),
      nombres: Joi.string()
        .min(2)
        .max(150),
      apellidos: Joi.string()
        .min(2)
        .max(150),
      
      // Datos de la visita
      areaDestinoId: Joi.number()
        .integer()
        .positive()
        .required(),
      personalVisitadoId: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .optional(),
      motivoVisitaId: Joi.number()
        .integer()
        .positive()
        .required()
    }).xor('visitanteId', 'tipoDocumentoId')
      .and('tipoDocumentoId', 'numeroDocumento', 'nombres', 'apellidos')
  },
  
  // Papeletas de salida
  papeletasSalida: {
    create: Joi.object({
      personalId: Joi.number()
        .integer()
        .positive()
        .required(),
      motivoSalidaId: Joi.number()
        .integer()
        .positive()
        .required(),
      fechaHoraSalida: Joi.date()
        .iso()
        .default(() => new Date().toISOString()),
      fechaHoraRetornoEstimada: Joi.date()
        .iso()
        .min(Joi.ref('fechaHoraSalida'))
        .allow(null),
      observacionSalida: Joi.string()
        .max(500)
        .allow(null, '')
    })
  },
  
  // Asistencia de personal
  asistenciaPersonal: {
    registrarIngreso: Joi.object({
      personalId: Joi.number()
        .integer()
        .positive()
        .required()
    }),
    
    registrarSalida: Joi.object({
      personalId: Joi.number()
        .integer()
        .positive()
        .required()
    }),
    
    registrarEstado: Joi.object({
      personalId: Joi.number()
        .integer()
        .positive()
        .required(),
      estadoPresencia: Joi.string()
        .valid(...config.validation.validPresenceStates)
        .required()
    })
  },
  
  // Catálogos genéricos
  catalogo: {
    create: Joi.object({
      nombre: Joi.string()
        .min(2)
        .max(150)
        .required()
        .messages({
          'string.min': 'El nombre debe tener al menos 2 caracteres',
          'string.max': 'El nombre no puede exceder 150 caracteres'
        })
    }),
    
    update: Joi.object({
      nombre: Joi.string()
        .min(2)
        .max(150)
        .optional(),
      activo: Joi.boolean().optional()
    }).min(1)
  }
};

/**
 * Middlewares de validación específicos
 */
const validationMiddleware = {
  // Validación de parámetros ID
  validateId: validate(commonSchemas.id, 'params'),
  
  // Validación de paginación
  validatePagination: validate(commonSchemas.pagination, 'query'),
  
  // Validación de rango de fechas
  validateDateRange: validate(commonSchemas.dateRange, 'query'),
  
  // Validación de búsqueda
  validateSearch: validate(commonSchemas.search, 'query'),
  
  // Autenticación
  validateRegister: validate(schemas.auth.register),
  validateLogin: validate(schemas.auth.login),
  validateChangePassword: validate(schemas.auth.changePassword),
  
  // Usuarios
  validateCreateUser: validate(schemas.usuarios.create),
  validateUpdateUser: validate(schemas.usuarios.update),
  
  // Personal
  validateCreatePersonal: validate(schemas.personal.create),
  validateUpdatePersonal: validate(schemas.personal.update),
  
  // Visitantes
  validateCreateVisitante: validate(schemas.visitantes.create),
  validateUpdateVisitante: validate(schemas.visitantes.update),
  
  // Visitas
  validateCreateVisita: validate(schemas.visitas.create),
  
  // Papeletas de salida
  validateCreatePapeleta: validate(schemas.papeletasSalida.create),
  
  // Asistencia de personal
  validateRegistrarIngreso: validate(schemas.asistenciaPersonal.registrarIngreso),
  validateRegistrarSalida: validate(schemas.asistenciaPersonal.registrarSalida),
  validateRegistrarEstado: validate(schemas.asistenciaPersonal.registrarEstado),
  
  // Catálogos
  validateCreateCatalogo: validate(schemas.catalogo.create),
  validateUpdateCatalogo: validate(schemas.catalogo.update)
};

module.exports = {
  validate,
  schemas,
  commonSchemas,
  validationMiddleware
};