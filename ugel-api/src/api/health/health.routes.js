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
router.get('/', controller.healthCheck);

/**
 * @route   GET /api/health/database
 * @desc    Verificar estado de la base de datos
 * @access  Public
 */
router.get('/database', controller.databaseCheck);

/**
 * @route   GET /api/health/detailed
 * @desc    Verificación detallada del sistema
 * @access  Public
 */
router.get('/detailed', controller.detailedHealthCheck);

module.exports = router;
