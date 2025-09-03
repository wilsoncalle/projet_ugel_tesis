/**
 * Repositorio para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todas las papeletas de salida con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Papeletas encontradas y total
 */
const findAll = async (options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    search = '',
    fechaInicio,
    fechaFin,
    personalId,
    motivoSalidaId
  } = options;
  
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        rs.id,
        rs.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        rs.motivo_salida_id,
        ms.nombre_motivo,
        rs.fecha_hora_salida,
        rs.fecha_hora_retorno_estimada,
        rs.fecha_hora_retorno_real,
        rs.observacion_salida,
        rs.usuario_registro_id,
        u.nombre_usuario as usuario_registro
      FROM RegistrosSalidaPersonal rs
      JOIN Personal p ON rs.personal_id = p.id
      JOIN MotivosSalidaPersonal ms ON rs.motivo_salida_id = ms.id
      JOIN Usuarios u ON rs.usuario_registro_id = u.id
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(
        p.nombres ILIKE $${paramCounter} OR 
        p.apellidos ILIKE $${paramCounter} OR 
        p.numero_documento ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por rango de fechas
    if (fechaInicio) {
      whereConditions.push(`rs.fecha_hora_salida >= $${paramCounter}`);
      queryParams.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereConditions.push(`rs.fecha_hora_salida <= $${paramCounter}`);
      queryParams.push(fechaFin);
      paramCounter++;
    }
    
    // Filtro por personal
    if (personalId) {
      whereConditions.push(`rs.personal_id = $${paramCounter}`);
      queryParams.push(personalId);
      paramCounter++;
    }
    
    // Filtro por motivo de salida
    if (motivoSalidaId) {
      whereConditions.push(`rs.motivo_salida_id = $${paramCounter}`);
      queryParams.push(motivoSalidaId);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosSalidaPersonal rs
      JOIN Personal p ON rs.personal_id = p.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY rs.fecha_hora_salida DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [papeletasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      papeletas: papeletasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando papeletas de salida:', error);
    throw new AppError('Error obteniendo papeletas de salida', 500);
  }
};

/**
 * Buscar papeletas de salida pendientes de retorno con paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Papeletas pendientes encontradas y total
 */
const findPendientes = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        rs.id,
        rs.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        rs.motivo_salida_id,
        ms.nombre_motivo,
        rs.fecha_hora_salida,
        rs.fecha_hora_retorno_estimada,
        rs.fecha_hora_retorno_real,
        rs.observacion_salida,
        rs.usuario_registro_id,
        u.nombre_usuario as usuario_registro
      FROM RegistrosSalidaPersonal rs
      JOIN Personal p ON rs.personal_id = p.id
      JOIN MotivosSalidaPersonal ms ON rs.motivo_salida_id = ms.id
      JOIN Usuarios u ON rs.usuario_registro_id = u.id
      WHERE rs.fecha_hora_retorno_real IS NULL
    `;
    
    // Agregar filtro de búsqueda si existe
    const queryParams = [];
    let paramCounter = 1;
    
    if (search) {
      query += ` AND (
        p.nombres ILIKE $${paramCounter} OR 
        p.apellidos ILIKE $${paramCounter} OR 
        p.numero_documento ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosSalidaPersonal rs
      JOIN Personal p ON rs.personal_id = p.id
      WHERE rs.fecha_hora_retorno_real IS NULL
      ${search ? `AND (
        p.nombres ILIKE $1 OR 
        p.apellidos ILIKE $1 OR 
        p.numero_documento ILIKE $1
      )` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY rs.fecha_hora_salida ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [papeletasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, search ? [`%${search}%`] : [])
    ]);
    
    return {
      papeletas: papeletasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando papeletas pendientes:', error);
    throw new AppError('Error obteniendo papeletas pendientes', 500);
  }
};

/**
 * Buscar papeletas pendientes por personal
 * @param {number} personalId - ID del personal
 * @returns {Array} Papeletas pendientes encontradas
 */
const findPendientesByPersonal = async (personalId) => {
  try {
    const query = `
      SELECT id
      FROM RegistrosSalidaPersonal
      WHERE personal_id = $1 AND fecha_hora_retorno_real IS NULL
    `;
    
    const result = await db.query(query, [personalId]);
    return result.rows;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando papeletas pendientes por personal ID ${personalId}:`, error);
    throw new AppError('Error obteniendo papeletas pendientes por personal', 500);
  }
};

/**
 * Buscar papeleta de salida por ID
 * @param {number} id - ID de la papeleta
 * @returns {Object|null} Papeleta encontrada o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        rs.id,
        rs.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        rs.motivo_salida_id,
        ms.nombre_motivo,
        rs.fecha_hora_salida,
        rs.fecha_hora_retorno_estimada,
        rs.fecha_hora_retorno_real,
        rs.observacion_salida,
        rs.usuario_registro_id,
        u.nombre_usuario as usuario_registro
      FROM RegistrosSalidaPersonal rs
      JOIN Personal p ON rs.personal_id = p.id
      JOIN MotivosSalidaPersonal ms ON rs.motivo_salida_id = ms.id
      JOIN Usuarios u ON rs.usuario_registro_id = u.id
      WHERE rs.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando papeleta por ID ${id}:`, error);
    throw new AppError('Error obteniendo papeleta de salida', 500);
  }
};

