/**
 * Repositorio para gestión de áreas de destino
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todas las áreas con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Áreas encontradas y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        id,
        nombre_area,
        activa
      FROM AreasDestino
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`nombre_area ILIKE $${paramCounter}`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activas
    if (activo !== undefined) {
      whereConditions.push(`activa = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar áreas activas
      whereConditions.push(`activa = $${paramCounter}`);
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
      FROM AreasDestino
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY nombre_area ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [areasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      areas: areasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando áreas:', error);
    throw new AppError('Error obteniendo áreas', 500);
  }
};

/**
 * Buscar área por ID
 * @param {number} id - ID del área
 * @returns {Object|null} Área encontrada o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_area,
        activa
      FROM AreasDestino 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando área por ID ${id}:`, error);
    throw new AppError('Error obteniendo área', 500);
  }
};

/**
 * Buscar área por nombre
 * @param {string} nombre - Nombre del área
 * @returns {Object|null} Área encontrada o null
 */
const findByName = async (nombre) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_area,
        activa
      FROM AreasDestino 
      WHERE LOWER(nombre_area) = LOWER($1)
      AND activa = true
    `;
    
    const result = await db.query(query, [nombre]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando área por nombre ${nombre}:`, error);
    throw new AppError('Error obteniendo área', 500);
  }
};

/**
 * Crear nueva área
 * @param {Object} areaData - Datos del área
 * @returns {Object} Área creada
 */
const create = async (areaData) => {
  try {
    const { nombre_area, activa = true } = areaData;
    
    const query = `
      INSERT INTO AreasDestino (nombre_area, activa)
      VALUES ($1, $2)
      RETURNING 
        id,
        nombre_area,
        activa
    `;
    
    const result = await db.query(query, [nombre_area, activa]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando área', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un área con este nombre', 409);
    }
    
    logger.error('Error en repositorio creando área:', error);
    throw error instanceof AppError ? error : new AppError('Error creando área', 500);
  }
};

/**
 * Actualizar área existente
 * @param {number} id - ID del área
 * @param {Object} areaData - Datos a actualizar
 * @returns {Object} Área actualizada
 */
const update = async (id, areaData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (areaData.nombre_area !== undefined) {
      updateFields.push(`nombre_area = $${paramCounter++}`);
      queryParams.push(areaData.nombre_area);
    }
    
    if (areaData.activa !== undefined) {
      updateFields.push(`activa = $${paramCounter++}`);
      queryParams.push(areaData.activa);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentArea = await findById(id);
      return currentArea;
    }
    
    const query = `
      UPDATE AreasDestino 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_area,
        activa
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Área no encontrada', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un área con este nombre', 409);
    }
    
    logger.error(`Error en repositorio actualizando área ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando área', 500);
  }
};

/**
 * Eliminar área (soft delete)
 * @param {number} id - ID del área
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE AreasDestino 
      SET activa = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Área no encontrada', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando área ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando área', 500);
  }
};

/**
 * Verificar si un área está siendo usada por personal activo
 * @param {number} id - ID del área
 * @returns {boolean} True si el área está en uso
 */
const checkAreaInUse = async (id) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM Personal
      WHERE area_destino_id = $1 AND activo = true
    `;
    
    const result = await db.query(query, [id]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de área ID ${id}:`, error);
    throw new AppError('Error verificando uso del área', 500);
  }
};

/**
 * Obtener listado simple de áreas activas
 * @returns {Array} Lista de áreas activas
 */
const getActiveAreasList = async () => {
  try {
    const query = `
      SELECT 
        id,
        nombre_area
      FROM AreasDestino 
      WHERE activa = true
      ORDER BY nombre_area ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de áreas activas:', error);
    throw new AppError('Error obteniendo áreas', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  checkAreaInUse,
  getActiveAreasList
};
