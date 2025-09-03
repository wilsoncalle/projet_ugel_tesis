/**
 * Repositorio para gestión de motivos de visita
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los motivos de visita con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Motivos de visita encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        id,
        nombre_motivo,
        activo
      FROM MotivosVisita
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`nombre_motivo ILIKE $${paramCounter}`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar motivos de visita activos
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(true);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM MotivosVisita
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY nombre_motivo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [motivosVisitaResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      motivosVisita: motivosVisitaResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando motivos de visita:', error);
    throw new AppError('Error obteniendo motivos de visita', 500);
  }
};

/**
 * Buscar motivo de visita por ID
 * @param {number} id - ID del motivo de visita
 * @returns {Object|null} Motivo de visita encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo,
        activo
      FROM MotivosVisita 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando motivo de visita por ID ${id}:`, error);
    throw new AppError('Error obteniendo motivo de visita', 500);
  }
};

/**
 * Buscar motivo de visita por nombre
 * @param {string} nombre - Nombre del motivo de visita
 * @returns {Object|null} Motivo de visita encontrado o null
 */
const findByName = async (nombre) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo,
        activo
      FROM MotivosVisita 
      WHERE LOWER(nombre_motivo) = LOWER($1)
    `;
    
    const result = await db.query(query, [nombre]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando motivo de visita por nombre ${nombre}:`, error);
    throw new AppError('Error obteniendo motivo de visita', 500);
  }
};

/**
 * Crear nuevo motivo de visita
 * @param {Object} motivoVisitaData - Datos del motivo de visita
 * @returns {Object} Motivo de visita creado
 */
const create = async (motivoVisitaData) => {
  try {
    const { nombre_motivo, activo = true } = motivoVisitaData;
    
    const query = `
      INSERT INTO MotivosVisita (nombre_motivo, activo)
      VALUES ($1, $2)
      RETURNING 
        id,
        nombre_motivo,
        activo
    `;
    
    const result = await db.query(query, [nombre_motivo, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando motivo de visita', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un motivo de visita con este nombre', 409);
    }
    
    logger.error('Error en repositorio creando motivo de visita:', error);
    throw error instanceof AppError ? error : new AppError('Error creando motivo de visita', 500);
  }
};

/**
 * Actualizar motivo de visita existente
 * @param {number} id - ID del motivo de visita
 * @param {Object} motivoVisitaData - Datos a actualizar
 * @returns {Object} Motivo de visita actualizado
 */
const update = async (id, motivoVisitaData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (motivoVisitaData.nombre_motivo !== undefined) {
      updateFields.push(`nombre_motivo = $${paramCounter++}`);
      queryParams.push(motivoVisitaData.nombre_motivo);
    }
    
    if (motivoVisitaData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(motivoVisitaData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentMotivoVisita = await findById(id);
      return currentMotivoVisita;
    }
    
    const query = `
      UPDATE MotivosVisita 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_motivo,
        activo
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un motivo de visita con este nombre', 409);
    }
    
    logger.error(`Error en repositorio actualizando motivo de visita ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando motivo de visita', 500);
  }
};

/**
 * Eliminar motivo de visita (soft delete)
 * @param {number} id - ID del motivo de visita
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE MotivosVisita 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando motivo de visita ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando motivo de visita', 500);
  }
};

/**
 * Verificar si un motivo de visita está siendo usado
 * @param {number} id - ID del motivo de visita
 * @returns {boolean} True si el motivo de visita está en uso
 */
const checkMotivoVisitaInUse = async (id) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM RegistrosVisitas
      WHERE motivo_visita_id = $1
    `;
    
    const result = await db.query(query, [id]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de motivo de visita ID ${id}:`, error);
    throw new AppError('Error verificando uso del motivo de visita', 500);
  }
};

/**
 * Obtener listado simple de motivos de visita activos
 * @returns {Array} Lista de motivos de visita activos
 */
const getActiveMotivosVisitaList = async () => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo
      FROM MotivosVisita 
      WHERE activo = true
      ORDER BY nombre_motivo ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de motivos de visita activos:', error);
    throw new AppError('Error obteniendo motivos de visita', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  checkMotivoVisitaInUse,
  getActiveMotivosVisitaList
};