/**
 * Crear nueva papeleta de salida
 * @param {Object} papeletaData - Datos de la papeleta
 * @returns {Object} Papeleta creada
 */
const create = async (papeletaData) => {
  try {
    const { 
      personal_id, 
      motivo_salida_id, 
      fecha_hora_salida,
      fecha_hora_retorno_estimada,
      observacion_salida,
      usuario_registro_id
    } = papeletaData;
    
    const query = `
      INSERT INTO RegistrosSalidaPersonal (
        personal_id, 
        motivo_salida_id, 
        fecha_hora_salida,
        fecha_hora_retorno_estimada,
        observacion_salida,
        usuario_registro_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      personal_id, 
      motivo_salida_id, 
      fecha_hora_salida,
      fecha_hora_retorno_estimada,
      observacion_salida,
      usuario_registro_id
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando papeleta de salida', 500);
    }
    
    // Obtener la papeleta completa
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('personal_id')) {
        throw new AppError('Personal no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('motivo_salida_id')) {
        throw new AppError('Motivo de salida no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('usuario_registro_id')) {
        throw new AppError('Usuario de registro no encontrado', 404);
      }
    }
    
    logger.error('Error en repositorio creando papeleta de salida:', error);
    throw error instanceof AppError ? error : new AppError('Error creando papeleta de salida', 500);
  }
};

/**
 * Registrar retorno de papeleta de salida
 * @param {number} id - ID de la papeleta
 * @returns {Object} Papeleta actualizada
 */
const registrarRetorno = async (id) => {
  try {
    const query = `
      UPDATE RegistrosSalidaPersonal 
      SET fecha_hora_retorno_real = CURRENT_TIMESTAMP
      WHERE id = $1 AND fecha_hora_retorno_real IS NULL
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Papeleta no encontrada o ya tiene retorno registrado', 404);
    }
    
    // Obtener la papeleta actualizada
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio registrando retorno para papeleta ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando retorno', 500);
  }
};

/**
 * Anular papeleta de salida
 * @param {number} id - ID de la papeleta
 * @returns {boolean} True si se anuló correctamente
 */
const anular = async (id) => {
  try {
    const query = `
      DELETE FROM RegistrosSalidaPersonal
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Papeleta de salida no encontrada', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio anulando papeleta ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error anulando papeleta', 500);
  }
};

/**
 * Obtener estadísticas de papeletas de salida
 * @param {string} fechaInicio - Fecha de inicio para el filtro
 * @param {string} fechaFin - Fecha de fin para el filtro
 * @returns {Object} Estadísticas de papeletas
 */
const getEstadisticas = async (fechaInicio, fechaFin) => {
  try {
    // Construir las condiciones de fecha
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha_hora_salida >= $${paramCounter++}`);
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      whereCondition.push(`fecha_hora_salida <= $${paramCounter++}`);
      params.push(fechaFin);
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Estadísticas totales
    const totalQuery = `
      SELECT 
        COUNT(*) as total_papeletas,
        COUNT(CASE WHEN fecha_hora_retorno_real IS NULL THEN 1 END) as pendientes,
        COUNT(CASE WHEN fecha_hora_retorno_real IS NOT NULL THEN 1 END) as retornadas
      FROM RegistrosSalidaPersonal
      ${whereClause}
    `;
    
    // Papeletas por motivo
    const motivoQuery = `
      SELECT 
        m.id,
        m.nombre_motivo,
        COUNT(*) as total
      FROM RegistrosSalidaPersonal rs
      JOIN MotivosSalidaPersonal m ON rs.motivo_salida_id = m.id
      ${whereClause}
      GROUP BY m.id, m.nombre_motivo
      ORDER BY total DESC
    `;
    
    // Papeletas por día
    const diaQuery = `
      SELECT 
        DATE(fecha_hora_salida) as fecha,
        COUNT(*) as total
      FROM RegistrosSalidaPersonal
      ${whereClause}
      GROUP BY DATE(fecha_hora_salida)
      ORDER BY fecha
    `;
    
    // Ejecutar consultas en paralelo
    const [totalResult, motivoResult, diaResult] = await Promise.all([
      db.query(totalQuery, params),
      db.query(motivoQuery, params),
      db.query(diaQuery, params)
    ]);
    
    return {
      total_papeletas: parseInt(totalResult.rows[0]?.total_papeletas || 0),
      pendientes: parseInt(totalResult.rows[0]?.pendientes || 0),
      retornadas: parseInt(totalResult.rows[0]?.retornadas || 0),
      papeletas_por_motivo: motivoResult.rows,
      papeletas_por_dia: diaResult.rows
    };
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas de papeletas:', error);
    throw new AppError('Error obteniendo estadísticas de papeletas', 500);
  }
};

module.exports = {
  findAll,
  findPendientes,
  findPendientesByPersonal,
  findById,
  create,
  registrarRetorno,
  anular,
  getEstadisticas
};
