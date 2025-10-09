/**
 * Rutas para gestión de tipos de documento
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./tiposdocumento.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/tipos-documento
 * @desc    Obtener todos los tipos de documento con paginación y filtros
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
 * @route   GET /api/tipos-documento/deleted
 * @desc    Obtener tipos de documento eliminados
 * @access  Private (Admin/RRHH)
 */
router.get('/deleted', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validatePagination,
  validationMiddleware.validateSearch,
  controller.getDeleted
);

/**
 * @route   GET /api/tipos-documento/:id
 * @desc    Obtener tipo de documento por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/tipos-documento
 * @desc    Crear nuevo tipo de documento
 * @access  Private (Admin/RRHH)
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  controller.create
);

/**
 * @route   PUT /api/tipos-documento/:id
 * @desc    Actualizar tipo de documento
 * @access  Private (Admin/RRHH)
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.update
);

/**
 * @route   DELETE /api/tipos-documento/:id
 * @desc    Eliminar tipo de documento (soft delete)
 * @access  Private (Admin/RRHH)
 */
router.delete('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.softDelete
);

/**
 * @route   PUT /api/tipos-documento/:id/restore
 * @desc    Restaurar tipo de documento eliminado
 * @access  Private (Admin/RRHH)
 */
router.put('/:id/restore', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.restore
);

module.exports = router;
