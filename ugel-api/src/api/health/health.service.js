/**
 * Servicio para diagnóstico del sistema
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./health.repository');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtiene el estado básico de salud del sistema
 * @returns {Object} Estado básico del sistema
 */
const getBasicHealthStatus = async () => {
  const startTime = Date.now();
  
  try {
    // Verificar conexión a base de datos
    const dbStatus = await repository.checkDatabaseConnection();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: dbStatus ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'UGEL API',
      version: '1.0.0',
      environment: config.nodeEnv,
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      database: dbStatus ? 'Connected' : 'Disconnected'
    };
    
  } catch (error) {
    logger.error('Error en health check básico:', error);
    
    return {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'UGEL API',
      version: '1.0.0',
      environment: config.nodeEnv,
      error: error.message
    };
  }
};

/**
 * Obtiene el estado específico de la base de datos
 * @returns {Object} Estado de la base de datos
 */
const getDatabaseStatus = async () => {
  const startTime = Date.now();
  
  try {
    const isConnected = await repository.checkDatabaseConnection();
    const dbInfo = await repository.getDatabaseInfo();
    const responseTime = Date.now() - startTime;
    
    return {
      status: isConnected ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      database: {
        connected: isConnected,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        responseTime: `${responseTime}ms`,
        ...dbInfo
      }
    };
    
  } catch (error) {
    logger.error('Error en database check:', error);
    
    return {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message
      }
    };
  }
};

/**
 * Obtiene el estado detallado del sistema
 * @returns {Object} Estado detallado del sistema
 */
const getDetailedHealthStatus = async () => {
  const startTime = Date.now();
  
  try {
    // Verificaciones paralelas
    const [
      dbStatus,
      dbInfo,
      systemStats
    ] = await Promise.all([
      repository.checkDatabaseConnection(),
      repository.getDatabaseInfo(),
      getSystemStats()
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: dbStatus ? 'OK' : 'ERROR',
      timestamp: new Date().toISOString(),
      service: {
        name: 'UGEL API',
        version: '1.0.0',
        environment: config.nodeEnv,
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`
      },
      database: {
        connected: dbStatus,
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        ...dbInfo
      },
      system: systemStats,
      dependencies: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
    
  } catch (error) {
    logger.error('Error en detailed health check:', error);
    
    return {
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};

/**
 * Obtiene estadísticas del sistema
 * @returns {Object} Estadísticas del sistema
 */
const getSystemStats = () => {
  const memoryUsage = process.memoryUsage();
  
  return {
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`
    },
    uptime: {
      process: `${Math.floor(process.uptime())} seconds`,
      system: `${Math.floor(require('os').uptime())} seconds`
    },
    cpu: {
      usage: process.cpuUsage()
    }
  };
};

module.exports = {
  getBasicHealthStatus,
  getDatabaseStatus,
  getDetailedHealthStatus
};
