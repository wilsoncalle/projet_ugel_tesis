/**
 * Servicio para gestión de tipos de contrato
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./tiposcontrato.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los tipos de contrato con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Tipos de contrato y datos de paginación
 */
const getAlltipocontrato = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener tipos de contrato con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      tiposContrato: result.tiposContrato,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo tipos de contrato:', error);
    throw error;
  }
};

/**
 * Obtener tipo de contrato por ID
 * @param {number} id - ID del tipo de contrato
 * @returns {Object} Tipo de contrato encontrado
 */
const getTipoContratoById = async (id) => {
  try {
    const tipoContrato = await repository.findById(id);
    
    if (!tipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    return tipoContrato;
    
  } catch (error) {
    logger.error(`Error obteniendo tipo de contrato ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo tipo de contrato
 * @param {Object} tipoContratoData - Datos del tipo de contrato
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Tipo de contrato creado
 */
const createTipoContrato = async (tipoContratoData, userId) => {
  try {
    const { nombre } = tipoContratoData;
    
    // Verificar si ya existe un tipo de contrato con el mismo nombre
    const existingTipoContrato = await repository.findByName(nombre);
    if (existingTipoContrato) {
      throw new AppError('Ya existe un tipo de contrato con este nombre', 409);
    }
    
    // Crear tipo de contrato
    const newTipoContrato = await repository.create({
      nombre_tipo: nombre,
      activo: true
    });
    
    logger.info(`Tipo de contrato creado: ${nombre} por usuario ID: ${userId}`);
    
    return newTipoContrato;
    
  } catch (error) {
    logger.error('Error creando tipo de contrato:', error);
    throw error;
  }
};

/**
 * Actualizar tipo de contrato existente
 * @param {number} id - ID del tipo de contrato
 * @param {Object} tipoContratoData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Tipo de contrato actualizado
 */
const updateTipoContrato = async (id, tipoContratoData, userId) => {
  try {
    // Verificar si el tipo de contrato existe
    const existingTipoContrato = await repository.findById(id);
    if (!existingTipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    const { nombre, activo } = tipoContratoData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombre !== undefined) {
      // Verificar si ya existe otro tipo de contrato con el mismo nombre
      const duplicateTipoContrato = await repository.findByName(nombre);
      if (duplicateTipoContrato && duplicateTipoContrato.id !== parseInt(id)) {
        throw new AppError('Ya existe otro tipo de contrato con este nombre', 409);
      }
      
      updateData.nombre_tipo = nombre;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingTipoContrato;
    }
    
    // Actualizar tipo de contrato
    const updatedTipoContrato = await repository.update(id, updateData);
    
    logger.info(`Tipo de contrato ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedTipoContrato;
    
  } catch (error) {
    logger.error(`Error actualizando tipo de contrato ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar tipo de contrato (soft delete)
 * @param {number} id - ID del tipo de contrato
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteTipoContrato = async (id, userId) => {
  try {
    // Verificar si el tipo de contrato existe
    const existingTipoContrato = await repository.findById(id);
    if (!existingTipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingTipoContrato.activo) {
      throw new AppError('El tipo de contrato ya está inactivo', 400);
    }
    
    // Verificar si el tipo de contrato está siendo usado por personal
    const isInUse = await repository.checkTipoContratoInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el tipo de contrato porque está siendo utilizado por personal activo', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Tipo de contrato ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando tipo de contrato ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener tipos de contrato eliminados (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Tipos de contrato eliminados y datos de paginación
 */
const getDeletedtipocontrato = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    return {
      tiposContrato: Array.isArray(result.tiposContrato) ? result.tiposContrato : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo tipos de contrato eliminados:', error);
    throw error;
  }
};

/**
 * Restaurar tipo de contrato eliminado
 * @param {number} id - ID del tipo de contrato
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Tipo de contrato restaurado
 */
const restoreTipoContrato = async (id, userId) => {
  try {
    const existingTipoContrato = await repository.findByIdIncludingDeleted(id);
    if (!existingTipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    
    if (existingTipoContrato.activo) {
      throw new AppError('El tipo de contrato ya está activo', 400);
    }
    
    const restoredTipoContrato = await repository.restore(id);
    
    logger.info(`Tipo de contrato ID ${id} restaurado por usuario ID: ${userId}`);
    
    return restoredTipoContrato;
    
  } catch (error) {
    logger.error(`Error restaurando tipo de contrato ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAlltipocontrato,
  getTipoContratoById,
  createTipoContrato,
  updateTipoContrato,
  deleteTipoContrato,
  getDeletedtipocontrato,
  restoreTipoContrato
};
