/**
 * Rutas para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./papeletassalida.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/papeletas-salida
 * @desc    Obtener todas las papeletas de salida con paginación y filtros
 * @access  Private
 */
router.get('/', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  validationMiddleware.validateDateRange,
  controller.getAll
);

/**
 * @route   GET /api/papeletas-salida/pendientes
 * @desc    Obtener papeletas de salida pendientes de retorno
 * @access  Private
 */
router.get('/pendientes', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  controller.getPendientes
);

/**
 * @route   GET /api/papeletas-salida/:id
 * @desc    Obtener papeleta de salida por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/papeletas-salida
 * @desc    Registrar nueva papeleta de salida
 * @access  Private
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateCreatePapeleta,
  controller.create
);

/**
 * @route   PUT /api/papeletas-salida/:id/retorno
 * @desc    Registrar retorno de papeleta de salida
 * @access  Private
 */
router.put('/:id/retorno', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.registrarRetorno
);

/**
 * @route   DELETE /api/papeletas-salida/:id
 * @desc    Anular papeleta de salida
 * @access  Private (Admin/RRHH)
 */
router.delete('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.anular
);

module.exports = router;