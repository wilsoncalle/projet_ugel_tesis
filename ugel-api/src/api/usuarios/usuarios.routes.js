/**
 * Rutas para gestión de usuarios
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./usuarios.controller');
const { authenticateToken, requireActiveUser, requireAdmin, requireOwnershipOrAdmin } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   GET /api/usuarios
 * @desc    Obtener todos los usuarios con paginación y filtros
 * @access  Private (Admin)
 */
router.get('/', 
  authenticateToken,
  requireActiveUser,
  requireAdmin,
  validationMiddleware.validatePagination,
  validationMiddleware.validateSearch,
  controller.getAll
);

/**
 * @route   GET /api/usuarios/deleted
 * @desc    Obtener usuarios eliminados
 * @access  Private (Admin)
 */
router.get('/deleted', 
  authenticateToken,
  requireActiveUser,
  requireAdmin,
  validationMiddleware.validatePagination,
  validationMiddleware.validateSearch,
  controller.getDeleted
);

/**
 * @route   PUT /api/usuarios/me
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private (Usuario autenticado)
 */
router.put('/me', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateUpdateProfile,
  controller.updateProfile
);

/**
 * @route   PUT /api/usuarios/me/password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private (Usuario autenticado)
 */
router.put('/me/password', 
  authenticateToken,
  requireActiveUser,
  validationMiddleware.validateUpdatePassword,
  controller.updatePassword
);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener usuario por ID
 * @access  Private (Admin o propietario)
 */
router.get('/:id', 
  authenticateToken,
  requireActiveUser,
  requireOwnershipOrAdmin('id'),
  validationMiddleware.validateId,
  controller.getById
);

/**
 * @route   POST /api/usuarios
 * @desc    Crear nuevo usuario
 * @access  Private (Admin)
 */
router.post('/', 
  authenticateToken,
  requireActiveUser,
  requireAdmin,
  validationMiddleware.validateCreateUser,
  controller.create
);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar usuario
 * @access  Private (Admin o propietario)
 */
router.put('/:id', 
  authenticateToken,
  requireActiveUser,
  requireOwnershipOrAdmin('id'),
  validationMiddleware.validateId,
  validationMiddleware.validateUpdateUser,
  controller.update
);

/**
 * @route   PUT /api/usuarios/:id/cambiar-contrasena
 * @desc    Cambiar contraseña de usuario
 * @access  Private (Admin o propietario)
 */
router.put('/:id/cambiar-contrasena', 
  authenticateToken,
  requireActiveUser,
  requireOwnershipOrAdmin('id'),
  validationMiddleware.validateId,
  validationMiddleware.validateChangePassword,
  controller.changePassword
);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Eliminar usuario (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', 
  authenticateToken,
  requireActiveUser,
  requireAdmin,
  validationMiddleware.validateId,
  controller.softDelete
);

/**
 * @route   PUT /api/usuarios/:id/restore
 * @desc    Restaurar usuario eliminado
 * @access  Private (Admin)
 */
router.put('/:id/restore', 
  authenticateToken,
  requireActiveUser,
  requireAdmin,
  validationMiddleware.validateId,
  controller.restore
);

module.exports = router;