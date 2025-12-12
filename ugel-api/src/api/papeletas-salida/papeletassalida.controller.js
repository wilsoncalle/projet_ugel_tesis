/**
 * Controlador simplificado para papeletas de salida (fuente Mongo externa)
 * Solo expone endpoints de lectura y estadísticas requeridas por el frontend.
 */

const { asyncHandler } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");
const repository = require("./papeletassalida.repository");

/**
 * GET /api/papeletas-salida/estadisticas/estado
 * Distribución y flujo por estado (datos locales Postgres)
 */
const getStatsEstado = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de estado de papeletas (Local)");

  const stats = await repository.getEstadisticasEstado({
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
 * Distribución por motivo (datos locales Postgres)
 */
const getStatsMotivos = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de motivos de papeletas (Local)");

  const stats = await repository.getEstadisticasMotivos({
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
 * Ranking por persona y resumen (datos locales Postgres)
 */
const getStatsHoras = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de horas/empleados (Local)");

  const stats = await repository.getEstadisticasHoras({
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
 * Estadísticas por área (datos locales Postgres)
 */
const getStatsAreas = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de áreas (Local)");

  const stats = await repository.getEstadisticasAreas({
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
 * Listado de papeletas aprobadas desde Postgres Local
 */
const getExternas = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  // Limit alto para mantener compatibilidad con frontend que filtra en cliente
  const result = await repository.findAll({
    fechaInicio: fechaInicio || null,
    fechaFin: fechaFin || null,
    limit: 10000 
  });

  res.json({ success: true, data: result.papeletas });
});

module.exports = {
  getStatsEstado,
  getStatsMotivos,
  getStatsHoras,
  getStatsAreas,
  getExternas,
};
