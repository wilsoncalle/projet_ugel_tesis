/**
 * Repositorio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los registros de asistencia con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Registros de asistencia encontrados y total
 */
const findAll = async (options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    search = '',
    fecha,
    fechaInicio,
    fechaFin,
    personalId,
    estadoPresencia
  } = options;
  
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        ca.id,
        ca.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        a.nombre_area as area_nombre,
        ca.fecha,
        ca.hora_ingreso,
        ca.hora_salida,
        ca.estado_presencia,
        ca.usuario_registro_id,
        u.nombre_usuario as usuario_registro,
        ca.fecha_registro
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      JOIN Usuarios u ON ca.usuario_registro_id = u.id
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
    
    // Filtro por fecha específica
    if (fecha) {
      whereConditions.push(`ca.fecha = $${paramCounter}`);
      queryParams.push(fecha);
      paramCounter++;
    }
    
    // Filtro por rango de fechas
    if (fechaInicio) {
      whereConditions.push(`ca.fecha >= $${paramCounter}`);
      queryParams.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereConditions.push(`ca.fecha <= $${paramCounter}`);
      queryParams.push(fechaFin);
      paramCounter++;
    }
    
    // Filtro por personal
    if (personalId) {
      whereConditions.push(`ca.personal_id = $${paramCounter}`);
      queryParams.push(personalId);
      paramCounter++;
    }
    
    // Filtro por estado de presencia
    if (estadoPresencia) {
      whereConditions.push(`ca.estado_presencia = $${paramCounter}`);
      queryParams.push(estadoPresencia);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY ca.fecha DESC, p.apellidos ASC, p.nombres ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [asistenciasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      asistencias: asistenciasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando registros de asistencia:', error);
    throw new AppError('Error obteniendo registros de asistencia', 500);
  }
};

/**
 * Buscar registro de asistencia por ID
 * @param {number} id - ID del registro de asistencia
 * @returns {Object|null} Registro de asistencia encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        ca.id,
        ca.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        a.nombre_area as area_nombre,
        ca.fecha,
        ca.hora_ingreso,
        ca.hora_salida,
        ca.estado_presencia,
        ca.usuario_registro_id,
        u.nombre_usuario as usuario_registro,
        ca.fecha_registro
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      JOIN Usuarios u ON ca.usuario_registro_id = u.id
      WHERE ca.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando registro de asistencia por ID ${id}:`, error);
    throw new AppError('Error obteniendo registro de asistencia', 500);
  }
};

/**
 * Buscar registro de asistencia por personal y fecha
 * @param {number} personalId - ID del personal
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object|null} Registro de asistencia encontrado o null
 */
const findByPersonalAndFecha = async (personalId, fecha) => {
  try {
    const query = `
      SELECT 
        id,
        personal_id,
        fecha,
        hora_ingreso,
        hora_salida,
        estado_presencia,
        usuario_registro_id,
        fecha_registro
      FROM ControlAsistenciaPersonal
      WHERE personal_id = $1 AND fecha = $2
    `;
    
    const result = await db.query(query, [personalId, fecha]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando registro de asistencia para personal ID ${personalId} en fecha ${fecha}:`, error);
    throw new AppError('Error obteniendo registro de asistencia', 500);
  }
};

/**
 * Crear nuevo registro de asistencia
 * @param {Object} asistenciaData - Datos del registro de asistencia
 * @returns {Object} Registro de asistencia creado
 */
const create = async (asistenciaData) => {
  try {
    const { 
      personal_id, 
      fecha, 
      hora_ingreso,
      hora_salida,
      estado_presencia,
      usuario_registro_id
    } = asistenciaData;
    
    const query = `
      INSERT INTO ControlAsistenciaPersonal (
        personal_id, 
        fecha, 
        hora_ingreso,
        hora_salida,
        estado_presencia,
        usuario_registro_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      personal_id, 
      fecha, 
      hora_ingreso,
      hora_salida,
      estado_presencia,
      usuario_registro_id
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando registro de asistencia', 500);
    }
    
    // Obtener el registro completo
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un registro de asistencia para este personal en esta fecha', 409);
    }
    
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('personal_id')) {
        throw new AppError('Personal no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('usuario_registro_id')) {
        throw new AppError('Usuario de registro no encontrado', 404);
      }
    }
    
    logger.error('Error en repositorio creando registro de asistencia:', error);
    throw error instanceof AppError ? error : new AppError('Error creando registro de asistencia', 500);
  }
};

