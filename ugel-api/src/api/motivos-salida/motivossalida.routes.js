/**
 * Rutas para gestión de motivos de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./motivossalida.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/motivos-salida
 * @desc    Obtener todos los motivos de salida con paginación y filtros
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
 * @route   GET /api/motivos-salida/:id
 * @desc    Obtener motivo de salida por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/motivos-salida
 * @desc    Crear nuevo motivo de salida
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
 * @route   PUT /api/motivos-salida/:id
 * @desc    Actualizar motivo de salida
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
 * @route   DELETE /api/motivos-salida/:id
 * @desc    Eliminar motivo de salida (soft delete)
 * @access  Private (Admin/RRHH)
 */
router.delete('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.softDelete
);

module.exports = router;
