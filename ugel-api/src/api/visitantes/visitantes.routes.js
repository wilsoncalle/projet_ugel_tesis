/**
 * Rutas para gestión de visitantes
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./visitantes.controller');
const { authenticateToken, requireActiveUser } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/visitantes
 * @desc    Obtener todos los visitantes con paginación y filtros
 * @access  Private
 */
router.get('/', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  validationMiddleware.validateSearch,
  controller.getAll
);

/**
 * @route   GET /api/visitantes/:id
 * @desc    Obtener visitante por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   GET /api/visitantes/documento/:tipoDocumentoId/:numeroDocumento
 * @desc    Obtener visitante por tipo y número de documento
 * @access  Private
 */
router.get('/documento/:tipoDocumentoId/:numeroDocumento', 
  authenticateToken,
  requireActiveUser,
  controller.getByDocumento
);

/**
 * @route   GET /api/visitantes/:id/historial
 * @desc    Obtener historial de visitas de un visitante
 * @access  Private
 */
router.get('/:id/historial', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  validationMiddleware.validatePagination,
  controller.getHistorial
);

/**
 * @route   POST /api/visitantes
 * @desc    Crear nuevo visitante
 * @access  Private
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateCreateVisitante,
  controller.create
);

/**
 * @route   PUT /api/visitantes/:id
 * @desc    Actualizar visitante
 * @access  Private
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  validationMiddleware.validateUpdateVisitante,
  controller.update
);

module.exports = router;