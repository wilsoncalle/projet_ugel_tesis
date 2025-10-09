/**
 * Rutas para gestión de cargos
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./cargos.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/cargos
 * @desc    Obtener todos los cargos con paginación y filtros
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
 * @route   GET /api/cargos/deleted
 * @desc    Obtener cargos eliminados
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
 * @route   GET /api/cargos/:id
 * @desc    Obtener cargo por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/cargos
 * @desc    Crear nuevo cargo
 * @access  Private (Admin/RRHH)
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateCreateCargo,
  controller.create
);

/**
 * @route   PUT /api/cargos/:id
 * @desc    Actualizar cargo
 * @access  Private (Admin/RRHH)
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  validationMiddleware.validateUpdateCargo,
  controller.update
);

/**
 * @route   DELETE /api/cargos/:id
 * @desc    Eliminar cargo (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.softDelete
);

/**
 * @route   PUT /api/cargos/:id/restore
 * @desc    Restaurar cargo eliminado
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
