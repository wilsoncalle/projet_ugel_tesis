/**
 * Controlador para gestión de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./personal.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todo el personal con paginación y filtros
 * @route GET /api/personal
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de personal');
  
  const result = await service.getAllPersonal(req.query);
  
  // Aseguramos que la respuesta siempre tenga un array, aunque esté vacío
  const personalData = result.personal || [];
  
  res.json({
    success: true,
    message: 'Personal obtenido exitosamente',
    data: personalData,
    pagination: result.pagination
  });
});

/**
 * Obtener personal por ID
 * @route GET /api/personal/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de personal por ID: ${id}`);
  
  const personal = await service.getPersonalById(id);
  
  res.json({
    success: true,
    message: 'Personal obtenido exitosamente',
    data: personal
  });
});

/**
 * Obtener personal por tipo y número de documento
 * @route GET /api/personal/documento/:tipo/:numero
 */
const getByDocumento = asyncHandler(async (req, res) => {
  const { tipo, numero } = req.params;
  logger.info(`Solicitud de personal por documento: ${tipo} - ${numero}`);
  
  const personal = await service.getPersonalByDocumento(tipo, numero);
  
  res.json({
    success: true,
    message: 'Personal obtenido exitosamente',
    data: personal
  });
});

/**
 * Crear nuevo personal
 * @route POST /api/personal
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo personal: ${req.body.nombres} ${req.body.apellidos}`);
  
  const personal = await service.createPersonal(req.body, req.user.id);
  
  logger.info(`Personal creado exitosamente: ${personal.nombres} ${personal.apellidos}`);
  
  res.status(201).json({
    success: true,
    message: 'Personal creado exitosamente',
    data: personal
  });
});

/**
 * Actualizar personal
 * @route PUT /api/personal/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando personal ID: ${id}`);
  
  const personal = await service.updatePersonal(id, req.body, req.user.id);
  
  logger.info(`Personal actualizado exitosamente: ${personal.nombres} ${personal.apellidos}`);
  
  res.json({
    success: true,
    message: 'Personal actualizado exitosamente',
    data: personal
  });
});

/**
 * Eliminar personal (soft delete)
 * @route DELETE /api/personal/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Eliminando personal ID: ${id}`);
  
  await service.deletePersonal(id, req.user.id);
  
  logger.info(`Personal eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Personal eliminado exitosamente'
  });
});

/**
 * Obtener personal eliminado
 * @route GET /api/personal/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de personal eliminado');
  
  const result = await service.getDeletedPersonal(req.query);
  
  res.json({
    success: true,
    message: 'Personal eliminado obtenido exitosamente',
    data: result.personal || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar personal eliminado
 * @route PUT /api/personal/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando personal ID: ${id}`);
  
  const personal = await service.restorePersonal(id, req.user.id);
  
  logger.info(`Personal restaurado exitosamente: ${personal.nombres} ${personal.apellidos}`);
  
  res.json({
    success: true,
    message: 'Personal restaurado exitosamente',
    data: personal
  });
});

/**
 * Sincronizar usuarios para personal existente
 * @route POST /api/personal/sincronizar-usuarios
 */
const sincronizarUsuarios = asyncHandler(async (req, res) => {
  logger.info('Iniciando sincronización de usuarios para personal');

  const resultado = await service.sincronizarUsuariosPersonal(req.user.id);

  res.json({
    success: true,
    message: 'Sincronización completada exitosamente',
    data: resultado
  });
});

module.exports = {
  getAll,
  getById,
  getByDocumento,
  create,
  update,
  softDelete,
  getDeleted,
  restore,
  sincronizarUsuarios
};
