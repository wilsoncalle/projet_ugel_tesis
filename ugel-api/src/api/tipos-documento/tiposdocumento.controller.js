/**
 * Controlador para gestión de tipos de documento
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./tiposdocumento.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los tipos de documento con paginación y filtros
 * @route GET /api/tipos-documento
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de tipos de documento');
  
  const result = await service.getAlltipodocumento(req.query);
  
  res.json({
    success: true,
    message: 'Tipos de documento obtenidos exitosamente',
    data: result.tiposDocumento,
    pagination: result.pagination
  });
});

/**
 * Obtener tipo de documento por ID
 * @route GET /api/tipos-documento/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de tipo de documento por ID: ${id}`);
  
  const tipoDocumento = await service.getTipoDocumentoById(id);
  
  res.json({
    success: true,
    message: 'Tipo de documento obtenido exitosamente',
    data: tipoDocumento
  });
});

/**
 * Crear nuevo tipo de documento
 * @route POST /api/tipos-documento
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo tipo de documento: ${req.body.codigo} - ${req.body.nombreCompleto}`);
  
  const tipoDocumento = await service.createTipoDocumento(req.body, req.user.id);
  
  logger.info(`Tipo de documento creado exitosamente: ${tipoDocumento.codigo} - ${tipoDocumento.nombre_completo}`);
  
  res.status(201).json({
    success: true,
    message: 'Tipo de documento creado exitosamente',
    data: tipoDocumento
  });
});

/**
 * Actualizar tipo de documento
 * @route PUT /api/tipos-documento/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando tipo de documento ID: ${id}`);
  
  const tipoDocumento = await service.updateTipoDocumento(id, req.body, req.user.id);
  
  logger.info(`Tipo de documento actualizado exitosamente: ${tipoDocumento.codigo} - ${tipoDocumento.nombre_completo}`);
  
  res.json({
    success: true,
    message: 'Tipo de documento actualizado exitosamente',
    data: tipoDocumento
  });
});

/**
 * Eliminar tipo de documento (soft delete)
 * @route DELETE /api/tipos-documento/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando tipo de documento ID: ${id}`);
  
  await service.deleteTipoDocumento(id, req.user.id);
  
  logger.info(`Tipo de documento eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Tipo de documento eliminado exitosamente'
  });
});

/**
 * Obtener tipos de documento eliminados
 * @route GET /api/tipos-documento/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de tipos de documento eliminados');
  
  const result = await service.getDeletedtipodocumento(req.query);
  
  res.json({
    success: true,
    message: 'Tipos de documento eliminados obtenidos exitosamente',
    data: result.tiposDocumento || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar tipo de documento eliminado
 * @route PUT /api/tipos-documento/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando tipo de documento ID: ${id}`);
  
  const tipoDocumento = await service.restoreTipoDocumento(id, req.user.id);
  
  logger.info(`Tipo de documento restaurado exitosamente: ${tipoDocumento.codigo}`);
  
  res.json({
    success: true,
    message: 'Tipo de documento restaurado exitosamente',
    data: tipoDocumento
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
