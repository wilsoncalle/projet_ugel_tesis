/**
 * Controlador para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require("./papeletassalida.service");
const { asyncHandler } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");

/**
 * GET /api/papeletas-salida
 * Listado con paginación y filtros
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info("Solicitud de listado de papeletas de salida");
  const result = await service.getAllPapeletas(req.query);

  res.json({
    success: true,
    message: "Papeletas de salida obtenidas exitosamente",
    data: result.papeletas,
    pagination: result.pagination,
  });
});

/**
 * GET /api/papeletas-salida/pendientes
 * Pendientes para garita (APROBADO/EN_CURSO sin retorno)
 */
const getPendientes = asyncHandler(async (req, res) => {
  logger.info("Solicitud de papeletas de salida pendientes");
  const result = await service.getPapeletasPendientes(req.query);

  res.json({
    success: true,
    message: "Papeletas de salida pendientes obtenidas exitosamente",
    data: result.papeletas,
    pagination: result.pagination,
  });
});

/**
 * GET /api/papeletas-salida/:id
 * Detalle por ID
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de papeleta de salida por ID: ${id}`);

  const papeleta = await service.getPapeletaById(id);

  res.json({
    success: true,
    message: "Papeleta de salida obtenida exitosamente",
    data: papeleta,
  });
});

/**
 * POST /api/papeletas-salida
 * Crear nueva papeleta (SOLICITADO por defecto o APROBADO si se indica)
 * Body esperado:
 * {
 *   personalSolicitanteId, motivoSalidaId, sustentoSolicitud,
 *   fechaHoraSalidaProgramada, fechaHoraRetornoProgramada,
 *   crearComoAprobada?, personalAutorizaId?, observacionAutorizacion?
 * }
 */
const create = asyncHandler(async (req, res) => {
  logger.info("Registrando nueva papeleta de salida");

  const papeleta = await service.createPapeleta({
    personalSolicitanteId: req.body.personalSolicitanteId,
    motivoSalidaId: req.body.motivoSalidaId,
    sustentoSolicitud: req.body.sustentoSolicitud,
    fechaHoraSalidaProgramada: req.body.fechaHoraSalidaProgramada,
    fechaHoraRetornoProgramada: req.body.fechaHoraRetornoProgramada,
    crearComoAprobada: !!req.body.crearComoAprobada,
    personalAutorizaId: req.body.personalAutorizaId,
    observacionAutorizacion: req.body.observacionAutorizacion,
  });

  logger.info(
    `Papeleta de salida registrada exitosamente con ID: ${papeleta.id}`,
  );

  res.status(201).json({
    success: true,
    message: "Papeleta de salida registrada exitosamente",
    data: papeleta,
  });
});

/**
 * PUT /api/papeletas-salida/:id/decidir
 * Aprobar o rechazar papeleta
 * Body: { accion: 'APROBAR'|'RECHAZAR', personalAutorizaId, observacionAutorizacion? }
 */
const decidir = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { accion, personalAutorizaId, observacionAutorizacion } = req.body;

  logger.info(`Decidir papeleta ID: ${id} (accion=${accion})`);

  const papeleta = await service.decidirPapeleta(id, {
    accion,
    personalAutorizaId,
    observacionAutorizacion,
  });

  res.json({
    success: true,
    message: `Papeleta ${accion === "APROBAR" ? "aprobada" : "rechazada"} exitosamente`,
    data: papeleta,
  });
});

/**
 * PUT /api/papeletas-salida/:id/salida
 * Registrar salida en garita
 */
const registrarSalida = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(
    `Registrando salida para papeleta ID: ${id} por usuario ${req.user.id}`,
  );

  const papeleta = await service.registrarSalida(id, req.user.id);

  res.json({
    success: true,
    message: "Salida registrada exitosamente",
    data: papeleta,
  });
});

/**
 * PUT /api/papeletas-salida/:id/retorno
 * Registrar retorno en garita
 */
const registrarRetorno = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Registrando retorno para papeleta de salida ID: ${id}`);

  const papeleta = await service.registrarRetorno(id, req.user.id);

  res.json({
    success: true,
    message: "Retorno de papeleta registrado exitosamente",
    data: papeleta,
  });
});

/**
 * PUT /api/papeletas-salida/:id/cancelar
 * Cancelar papeleta (antes de salir)
 * Body: { observacionAutorizacion? }
 */
const cancelar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { observacionAutorizacion } = req.body;

  logger.info(`Cancelando papeleta de salida ID: ${id}`);

  const papeleta = await service.cancelarPapeleta(id, observacionAutorizacion);

  res.json({
    success: true,
    message: "Papeleta de salida cancelada exitosamente",
    data: papeleta,
  });
});

/**
 * DELETE /api/papeletas-salida/:id
 * Anular (DELETE físico) — usar con cuidado
 */
const anular = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Anulando papeleta de salida ID: ${id}`);

  await service.anularPapeleta(id, req.user.id);

  res.json({
    success: true,
    message: "Papeleta de salida anulada exitosamente",
  });
});

/**
 * GET /api/papeletas-salida/estadisticas
 * Estadísticas por rango y campoFecha
 * Query: ?fechaInicio=...&fechaFin=...&campoFecha=solicitud|programada|salida_real|retorno_real
 */
const getStats = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de papeletas de salida");

  const stats = await service.getEstadisticas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin,
    campoFecha: req.query.campoFecha,
  });

  res.json({
    success: true,
    message: "Estadísticas obtenidas exitosamente",
    data: stats,
  });
});

module.exports = {
  // listados
  getAll,
  getPendientes,
  getById,

  // creación/flujo
  create,
  decidir,
  registrarSalida,
  registrarRetorno,
  cancelar,
  anular,

  // stats
  getStats,
};
