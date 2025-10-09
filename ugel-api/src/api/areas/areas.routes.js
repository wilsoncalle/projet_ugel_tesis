/**
 * Rutas para gestión de áreas de destino
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./areas.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/areas
 * @desc    Obtener todas las áreas con paginación y filtros
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
 * @route   GET /api/areas/deleted
 * @desc    Obtener áreas eliminadas
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
 * @route   GET /api/areas/:id
 * @desc    Obtener área por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/areas
 * @desc    Crear nueva área
 * @access  Private (Admin/RRHH)
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateCreateCatalogo,
  controller.create
);

/**
 * @route   PUT /api/areas/:id
 * @desc    Actualizar área
 * @access  Private (Admin/RRHH)
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  validationMiddleware.validateUpdateCatalogo,
  controller.update
);

/**
 * @route   DELETE /api/areas/:id
 * @desc    Eliminar área (soft delete)
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
 * @route   PUT /api/areas/:id/restore
 * @desc    Restaurar área eliminada
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
