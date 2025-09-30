/**
 * Rutas para gestión de visitas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./visitas.controller');
const { authenticateToken, requireActiveUser } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/visitas
 * @desc    Obtener todas las visitas con paginación y filtros
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
 * @route   GET /api/visitas/export/excel
 * @desc    Exportar visitas a Excel
 * @access  Private
 */
router.get('/export/excel',
  authenticateToken,
  requireActiveUser,
  controller.exportarAExcel
);

/**
 * @route   GET /api/visitas/export/pdf
 * @desc    Exportar visitas a PDF
 * @access  Private
 */
router.get('/export/pdf',
  authenticateToken,
  requireActiveUser,
  controller.exportarAPDF
);

/**
 * @route   GET /api/visitas/activas
 * @desc    Obtener visitas activas (sin salida)
 * @access  Private
 */
router.get('/activas', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  controller.getActivas
);

/**
 * @route   GET /api/visitas/:id
 * @desc    Obtener visita por ID
 * @access  Private
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/visitas
 * @desc    Registrar nueva visita
 * @access  Private
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateCreateVisita,
  controller.create
);

/**
 * @route   PUT /api/visitas/:id/salida
 * @desc    Registrar salida de visita
 * @access  Private
 */
router.put('/:id/salida', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.registrarSalida
);

module.exports = router;