/**
 * Script de migración para agregar columna ultimo_intento_fallido a Usuarios
 */

require('dotenv').config();
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

const migrateLastFailedAttempt = async () => {
  try {
    logger.info('Iniciando migración de ultimo_intento_fallido...');

    // Verificar si la columna ya existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'ultimo_intento_fallido';
    `;

    const result = await db.query(checkColumnQuery);
    
    if (result.rows.length === 0) {
      logger.info('Agregando columna ultimo_intento_fallido...');
      await db.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN ultimo_intento_fallido TIMESTAMP NULL;
      `);
      logger.info('Columna ultimo_intento_fallido agregada.');
    } else {
      logger.info('Columna ultimo_intento_fallido ya existe.');
    }

    logger.info('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    logger.error('Error durante la migración:', error);
    process.exit(1);
  }
};

migrateLastFailedAttempt();
