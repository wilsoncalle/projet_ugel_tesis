/**
 * Rutas para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require("express");
const controller = require("./papeletassalida.controller");
const {
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
} = require("../../middleware/authHandler");
const { validationMiddleware } = require("../../middleware/validationHandler");

const router = express.Router();

/**
 * @route   GET /api/papeletas-salida
 * @desc    Obtener todas las papeletas de salida con paginación y filtros
 * @access  Private
 */
router.get(
  "/",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateListPapeletas, // filtros específicos de papeletas
  controller.getAll,
);

/**
 * @route   GET /api/papeletas-salida/pendientes
 * @desc    Obtener papeletas pendientes para garita (APROBADO/EN_CURSO sin retorno)
 * @access  Private
 */
router.get(
  "/pendientes",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validatePendientesPapeletas,
  controller.getPendientes,
);

/**
 * @route   GET /api/papeletas-salida/estadisticas
 * @desc    Obtener estadísticas por rango y campoFecha
 * @query   fechaInicio, fechaFin, campoFecha=solicitud|programada|salida_real|retorno_real
 * @access  Private (Admin/RRHH)
 */
router.get(
  "/estadisticas",
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateEstadisticasPapeletas,
  controller.getStats,
);

/**
 * @route   GET /api/papeletas-salida/estadisticas/estado
 * @desc    Obtener estadísticas de estado de papeletas
 * @query   fechaInicio, fechaFin, periodo
 * @access  Private
 */
router.get(
  "/estadisticas/estado",
  authenticateToken,
  requireActiveUser,
  controller.getStatsEstado,
);

/**
 * @route   GET /api/papeletas-salida/estadisticas/motivos
 * @desc    Obtener estadísticas de motivos de salida
 * @query   fechaInicio, fechaFin, periodo
 * @access  Private
 */
router.get(
  "/estadisticas/motivos",
  authenticateToken,
  requireActiveUser,
  controller.getStatsMotivos,
);

/**
 * @route   GET /api/papeletas-salida/estadisticas/horas
 * @desc    Obtener estadísticas de horas autorizadas vs usadas
 * @query   fechaInicio, fechaFin, periodo
 * @access  Private
 */
router.get(
  "/estadisticas/horas",
  authenticateToken,
  requireActiveUser,
  controller.getStatsHoras,
);

/**
 * @route   GET /api/papeletas-salida/estadisticas/areas
 * @desc    Obtener estadísticas de áreas y colaboradores
 * @query   fechaInicio, fechaFin, periodo
 * @access  Private
 */
router.get(
  "/estadisticas/areas",
  authenticateToken,
  requireActiveUser,
  controller.getStatsAreas,
);

/**
 * @route   GET /api/papeletas-salida/externas
 * @desc    Obtener papeletas aprobadas desde MongoDB (datos externos)
 * @access  Public (sin autenticación por ahora)
 */
router.get(
  "/externas",
  // authenticateToken,
  // requireActiveUser,
  controller.getExternas,
);

/**
 * @route   POST /api/papeletas-salida
 * @desc    Registrar nueva papeleta (SOLICITADO por defecto o APROBADO si se indica)
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateCreatePapeleta,
  controller.create,
);

/**
 * @route   PUT /api/papeletas-salida/:id/decidir
 * @desc    Aprobar o rechazar papeleta (APROBAR|RECHAZAR)
 * @access  Private (Admin/RRHH)
 */
router.put(
  "/:id/decidir",
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  validationMiddleware.validateDecidirPapeleta,
  controller.decidir,
);

/**
 * @route   PUT /api/papeletas-salida/:id/salida
 * @desc    Registrar salida en garita
 * @access  Private
 */
router.put(
  "/:id/salida",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.registrarSalida,
);

/**
 * @route   PUT /api/papeletas-salida/:id/retorno
 * @desc    Registrar retorno en garita
 * @access  Private
 */
router.put(
  "/:id/retorno",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.registrarRetorno,
);

/**
 * @route   PUT /api/papeletas-salida/:id/cancelar
 * @desc    Cancelar papeleta (antes de registrar salida)
 * @access  Private
 */
router.put(
  "/:id/cancelar",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  validationMiddleware.validateCancelarPapeleta,
  controller.cancelar,
);

/**
 * @route   GET /api/papeletas-salida/:id
 * @desc    Obtener papeleta de salida por ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateId,
  controller.getById,
);

/**
 * @route   DELETE /api/papeletas-salida/:id
 * @desc    Anular papeleta de salida (DELETE físico)
 * @access  Private (Admin/RRHH)
 */
router.delete(
  "/:id",
  authenticateToken,
  requireActiveUser,
  requireAdminOrRRHH,
  validationMiddleware.validateId,
  controller.anular,
);

module.exports = router;
