/**
 * Controlador para gestión de visitantes
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./visitantes.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los visitantes con paginación y filtros
 * @route GET /api/visitantes
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de visitantes');
  
  const result = await service.getAllVisitantes(req.query);
  
  res.json({
    success: true,
    message: 'Visitantes obtenidos exitosamente',
    data: result.visitantes,
    pagination: result.pagination
  });
});

/**
 * Obtener visitante por ID
 * @route GET /api/visitantes/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de visitante por ID: ${id}`);
  
  const visitante = await service.getVisitanteById(id);
  
  res.json({
    success: true,
    message: 'Visitante obtenido exitosamente',
    data: visitante
  });
});

/**
 * Obtener visitante por tipo y número de documento
 * @route GET /api/visitantes/documento/:tipoDocumentoId/:numeroDocumento
 */
const getByDocumento = asyncHandler(async (req, res) => {
  const { tipoDocumentoId, numeroDocumento } = req.params;
  logger.info(`Solicitud de visitante por documento: ${tipoDocumentoId} - ${numeroDocumento}`);
  
  const visitante = await service.getVisitanteByDocumento(tipoDocumentoId, numeroDocumento);
  
  res.json({
    success: true,
    message: 'Visitante obtenido exitosamente',
    data: visitante
  });
});

/**
 * Obtener historial de visitas de un visitante
 * @route GET /api/visitantes/:id/historial
 */
const getHistorial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de historial de visitas para visitante ID: ${id}`);
  
  const result = await service.getHistorialVisitas(id, req.query);
  
  res.json({
    success: true,
    message: 'Historial de visitas obtenido exitosamente',
    data: result.visitas,
    pagination: result.pagination
  });
});

/**
 * Crear nuevo visitante
 * @route POST /api/visitantes
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo visitante: ${req.body.nombres} ${req.body.apellidos}`);
  
  const visitante = await service.createVisitante(req.body);
  
  logger.info(`Visitante creado exitosamente: ${visitante.nombres} ${visitante.apellidos}`);
  
  res.status(201).json({
    success: true,
    message: 'Visitante creado exitosamente',
    data: visitante
  });
});

/**
 * Actualizar visitante
 * @route PUT /api/visitantes/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando visitante ID: ${id}`);
  
  const visitante = await service.updateVisitante(id, req.body);
  
  logger.info(`Visitante actualizado exitosamente: ${visitante.nombres} ${visitante.apellidos}`);
  
  res.json({
    success: true,
    message: 'Visitante actualizado exitosamente',
    data: visitante
  });
});

module.exports = {
  getAll,
  getById,
  getByDocumento,
  getHistorial,
  create,
  update
};
