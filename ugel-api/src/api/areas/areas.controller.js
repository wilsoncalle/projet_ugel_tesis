/**
 * Controlador para gestión de áreas de destino
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./areas.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las áreas con paginación y filtros
 * @route GET /api/areas
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de áreas');
  
  const result = await service.getAllAreas(req.query);
  
  res.json({
    success: true,
    message: 'Áreas obtenidas exitosamente',
    data: result.areas,
    pagination: result.pagination
  });
});

/**
 * Obtener área por ID
 * @route GET /api/areas/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de área por ID: ${id}`);
  
  const area = await service.getAreaById(id);
  
  res.json({
    success: true,
    message: 'Área obtenida exitosamente',
    data: area
  });
});

/**
 * Crear nueva área
 * @route POST /api/areas
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nueva área: ${req.body.nombre}`);
  
  const area = await service.createArea(req.body, req.user.id);
  
  logger.info(`Área creada exitosamente: ${area.nombre_area}`);
  
  res.status(201).json({
    success: true,
    message: 'Área creada exitosamente',
    data: area
  });
});

/**
 * Actualizar área
 * @route PUT /api/areas/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando área ID: ${id}`);
  
  const area = await service.updateArea(id, req.body, req.user.id);
  
  logger.info(`Área actualizada exitosamente: ${area.nombre_area}`);
  
  res.json({
    success: true,
    message: 'Área actualizada exitosamente',
    data: area
  });
});

/**
 * Eliminar área (soft delete)
 * @route DELETE /api/areas/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando área ID: ${id}`);
  
  await service.deleteArea(id, req.user.id);
  
  logger.info(`Área eliminada exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Área eliminada exitosamente'
  });
});

/**
 * Obtener áreas eliminadas
 * @route GET /api/areas/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de áreas eliminadas');
  
  const result = await service.getDeletedAreas(req.query);
  
  res.json({
    success: true,
    message: 'Áreas eliminadas obtenidas exitosamente',
    data: result.areas || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar área eliminada
 * @route PUT /api/areas/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando área ID: ${id}`);
  
  const area = await service.restoreArea(id, req.user.id);
  
  logger.info(`Área restaurada exitosamente: ${area.nombre_area}`);
  
  res.json({
    success: true,
    message: 'Área restaurada exitosamente',
    data: area
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
