/**
 * Controlador para gestión de motivos de visita
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./motivosvisita.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los motivos de visita con paginación y filtros
 * @route GET /api/motivos-visita
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de motivos de visita');
  
  const result = await service.getAllMotivosVisita(req.query);
  
  res.json({
    success: true,
    message: 'Motivos de visita obtenidos exitosamente',
    data: result.motivosVisita,
    pagination: result.pagination
  });
});

/**
 * Obtener motivo de visita por ID
 * @route GET /api/motivos-visita/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de motivo de visita por ID: ${id}`);
  
  const motivoVisita = await service.getMotivoVisitaById(id);
  
  res.json({
    success: true,
    message: 'Motivo de visita obtenido exitosamente',
    data: motivoVisita
  });
});

/**
 * Crear nuevo motivo de visita
 * @route POST /api/motivos-visita
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo motivo de visita: ${req.body.nombre}`);
  
  const motivoVisita = await service.createMotivoVisita(req.body, req.user.id);
  
  logger.info(`Motivo de visita creado exitosamente: ${motivoVisita.nombre_motivo}`);
  
  res.status(201).json({
    success: true,
    message: 'Motivo de visita creado exitosamente',
    data: motivoVisita
  });
});

/**
 * Actualizar motivo de visita
 * @route PUT /api/motivos-visita/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando motivo de visita ID: ${id}`);
  
  const motivoVisita = await service.updateMotivoVisita(id, req.body, req.user.id);
  
  logger.info(`Motivo de visita actualizado exitosamente: ${motivoVisita.nombre_motivo}`);
  
  res.json({
    success: true,
    message: 'Motivo de visita actualizado exitosamente',
    data: motivoVisita
  });
});

/**
 * Eliminar motivo de visita (soft delete)
 * @route DELETE /api/motivos-visita/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando motivo de visita ID: ${id}`);
  
  await service.deleteMotivoVisita(id, req.user.id);
  
  logger.info(`Motivo de visita eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Motivo de visita eliminado exitosamente'
  });
});

/**
 * Obtener motivos de visita eliminados
 * @route GET /api/motivos-visita/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de motivos de visita eliminados');
  
  const result = await service.getDeletedMotivosVisita(req.query);
  
  res.json({
    success: true,
    message: 'Motivos de visita eliminados obtenidos exitosamente',
    data: result.motivosVisita || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar motivo de visita eliminado
 * @route PUT /api/motivos-visita/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando motivo de visita ID: ${id}`);
  
  const motivoVisita = await service.restoreMotivoVisita(id, req.user.id);
  
  logger.info(`Motivo de visita restaurado exitosamente: ${motivoVisita.nombre_motivo}`);
  
  res.json({
    success: true,
    message: 'Motivo de visita restaurado exitosamente',
    data: motivoVisita
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete,
  getDeleted,
  restore
};
