/**
 * Rutas para autenticación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./auth.controller');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public (en desarrollo) / Admin (en producción)
 */
const { authenticateToken, requireAdmin } = require('../../middleware/authHandler');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Admin
 */
router.post('/register', 
  authenticateToken,
  requireAdmin,
  validationMiddleware.validateRegister,
  controller.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', 
  validationMiddleware.validateLogin,
  controller.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refrescar token de acceso
 * @access  Private
 */
router.post('/refresh', 
  controller.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', 
  controller.logout
);

module.exports = router;
