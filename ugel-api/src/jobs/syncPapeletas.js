// Cargar variables de entorno si se ejecuta directamente
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { pool } = require('../config/database');
const mongoService = require('../api/external/mongoService');
const logger = require('../utils/logger');

const sincronizarPapeletas = async () => {
  logger.info('Iniciando sincronización diaria de papeletas externas...');
  
  try {
    // 1. Obtener datos procesados de Mongo
    const datosMongo = await mongoService.getPapeletasAprobadasExternas();
    
    if (!datosMongo || datosMongo.length === 0) {
      logger.info('No se encontraron datos en Mongo para sincronizar.');
      return;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const item of datosMongo) {
        // Mapeo de campos
        const external_id = item.id;
        const codigo_papeleta = item.codigo_papeleta;
        const solicitante_nombres = item.solicitante_nombres;
        const solicitante_apellidos = item.solicitante_apellidos;
        const solicitante_dni = item.solicitante_numero_documento;
        const motivo = item.nombre_motivo;
        const motivo_detalle = item.motivo_detalle;
        const fecha_salida = item.fecha_hora_salida_programada;
        const fecha_retorno = item.fecha_hora_retorno_programada;
        const estado_virtual = item.estado; 
        const estado_original = item.estado; 
        const solicitante_area = item.nombreArea;

        const queryText = `
          INSERT INTO papeletaexterna (
            external_id, codigo_papeleta, solicitante_nombres, 
            solicitante_apellidos, solicitante_dni, solicitante_area, motivo, 
            motivo_detalle, fecha_salida, fecha_retorno, 
            estado_original, estado_virtual, fecha_sincronizacion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (external_id) DO UPDATE SET
            codigo_papeleta = EXCLUDED.codigo_papeleta,
            solicitante_nombres = EXCLUDED.solicitante_nombres,
            solicitante_apellidos = EXCLUDED.solicitante_apellidos,
            solicitante_area = EXCLUDED.solicitante_area,
            estado_original = EXCLUDED.estado_original,
            estado_virtual = EXCLUDED.estado_virtual,
            fecha_salida = EXCLUDED.fecha_salida,
            fecha_retorno = EXCLUDED.fecha_retorno,
            fecha_sincronizacion = NOW();
        `;
        
        await client.query(queryText, [
          external_id, codigo_papeleta, solicitante_nombres, 
          solicitante_apellidos, solicitante_dni, solicitante_area, motivo, 
          motivo_detalle, fecha_salida, fecha_retorno, 
          estado_original, estado_virtual
        ]);
      }

      await client.query('COMMIT');
      logger.info(`Sincronización completada. ${datosMongo.length} registros procesados/actualizados.`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error durante la sincronización de papeletas:', error);
  }
};

module.exports = { sincronizarPapeletas };

// Si se ejecuta este archivo directamente
if (require.main === module) {
  sincronizarPapeletas().then(async () => {
    try {
        await pool.end(); 
        console.log('Proceso finalizado correctamente');
    } catch (e) {
        console.error('Error cerrando conexiones', e);
    }
  });
}
