/**
 * Repositorio para autenticación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar usuario por nombre de usuario
 * @param {string} nombreUsuario - Nombre de usuario
 * @returns {Object|null} Usuario encontrado o null
 */
const findByUsername = async (nombreUsuario) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.nombre_usuario,
        u.hash_contrasena,
        u.email,
        u.rol,
        u.activo,
        u.fecha_creacion,
        u.intentos_fallidos,
        u.bloqueado_hasta,
        u.personal_id,
        u.ultimo_intento_fallido
      FROM Usuarios u
      WHERE u.nombre_usuario = $1
    `;
    
    const result = await db.query(query, [nombreUsuario]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error('Error buscando usuario por nombre de usuario:', error);
    // Expose the database error message for debugging
    throw new AppError(`Error de base de datos: ${error.message}`, 500);
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
        u.id,
        u.nombre_usuario,
        u.hash_contrasena,
        u.email,
        u.rol,
        u.activo,
        u.fecha_creacion,
        u.personal_id
      FROM Usuarios u
      WHERE u.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error('Error buscando usuario por ID:', error);
    throw new AppError('Error interno del servidor', 500);
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
        u.id,
        u.nombre_usuario,
        u.email,
        u.rol,
        u.activo,
        u.fecha_creacion,
        u.personal_id
      FROM Usuarios u
      WHERE u.nombre_usuario = $1 OR u.email = $2
    `;
    
    const result = await db.query(query, [nombreUsuario, email]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error('Error buscando usuario por nombre de usuario o email:', error);
    throw new AppError('Error interno del servidor', 500);
  }
};

/**
 * Crear un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @returns {Object} Usuario creado
 */
const create = async (userData) => {
  try {
    const { nombre_usuario, hash_contrasena, email, rol } = userData;
    
    const query = `
      INSERT INTO Usuarios (nombre_usuario, hash_contrasena, email, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING 
        id,
        nombre_usuario,
        hash_contrasena,
        email,
        rol,
        activo,
        fecha_creacion
    `;
    
    const result = await db.query(query, [nombre_usuario, hash_contrasena, email, rol]);
    
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
    
    logger.error('Error creando usuario:', error);
    throw error instanceof AppError ? error : new AppError('Error interno del servidor', 500);
  }
};

/**
 * Actualizar contraseña de usuario
 * @param {number} userId - ID del usuario
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {boolean} True si se actualizó correctamente
 */
const updatePassword = async (userId, hashedPassword) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET hash_contrasena = $1
      WHERE id = $2 AND activo = true
    `;
    
    const result = await db.query(query, [hashedPassword, userId]);
    
    if (result.rowCount === 0) {
      throw new AppError('Usuario no encontrado o inactivo', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error('Error actualizando contraseña:', error);
    throw error instanceof AppError ? error : new AppError('Error interno del servidor', 500);
  }
};

/**
 * Actualizar último login del usuario
 * @param {number} userId - ID del usuario
 * @returns {boolean} True si se actualizó correctamente
 */
const updateLastLogin = async (userId) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET ultimo_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await db.query(query, [userId]);
    return true;
    
  } catch (error) {
    logger.error('Error actualizando último login:', error);
    // No lanzar error ya que es una operación secundaria
    return false;
  }
};

/**
 * Contar usuarios por rol
 * @param {string} rol - Rol a contar
 * @returns {number} Cantidad de usuarios
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
    logger.error('Error contando usuarios por rol:', error);
    throw new AppError('Error interno del servidor', 500);
  }
};

/**
 * Incrementar intentos fallidos
 * @param {number} userId - ID del usuario
 * @returns {number} Nuevos intentos fallidos
 */
const incrementFailedAttempts = async (userId) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET intentos_fallidos = intentos_fallidos + 1, ultimo_intento_fallido = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING intentos_fallidos
    `;
    
    const result = await db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      logger.error(`No se pudo incrementar intentos fallidos: Usuario ID ${userId} no encontrado para actualización`);
      // Si no se encuentra el usuario para actualizar, retornamos un valor alto para forzar bloqueo o manejarlo
      return 999; 
    }
    
    return result.rows[0].intentos_fallidos;
    
  } catch (error) {
    logger.error('Error incrementando intentos fallidos:', error);
    // No lanzar error 500 para no romper el flujo de login fallido, 
    // pero retornar un valor que indique fallo o simplemente 1
    return 1;
  }
};

/**
 * Resetear intentos fallidos
 * @param {number} userId - ID del usuario
 * @returns {boolean} True si se actualizó correctamente
 */
const resetFailedAttempts = async (userId) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE id = $1
    `;
    
    await db.query(query, [userId]);
    return true;
    
  } catch (error) {
    logger.error('Error reseteando intentos fallidos:', error);
    // No lanzar error crítico
    return false;
  }
};

/**
 * Bloquear usuario temporalmente
 * @param {number} userId - ID del usuario
 * @param {Date} lockoutUntil - Fecha hasta la cual bloquear
 * @returns {boolean} True si se actualizó correctamente
 */
const lockUser = async (userId, lockoutUntil) => {
  try {
    const query = `
      UPDATE Usuarios 
      SET bloqueado_hasta = $1
      WHERE id = $2
    `;
    
    await db.query(query, [lockoutUntil, userId]);
    return true;
    
  } catch (error) {
    logger.error('Error bloqueando usuario:', error);
    throw new AppError('Error interno del servidor', 500);
  }
};

module.exports = {
  findByUsername,
  findById,
  findByUsernameOrEmail,
  create,
  updatePassword,
  updateLastLogin,
  countByRole,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockUser
};
