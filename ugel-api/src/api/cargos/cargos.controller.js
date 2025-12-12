/**
 * Controlador para gestión de cargos
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./cargos.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los cargos con paginación y filtros
 * @route GET /api/cargos
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de cargos');
  
  const result = await service.getAllcargo(req.query);
  
  res.json({
    success: true,
    message: 'cargo obtenidos exitosamente',
    data: result.cargos,
    pagination: result.pagination
  });
});

/**
 * Obtener cargo por ID
 * @route GET /api/cargos/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de cargo por ID: ${id}`);
  
  const cargo = await service.getCargoById(id);
  
  res.json({
    success: true,
    message: 'Cargo obtenido exitosamente',
    data: cargo
  });
});

/**
 * Crear nuevo cargo
 * @route POST /api/cargos
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo cargo: ${req.body.nombre_cargo}`);
  
  const cargo = await service.createCargo(req.body, req.user.id);
  
  logger.info(`Cargo creado exitosamente: ${cargo.nombre_cargo}`);
  
  res.status(201).json({
    success: true,
    message: 'Cargo creado exitosamente',
    data: cargo
  });
});

/**
 * Actualizar cargo
 * @route PUT /api/cargos/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando cargo ID: ${id}`);
  
  const cargo = await service.updateCargo(id, req.body, req.user.id);
  
  logger.info(`Cargo actualizado exitosamente: ${cargo.nombre_cargo}`);
  
  res.json({
    success: true,
    message: 'Cargo actualizado exitosamente',
    data: cargo
  });
});

/**
 * Eliminar cargo (soft delete)
 * @route DELETE /api/cargos/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando cargo ID: ${id}`);
  
  await service.deleteCargo(id, req.user.id);
  
  logger.info(`Cargo eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Cargo eliminado exitosamente'
  });
});

/**
 * Obtener cargos eliminados
 * @route GET /api/cargos/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de cargos eliminados');
  
  const result = await service.getDeletedcargo(req.query);
  
  res.json({
    success: true,
    message: 'cargo eliminados obtenidos exitosamente',
    data: result.cargos || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar cargo eliminado
 * @route PUT /api/cargos/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando cargo ID: ${id}`);
  
  const cargo = await service.restoreCargo(id, req.user.id);
  
  logger.info(`Cargo restaurado exitosamente: ${cargo.nombre_cargo}`);
  
  res.json({
    success: true,
    message: 'Cargo restaurado exitosamente',
    data: cargo
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
