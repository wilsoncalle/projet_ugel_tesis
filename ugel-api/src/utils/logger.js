/**
 * Sistema de logging para la aplicación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const config = require('../config');

/**
 * Niveles de log disponibles
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Colores para la consola
 */
const COLORS = {
  error: '\x1b[31m', // Rojo
  warn: '\x1b[33m',  // Amarillo
  info: '\x1b[36m',  // Cian
  debug: '\x1b[35m', // Magenta
  reset: '\x1b[0m'   // Reset
};

/**
 * Obtiene el timestamp formateado
 * @returns {string} Timestamp en formato ISO
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Formatea el mensaje de log
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje principal
 * @param {any} meta - Información adicional
 * @returns {string} Mensaje formateado
 */
const formatMessage = (level, message, meta = null) => {
  const timestamp = getTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  let logMessage = `${timestamp} [${levelUpper}] ${message}`;
  
  if (meta !== null && meta !== undefined) {
    if (typeof meta === 'object') {
      logMessage += '\n' + JSON.stringify(meta, null, 2);
    } else {
      logMessage += ` ${meta}`;
    }
  }
  
  return logMessage;
};

/**
 * Verifica si el nivel de log debe ser mostrado
 * @param {string} level - Nivel del log a verificar
 * @returns {boolean} True si debe mostrarse
 */
const shouldLog = (level) => {
  const configLevel = config.logLevel || 'info';
  return LOG_LEVELS[level] <= LOG_LEVELS[configLevel];
};

/**
 * Escribe el log en la consola con colores
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje formateado
 */
const writeToConsole = (level, message) => {
  const color = COLORS[level] || COLORS.reset;
  const resetColor = COLORS.reset;
  
  if (level === 'error') {
    console.error(`${color}${message}${resetColor}`);
  } else if (level === 'warn') {
    console.warn(`${color}${message}${resetColor}`);
  } else {
    console.log(`${color}${message}${resetColor}`);
  }
};

/**
 * Función genérica de logging
 * @param {string} level - Nivel del log
 * @param {string} message - Mensaje principal
 * @param {any} meta - Información adicional
 */
const log = (level, message, meta = null) => {
  if (!shouldLog(level)) {
    return;
  }
  
  const formattedMessage = formatMessage(level, message, meta);
  writeToConsole(level, formattedMessage);
  
  // En producción, aquí se podría agregar escritura a archivos
  // o envío a servicios de logging externos
};

/**
 * Logger object con métodos para cada nivel
 */
const logger = {
  /**
   * Log de error
   * @param {string} message - Mensaje de error
   * @param {any} meta - Información adicional
   */
  error: (message, meta = null) => {
    log('error', message, meta);
  },
  
  /**
   * Log de advertencia
   * @param {string} message - Mensaje de advertencia
   * @param {any} meta - Información adicional
   */
  warn: (message, meta = null) => {
    log('warn', message, meta);
  },
  
  /**
   * Log informativo
   * @param {string} message - Mensaje informativo
   * @param {any} meta - Información adicional
   */
  info: (message, meta = null) => {
    log('info', message, meta);
  },
  
  /**
   * Log de debug
   * @param {string} message - Mensaje de debug
   * @param {any} meta - Información adicional
   */
  debug: (message, meta = null) => {
    log('debug', message, meta);
  }
};

module.exports = logger;
