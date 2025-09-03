/**
 * Servicio para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./papeletassalida.repository');
const personalRepository = require('../personal/personal.repository');
const motivosSalidaRepository = require('../motivos-salida/motivossalida.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las papeletas de salida con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Papeletas de salida y datos de paginación
 */
const getAllPapeletas = async (options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    q = '',
    fechaInicio,
    fechaFin,
    personalId,
    motivoSalidaId
  } = options;
  
  try {
    // Obtener papeletas con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      fechaInicio,
      fechaFin,
      personalId: personalId ? parseInt(personalId) : undefined,
      motivoSalidaId: motivoSalidaId ? parseInt(motivoSalidaId) : undefined
    });
    
    // Formatear respuesta
    return {
      papeletas: result.papeletas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo papeletas de salida:', error);
    throw error;
  }
};

/**
 * Obtener papeletas de salida pendientes de retorno con paginación
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Papeletas pendientes y datos de paginación
 */
const getPapeletasPendientes = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener papeletas pendientes con paginación
    const result = await repository.findPendientes({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      papeletas: result.papeletas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo papeletas de salida pendientes:', error);
    throw error;
  }
};

/**
 * Obtener papeleta de salida por ID
 * @param {number} id - ID de la papeleta
 * @returns {Object} Papeleta encontrada
 */
const getPapeletaById = async (id) => {
  try {
    const papeleta = await repository.findById(id);
    
    if (!papeleta) {
      throw new AppError('Papeleta de salida no encontrada', 404);
    }
    
    return papeleta;
    
  } catch (error) {
    logger.error(`Error obteniendo papeleta de salida ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nueva papeleta de salida
 * @param {Object} papeletaData - Datos de la papeleta
 * @returns {Object} Papeleta creada
 */
const createPapeleta = async (papeletaData) => {
  try {
    const { 
      personalId, 
      motivoSalidaId, 
      fechaHoraSalida,
      fechaHoraRetornoEstimada,
      observacionSalida,
      usuarioRegistroId
    } = papeletaData;
    
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    if (!personal.activo) {
      throw new AppError('Personal inactivo', 400);
    }
    
    // Verificar que el motivo de salida exista y esté activo
    const motivoSalida = await motivosSalidaRepository.findById(motivoSalidaId);
    if (!motivoSalida) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    if (!motivoSalida.activo) {
      throw new AppError('Motivo de salida inactivo', 400);
    }
    
    // Verificar que la fecha de salida no sea posterior a la fecha de retorno estimada
    if (fechaHoraSalida && fechaHoraRetornoEstimada) {
      const salida = new Date(fechaHoraSalida);
      const retorno = new Date(fechaHoraRetornoEstimada);
      
      if (salida > retorno) {
        throw new AppError('La fecha de salida no puede ser posterior a la fecha de retorno estimada', 400);
      }
    }
    
    // Verificar que no exista otra papeleta pendiente para el mismo personal
    const papeletasPendientes = await repository.findPendientesByPersonal(personalId);
    if (papeletasPendientes.length > 0) {
      throw new AppError('El personal ya tiene una papeleta de salida pendiente', 400);
    }
    
    // Crear la papeleta
    const newPapeleta = await repository.create({
      personal_id: personalId,
      motivo_salida_id: motivoSalidaId,
      fecha_hora_salida: fechaHoraSalida || new Date(),
      fecha_hora_retorno_estimada: fechaHoraRetornoEstimada || null,
      observacion_salida: observacionSalida || null,
      usuario_registro_id: usuarioRegistroId
    });
    
    logger.info(`Papeleta de salida creada para personal ID: ${personalId}`);
    
    return newPapeleta;
    
  } catch (error) {
    logger.error('Error creando papeleta de salida:', error);
    throw error;
  }
};

/**
 * Registrar retorno de papeleta de salida
 * @param {number} id - ID de la papeleta
 * @param {number} usuarioId - ID del usuario que registra el retorno
 * @returns {Object} Papeleta actualizada
 */
const registrarRetorno = async (id, usuarioId) => {
  try {
    // Verificar si la papeleta existe
    const papeleta = await repository.findById(id);
    if (!papeleta) {
      throw new AppError('Papeleta de salida no encontrada', 404);
    }
    
    // Verificar si la papeleta ya tiene retorno registrado
    if (papeleta.fecha_hora_retorno_real) {
      throw new AppError('La papeleta ya tiene retorno registrado', 400);
    }
    
    // Registrar retorno
    const updatedPapeleta = await repository.registrarRetorno(id);
    
    logger.info(`Retorno registrado para papeleta de salida ID: ${id} por usuario ID: ${usuarioId}`);
    
    return updatedPapeleta;
    
  } catch (error) {
    logger.error(`Error registrando retorno para papeleta ID ${id}:`, error);
    throw error;
  }
};

/**
 * Anular papeleta de salida
 * @param {number} id - ID de la papeleta
 * @param {number} usuarioId - ID del usuario que anula
 * @returns {boolean} True si se anuló correctamente
 */
const anularPapeleta = async (id, usuarioId) => {
  try {
    // Verificar si la papeleta existe
    const papeleta = await repository.findById(id);
    if (!papeleta) {
      throw new AppError('Papeleta de salida no encontrada', 404);
    }
    
    // Anular la papeleta
    await repository.anular(id);
    
    logger.info(`Papeleta de salida ID: ${id} anulada por usuario ID: ${usuarioId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error anulando papeleta de salida ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener estadísticas de papeletas de salida
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de papeletas
 */
const getEstadisticas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticas(fechaInicio, fechaFin);
    return stats;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de papeletas de salida:', error);
    throw error;
  }
};

module.exports = {
  getAllPapeletas,
  getPapeletasPendientes,
  getPapeletaById,
  createPapeleta,
  registrarRetorno,
  anularPapeleta,
  getEstadisticas
};
