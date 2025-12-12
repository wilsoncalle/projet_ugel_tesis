/**
 * Servicio para gestión de tipos de documento
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./tiposdocumento.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los tipos de documento con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Tipos de documento y datos de paginación
 */
const getAlltipodocumento = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener tipos de documento con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      tiposDocumento: result.tiposDocumento,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo tipos de documento:', error);
    throw error;
  }
};

/**
 * Obtener tipo de documento por ID
 * @param {number} id - ID del tipo de documento
 * @returns {Object} Tipo de documento encontrado
 */
const getTipoDocumentoById = async (id) => {
  try {
    const tipoDocumento = await repository.findById(id);
    
    if (!tipoDocumento) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    return tipoDocumento;
    
  } catch (error) {
    logger.error(`Error obteniendo tipo de documento ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo tipo de documento
 * @param {Object} tipoDocumentoData - Datos del tipo de documento
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Tipo de documento creado
 */
const createTipoDocumento = async (tipoDocumentoData, userId) => {
  try {
    const { codigo, nombreCompleto } = tipoDocumentoData;
    
    if (!codigo || !nombreCompleto) {
      throw new AppError('El código y nombre completo son requeridos', 400);
    }
    
    // Verificar si ya existe un tipo de documento con el mismo código
    const existingTipoDocumento = await repository.findByCode(codigo);
    if (existingTipoDocumento) {
      throw new AppError('Ya existe un tipo de documento con este código', 409);
    }
    
    // Crear tipo de documento
    const newTipoDocumento = await repository.create({
      codigo,
      nombre_completo: nombreCompleto,
      activo: true
    });
    
    logger.info(`Tipo de documento creado: ${codigo} - ${nombreCompleto} por usuario ID: ${userId}`);
    
    return newTipoDocumento;
    
  } catch (error) {
    logger.error('Error creando tipo de documento:', error);
    throw error;
  }
};

/**
 * Actualizar tipo de documento existente
 * @param {number} id - ID del tipo de documento
 * @param {Object} tipoDocumentoData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Tipo de documento actualizado
 */
const updateTipoDocumento = async (id, tipoDocumentoData, userId) => {
  try {
    // Verificar si el tipo de documento existe
    const existingTipoDocumento = await repository.findById(id);
    if (!existingTipoDocumento) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    const { codigo, nombreCompleto, activo } = tipoDocumentoData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (codigo !== undefined) {
      // Verificar si ya existe otro tipo de documento con el mismo código
      const duplicateTipoDocumento = await repository.findByCode(codigo);
      if (duplicateTipoDocumento && duplicateTipoDocumento.id !== parseInt(id)) {
        throw new AppError('Ya existe otro tipo de documento con este código', 409);
      }
      
      updateData.codigo = codigo;
    }
    
    if (nombreCompleto !== undefined) {
      updateData.nombre_completo = nombreCompleto;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingTipoDocumento;
    }
    
    // Actualizar tipo de documento
    const updatedTipoDocumento = await repository.update(id, updateData);
    
    logger.info(`Tipo de documento ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedTipoDocumento;
    
  } catch (error) {
    logger.error(`Error actualizando tipo de documento ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar tipo de documento (soft delete)
 * @param {number} id - ID del tipo de documento
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteTipoDocumento = async (id, userId) => {
  try {
    // Verificar si el tipo de documento existe
    const existingTipoDocumento = await repository.findById(id);
    if (!existingTipoDocumento) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingTipoDocumento.activo) {
      throw new AppError('El tipo de documento ya está inactivo', 400);
    }
    
    // Verificar si el tipo de documento está siendo usado
    const isInUse = await repository.checkTipoDocumentoInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el tipo de documento porque está siendo utilizado en registros existentes', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Tipo de documento ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando tipo de documento ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener tipos de documento eliminados (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Tipos de documento eliminados y datos de paginación
 */
const getDeletedtipodocumento = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    return {
      tiposDocumento: Array.isArray(result.tiposDocumento) ? result.tiposDocumento : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo tipos de documento eliminados:', error);
    throw error;
  }
};

/**
 * Restaurar tipo de documento eliminado
 * @param {number} id - ID del tipo de documento
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Tipo de documento restaurado
 */
const restoreTipoDocumento = async (id, userId) => {
  try {
    const existingTipoDocumento = await repository.findByIdIncludingDeleted(id);
    if (!existingTipoDocumento) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    if (existingTipoDocumento.activo) {
      throw new AppError('El tipo de documento ya está activo', 400);
    }
    
    const restoredTipoDocumento = await repository.restore(id);
    
    logger.info(`Tipo de documento ID ${id} restaurado por usuario ID: ${userId}`);
    
    return restoredTipoDocumento;
    
  } catch (error) {
    logger.error(`Error restaurando tipo de documento ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAlltipodocumento,
  getTipoDocumentoById,
  createTipoDocumento,
  updateTipoDocumento,
  deleteTipoDocumento,
  getDeletedtipodocumento,
  restoreTipoDocumento
};
