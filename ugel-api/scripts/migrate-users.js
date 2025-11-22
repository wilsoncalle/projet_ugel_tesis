/**
 * Script de migración para actualizar la tabla Usuarios
 * Agrega columnas para control de intentos fallidos y bloqueo
 */

require('dotenv').config();
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

const migrate = async () => {
  try {
    logger.info('Iniciando migración de base de datos...');

    // Verificar si las columnas ya existen
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name IN ('intentos_fallidos', 'bloqueado_hasta');
    `;

    const result = await db.query(checkColumnsQuery);
    const existingColumns = result.rows.map(row => row.column_name);

    // Agregar columna intentos_fallidos si no existe
    if (!existingColumns.includes('intentos_fallidos')) {
      logger.info('Agregando columna intentos_fallidos...');
      await db.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN intentos_fallidos INT NOT NULL DEFAULT 0;
      `);
      logger.info('Columna intentos_fallidos agregada.');
    } else {
      logger.info('Columna intentos_fallidos ya existe.');
    }

    // Agregar columna bloqueado_hasta si no existe
    if (!existingColumns.includes('bloqueado_hasta')) {
      logger.info('Agregando columna bloqueado_hasta...');
      await db.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN bloqueado_hasta TIMESTAMP NULL;
      `);
      logger.info('Columna bloqueado_hasta agregada.');
    } else {
      logger.info('Columna bloqueado_hasta ya existe.');
    }

    logger.info('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    logger.error('Error durante la migración:', error);
    process.exit(1);
  }
};

migrate();
