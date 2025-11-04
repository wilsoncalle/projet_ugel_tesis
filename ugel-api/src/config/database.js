/**
 * Configuración de la conexión a PostgreSQL
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');
const config = require('./index');

// Configuración del pool de conexiones
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_DATABASE || 'ugel_control_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'qwerty',
  max: 20, // Máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // Tiempo antes de cerrar conexiones inactivas
  connectionTimeoutMillis: 2000, // Tiempo máximo para obtener una conexión
};

// Crear el pool de conexiones
const pool = new Pool(poolConfig);

// Evento de conexión exitosa
pool.on('connect', () => {
  logger.info('Nueva conexión establecida con PostgreSQL');
});

// Evento de error en el pool
pool.on('error', (err) => {
  logger.error('Error inesperado en el cliente de PostgreSQL:', err);
  process.exit(-1);
});

/**
 * Ejecuta una consulta SQL con parámetros
 * @param {string} text - Consulta SQL
 * @param {Array} params - Parámetros de la consulta
 * @returns {Promise} Resultado de la consulta
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info(`Query ejecutada en ${duration}ms: ${text.substring(0, 50)}...`);
    return result;
  } catch (error) {
    logger.error('Error en query SQL:', {
      error: error.message,
      query: text,
      params
    });
    throw error;
  }
};

/**
 * Obtiene un cliente del pool para transacciones
 * @returns {Promise} Cliente de PostgreSQL
 */
const getClient = async () => {
  try {
    const client = await pool.connect();
    logger.info('Cliente obtenido del pool');
    return client;
  } catch (error) {
    logger.error('Error obteniendo cliente del pool:', error);
    throw error;
  }
};

/**
 * Verifica la conexión a la base de datos
 * @returns {Promise<boolean>} Estado de la conexión
 */
const checkConnection = async () => {
  try {
    await query('SELECT NOW()', []);
    logger.info('Conexión a PostgreSQL verificada correctamente');
    return true;
  } catch (error) {
    logger.error('Error verificando conexión a PostgreSQL:', error);
    return false;
  }
};

/**
 * Cierra el pool de conexiones
 */
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Pool de conexiones cerrado correctamente');
  } catch (error) {
    logger.error('Error cerrando pool de conexiones:', error);
  }
};

/**
 * Realiza rollback de una transacción de forma segura
 * @param {Object} client - Cliente de PostgreSQL
 */
const safeRollback = async (client) => {
  if (!client) return;
  try {
    await client.query('ROLLBACK');
    logger.info('Rollback realizado correctamente');
  } catch (error) {
    logger.error('Error realizando rollback:', error);
  }
};

module.exports = {
  query,
  getClient,
  checkConnection,
  closePool,
  safeRollback,
  pool
};