/**
 * Rutas para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./asistenciapersonal.controller');
const { authenticateToken, requireActiveUser, requireAdminOrRRHH } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/asistencia-personal
 * @desc    Obtener registros de asistencia con paginación y filtros
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
 * @route   GET /api/asistencia-personal/hoy
 * @desc    Obtener registros de asistencia del día actual
 * @access  Private
 */
router.get('/hoy', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  controller.getHoy
);

/**
 * @route   GET /api/asistencia-personal/:id
 * @desc    Obtener registro de asistencia por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/asistencia-personal/ingreso
 * @desc    Registrar ingreso de personal
 * @access  Private
 */
router.post('/ingreso', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateRegistrarIngreso,
  controller.registrarIngreso
);

/**
 * @route   PUT /api/asistencia-personal/salida
 * @desc    Registrar salida de personal
 * @access  Private
 */
router.put('/salida', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateRegistrarSalida,
  controller.registrarSalida
);

/**
 * @route   POST /api/asistencia-personal/estado
 * @desc    Registrar estado de presencia (presente, ausente, etc.)
 * @access  Private (Admin/RRHH)
 */
router.post('/estado', 
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateRegistrarEstado,
  controller.registrarEstado
);

module.exports = router;