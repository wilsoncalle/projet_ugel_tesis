/**
 * Rutas para gestión de motivos de visita
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./motivosvisita.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/motivos-visita
 * @desc    Obtener todos los motivos de visita con paginación y filtros
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
 * @route   GET /api/motivos-visita/deleted
 * @desc    Obtener motivos de visita eliminados
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
 * @route   GET /api/motivos-visita/:id
 * @desc    Obtener motivo de visita por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/motivos-visita
 * @desc    Crear nuevo motivo de visita
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
 * @route   PUT /api/motivos-visita/:id
 * @desc    Actualizar motivo de visita
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
 * @route   DELETE /api/motivos-visita/:id
 * @desc    Eliminar motivo de visita (soft delete)
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
 * @route   PUT /api/motivos-visita/:id/restore
 * @desc    Restaurar motivo de visita eliminado
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
