/**
 * Rutas para gestión de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./personal.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/personal
 * @desc    Obtener todo el personal con paginación y filtros
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
 * @route   GET /api/personal/deleted
 * @desc    Obtener personal eliminado
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
 * @route   GET /api/personal/documento/:tipo/:numero
 * @desc    Obtener personal por tipo y número de documento
 * @access  Private
 */
router.get('/documento/:tipo/:numero', 
  authenticateToken,
  requireActiveUser,
  controller.getByDocumento
);

/**
 * @route   POST /api/personal/sincronizar-usuarios
 * @desc    Crear o reactivar usuarios para personal existente con datos completos
 * @access  Private (Admin/RRHH)
 */
router.post('/sincronizar-usuarios',
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  controller.sincronizarUsuarios
);

/**
 * @route   GET /api/personal/:id
 * @desc    Obtener personal por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/personal
 * @desc    Crear nuevo personal
 * @access  Private (Admin/RRHH)
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateCreatePersonal,
  controller.create
);

/**
 * @route   PUT /api/personal/:id
 * @desc    Actualizar personal
 * @access  Private (Admin/RRHH)
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  validationMiddleware.validateUpdatePersonal,
  controller.update
);

/**
 * @route   DELETE /api/personal/:id
 * @desc    Eliminar personal (soft delete)
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
 * @route   PUT /api/personal/:id/restore
 * @desc    Restaurar personal eliminado
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
