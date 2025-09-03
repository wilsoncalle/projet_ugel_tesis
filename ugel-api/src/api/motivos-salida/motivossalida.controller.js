/**
 * Controlador para gestión de motivos de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./motivossalida.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los motivos de salida con paginación y filtros
 * @route GET /api/motivos-salida
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de motivos de salida');
  
  const result = await service.getAllMotivosSalida(req.query);
  
  res.json({
    success: true,
    message: 'Motivos de salida obtenidos exitosamente',
    data: result.motivosSalida,
    pagination: result.pagination
  });
});

/**
 * Obtener motivo de salida por ID
 * @route GET /api/motivos-salida/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de motivo de salida por ID: ${id}`);
  
  const motivoSalida = await service.getMotivoSalidaById(id);
  
  res.json({
    success: true,
    message: 'Motivo de salida obtenido exitosamente',
    data: motivoSalida
  });
});

/**
 * Crear nuevo motivo de salida
 * @route POST /api/motivos-salida
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo motivo de salida: ${req.body.nombre}`);
  
  const motivoSalida = await service.createMotivoSalida(req.body, req.user.id);
  
  logger.info(`Motivo de salida creado exitosamente: ${motivoSalida.nombre_motivo}`);
  
  res.status(201).json({
    success: true,
    message: 'Motivo de salida creado exitosamente',
    data: motivoSalida
  });
});

/**
 * Actualizar motivo de salida
 * @route PUT /api/motivos-salida/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando motivo de salida ID: ${id}`);
  
  const motivoSalida = await service.updateMotivoSalida(id, req.body, req.user.id);
  
  logger.info(`Motivo de salida actualizado exitosamente: ${motivoSalida.nombre_motivo}`);
  
  res.json({
    success: true,
    message: 'Motivo de salida actualizado exitosamente',
    data: motivoSalida
  });
});

/**
 * Eliminar motivo de salida (soft delete)
 * @route DELETE /api/motivos-salida/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando motivo de salida ID: ${id}`);
  
  await service.deleteMotivoSalida(id, req.user.id);
  
  logger.info(`Motivo de salida eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Motivo de salida eliminado exitosamente'
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  softDelete
};
