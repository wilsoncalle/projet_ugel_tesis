/**
 * Servicio para gestión de usuarios
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const bcrypt = require('bcryptjs');
const repository = require('./usuarios.repository');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtener todos los usuarios con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Usuarios y datos de paginación
 */
const getAllUsuarios = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo, rol } = options;
  
  try {
    // Obtener usuarios con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined,
      rol
    });
    
    // Formatear respuesta
    return {
      usuarios: result.usuarios,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo usuarios:', error);
    throw error;
  }
};

/**
 * Obtener usuario por ID
 * @param {number} id - ID del usuario
 * @returns {Object} Usuario encontrado
 */
const getUsuarioById = async (id) => {
  try {
    const usuario = await repository.findById(id);
    
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    // Eliminar datos sensibles
    const { hash_contrasena, ...usuarioSinContrasena } = usuario;
    
    return usuarioSinContrasena;
    
  } catch (error) {
    logger.error(`Error obteniendo usuario ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo usuario
 * @param {Object} usuarioData - Datos del usuario
 * @param {number} creatorId - ID del usuario que crea
 * @returns {Object} Usuario creado
 */
const createUsuario = async (usuarioData, creatorId) => {
  try {
    const { nombreUsuario, email, contrasena, rol } = usuarioData;
    
    // Verificar si el usuario ya existe
    const existingUsuario = await repository.findByUsernameOrEmail(nombreUsuario, email);
    if (existingUsuario) {
      if (existingUsuario.nombre_usuario.toLowerCase() === nombreUsuario.toLowerCase()) {
        throw new AppError('El nombre de usuario ya está en uso', 409);
      }
      if (existingUsuario.email.toLowerCase() === email.toLowerCase()) {
        throw new AppError('El email ya está registrado', 409);
      }
    }
    
    // Verificar que el rol sea válido
    if (!config.validation.validRoles.includes(rol)) {
      throw new AppError(`Rol inválido. Roles válidos: ${config.validation.validRoles.join(', ')}`, 400);
    }
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, config.security.bcryptRounds);
    
    // Crear el usuario
    const newUsuario = await repository.create({
      nombre_usuario: nombreUsuario,
      hash_contrasena: hashedPassword,
      email,
      rol,
      activo: true
    });
    
    // Eliminar datos sensibles
    const { hash_contrasena, ...usuarioSinContrasena } = newUsuario;
    
    logger.info(`Usuario creado: ${nombreUsuario} con rol ${rol} por usuario ID: ${creatorId}`);
    
    return usuarioSinContrasena;
    
  } catch (error) {
    logger.error('Error creando usuario:', error);
    throw error;
  }
};

/**
 * Actualizar usuario existente
 * @param {number} id - ID del usuario
 * @param {Object} usuarioData - Datos a actualizar
 * @param {number} updaterId - ID del usuario que actualiza
 * @returns {Object} Usuario actualizado
 */
const updateUsuario = async (id, usuarioData, updaterId) => {
  try {
    // Verificar si el usuario existe
    const existingUsuario = await repository.findById(id);
    if (!existingUsuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    const { nombreUsuario, email, rol, activo } = usuarioData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombreUsuario !== undefined) {
      // Verificar si ya existe otro usuario con el mismo nombre de usuario
      const duplicateUsuario = await repository.findByUsername(nombreUsuario);
      if (duplicateUsuario && duplicateUsuario.id !== parseInt(id)) {
        throw new AppError('Ya existe otro usuario con este nombre de usuario', 409);
      }
      
      updateData.nombre_usuario = nombreUsuario;
    }
    
    if (email !== undefined) {
      // Verificar si ya existe otro usuario con el mismo email
      const duplicateUsuario = await repository.findByEmail(email);
      if (duplicateUsuario && duplicateUsuario.id !== parseInt(id)) {
        throw new AppError('Ya existe otro usuario con este email', 409);
      }
      
      updateData.email = email;
    }
    
    if (rol !== undefined) {
      // Verificar que el rol sea válido
      if (!config.validation.validRoles.includes(rol)) {
        throw new AppError(`Rol inválido. Roles válidos: ${config.validation.validRoles.join(', ')}`, 400);
      }
      
      updateData.rol = rol;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      // Eliminar datos sensibles
      const { hash_contrasena, ...usuarioSinContrasena } = existingUsuario;
      return usuarioSinContrasena;
    }
    
    // Actualizar usuario
    const updatedUsuario = await repository.update(id, updateData);
    
    // Eliminar datos sensibles
    const { hash_contrasena, ...usuarioSinContrasena } = updatedUsuario;
    
    logger.info(`Usuario ID ${id} actualizado por usuario ID: ${updaterId}`);
    
    return usuarioSinContrasena;
    
  } catch (error) {
    logger.error(`Error actualizando usuario ID ${id}:`, error);
    throw error;
  }
};

/**
 * Cambiar contraseña de usuario
 * @param {number} id - ID del usuario
 * @param {string} contrasenaActual - Contraseña actual
 * @param {string} nuevaContrasena - Nueva contraseña
 * @returns {boolean} True si se cambió correctamente
 */
const changePassword = async (id, contrasenaActual, nuevaContrasena) => {
  try {
    // Verificar si el usuario existe
    const usuario = await repository.findById(id);
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(contrasenaActual, usuario.hash_contrasena);
    if (!isPasswordValid) {
      throw new AppError('Contraseña actual incorrecta', 400);
    }
    
    // Verificar que la nueva contraseña sea diferente
    if (contrasenaActual === nuevaContrasena) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual', 400);
    }
    
    // Verificar longitud mínima
    if (nuevaContrasena.length < config.validation.minPasswordLength) {
      throw new AppError(`La contraseña debe tener al menos ${config.validation.minPasswordLength} caracteres`, 400);
    }
    
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(nuevaContrasena, config.security.bcryptRounds);
    
    // Actualizar contraseña
    await repository.updatePassword(id, hashedPassword);
    
    logger.info(`Contraseña cambiada para usuario ID: ${id}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error cambiando contraseña para usuario ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar usuario (soft delete)
 * @param {number} id - ID del usuario
 * @param {number} deleterId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteUsuario = async (id, deleterId) => {
  try {
    // Verificar si el usuario existe
    const existingUsuario = await repository.findById(id);
    if (!existingUsuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingUsuario.activo) {
      throw new AppError('El usuario ya está inactivo', 400);
    }
    
    // No permitir eliminar el último administrador
    if (existingUsuario.rol === 'Administrador') {
      const adminCount = await repository.countByRole('Administrador');
      if (adminCount <= 1) {
        throw new AppError('No se puede eliminar el último administrador', 400);
      }
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Usuario ID ${id} eliminado (soft delete) por usuario ID: ${deleterId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando usuario ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  changePassword,
  deleteUsuario
};
