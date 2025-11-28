/**
 * Controlador simplificado para papeletas de salida (fuente Mongo externa)
 * Solo expone endpoints de lectura y estadísticas requeridas por el frontend.
 */

const { asyncHandler } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");
const mongoService = require("../external/mongoService");

/**
 * GET /api/papeletas-salida/estadisticas/estado
 * Distribución y flujo por estado (datos Mongo)
 */
const getStatsEstado = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de estado de papeletas (Mongo)");

  const stats = await mongoService.getEstadisticasEstadoExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
  });

  res.json({
    success: true,
    message: "Estadísticas de estado obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/motivos
 * Distribución por motivo (datos Mongo)
 */
const getStatsMotivos = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de motivos de papeletas (Mongo)");

  const stats = await mongoService.getEstadisticasMotivosExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
  });

  res.json({
    success: true,
    message: "Estadísticas de motivos obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/horas
 * Ranking por persona y resumen (datos Mongo)
 */
const getStatsHoras = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de horas/empleados (Mongo)");

  const stats = await mongoService.getEstadisticasHorasExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
  });

  res.json({
    success: true,
    message: "Estadísticas de empleados obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/areas
 * Estadísticas por área (datos Mongo)
 */
const getStatsAreas = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de áreas (Mongo)");

  const stats = await mongoService.getEstadisticasAreasExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
  });

  res.json({
    success: true,
    message: "Estadísticas de áreas obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/externas
 * Listado de papeletas aprobadas desde Mongo (solo lectura)
 */
const getExternas = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  const data = await mongoService.getPapeletasAprobadasExternas({
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
  });

  res.json({ success: true, data });
});

module.exports = {
  getStatsEstado,
  getStatsMotivos,
  getStatsHoras,
  getStatsAreas,
  getExternas,
};