/**
 * Actualizar hora de ingreso de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} horaIngreso - Hora de ingreso en formato HH:MM:SS
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que actualiza
 * @returns {Object} Registro de asistencia actualizado
 */
const updateIngreso = async (id, horaIngreso, estadoPresencia, usuarioId) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET 
        hora_ingreso = $1,
        estado_presencia = $2,
        usuario_registro_id = $3
      WHERE id = $4
      RETURNING id
    `;
    
    const result = await db.query(query, [horaIngreso, estadoPresencia, usuarioId, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando ingreso para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando ingreso', 500);
  }
};

/**
 * Actualizar hora de salida de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Registro de asistencia actualizado
 */
const updateSalida = async (id, horaSalida) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET hora_salida = $1
      WHERE id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [horaSalida, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando salida para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando salida', 500);
  }
};

/**
 * Actualizar estado de presencia de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que actualiza
 * @returns {Object} Registro de asistencia actualizado
 */
const updateEstadoPresencia = async (id, estadoPresencia, usuarioId) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET 
        estado_presencia = $1,
        usuario_registro_id = $2
      WHERE id = $3
      RETURNING id
    `;
    
    const result = await db.query(query, [estadoPresencia, usuarioId, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando estado de presencia para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando estado de presencia', 500);
  }
};

/**
 * Obtener estadísticas de asistencia
 * @param {string} fechaInicio - Fecha de inicio para el filtro
 * @param {string} fechaFin - Fecha de fin para el filtro
 * @returns {Object} Estadísticas de asistencia
 */
const getEstadisticas = async (fechaInicio, fechaFin) => {
  try {
    // Construir las condiciones de fecha
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha >= $${paramCounter++}`);
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      whereCondition.push(`fecha <= $${paramCounter++}`);
      params.push(fechaFin);
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Estadísticas por estado de presencia
    const estadoQuery = `
      SELECT 
        estado_presencia,
        COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      GROUP BY estado_presencia
      ORDER BY total DESC
    `;
    
    // Estadísticas por día
    const diaQuery = `
      SELECT 
        fecha,
        COUNT(*) as total,
        COUNT(CASE WHEN estado_presencia = 'Presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN estado_presencia = 'Ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN estado_presencia = 'Tardanza' THEN 1 END) as tardanzas,
        COUNT(CASE WHEN estado_presencia = 'Falta' THEN 1 END) as faltas
      FROM ControlAsistenciaPersonal
      ${whereClause}
      GROUP BY fecha
      ORDER BY fecha DESC
    `;
    
    // Estadísticas por área
    const areaQuery = `
      SELECT 
        a.nombre_area,
        COUNT(*) as total,
        COUNT(CASE WHEN ca.estado_presencia = 'Presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN ca.estado_presencia = 'Ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN ca.estado_presencia = 'Tardanza' THEN 1 END) as tardanzas,
        COUNT(CASE WHEN ca.estado_presencia = 'Falta' THEN 1 END) as faltas
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      ${whereClause}
      GROUP BY a.nombre_area
      ORDER BY total DESC
    `;
    
    // Ejecutar consultas en paralelo
    const [estadoResult, diaResult, areaResult] = await Promise.all([
      db.query(estadoQuery, params),
      db.query(diaQuery, params),
      db.query(areaQuery, params)
    ]);
    
    return {
      por_estado: estadoResult.rows,
      por_dia: diaResult.rows,
      por_area: areaResult.rows
    };
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas de asistencia:', error);
    throw new AppError('Error obteniendo estadísticas de asistencia', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByPersonalAndFecha,
  create,
  updateIngreso,
  updateSalida,
  updateEstadoPresencia,
  getEstadisticas
};
