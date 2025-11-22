/**
 * Script de migración para agregar columna personal_id a Usuarios
 */

require('dotenv').config();
const db = require('../src/config/database');
const logger = require('../src/utils/logger');

const migratePersonalId = async () => {
  try {
    logger.info('Iniciando migración de personal_id...');

    // Verificar si la columna ya existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      AND column_name = 'personal_id';
    `;

    const result = await db.query(checkColumnQuery);
    
    if (result.rows.length === 0) {
      logger.info('Agregando columna personal_id...');
      await db.query(`
        ALTER TABLE Usuarios 
        ADD COLUMN personal_id INT NULL;
        
        ALTER TABLE Usuarios
        ADD CONSTRAINT fk_usuarios_personal
        FOREIGN KEY (personal_id) REFERENCES Personal(id);
      `);
      logger.info('Columna personal_id agregada.');
    } else {
      logger.info('Columna personal_id ya existe.');
    }

    logger.info('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    logger.error('Error durante la migración:', error);
    process.exit(1);
  }
};

migratePersonalId();
