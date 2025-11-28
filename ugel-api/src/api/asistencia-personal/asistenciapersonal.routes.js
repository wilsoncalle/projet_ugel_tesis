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
 * @route   GET /api/asistencia-personal/mi/resumen
 * @desc    Obtener resumen mensual de asistencia del usuario logueado
 * @access  Private
 */
router.get(
  '/mi/resumen',
  authenticateToken,
  requireActiveUser,
  controller.getMiResumen
);

/**
 * @route   GET /api/asistencia-personal/mi/asistencia
 * @desc    Obtener historial de asistencia mensual del usuario logueado
 * @access  Private
 */
router.get(
  '/mi/asistencia',
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePagination,
  controller.getMiAsistencia
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

/**
 * @route   GET /api/asistencia-personal/estadisticas/totales
 * @desc    Obtener estadísticas de total de asistencias
 * @access  Private
 */
router.get('/estadisticas/totales', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateDateRange,
  controller.getEstadisticasTotales
);

/**
 * @route   GET /api/asistencia-personal/estadisticas/puntualidad
 * @desc    Obtener estadísticas de puntualidad y tardanzas
 * @access  Private
 */
router.get('/estadisticas/puntualidad', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateDateRange,
  controller.getEstadisticasPuntualidad
);

/**
 * @route   GET /api/asistencia-personal/estadisticas/ausencias
 * @desc    Obtener estadísticas de ausencias y justificaciones
 * @access  Private
 */
router.get('/estadisticas/ausencias', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateDateRange,
  controller.getEstadisticasAusencias
);

/**
 * @route   GET /api/asistencia-personal/estadisticas/areas
 * @desc    Obtener estadísticas por áreas
 * @access  Private
 */
router.get('/estadisticas/areas', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateDateRange,
  controller.getEstadisticasAreas
);

/**
 * @route   GET /api/asistencia-personal/estadisticas/personal
 * @desc    Obtener estadísticas por personal
 * @access  Private
 */
router.get('/estadisticas/personal', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateDateRange,
  controller.getEstadisticasPersonal
);

/**
 * @route   GET /api/asistencia-personal/estadisticas/personal-detalle/:personalId
 * @desc    Obtener detalle completo de un personal específico
 * @access  Private
 */
router.get('/estadisticas/personal-detalle/:personalId', 
  authenticateToken,
  requireActiveUser,
  controller.getPersonalDetalle
);

/**
 * @route   GET /api/asistencia-personal/export/excel
 * @desc    Exportar asistencias a Excel
 * @access  Private
 */
router.get('/export/excel',
  authenticateToken,
  requireActiveUser,
  controller.exportarAExcel
);

/**
 * @route   GET /api/asistencia-personal/export/pdf
 * @desc    Exportar asistencias a PDF
 * @access  Private
 */
router.get('/export/pdf',
  authenticateToken,
  requireActiveUser,
  controller.exportarAPDF
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

module.exports = router;