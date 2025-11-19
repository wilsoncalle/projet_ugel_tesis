/**
 * Controlador para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require("./papeletassalida.service");
const personalRepository = require("../personal/personal.repository");
const { asyncHandler, AppError } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");
const mongoService = require("../external/mongoService");

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
  const { accion, observacionAutorizacion } = req.body;
  
  // 1. Intentar obtener personalAutorizaId del body primero
  let personalAutorizaId = req.body.personalAutorizaId;
  
  // 2. Si no viene en el body, intentar obtenerlo del token
  if (!personalAutorizaId) {
    personalAutorizaId = req.user?.personal_id ?? req.user?.personalId ?? null;
  }
  
  // 3. Si aún no tenemos personalId, buscar por nombre de usuario o email
  // (Asumiendo que el nombre de usuario o email coincide con algún campo del personal)
  if (!personalAutorizaId && req.user) {
    // Intentar buscar el personal por nombre de usuario o email
    // Nota: Esto requiere que haya una relación entre Usuario y Personal
    // Si no existe, se lanzará un error claro
    try {
      // Si el nombre de usuario es un DNI, intentar buscar por documento
      const nombreUsuario = req.user.nombreUsuario;
      if (nombreUsuario && /^\d{8}$/.test(nombreUsuario)) {
        const personal = await personalRepository.findByDocumento('DNI', nombreUsuario);
        if (personal) {
          personalAutorizaId = personal.id;
        }
      }
    } catch (error) {
      logger.warn(`No se pudo obtener personal por nombre de usuario: ${error.message}`);
    }
  }
  
  // 4. Si aún no tenemos personalId, lanzar error claro
  if (!personalAutorizaId) {
    throw new AppError(
      "Usuario no autorizado o no vinculado a un registro de personal. Debe indicar el personal que autoriza.",
      403
    );
  }

  logger.info(`Decidir papeleta ID: ${id} (accion=${accion}) por Personal ID: ${personalAutorizaId}`);

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

/**
 * GET /api/papeletas-salida/estadisticas/estado
 * Estadísticas de estado de papeletas
 */
const getStatsEstado = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de estado de papeletas (Mongo)");
  
  // Usamos mongoService
  const stats = await mongoService.getEstadisticasEstadoExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin
  });

  res.json({
    success: true,
    message: "Estadísticas de estado obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/motivos
 * Estadísticas de motivos de salida
 */
const getStatsMotivos = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de motivos de papeletas (Mongo)");

  const stats = await mongoService.getEstadisticasMotivosExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin
  });

  res.json({
    success: true,
    message: "Estadísticas de motivos obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/horas
 * Estadísticas de horas autorizadas vs usadas
 */
const getStatsHoras = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de horas/empleados (Mongo)");

  const stats = await mongoService.getEstadisticasHorasExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin
  });

  res.json({
    success: true,
    message: "Estadísticas de empleados obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/estadisticas/areas
 * Estadísticas de áreas y colaboradores
 */
const getStatsAreas = asyncHandler(async (req, res) => {
  logger.info("Solicitud de estadísticas de áreas (Mongo)");

  const stats = await mongoService.getEstadisticasAreasExternas({
    fechaInicio: req.query.fechaInicio,
    fechaFin: req.query.fechaFin
  });

  res.json({
    success: true,
    message: "Estadísticas de áreas obtenidas exitosamente",
    data: stats,
  });
});

/**
 * GET /api/papeletas-salida/externas
 * Obtiene papeletas aprobadas desde MongoDB (datos externos)
 */
const getExternas = asyncHandler(async (req, res) => {
  const data = await mongoService.getPapeletasAprobadasExternas();
  res.json({ success: true, data });
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
  getStatsEstado,
  getStatsMotivos,
  getStatsHoras,
  getStatsAreas,

  // externas
  getExternas,
};
