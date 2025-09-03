/**
 * Controlador para diagnóstico del sistema
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./health.service');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * Verificación básica de salud del sistema
 * @route GET /api/health
 */
const healthCheck = asyncHandler(async (req, res) => {
  const healthStatus = await service.getBasicHealthStatus();
  
  const statusCode = healthStatus.status === 'OK' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.status === 'OK',
    ...healthStatus
  });
});

/**
 * Verificación específica de la base de datos
 * @route GET /api/health/database
 */
const databaseCheck = asyncHandler(async (req, res) => {
  const dbStatus = await service.getDatabaseStatus();
  
  const statusCode = dbStatus.status === 'OK' ? 200 : 503;
  
  res.status(statusCode).json({
    success: dbStatus.status === 'OK',
    ...dbStatus
  });
});

/**
 * Verificación detallada del sistema
 * @route GET /api/health/detailed
 */
const detailedHealthCheck = asyncHandler(async (req, res) => {
  const detailedStatus = await service.getDetailedHealthStatus();
  
  const statusCode = detailedStatus.status === 'OK' ? 200 : 503;
  
  res.status(statusCode).json({
    success: detailedStatus.status === 'OK',
    ...detailedStatus
  });
});

module.exports = {
  healthCheck,
  databaseCheck,
  detailedHealthCheck
};
