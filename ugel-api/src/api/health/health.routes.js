/**
 * Rutas para diagnóstico del sistema
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const controller = require('./health.controller');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Verificar estado del sistema
 * @access  Public
 */
const { authenticateToken, requireAdmin } = require('../../middleware/authHandler');

/**
 * @route   GET /api/health
 * @desc    Verificar estado del sistema
 * @access  Public
 */
router.get('/', controller.healthCheck);

/**
 * @route   GET /api/health/database
 * @desc    Verificar estado de la base de datos
 * @access  Private (Admin)
 */
router.get('/database', authenticateToken, requireAdmin, controller.databaseCheck);

/**
 * @route   GET /api/health/detailed
 * @desc    Verificación detallada del sistema
 * @access  Private (Admin)
 */
router.get('/detailed', authenticateToken, requireAdmin, controller.detailedHealthCheck);

module.exports = router;
