/**
 * Repositorio para diagnóstico del sistema
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Verifica la conexión a la base de datos
 * @returns {boolean} True si la conexión es exitosa
 */
const checkDatabaseConnection = async () => {
  try {
    await db.query('SELECT 1', []);
    return true;
  } catch (error) {
    logger.error('Error verificando conexión a base de datos:', error);
    return false;
  }
};

/**
 * Obtiene información de la base de datos
 * @returns {Object} Información de la base de datos
 */
const getDatabaseInfo = async () => {
  try {
    const queries = [
      // Versión de PostgreSQL
      "SELECT version() as version",
      // Hora actual del servidor de base de datos
      "SELECT NOW() as current_time",
      // Información de conexiones activas
      "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active'",
      // Tamaño de la base de datos
      "SELECT pg_size_pretty(pg_database_size(current_database())) as database_size"
    ];
    
    const [versionResult, timeResult, connectionsResult, sizeResult] = await Promise.all(
      queries.map(query => db.query(query, []))
    );
    
    return {
      version: versionResult.rows[0]?.version?.split(' ')[0] + ' ' + versionResult.rows[0]?.version?.split(' ')[1] || 'Unknown',
      serverTime: timeResult.rows[0]?.current_time || null,
      activeConnections: parseInt(connectionsResult.rows[0]?.active_connections) || 0,
      databaseSize: sizeResult.rows[0]?.database_size || 'Unknown'
    };
    
  } catch (error) {
    logger.error('Error obteniendo información de base de datos:', error);
    return {
      version: 'Unknown',
      serverTime: null,
      activeConnections: 0,
      databaseSize: 'Unknown',
      error: error.message
    };
  }
};

/**
 * Obtiene estadísticas de las tablas principales
 * @returns {Object} Estadísticas de tablas
 */
const getTablesStats = async () => {
  try {
    const queries = [
      // Conteo de usuarios
      "SELECT COUNT(*) as total FROM Usuarios",
      "SELECT COUNT(*) as active FROM Usuarios WHERE activo = true",
      
      // Conteo de personal
      "SELECT COUNT(*) as total FROM Personal",
      "SELECT COUNT(*) as active FROM Personal WHERE activo = true",
      
      // Conteo de visitantes
      "SELECT COUNT(*) as total FROM Visitantes",
      
      // Conteo de visitas (último mes)
      `SELECT COUNT(*) as recent_visits 
       FROM RegistrosVisitas 
       WHERE fecha_ingreso >= CURRENT_DATE - INTERVAL '30 days'`,
      
      // Conteo de áreas
      "SELECT COUNT(*) as total FROM AreasDestino WHERE activa = true"
    ];
    
    const results = await Promise.all(
      queries.map(query => db.query(query, []).catch(err => ({ rows: [{ error: err.message }] })))
    );
    
    return {
      usuarios: {
        total: parseInt(results[0].rows[0]?.total) || 0,
        activos: parseInt(results[1].rows[0]?.active) || 0
      },
      personal: {
        total: parseInt(results[2].rows[0]?.total) || 0,
        activos: parseInt(results[3].rows[0]?.active) || 0
      },
      visitantes: {
        total: parseInt(results[4].rows[0]?.total) || 0
      },
      visitas: {
        ultimoMes: parseInt(results[5].rows[0]?.recent_visits) || 0
      },
      areas: {
        activas: parseInt(results[6].rows[0]?.total) || 0
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de tablas:', error);
    return {
      error: error.message
    };
  }
};

/**
 * Verifica la integridad de las tablas principales
 * @returns {Object} Estado de integridad
 */
const checkTablesIntegrity = async () => {
  try {
    const requiredTables = [
      'Usuarios',
      'AreasDestino',
      'TiposContrato',
      'TiposDocumento',
      'MotivosVisita',
      'Personal',
      'Visitantes',
      'RegistrosVisitas',
      'RegistrosSalidaPersonal',
      'ControlAsistenciaPersonal'
    ];
    
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
    `;
    
    const result = await db.query(query, [requiredTables]);
    const existingTables = result.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    return {
      allTablesExist: missingTables.length === 0,
      existingTables: existingTables,
      missingTables: missingTables,
      totalRequired: requiredTables.length,
      totalExisting: existingTables.length
    };
    
  } catch (error) {
    logger.error('Error verificando integridad de tablas:', error);
    return {
      allTablesExist: false,
      error: error.message
    };
  }
};

module.exports = {
  checkDatabaseConnection,
  getDatabaseInfo,
  getTablesStats,
  checkTablesIntegrity
};
