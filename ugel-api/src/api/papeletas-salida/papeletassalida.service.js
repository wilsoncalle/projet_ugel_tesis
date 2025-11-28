/**
 * Servicio simplificado de papeletas basado en Mongo (solo lectura).
 * El backend relacional (PostgreSQL) ya no se usa para este módulo.
 */

const mongoService = require("../external/mongoService");

const getEstadisticasEstado = async ({ fechaInicio, fechaFin }) =>
  mongoService.getEstadisticasEstadoExternas({ fechaInicio, fechaFin });

const getEstadisticasMotivos = async ({ fechaInicio, fechaFin }) =>
  mongoService.getEstadisticasMotivosExternas({ fechaInicio, fechaFin });

const getEstadisticasHoras = async ({ fechaInicio, fechaFin }) =>
  mongoService.getEstadisticasHorasExternas({ fechaInicio, fechaFin });

const getEstadisticasAreas = async ({ fechaInicio, fechaFin }) =>
  mongoService.getEstadisticasAreasExternas({ fechaInicio, fechaFin });

const getPapeletasExternas = async ({ fechaInicio, fechaFin }) =>
  mongoService.getPapeletasAprobadasExternas({ fechaInicio, fechaFin });

module.exports = {
  getEstadisticasEstado,
  getEstadisticasMotivos,
  getEstadisticasHoras,
  getEstadisticasAreas,
  getPapeletasExternas,
};
