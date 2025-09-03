/**
 * Repositorio para gestión de motivos de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los motivos de salida con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Motivos de salida encontrados y total
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
      FROM MotivosSalidaPersonal
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
      // Por defecto, solo mostrar motivos de salida activos
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
      FROM MotivosSalidaPersonal
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
    const [motivosSalidaResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      motivosSalida: motivosSalidaResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando motivos de salida:', error);
    throw new AppError('Error obteniendo motivos de salida', 500);
  }
};

/**
 * Buscar motivo de salida por ID
 * @param {number} id - ID del motivo de salida
 * @returns {Object|null} Motivo de salida encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo,
        activo
      FROM MotivosSalidaPersonal 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando motivo de salida por ID ${id}:`, error);
    throw new AppError('Error obteniendo motivo de salida', 500);
  }
};

/**
 * Buscar motivo de salida por nombre
 * @param {string} nombre - Nombre del motivo de salida
 * @returns {Object|null} Motivo de salida encontrado o null
 */
const findByName = async (nombre) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo,
        activo
      FROM MotivosSalidaPersonal 
      WHERE LOWER(nombre_motivo) = LOWER($1)
    `;
    
    const result = await db.query(query, [nombre]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando motivo de salida por nombre ${nombre}:`, error);
    throw new AppError('Error obteniendo motivo de salida', 500);
  }
};

/**
 * Crear nuevo motivo de salida
 * @param {Object} motivoSalidaData - Datos del motivo de salida
 * @returns {Object} Motivo de salida creado
 */
const create = async (motivoSalidaData) => {
  try {
    const { nombre_motivo, activo = true } = motivoSalidaData;
    
    const query = `
      INSERT INTO MotivosSalidaPersonal (nombre_motivo, activo)
      VALUES ($1, $2)
      RETURNING 
        id,
        nombre_motivo,
        activo
    `;
    
    const result = await db.query(query, [nombre_motivo, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando motivo de salida', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un motivo de salida con este nombre', 409);
    }
    
    logger.error('Error en repositorio creando motivo de salida:', error);
    throw error instanceof AppError ? error : new AppError('Error creando motivo de salida', 500);
  }
};

/**
 * Actualizar motivo de salida existente
 * @param {number} id - ID del motivo de salida
 * @param {Object} motivoSalidaData - Datos a actualizar
 * @returns {Object} Motivo de salida actualizado
 */
const update = async (id, motivoSalidaData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (motivoSalidaData.nombre_motivo !== undefined) {
      updateFields.push(`nombre_motivo = $${paramCounter++}`);
      queryParams.push(motivoSalidaData.nombre_motivo);
    }
    
    if (motivoSalidaData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(motivoSalidaData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentMotivoSalida = await findById(id);
      return currentMotivoSalida;
    }
    
    const query = `
      UPDATE MotivosSalidaPersonal 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_motivo,
        activo
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un motivo de salida con este nombre', 409);
    }
    
    logger.error(`Error en repositorio actualizando motivo de salida ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando motivo de salida', 500);
  }
};

/**
 * Eliminar motivo de salida (soft delete)
 * @param {number} id - ID del motivo de salida
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE MotivosSalidaPersonal 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando motivo de salida ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando motivo de salida', 500);
  }
};

/**
 * Verificar si un motivo de salida está siendo usado
 * @param {number} id - ID del motivo de salida
 * @returns {boolean} True si el motivo de salida está en uso
 */
const checkMotivoSalidaInUse = async (id) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM RegistrosSalidaPersonal
      WHERE motivo_salida_id = $1
    `;
    
    const result = await db.query(query, [id]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de motivo de salida ID ${id}:`, error);
    throw new AppError('Error verificando uso del motivo de salida', 500);
  }
};

/**
 * Obtener listado simple de motivos de salida activos
 * @returns {Array} Lista de motivos de salida activos
 */
const getActiveMotivosSalidaList = async () => {
  try {
    const query = `
      SELECT 
        id,
        nombre_motivo
      FROM MotivosSalidaPersonal 
      WHERE activo = true
      ORDER BY nombre_motivo ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de motivos de salida activos:', error);
    throw new AppError('Error obteniendo motivos de salida', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  checkMotivoSalidaInUse,
  getActiveMotivosSalidaList
};
