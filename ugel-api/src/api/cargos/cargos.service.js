/**
 * Servicio para gestión de cargos
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./cargos.repository');

const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los cargos con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} cargo y datos de paginación
 */
const getAllcargo = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener cargos con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      cargos: result.cargos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo cargos:', error);
    throw error;
  }
};

/**
 * Obtener cargo por ID
 * @param {number} id - ID del cargo
 * @returns {Object} Cargo encontrado
 */
const getCargoById = async (id) => {
  try {
    const cargo = await repository.findById(id);
    
    if (!cargo) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    return cargo;
    
  } catch (error) {
    logger.error(`Error obteniendo cargo ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo cargo
 * @param {Object} cargoData - Datos del cargo
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Cargo creado
 */
const createCargo = async (cargoData, userId) => {
  try {
    const { nombre_cargo, descripcion } = cargoData;
    
    // Verificar si ya existe un cargo con el mismo nombre
    const existingCargo = await repository.findByName(nombre_cargo);
    if (existingCargo) {
      throw new AppError('Ya existe un cargo con este nombre', 409);
    }
    

    
    // Crear cargo
    const newCargo = await repository.create({
      nombre_cargo,
      descripcion,
      activo: true
    });
    
    logger.info(`Cargo creado: ${nombre_cargo} por usuario ID: ${userId}`);
    
    return newCargo;
    
  } catch (error) {
    logger.error('Error creando cargo:', error);
    throw error;
  }
};

/**
 * Actualizar cargo existente
 * @param {number} id - ID del cargo
 * @param {Object} cargoData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Cargo actualizado
 */
const updateCargo = async (id, cargoData, userId) => {
  try {
    // Verificar si el cargo existe
    const existingCargo = await repository.findById(id);
    if (!existingCargo) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    const { nombre_cargo, descripcion, activo } = cargoData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombre_cargo !== undefined) {
      // Verificar si ya existe otro cargo con el mismo nombre
      const duplicateCargo = await repository.findByName(nombre_cargo);
      if (duplicateCargo && duplicateCargo.id !== parseInt(id)) {
        throw new AppError('Ya existe otro cargo con este nombre', 409);
      }
      
      updateData.nombre_cargo = nombre_cargo;
    }
    
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion;
    }
    

    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingCargo;
    }
    
    // Actualizar cargo
    const updatedCargo = await repository.update(id, updateData);
    
    logger.info(`Cargo ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedCargo;
    
  } catch (error) {
    logger.error(`Error actualizando cargo ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar cargo (soft delete)
 * @param {number} id - ID del cargo
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteCargo = async (id, userId) => {
  try {
    // Verificar si el cargo existe
    const existingCargo = await repository.findById(id);
    if (!existingCargo) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingCargo.activo) {
      throw new AppError('El cargo ya está inactivo', 400);
    }
    
    // Verificar si el cargo está siendo usado por personal
    const isInUse = await repository.checkCargoInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el cargo porque está siendo utilizado por personal activo', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Cargo ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando cargo ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener cargos eliminados (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} cargo eliminados y datos de paginación
 */
const getDeletedcargo = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    return {
      cargos: Array.isArray(result.cargos) ? result.cargos : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo cargos eliminados:', error);
    throw error;
  }
};

/**
 * Restaurar cargo eliminado
 * @param {number} id - ID del cargo
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Cargo restaurado
 */
const restoreCargo = async (id, userId) => {
  try {
    const existingCargo = await repository.findByIdIncludingDeleted(id);
    if (!existingCargo) {
      throw new AppError('Cargo no encontrado', 404);
    }
    
    if (existingCargo.activo) {
      throw new AppError('El cargo ya está activo', 400);
    }
    
    const restoredCargo = await repository.restore(id);
    
    logger.info(`Cargo ID ${id} restaurado por usuario ID: ${userId}`);
    
    return restoredCargo;
    
  } catch (error) {
    logger.error(`Error restaurando cargo ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllcargo,
  getCargoById,
  createCargo,
  updateCargo,
  deleteCargo,
  getDeletedcargo,
  restoreCargo
};
