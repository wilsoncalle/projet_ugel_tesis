/**
 * Controlador para gestión de tipos de contrato
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./tiposcontrato.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los tipos de contrato con paginación y filtros
 * @route GET /api/tipos-contrato
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de tipos de contrato');
  
  const result = await service.getAlltipocontrato(req.query);
  
  res.json({
    success: true,
    message: 'Tipos de contrato obtenidos exitosamente',
    data: result.tiposContrato,
    pagination: result.pagination
  });
});

/**
 * Obtener tipo de contrato por ID
 * @route GET /api/tipos-contrato/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de tipo de contrato por ID: ${id}`);
  
  const tipoContrato = await service.getTipoContratoById(id);
  
  res.json({
    success: true,
    message: 'Tipo de contrato obtenido exitosamente',
    data: tipoContrato
  });
});

/**
 * Crear nuevo tipo de contrato
 * @route POST /api/tipos-contrato
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo tipo de contrato: ${req.body.nombre}`);
  
  const tipoContrato = await service.createTipoContrato(req.body, req.user.id);
  
  logger.info(`Tipo de contrato creado exitosamente: ${tipoContrato.nombre_tipo}`);
  
  res.status(201).json({
    success: true,
    message: 'Tipo de contrato creado exitosamente',
    data: tipoContrato
  });
});

/**
 * Actualizar tipo de contrato
 * @route PUT /api/tipos-contrato/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando tipo de contrato ID: ${id}`);
  
  const tipoContrato = await service.updateTipoContrato(id, req.body, req.user.id);
  
  logger.info(`Tipo de contrato actualizado exitosamente: ${tipoContrato.nombre_tipo}`);
  
  res.json({
    success: true,
    message: 'Tipo de contrato actualizado exitosamente',
    data: tipoContrato
  });
});

/**
 * Eliminar tipo de contrato (soft delete)
 * @route DELETE /api/tipos-contrato/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando tipo de contrato ID: ${id}`);
  
  await service.deleteTipoContrato(id, req.user.id);
  
  logger.info(`Tipo de contrato eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Tipo de contrato eliminado exitosamente'
  });
});

/**
 * Obtener tipos de contrato eliminados
 * @route GET /api/tipos-contrato/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de tipos de contrato eliminados');
  
  const result = await service.getDeletedtipocontrato(req.query);
  
  res.json({
    success: true,
    message: 'Tipos de contrato eliminados obtenidos exitosamente',
    data: result.tiposContrato || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar tipo de contrato eliminado
 * @route PUT /api/tipos-contrato/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando tipo de contrato ID: ${id}`);
  
  const tipoContrato = await service.restoreTipoContrato(id, req.user.id);
  
  logger.info(`Tipo de contrato restaurado exitosamente: ${tipoContrato.nombre_tipo}`);
  
  res.json({
    success: true,
    message: 'Tipo de contrato restaurado exitosamente',
    data: tipoContrato
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
