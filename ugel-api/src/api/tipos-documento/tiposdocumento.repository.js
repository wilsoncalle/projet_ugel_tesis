/**
 * Repositorio para gestión de tipos de documento
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los tipos de documento con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Tipos de documento encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        id,
        codigo,
        nombre_completo,
        activo
      FROM TiposDocumento
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(codigo ILIKE $${paramCounter} OR nombre_completo ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar tipos de documento activos
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
      FROM TiposDocumento
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY codigo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [tiposDocumentoResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      tiposDocumento: tiposDocumentoResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando tipos de documento:', error);
    throw new AppError('Error obteniendo tipos de documento', 500);
  }
};

/**
 * Buscar tipo de documento por ID
 * @param {number} id - ID del tipo de documento
 * @returns {Object|null} Tipo de documento encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre_completo,
        activo
      FROM TiposDocumento 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando tipo de documento por ID ${id}:`, error);
    throw new AppError('Error obteniendo tipo de documento', 500);
  }
};

/**
 * Buscar tipo de documento por código
 * @param {string} codigo - Código del tipo de documento
 * @returns {Object|null} Tipo de documento encontrado o null
 */
const findByCode = async (codigo) => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre_completo,
        activo
      FROM TiposDocumento 
      WHERE LOWER(codigo) = LOWER($1)
    `;
    
    const result = await db.query(query, [codigo]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando tipo de documento por código ${codigo}:`, error);
    throw new AppError('Error obteniendo tipo de documento', 500);
  }
};

/**
 * Crear nuevo tipo de documento
 * @param {Object} tipoDocumentoData - Datos del tipo de documento
 * @returns {Object} Tipo de documento creado
 */
const create = async (tipoDocumentoData) => {
  try {
    const { codigo, nombre_completo, activo = true } = tipoDocumentoData;
    
    const query = `
      INSERT INTO TiposDocumento (codigo, nombre_completo, activo)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        codigo,
        nombre_completo,
        activo
    `;
    
    const result = await db.query(query, [codigo, nombre_completo, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando tipo de documento', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un tipo de documento con este código', 409);
    }
    
    logger.error('Error en repositorio creando tipo de documento:', error);
    throw error instanceof AppError ? error : new AppError('Error creando tipo de documento', 500);
  }
};

/**
 * Actualizar tipo de documento existente
 * @param {number} id - ID del tipo de documento
 * @param {Object} tipoDocumentoData - Datos a actualizar
 * @returns {Object} Tipo de documento actualizado
 */
const update = async (id, tipoDocumentoData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (tipoDocumentoData.codigo !== undefined) {
      updateFields.push(`codigo = $${paramCounter++}`);
      queryParams.push(tipoDocumentoData.codigo);
    }
    
    if (tipoDocumentoData.nombre_completo !== undefined) {
      updateFields.push(`nombre_completo = $${paramCounter++}`);
      queryParams.push(tipoDocumentoData.nombre_completo);
    }
    
    if (tipoDocumentoData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(tipoDocumentoData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentTipoDocumento = await findById(id);
      return currentTipoDocumento;
    }
    
    const query = `
      UPDATE TiposDocumento 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        codigo,
        nombre_completo,
        activo
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un tipo de documento con este código', 409);
    }
    
    logger.error(`Error en repositorio actualizando tipo de documento ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando tipo de documento', 500);
  }
};

/**
 * Eliminar tipo de documento (soft delete)
 * @param {number} id - ID del tipo de documento
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE TiposDocumento 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando tipo de documento ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando tipo de documento', 500);
  }
};

/**
 * Verificar si un tipo de documento está siendo usado
 * @param {number} id - ID del tipo de documento
 * @returns {boolean} True si el tipo de documento está en uso
 */
const checkTipoDocumentoInUse = async (id) => {
  try {
    // Verificar uso en visitantes
    const visitantesQuery = `
      SELECT COUNT(*) as count
      FROM Visitantes
      WHERE tipo_documento_id = $1
    `;
    
    // Verificar uso en personal
    const personalQuery = `
      SELECT COUNT(*) as count
      FROM Personal
      WHERE tipo_documento = (SELECT codigo FROM TiposDocumento WHERE id = $1)
    `;
    
    const [visitantesResult, personalResult] = await Promise.all([
      db.query(visitantesQuery, [id]),
      db.query(personalQuery, [id])
    ]);
    
    const visitantesCount = parseInt(visitantesResult.rows[0].count);
    const personalCount = parseInt(personalResult.rows[0].count);
    
    return visitantesCount > 0 || personalCount > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de tipo de documento ID ${id}:`, error);
    throw new AppError('Error verificando uso del tipo de documento', 500);
  }
};

/**
 * Obtener listado simple de tipos de documento activos
 * @returns {Array} Lista de tipos de documento activos
 */
const getActiveTiposDocumentoList = async () => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre_completo
      FROM TiposDocumento 
      WHERE activo = true
      ORDER BY codigo ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de tipos de documento activos:', error);
    throw new AppError('Error obteniendo tipos de documento', 500);
  }
};

/**
 * Buscar tipos de documento eliminados (soft delete)
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Tipos de documento eliminados y total
 */
const findDeleted = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    const whereConditions = ['activo = false'];
    const queryParams = [];
    let paramCounter = 1;
    
    if (search) {
      whereConditions.push(`(codigo ILIKE $${paramCounter} OR nombre_completo ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM TiposDocumento
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const query = `
      SELECT 
        id,
        codigo,
        nombre_completo,
        activo
      FROM TiposDocumento
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY codigo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const [tiposResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      tiposDocumento: Array.isArray(tiposResult?.rows) ? tiposResult.rows : [],
      total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando tipos de documento eliminados:', error);
    throw new AppError('Error obteniendo tipos de documento eliminados', 500);
  }
};

/**
 * Buscar tipo de documento por ID incluyendo eliminados
 * @param {number} id - ID del tipo de documento
 * @returns {Object|null} Tipo de documento encontrado o null
 */
const findByIdIncludingDeleted = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        codigo,
        nombre_completo,
        activo
      FROM TiposDocumento 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando tipo de documento por ID (incluyendo eliminados) ${id}:`, error);
    throw new AppError('Error obteniendo tipo de documento', 500);
  }
};

/**
 * Restaurar tipo de documento eliminado
 * @param {number} id - ID del tipo de documento
 * @returns {Object} Tipo de documento restaurado
 */
const restore = async (id) => {
  try {
    const query = `
      UPDATE TiposDocumento 
      SET activo = true
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    return await findByIdIncludingDeleted(id);
    
  } catch (error) {
    logger.error(`Error en repositorio restaurando tipo de documento ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error restaurando tipo de documento', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByCode,
  create,
  update,
  softDelete,
  checkTipoDocumentoInUse,
  getActiveTiposDocumentoList,
  findDeleted,
  findByIdIncludingDeleted,
  restore
};
