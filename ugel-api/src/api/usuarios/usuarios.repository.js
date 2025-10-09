/**
 * Repositorio para gestión de usuarios
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los usuarios con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Usuarios encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo, rol } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        id,
        nombre_usuario,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(nombre_usuario ILIKE $${paramCounter} OR email ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar usuarios activos
      whereConditions.push(`activo = $${paramCounter}`);
      queryParams.push(true);
      paramCounter++;
    }
    
    // Filtro por rol
    if (rol) {
      whereConditions.push(`rol = $${paramCounter}`);
      queryParams.push(rol);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Usuarios
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY nombre_usuario ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [usuariosResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      usuarios: usuariosResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando usuarios:', error);
    throw new AppError('Error obteniendo usuarios', 500);
  }
};

/**
 * Buscar usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando usuario por ID ${id}:`, error);
    throw new AppError('Error obteniendo usuario', 500);
  }
};

/**
 * Buscar usuario por nombre de usuario
 * @param {string} nombreUsuario - Nombre de usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findByUsername = async (nombreUsuario) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios 
      WHERE LOWER(nombre_usuario) = LOWER($1)
    `;
    
    const result = await db.query(query, [nombreUsuario]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando usuario por nombre ${nombreUsuario}:`, error);
    throw new AppError('Error obteniendo usuario', 500);
  }
};

/**
 * Buscar usuario por email
 * @param {string} email - Email
 * @returns {Object|null} Usuario encontrado o null
 */
const findByEmail = async (email) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios 
      WHERE LOWER(email) = LOWER($1)
    `;
    
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando usuario por email ${email}:`, error);
    throw new AppError('Error obteniendo usuario', 500);
  }
};

/**
 * Buscar usuario por nombre de usuario o email
 * @param {string} nombreUsuario - Nombre de usuario
 * @param {string} email - Email
 * @returns {Object|null} Usuario encontrado o null
 */
const findByUsernameOrEmail = async (nombreUsuario, email) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_usuario,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios 
      WHERE LOWER(nombre_usuario) = LOWER($1) OR LOWER(email) = LOWER($2)
    `;
    
    const result = await db.query(query, [nombreUsuario, email]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando usuario por nombre o email:`, error);
    throw new AppError('Error obteniendo usuario', 500);
  }
};

/**
 * Crear nuevo usuario
 * @param {Object} usuarioData - Datos del usuario
 * @returns {Object} Usuario creado
 */
const create = async (usuarioData) => {
  try {
    const { nombre_usuario, hash_contrasena, email, rol, activo = true } = usuarioData;
    
    const query = `
      INSERT INTO Usuarios (nombre_usuario, hash_contrasena, email, rol, activo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
    `;
    
    const result = await db.query(query, [nombre_usuario, hash_contrasena, email, rol, activo]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando usuario', 500);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      if (error.constraint && error.constraint.includes('nombre_usuario')) {
        throw new AppError('El nombre de usuario ya está en uso', 409);
      }
      if (error.constraint && error.constraint.includes('email')) {
        throw new AppError('El email ya está registrado', 409);
      }
    }
    
    logger.error('Error en repositorio creando usuario:', error);
    throw error instanceof AppError ? error : new AppError('Error creando usuario', 500);
  }
};

/**
 * Actualizar usuario existente
 * @param {number} id - ID del usuario
 * @param {Object} usuarioData - Datos a actualizar
 * @returns {Object} Usuario actualizado
 */
const update = async (id, usuarioData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (usuarioData.nombre_usuario !== undefined) {
      updateFields.push(`nombre_usuario = $${paramCounter++}`);
      queryParams.push(usuarioData.nombre_usuario);
    }
    
    if (usuarioData.email !== undefined) {
      updateFields.push(`email = $${paramCounter++}`);
      queryParams.push(usuarioData.email);
    }
    
    if (usuarioData.rol !== undefined) {
      updateFields.push(`rol = $${paramCounter++}`);
      queryParams.push(usuarioData.rol);
    }
    
    if (usuarioData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(usuarioData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentUsuario = await findById(id);
      return currentUsuario;
    }
    
    const query = `
      UPDATE Usuarios 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    return result.rows[0];
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      if (error.constraint && error.constraint.includes('nombre_usuario')) {
        throw new AppError('El nombre de usuario ya está en uso', 409);
      }
      if (error.constraint && error.constraint.includes('email')) {
        throw new AppError('El email ya está registrado', 409);
      }
    }
    
    logger.error(`Error en repositorio actualizando usuario ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando usuario', 500);
  }
};

/**
 * Actualizar contraseña de usuario
 * @param {number} id - ID del usuario
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {boolean} True si se actualizó correctamente
 */
const updatePassword = async (id, hashedPassword) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET hash_contrasena = $1
      WHERE id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [hashedPassword, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando contraseña para usuario ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando contraseña', 500);
  }
};

/**
 * Eliminar usuario (soft delete)
 * @param {number} id - ID del usuario
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando usuario ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando usuario', 500);
  }
};

/**
 * Contar usuarios por rol
 * @param {string} rol - Rol a contar
 * @returns {number} Cantidad de usuarios activos con ese rol
 */
const countByRole = async (rol) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM Usuarios
      WHERE rol = $1 AND activo = true
    `;
    
    const result = await db.query(query, [rol]);
    return parseInt(result.rows[0].count);
    
  } catch (error) {
    logger.error(`Error en repositorio contando usuarios por rol ${rol}:`, error);
    throw new AppError('Error contando usuarios', 500);
  }
};

/**
 * Buscar usuarios eliminados (soft delete)
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Usuarios eliminados y total
 */
const findDeleted = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    const whereConditions = ['activo = false'];
    const queryParams = [];
    let paramCounter = 1;
    
    if (search) {
      whereConditions.push(`(nombre_usuario ILIKE $${paramCounter} OR email ILIKE $${paramCounter})`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Usuarios
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const query = `
      SELECT 
        id,
        nombre_usuario,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY nombre_usuario ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    queryParams.push(limit, offset);
    
    const [usuariosResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      usuarios: Array.isArray(usuariosResult?.rows) ? usuariosResult.rows : [],
      total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando usuarios eliminados:', error);
    throw new AppError('Error obteniendo usuarios eliminados', 500);
  }
};

/**
 * Buscar usuario por ID incluyendo eliminados
 * @param {number} id - ID del usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findByIdIncludingDeleted = async (id) => {
  try {
    const query = `
      SELECT 
        id,
        nombre_usuario,
        email,
        rol,
        activo,
        fecha_creacion
      FROM Usuarios 
      WHERE id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando usuario por ID (incluyendo eliminados) ${id}:`, error);
    throw new AppError('Error obteniendo usuario', 500);
  }
};

/**
 * Restaurar usuario eliminado
 * @param {number} id - ID del usuario
 * @returns {Object} Usuario restaurado
 */
const restore = async (id) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET activo = true
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    return await findByIdIncludingDeleted(id);
    
  } catch (error) {
    logger.error(`Error en repositorio restaurando usuario ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error restaurando usuario', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByUsername,
  findByEmail,
  findByUsernameOrEmail,
  create,
  update,
  updatePassword,
  softDelete,
  countByRole,
  findDeleted,
  findByIdIncludingDeleted,
  restore
};
