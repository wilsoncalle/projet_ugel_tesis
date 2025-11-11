/**
 * Controlador para gestión de usuarios
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./usuarios.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los usuarios con paginación y filtros
 * @route GET /api/usuarios
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de usuarios');
  
  const result = await service.getAllUsuarios(req.query);
  
  res.json({
    success: true,
    message: 'Usuarios obtenidos exitosamente',
    data: result.usuarios,
    pagination: result.pagination
  });
});

/**
 * Obtener usuario por ID
 * @route GET /api/usuarios/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de usuario por ID: ${id}`);
  
  const usuario = await service.getUsuarioById(id);
  
  res.json({
    success: true,
    message: 'Usuario obtenido exitosamente',
    data: usuario
  });
});

/**
 * Crear nuevo usuario
 * @route POST /api/usuarios
 */
const create = asyncHandler(async (req, res) => {
  logger.info(`Creando nuevo usuario: ${req.body.nombreUsuario}`);
  
  const usuario = await service.createUsuario(req.body, req.user.id);
  
  logger.info(`Usuario creado exitosamente: ${usuario.nombre_usuario}`);
  
  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: usuario
  });
});

/**
 * Actualizar usuario
 * @route PUT /api/usuarios/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Actualizando usuario ID: ${id}`);
  
  // Verificar si el usuario actual es administrador o el propietario
  const isAdmin = req.user.rol === 'Administrador';
  const isSelfUpdate = parseInt(id) === req.user.id;
  
  // Si no es administrador y está intentando actualizar el rol, prohibirlo
  if (!isAdmin && req.body.rol) {
    throw new AppError('No tienes permisos para cambiar el rol', 403);
  }
  
  const usuario = await service.updateUsuario(id, req.body, req.user.id);
  
  logger.info(`Usuario actualizado exitosamente: ${usuario.nombre_usuario}`);
  
  res.json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    data: usuario
  });
});

/**
 * Cambiar contraseña de usuario
 * @route PUT /api/usuarios/:id/cambiar-contrasena
 */
const changePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { contrasenaActual, nuevaContrasena } = req.body;
  
  if (!contrasenaActual || !nuevaContrasena) {
    throw new AppError('La contraseña actual y la nueva son requeridas', 400);
  }
  
  logger.info(`Cambiando contraseña para usuario ID: ${id}`);
  
  await service.changePassword(id, contrasenaActual, nuevaContrasena);
  
  logger.info(`Contraseña cambiada exitosamente para usuario ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

/**
 * Eliminar usuario (soft delete)
 * @route DELETE /api/usuarios/:id
 */
const softDelete = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Evitar que un usuario se elimine a sí mismo
  if (parseInt(id) === req.user.id) {
    throw new AppError('No puedes eliminar tu propio usuario', 400);
  }
  
  logger.info(`Eliminando usuario ID: ${id}`);
  
  await service.deleteUsuario(id, req.user.id);
  
  logger.info(`Usuario eliminado exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * Obtener usuarios eliminados
 * @route GET /api/usuarios/deleted
 */
const getDeleted = asyncHandler(async (req, res) => {
  logger.info('Solicitud de usuarios eliminados');
  
  const result = await service.getDeletedUsuarios(req.query);
  
  res.json({
    success: true,
    message: 'Usuarios eliminados obtenidos exitosamente',
    data: result.usuarios || [],
    pagination: result.pagination
  });
});

/**
 * Restaurar usuario eliminado
 * @route PUT /api/usuarios/:id/restore
 */
const restore = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Restaurando usuario ID: ${id}`);
  
  const usuario = await service.restoreUsuario(id, req.user.id);
  
  logger.info(`Usuario restaurado exitosamente: ${usuario.nombre_usuario}`);
  
  res.json({
    success: true,
    message: 'Usuario restaurado exitosamente',
    data: usuario
  });
});

/**
 * Actualizar perfil del usuario autenticado
 * @route PUT /api/usuarios/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  logger.info(`Usuario ${userId} actualizando su perfil`);
  
  const usuario = await service.updateProfile(userId, req.body);
  
  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: usuario
  });
});

/**
 * Cambiar contraseña del usuario autenticado
 * @route PUT /api/usuarios/me/password
 */
const updatePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  logger.info(`Usuario ${userId} cambiando su contraseña`);
  
  await service.updatePassword(userId, req.body);
  
  res.json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

module.exports = {
  getAll,
  getById,
  create,
  update,
  changePassword,
  softDelete,
  getDeleted,
  restore,
  updateProfile,
  updatePassword
};
