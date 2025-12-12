/**
 * Servicio para gestión de usuarios
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const bcrypt = require('bcryptjs');
const repository = require('./usuarios.repository');
const personalRepository = require('../personal/personal.repository');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtener todos los usuarios con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} usuario y datos de paginación
 */
const getAllusuario = async (options = {}) => {
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
 * Obtener usuario por personalId
 * @param {number} personalId - ID del personal
 * @returns {Object|null} Usuario encontrado sin contraseña
 */
const getUsuarioBypersonalId = async (personalId) => {
  try {
    if (!personalId) return null;

    const usuario = await repository.findBypersonalId(personalId);
    if (!usuario) return null;

    const { hash_contrasena, ...usuarioSinContrasena } = usuario;
    return usuarioSinContrasena;
  } catch (error) {
    logger.error(`Error obteniendo usuario por personalId ${personalId}:`, error);
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
    const { nombreUsuario, email, contrasena, rol, personalId } = usuarioData;
    
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
    
    // Validar personalId si se proporciona
    if (personalId) {
      // Verificar que el personal no esté ya vinculado a otro usuario
      const existingLink = await repository.findBypersonalId(personalId);
      if (existingLink) {
        throw new AppError('Esta persona ya está vinculada a otro usuario', 409);
      }
      
      // Verificar que el personal existe
      const personal = await personalRepository.findById(personalId);
      if (!personal) {
        throw new AppError('El personal seleccionado no existe', 404);
      }
    }
    
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, config.security.bcryptRounds);
    
    // Crear el usuario
    const newUsuario = await repository.create({
      nombre_usuario: nombreUsuario,
      hash_contrasena: hashedPassword,
      email,
      rol,
      activo: true,
      personal_id: personalId || null
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
    
    const { nombreUsuario, email, rol, activo, personalId, contrasena } = usuarioData;
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
    
    // Procesar contraseña si se proporciona
    if (contrasena !== undefined && contrasena !== null && contrasena !== '') {
      // Validar longitud mínima
      if (contrasena.length < config.validation.minPasswordLength) {
        throw new AppError(`La contraseña debe tener al menos ${config.validation.minPasswordLength} caracteres`, 400);
      }
      
      // Hashear la contraseña antes de guardarla
      const hashedPassword = await bcrypt.hash(contrasena, config.security.bcryptRounds);
      updateData.hash_contrasena = hashedPassword;
      
      logger.info(`Contraseña actualizada para usuario ID ${id}`);
    }
    
    // Agregar personalId a los datos de actualización
    if (personalId !== undefined) {
      // Validar personalId si se proporciona (no es null)
      if (personalId !== null) {
        // Verificar que el personal no esté ya vinculado a otro usuario
        const existingLink = await repository.findBypersonalId(personalId);
        if (existingLink && existingLink.id !== parseInt(id)) {
          throw new AppError('Esta persona ya está vinculada a otro usuario', 409);
        }
        
        // Verificar que el personal existe
        const personal = await personalRepository.findById(personalId);
        if (!personal) {
          throw new AppError('El personal seleccionado no existe', 404);
        }
      }
      updateData.personal_id = personalId; // Puede ser null para desvincular
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

/**
 * Obtener usuarios eliminados (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} usuario eliminados y datos de paginación
 */
const getDeletedusuario = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    return {
      usuarios: Array.isArray(result.usuarios) ? result.usuarios : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo usuarios eliminados:', error);
    throw error;
  }
};

/**
 * Restaurar usuario eliminado
 * @param {number} id - ID del usuario
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Usuario restaurado
 */
const restoreUsuario = async (id, userId) => {
  try {
    const existingUsuario = await repository.findByIdIncludingDeleted(id);
    if (!existingUsuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    if (existingUsuario.activo) {
      throw new AppError('El usuario ya está activo', 400);
    }
    
    const restoredUsuario = await repository.restore(id);
    
    // Eliminar datos sensibles
    const { hash_contrasena, ...usuarioSinContrasena } = restoredUsuario;
    
    logger.info(`Usuario ID ${id} restaurado por usuario ID: ${userId}`);
    
    return usuarioSinContrasena;
    
  } catch (error) {
    logger.error(`Error restaurando usuario ID ${id}:`, error);
    throw error;
  }
};

/**
 * Actualizar perfil del usuario autenticado
 * @param {number} userId - ID del usuario
 * @param {Object} profileData - Datos del perfil a actualizar
 * @returns {Object} Usuario actualizado
 */
const updateProfile = async (userId, profileData) => {
  try {
    // Mapear campos del frontend (nombreUsuario, email) a campos de BD (nombre_usuario, email)
    const nombre_usuario = profileData.nombreUsuario || profileData.nombre_usuario;
    const email = profileData.email;
    
    // Validar que los campos requeridos estén presentes
    if (!nombre_usuario || !email) {
      throw new AppError('Nombre de usuario y email son requeridos', 400);
    }
    
    // Verificar que el usuario existe
    const usuario = await repository.findById(userId);
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    // Verificar si el email ya está en uso por otro usuario
    if (email && email !== usuario.email) {
      const existingUser = await repository.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('El correo electrónico ya está en uso', 400);
      }
    }
    
    // Verificar si el nombre de usuario ya está en uso por otro usuario
    if (nombre_usuario && nombre_usuario !== usuario.nombre_usuario) {
      const existingUser = await repository.findByUsername(nombre_usuario);
      if (existingUser && existingUser.id !== userId) {
        throw new AppError('El nombre de usuario ya está en uso', 400);
      }
    }
    
    // Actualizar perfil
    const updatedUser = await repository.updateProfile(userId, {
      nombre_usuario,
      email
    });
    
    logger.info(`Perfil actualizado para usuario ID ${userId}`);
    return updatedUser;
    
  } catch (error) {
    logger.error(`Error actualizando perfil del usuario ID ${userId}:`, error);
    throw error;
  }
};

/**
 * Cambiar contraseña del usuario autenticado
 * @param {number} userId - ID del usuario
 * @param {Object} passwordData - Datos de contraseña
 * @returns {void}
 */
const updatePassword = async (userId, passwordData) => {
  try {
    const { currentPassword, newPassword } = passwordData;
    
    // Verificar que el usuario existe
    const usuario = await repository.findById(userId);
    if (!usuario) {
      throw new AppError('Usuario no encontrado', 404);
    }
    
    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, usuario.hash_contrasena);
    if (!isPasswordValid) {
      throw new AppError('La contraseña actual es incorrecta', 400);
    }
    
    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, usuario.hash_contrasena);
    if (isSamePassword) {
      throw new AppError('La nueva contraseña debe ser diferente a la actual', 400);
    }
    
    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña
    await repository.updatePassword(userId, hashedPassword);
    
    logger.info(`Contraseña actualizada para usuario ID ${userId}`);
    
  } catch (error) {
    logger.error(`Error actualizando contraseña del usuario ID ${userId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllusuario,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  changePassword,
  deleteUsuario,
  getDeletedusuario,
  restoreUsuario,
  updateProfile,
  updatePassword,
  getUsuarioBypersonalId
};
