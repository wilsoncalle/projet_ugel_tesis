/**
 * Servicio para gestión de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./personal.repository');
const areasRepository = require('../areas/areas.repository');
const tiposContratoRepository = require('../tipos-contrato/tiposcontrato.repository');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtener todo el personal con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Personal y datos de paginación
 */
const getAllPersonal = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo, areaId, tipoContratoId } = options;
  
  try {
    // Obtener personal con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined,
      areaId: areaId ? parseInt(areaId) : undefined,
      tipoContratoId: tipoContratoId ? parseInt(tipoContratoId) : undefined
    });
    
    // Formatear respuesta - asegurar que personal siempre sea un array
    return {
      personal: Array.isArray(result.personal) ? result.personal : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo personal:', error);
    throw error;
  }
};

/**
 * Obtener personal por ID
 * @param {number} id - ID del personal
 * @returns {Object} Personal encontrado
 */
const getPersonalById = async (id) => {
  try {
    const personal = await repository.findById(id);
    
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    return personal;
    
  } catch (error) {
    logger.error(`Error obteniendo personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener personal por tipo y número de documento
 * @param {string} tipoDocumento - Tipo de documento
 * @param {string} numeroDocumento - Número de documento
 * @returns {Object} Personal encontrado
 */
const getPersonalByDocumento = async (tipoDocumento, numeroDocumento) => {
  try {
    const personal = await repository.findByDocumento(tipoDocumento, numeroDocumento);
    
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    return personal;
    
  } catch (error) {
    logger.error(`Error obteniendo personal por documento ${tipoDocumento}-${numeroDocumento}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo personal
 * @param {Object} personalData - Datos del personal
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Personal creado
 */
const createPersonal = async (personalData, userId) => {
  try {
    const { 
      tipoDocumento, 
      numeroDocumento, 
      nombres, 
      apellidos, 
      areaDestinoId, 
      tipoContratoId 
    } = personalData;
    
    // Verificar que el tipo de documento sea válido
    if (!config.validation.validDocumentTypes.includes(tipoDocumento)) {
      throw new AppError(`Tipo de documento inválido. Tipos válidos: ${config.validation.validDocumentTypes.join(', ')}`, 400);
    }
    
    // Verificar si ya existe personal con el mismo documento
    const existingPersonal = await repository.findByDocumento(tipoDocumento, numeroDocumento);
    if (existingPersonal) {
      throw new AppError('Ya existe personal registrado con este documento', 409);
    }
    
    // Verificar que el área de destino exista y esté activa
    const area = await areasRepository.findById(areaDestinoId);
    if (!area) {
      throw new AppError('Área de destino no encontrada', 404);
    }
    if (!area.activa) {
      throw new AppError('Área de destino inactiva', 400);
    }
    
    // Verificar que el tipo de contrato exista y esté activo
    const tipoContrato = await tiposContratoRepository.findById(tipoContratoId);
    if (!tipoContrato) {
      throw new AppError('Tipo de contrato no encontrado', 404);
    }
    if (!tipoContrato.activo) {
      throw new AppError('Tipo de contrato inactivo', 400);
    }
    
    // Crear el personal
    const newPersonal = await repository.create({
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      nombres,
      apellidos,
      area_destino_id: areaDestinoId,
      tipo_contrato_id: tipoContratoId,
      activo: true
    });
    
    logger.info(`Personal creado: ${nombres} ${apellidos} por usuario ID: ${userId}`);
    
    return newPersonal;
    
  } catch (error) {
    logger.error('Error creando personal:', error);
    throw error;
  }
};

/**
 * Actualizar personal existente
 * @param {number} id - ID del personal
 * @param {Object} personalData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Personal actualizado
 */
const updatePersonal = async (id, personalData, userId) => {
  try {
    // Verificar si el personal existe
    const existingPersonal = await repository.findById(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    const { 
      tipoDocumento, 
      numeroDocumento, 
      nombres, 
      apellidos, 
      areaDestinoId, 
      tipoContratoId,
      activo
    } = personalData;
    
    const updateData = {};
    
    // Preparar datos a actualizar
    if (tipoDocumento !== undefined) {
      // Verificar que el tipo de documento sea válido
      if (!config.validation.validDocumentTypes.includes(tipoDocumento)) {
        throw new AppError(`Tipo de documento inválido. Tipos válidos: ${config.validation.validDocumentTypes.join(', ')}`, 400);
      }
      
      updateData.tipo_documento = tipoDocumento;
    }
    
    if (numeroDocumento !== undefined) {
      // Si se cambia el documento, verificar que no exista otro personal con ese documento
      if (tipoDocumento !== existingPersonal.tipo_documento || numeroDocumento !== existingPersonal.numero_documento) {
        const duplicatePersonal = await repository.findByDocumento(
          tipoDocumento || existingPersonal.tipo_documento, 
          numeroDocumento
        );
        
        if (duplicatePersonal && duplicatePersonal.id !== parseInt(id)) {
          throw new AppError('Ya existe otro personal con este documento', 409);
        }
      }
      
      updateData.numero_documento = numeroDocumento;
    }
    
    if (nombres !== undefined) {
      updateData.nombres = nombres;
    }
    
    if (apellidos !== undefined) {
      updateData.apellidos = apellidos;
    }
    
    if (areaDestinoId !== undefined) {
      // Verificar que el área de destino exista y esté activa
      const area = await areasRepository.findById(areaDestinoId);
      if (!area) {
        throw new AppError('Área de destino no encontrada', 404);
      }
      if (!area.activa) {
        throw new AppError('Área de destino inactiva', 400);
      }
      
      updateData.area_destino_id = areaDestinoId;
    }
    
    if (tipoContratoId !== undefined) {
      // Verificar que el tipo de contrato exista y esté activo
      const tipoContrato = await tiposContratoRepository.findById(tipoContratoId);
      if (!tipoContrato) {
        throw new AppError('Tipo de contrato no encontrado', 404);
      }
      if (!tipoContrato.activo) {
        throw new AppError('Tipo de contrato inactivo', 400);
      }
      
      updateData.tipo_contrato_id = tipoContratoId;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingPersonal;
    }
    
    // Actualizar personal
    const updatedPersonal = await repository.update(id, updateData);
    
    logger.info(`Personal ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedPersonal;
    
  } catch (error) {
    logger.error(`Error actualizando personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar personal (soft delete)
 * @param {number} id - ID del personal
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deletePersonal = async (id, userId) => {
  try {
    // Verificar si el personal existe
    const existingPersonal = await repository.findById(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingPersonal.activo) {
      throw new AppError('El personal ya está inactivo', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Personal ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando personal ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener personal eliminado (soft delete)
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Personal eliminado y datos de paginación
 */
const getDeletedPersonal = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener personal eliminado con paginación
    const result = await repository.findDeleted({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      personal: Array.isArray(result.personal) ? result.personal : [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total || 0,
        totalPages: Math.ceil((result.total || 0) / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo personal eliminado:', error);
    throw error;
  }
};

/**
 * Restaurar personal eliminado
 * @param {number} id - ID del personal
 * @param {number} userId - ID del usuario que restaura
 * @returns {Object} Personal restaurado
 */
const restorePersonal = async (id, userId) => {
  try {
    // Verificar si el personal existe (incluyendo eliminados)
    const existingPersonal = await repository.findByIdIncludingDeleted(id);
    if (!existingPersonal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar si ya está activo
    if (existingPersonal.activo) {
      throw new AppError('El personal ya está activo', 400);
    }
    
    // Restaurar personal (marcar como activo)
    const restoredPersonal = await repository.restore(id);
    
    logger.info(`Personal ID ${id} restaurado por usuario ID: ${userId}`);
    
    return restoredPersonal;
    
  } catch (error) {
    logger.error(`Error restaurando personal ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllPersonal,
  getPersonalById,
  getPersonalByDocumento,
  createPersonal,
  updatePersonal,
  deletePersonal,
  getDeletedPersonal,
  restorePersonal
};
