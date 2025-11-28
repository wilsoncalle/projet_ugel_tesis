/**
 * Rutas para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require("express");
const controller = require("./papeletassalida.controller");
const {
  authenticateToken,
  requireActiveUser,
} = require("../../middleware/authHandler");

const router = express.Router();

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

module.exports = router;
