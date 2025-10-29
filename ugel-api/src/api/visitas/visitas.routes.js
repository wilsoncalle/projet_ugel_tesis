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
 * @route   GET /api/visitas/por-area
 * @desc    Obtener estadísticas de visitas por área
 * @access  Private
 */
router.get('/por-area', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitasPorArea
);

router.get('/por-motivo', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitasPorMotivo
);

/**
 * @route   GET /api/visitas/por-personal
 * @desc    Obtener estadísticas de visitas por personal visitado
 * @access  Private
 */
router.get('/por-personal', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitasPorPersonal
);

/**
 * @route   GET /api/visitas/visitantes-frecuentes
 * @desc    Obtener visitantes frecuentes
 * @access  Private
 */
router.get('/visitantes-frecuentes', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitantesFrecuentes
);

/**
 * @route   GET /api/visitas/visitante/:visitanteId/detalle
 * @desc    Obtener detalle de visitas de un visitante específico
 * @access  Private
 */
router.get('/visitante/:visitanteId/detalle', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitanteDetalle
);

/**
 * @route   GET /api/visitas/totales
 * @desc    Obtener estadísticas de visitas totales
 * @access  Private
 */
router.get('/totales', 
  authenticateToken,
  requireActiveUser,
  controller.getVisitasTotales
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

/**
 * @route   POST /api/visitas/cerrar-automatico
 * @desc    Cerrar automáticamente visitas pendientes según las reglas del sistema
 * @access  Private
 */
router.post('/cerrar-automatico', 
  authenticateToken,
  requireActiveUser,
  controller.cerrarVisitasAutomaticamente
);

module.exports = router;