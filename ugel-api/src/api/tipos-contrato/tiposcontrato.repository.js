/**
 * Repositorio para gestión de tipos de contrato
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los tipos de contrato con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Tipos de contrato encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        id,
        nombre_tipo,
        activo
      FROM TiposContrato
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`nombre_tipo ILIKE $${paramCounter}`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar tipos de contrato activos
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
      FROM TiposContrato
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY nombre_tipo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [tiposContratoResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      tiposContrato: tiposContratoResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando tipos de contrato:', error);
    throw new AppError('Error obteniendo tipos de contrato', 500);
  }
};

/**
 * Buscar tipo de contrato por ID
 * @param {number} id - ID del tipo de contrato
 * @returns {Object|null} Tipo de contrato encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_tipo,
        activo
      FROM TiposContrato 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando tipo de contrato por ID ${id}:`, error);
    throw new AppError('Error obteniendo tipo de contrato', 500);
  }
};

/**
 * Buscar tipo de contrato por nombre
 * @param {string} nombre - Nombre del tipo de contrato
 * @returns {Object|null} Tipo de contrato encontrado o null
 */
const findByName = async (nombre) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_tipo,
        activo
      FROM TiposContrato 
      WHERE LOWER(nombre_tipo) = LOWER($1)
    `;
    
    const result = await db.query(query, [nombre]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando tipo de contrato por nombre ${nombre}:`, error);
    throw new AppError('Error obteniendo tipo de contrato', 500);
  }
};

/**
 * Crear nuevo tipo de contrato
 * @param {Object} tipoContratoData - Datos del tipo de contrato
 * @returns {Object} Tipo de contrato creado
 */
const create = async (tipoContratoData) => {
  try {
    const { nombre_tipo, activo = true } = tipoContratoData;
    
    const query = `
      INSERT INTO TiposContrato (nombre_tipo, activo)
      VALUES ($1, $2)
      RETURNING 
        id,
        nombre_tipo,
        activo
    `;
    
    const result = await db.query(query, [nombre_tipo, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando tipo de contrato', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un tipo de contrato con este nombre', 409);
    }
    
    logger.error('Error en repositorio creando tipo de contrato:', error);
    throw error instanceof AppError ? error : new AppError('Error creando tipo de contrato', 500);
  }
};

/**
 * Actualizar tipo de contrato existente
 * @param {number} id - ID del tipo de contrato
 * @param {Object} tipoContratoData - Datos a actualizar
 * @returns {Object} Tipo de contrato actualizado
 */
const update = async (id, tipoContratoData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (tipoContratoData.nombre_tipo !== undefined) {
      updateFields.push(`nombre_tipo = $${paramCounter++}`);
      queryParams.push(tipoContratoData.nombre_tipo);
    }
    
    if (tipoContratoData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(tipoContratoData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentTipoContrato = await findById(id);
      return currentTipoContrato;
    }
    
    const query = `
      UPDATE TiposContrato 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_tipo,
        activo
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un tipo de contrato con este nombre', 409);
    }
    
    logger.error(`Error en repositorio actualizando tipo de contrato ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando tipo de contrato', 500);
  }
};

/**
 * Eliminar tipo de contrato (soft delete)
 * @param {number} id - ID del tipo de contrato
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE TiposContrato 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando tipo de contrato ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando tipo de contrato', 500);
  }
};

/**
 * Verificar si un tipo de contrato está siendo usado por personal activo
 * @param {number} id - ID del tipo de contrato
 * @returns {boolean} True si el tipo de contrato está en uso
 */
const checkTipoContratoInUse = async (id) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM Personal
      WHERE tipo_contrato_id = $1 AND activo = true
    `;
    
    const result = await db.query(query, [id]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de tipo de contrato ID ${id}:`, error);
    throw new AppError('Error verificando uso del tipo de contrato', 500);
  }
};

/**
 * Obtener listado simple de tipos de contrato activos
 * @returns {Array} Lista de tipos de contrato activos
 */
const getActiveTiposContratoList = async () => {
  try {
    const query = `
      SELECT 
        id,
        nombre_tipo
      FROM TiposContrato 
      WHERE activo = true
      ORDER BY nombre_tipo ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de tipos de contrato activos:', error);
    throw new AppError('Error obteniendo tipos de contrato', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  checkTipoContratoInUse,
  getActiveTiposContratoList
};
