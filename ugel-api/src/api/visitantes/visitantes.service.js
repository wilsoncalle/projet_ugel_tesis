/**
 * Servicio para gestión de visitantes
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./visitantes.repository');
const tiposDocumentoRepository = require('../tipos-documento/tiposdocumento.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los visitantes con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Visitantes y datos de paginación
 */
const getAllVisitantes = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener visitantes con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      visitantes: result.visitantes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo visitantes:', error);
    throw error;
  }
};

/**
 * Obtener visitante por ID
 * @param {number} id - ID del visitante
 * @returns {Object} Visitante encontrado
 */
const getVisitanteById = async (id) => {
  try {
    const visitante = await repository.findById(id);
    
    if (!visitante) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    return visitante;
    
  } catch (error) {
    logger.error(`Error obteniendo visitante ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener visitante por tipo y número de documento
 * @param {number} tipoDocumentoId - ID del tipo de documento
 * @param {string} numeroDocumento - Número de documento
 * @returns {Object} Visitante encontrado
 */
const getVisitanteByDocumento = async (tipoDocumentoId, numeroDocumento) => {
  try {
    const visitante = await repository.findByDocumento(tipoDocumentoId, numeroDocumento);
    
    if (!visitante) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    return visitante;
    
  } catch (error) {
    logger.error(`Error obteniendo visitante por documento ${tipoDocumentoId}-${numeroDocumento}:`, error);
    throw error;
  }
};

/**
 * Obtener historial de visitas de un visitante
 * @param {number} id - ID del visitante
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Historial de visitas y datos de paginación
 */
const getHistorialVisitas = async (id, options = {}) => {
  try {
    // Verificar que el visitante exista
    const visitante = await repository.findById(id);
    if (!visitante) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    // Obtener historial de visitas
    const historial = await repository.getHistorialVisitas(id, options);
    
    return {
      visitas: historial.visitas,
      pagination: {
        page: historial.page,
        limit: historial.limit,
        total: historial.total,
        totalPages: historial.totalPages
      }
    };
    
  } catch (error) {
    logger.error(`Error obteniendo historial de visitas para visitante ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo visitante
 * @param {Object} visitanteData - Datos del visitante
 * @returns {Object} Visitante creado
 */
const createVisitante = async (visitanteData) => {
  try {
    const { tipoDocumentoId, numeroDocumento, nombres, apellidos } = visitanteData;
    
    // Verificar que el tipo de documento exista y esté activo
    const tipoDocumento = await tiposDocumentoRepository.findById(tipoDocumentoId);
    if (!tipoDocumento) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    if (!tipoDocumento.activo) {
      throw new AppError('Tipo de documento inactivo', 400);
    }
    
    // Verificar si ya existe un visitante con el mismo documento
    const existingVisitante = await repository.findByDocumento(tipoDocumentoId, numeroDocumento);
    if (existingVisitante) {
      throw new AppError('Ya existe un visitante con este documento', 409);
    }
    
    // Crear el visitante
    const newVisitante = await repository.create({
      tipo_documento_id: tipoDocumentoId,
      numero_documento: numeroDocumento,
      nombres,
      apellidos
    });
    
    logger.info(`Visitante creado: ${nombres} ${apellidos}`);
    
    return newVisitante;
    
  } catch (error) {
    logger.error('Error creando visitante:', error);
    throw error;
  }
};

/**
 * Actualizar visitante existente
 * @param {number} id - ID del visitante
 * @param {Object} visitanteData - Datos a actualizar
 * @returns {Object} Visitante actualizado
 */
const updateVisitante = async (id, visitanteData) => {
  try {
    // Verificar si el visitante existe
    const existingVisitante = await repository.findById(id);
    if (!existingVisitante) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    const { tipoDocumentoId, numeroDocumento, nombres, apellidos } = visitanteData;
    const updateData = {};
    
    // Preparar datos a actualizar (enviar en camelCase al repositorio)
    if (tipoDocumentoId !== undefined) {
      // Verificar que el tipo de documento exista y esté activo
      const tipoDocumento = await tiposDocumentoRepository.findById(tipoDocumentoId);
      if (!tipoDocumento) {
        throw new AppError('Tipo de documento no encontrado', 404);
      }
      if (!tipoDocumento.activo) {
        throw new AppError('Tipo de documento inactivo', 400);
      }
      
      updateData.tipoDocumentoId = tipoDocumentoId;
    }
    
    if (numeroDocumento !== undefined) {
      // Si se cambia el documento, verificar que no exista otro visitante con ese documento
      if (tipoDocumentoId !== existingVisitante.tipo_documento_id || numeroDocumento !== existingVisitante.numero_documento) {
        const duplicateVisitante = await repository.findByDocumento(
          tipoDocumentoId || existingVisitante.tipo_documento_id, 
          numeroDocumento
        );
        
        if (duplicateVisitante && duplicateVisitante.id !== parseInt(id)) {
          throw new AppError('Ya existe otro visitante con este documento', 409);
        }
      }
      
      updateData.numeroDocumento = numeroDocumento;
    }
    
    if (nombres !== undefined) {
      updateData.nombres = nombres;
    }
    
    if (apellidos !== undefined) {
      updateData.apellidos = apellidos;
    }
    
    // Actualizar fecha de última actualización
    updateData.fechaUltimaActualizacionApi = new Date();
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingVisitante;
    }
    
    // Actualizar visitante
    const updatedVisitante = await repository.update(id, updateData);
    
    logger.info(`Visitante ID ${id} actualizado`);
    
    return updatedVisitante;
    
  } catch (error) {
    logger.error(`Error actualizando visitante ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllVisitantes,
  getVisitanteById,
  getVisitanteByDocumento,
  getHistorialVisitas,
  createVisitante,
  updateVisitante
};
