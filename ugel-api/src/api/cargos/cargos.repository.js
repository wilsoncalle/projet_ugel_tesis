/**
 * Repositorio para gestión de cargos
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los cargos con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Cargos encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo, areaDestinoId } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        c.id,
        c.nombre_cargo,
        c.descripcion,
        c.activo,
        c.fecha_creacion
      FROM Cargos c
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(
        c.nombre_cargo ILIKE $${paramCounter} OR 
        c.descripcion ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`c.activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar cargos activos
      whereConditions.push(`c.activo = $${paramCounter}`);
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
      FROM Cargos c
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY c.nombre_cargo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [cargosResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      cargos: cargosResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando cargos:', error);
    throw new AppError('Error obteniendo cargos', 500);
  }
};

/**
 * Buscar cargo por ID
 * @param {number} id - ID del cargo
 * @returns {Object|null} Cargo encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre_cargo,
        c.descripcion,
        c.activo,
        c.fecha_creacion
      FROM Cargos c
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando cargo por ID ${id}:`, error);
    throw new AppError('Error obteniendo cargo', 500);
  }
};

/**
 * Buscar cargo por nombre
 * @param {string} nombre - Nombre del cargo
 * @returns {Object|null} Cargo encontrado o null
 */
const findByName = async (nombre) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre_cargo,
        c.descripcion,
        c.activo,
        c.fecha_creacion
      FROM Cargos c
      WHERE LOWER(c.nombre_cargo) = LOWER($1)
      AND c.activo = true
    `;
    
    const result = await db.query(query, [nombre]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando cargo por nombre ${nombre}:`, error);
    throw new AppError('Error obteniendo cargo', 500);
  }
};

/**
 * Crear nuevo cargo
 * @param {Object} cargoData - Datos del cargo
 * @returns {Object} Cargo creado
 */
const create = async (cargoData) => {
  try {
    const { nombre_cargo, descripcion, activo = true } = cargoData;
    
    const query = `
      INSERT INTO Cargos (nombre_cargo, descripcion, activo)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        nombre_cargo,
        descripcion,
        activo,
        fecha_creacion
    `;
    
    const result = await db.query(query, [nombre_cargo, descripcion, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando cargo', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un cargo con este nombre', 409);
    }
    
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('area_destino_id')) {
        throw new AppError('Área de destino no encontrada', 404);
      }
    }
    
    logger.error('Error en repositorio creando cargo:', error);
    throw error instanceof AppError ? error : new AppError('Error creando cargo', 500);
  }
};

/**
 * Actualizar cargo existente
 * @param {number} id - ID del cargo
 * @param {Object} cargoData - Datos a actualizar
 * @returns {Object} Cargo actualizado
 */
const update = async (id, cargoData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (cargoData.nombre_cargo !== undefined) {
      updateFields.push(`nombre_cargo = $${paramCounter++}`);
      queryParams.push(cargoData.nombre_cargo);
    }
    
    if (cargoData.descripcion !== undefined) {
      updateFields.push(`descripcion = $${paramCounter++}`);
      queryParams.push(cargoData.descripcion);
    }
    

    
    if (cargoData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(cargoData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentCargo = await findById(id);
      return currentCargo;
    }
    
    const query = `
      UPDATE Cargos 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_cargo,
        descripcion,
        activo,
        fecha_creacion
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un cargo con este nombre', 409);
    }
    

    
    logger.error(`Error en repositorio actualizando cargo ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando cargo', 500);
  }
};

/**
 * Eliminar cargo (soft delete)
 * @param {number} id - ID del cargo
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE Cargos 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando cargo ID ${id}:`, error);
    throw new AppError('Error eliminando cargo', 500);
  }
};

/**
 * Verificar si un cargo está siendo usada por personal activo
 * @param {number} id - ID del cargo
 * @returns {boolean} True si el cargo está en uso
 */
const checkCargoInUse = async (id) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM Personal
      WHERE cargo_id = $1 AND activo = true
    `;
    
    const result = await db.query(query, [id]);
    return parseInt(result.rows[0].count) > 0;
    
  } catch (error) {
    logger.error(`Error verificando uso de cargo ID ${id}:`, error);
    throw new AppError('Error verificando uso del cargo', 500);
  }
};

/**
 * Obtener listado simple de cargos activos
 * @returns {Array} Lista de cargos activos
 */
const getActiveCargosList = async () => {
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre_cargo
      FROM Cargos c
      WHERE c.activo = true
      ORDER BY c.nombre_cargo ASC
    `;
    
    const result = await db.query(query, []);
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo lista de cargos activos:', error);
    throw new AppError('Error obteniendo cargos', 500);
  }
};



/**
 * Buscar cargos eliminados (soft delete)
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Cargos eliminados y total
 */
const findDeleted = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base para cargos eliminados
    const whereConditions = ['c.activo = false'];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`c.nombre_cargo ILIKE $${paramCounter}`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Cargos c

      WHERE ${whereConditions.join(' AND ')}
    `;
    
    // Consulta principal
    const query = `
      SELECT 
        c.id,
        c.nombre_cargo,
        c.descripcion,
        c.activo,
        c.fecha_creacion
      FROM Cargos c
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.nombre_cargo ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [cargosResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      cargos: Array.isArray(cargosResult?.rows) ? cargosResult.rows : [],
      total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando cargos eliminados:', error);
    throw new AppError('Error obteniendo cargos eliminados', 500);
  }
};

/**
 * Buscar cargo por ID incluyendo eliminados
 * @param {number} id - ID del cargo
 * @returns {Object|null} Cargo encontrado o null
 */
const findByIdIncludingDeleted = async (id) => {
  try {
    const query = `
      SELECT 
        c.id,
        c.nombre_cargo,
        c.descripcion,
        c.activo,
        c.fecha_creacion
      FROM Cargos c
      WHERE c.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando cargo por ID (incluyendo eliminados) ${id}:`, error);
    throw new AppError('Error obteniendo cargo', 500);
  }
};

/**
 * Restaurar cargo eliminado
 * @param {number} id - ID del cargo
 * @returns {Object} Cargo restaurado
 */
const restore = async (id) => {
  try {
    const query = `
      UPDATE Cargos 
      SET activo = true
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    // Obtener el cargo restaurado completo
    return await findByIdIncludingDeleted(id);
    
  } catch (error) {
    logger.error(`Error en repositorio restaurando cargo ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error restaurando cargo', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  checkCargoInUse,
  getActiveCargosList,

  findDeleted,
  findByIdIncludingDeleted,
  restore
};
