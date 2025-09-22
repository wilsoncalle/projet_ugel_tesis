/**
 * Servicio para gestión de visitas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./visitas.repository');
const visitantesRepository = require('../visitantes/visitantes.repository');
const areasRepository = require('../areas/areas.repository');
const personalRepository = require('../personal/personal.repository');
const motivosVisitaRepository = require('../motivos-visita/motivosvisita.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las visitas con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Visitas y datos de paginación
 */
const getAllVisitas = async (options = {}) => {
  const { 
    page = 1, 
    limit = 15, 
    q = '',
    fechaInicio,
    fechaFin,
    areaId,
    motivoVisitaId,
    personalVisitadoId,
    documentoVisitante
  } = options;
  
  
  try {
    // Obtener visitas con paginación
    const result = await repository.findAll({
      page: parseInt(page), // Asegurar que sea número
      limit: parseInt(limit), // Asegurar que sea número
      search: q,
      fechaInicio,
      fechaFin,
      areaId: areaId ? parseInt(areaId) : undefined, // CAMBIO: usar areaId
      motivoVisitaId: motivoVisitaId ? parseInt(motivoVisitaId) : undefined,
      personalVisitadoId: personalVisitadoId ? parseInt(personalVisitadoId) : undefined,
      documentoVisitante
    });
    
    // Formatear respuesta
    const response = {
      visitas: result.visitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
    
    return response;
    
  } catch (error) {
    logger.error('Error obteniendo visitas:', error);
    throw error;
  }
};

/**
 * Obtener visitas activas (sin salida) con paginación
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Visitas activas y datos de paginación
 */
const getVisitasActivas = async (options = {}) => {
  const { page = 1, limit = 15, q = '' } = options;
  
  try {
    // Obtener visitas activas con paginación
    const result = await repository.findActivas({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      visitas: result.visitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo visitas activas:', error);
    throw error;
  }
};

/**
 * Obtener visita por ID
 * @param {number} id - ID de la visita
 * @returns {Object} Visita encontrada
 */
const getVisitaById = async (id) => {
  try {
    const visita = await repository.findById(id);
    
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    return visita;
    
  } catch (error) {
    logger.error(`Error obteniendo visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nueva visita
 * @param {Object} visitaData - Datos de la visita
 * @returns {Object} Visita creada
 */
const createVisita = async (visitaData) => {
  try {
    const { 
      visitanteId, 
      tipoDocumentoId,
      numeroDocumento,
      nombres,
      apellidos,
      areaDestinoId, 
      personalVisitadoId, 
      motivoVisitaId,
      usuarioIngresoId
    } = visitaData;
    
    let visitante;
    
    // Si no se proporciona un visitante existente, crear uno nuevo
    if (!visitanteId) {
      if (!tipoDocumentoId || !numeroDocumento || !nombres || !apellidos) {
        throw new AppError('Datos del visitante incompletos', 400);
      }
      
      // Verificar si ya existe el visitante
      visitante = await visitantesRepository.findByDocumento(tipoDocumentoId, numeroDocumento);
      
      // Si no existe, crearlo
      if (!visitante) {
        visitante = await visitantesRepository.create({
          tipo_documento_id: tipoDocumentoId,
          numero_documento: numeroDocumento,
          nombres,
          apellidos
        });
      }
    } else {
      // Verificar que el visitante exista
      visitante = await visitantesRepository.findById(visitanteId);
      if (!visitante) {
        throw new AppError('Visitante no encontrado', 404);
      }
    }
    
    // Verificar que el área de destino exista y esté activa
    const area = await areasRepository.findById(areaDestinoId);
    if (!area) {
      throw new AppError('Área de destino no encontrada', 404);
    }
    if (!area.activa) {
      throw new AppError('Área de destino inactiva', 400);
    }
    
    // Verificar que el personal visitado exista y esté activo (si se proporciona)
    if (personalVisitadoId) {
      const personal = await personalRepository.findById(personalVisitadoId);
      if (!personal) {
        throw new AppError('Personal visitado no encontrado', 404);
      }
      if (!personal.activo) {
        throw new AppError('Personal visitado inactivo', 400);
      }
    }
    
    // Verificar que el motivo de visita exista y esté activo
    const motivoVisita = await motivosVisitaRepository.findById(motivoVisitaId);
    if (!motivoVisita) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    if (!motivoVisita.activo) {
      throw new AppError('Motivo de visita inactivo', 400);
    }
    
    // Verificar si el visitante ya tiene una visita activa (sin salida) en la misma área
    const visitaActiva = await repository.findVisitaActivaPorVisitante(visitante.id);
if (visitaActiva) {
  throw new AppError(
    `El visitante ya tiene una visita activa en el área "${visitaActiva.nombre_area}" desde ${new Date(visitaActiva.fecha_ingreso).toLocaleString()}. Debe registrar su salida antes de una nueva entrada.`, 
    409
  );
}
    
    // Crear la visita
    const newVisita = await repository.create({
      visitante_id: visitante.id,
      area_destino_id: areaDestinoId,
      personal_visitado_id: personalVisitadoId || null,
      motivo_visita_id: motivoVisitaId,
      fecha_ingreso: new Date(),
      usuario_ingreso_id: usuarioIngresoId
    });
    
    logger.info(`Visita creada para visitante ID: ${visitante.id}`);
    
    return newVisita;
    
  } catch (error) {
    logger.error('Error creando visita:', error);
    throw error;
  }
};

/**
 * Registrar salida de visita
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @returns {Object} Visita actualizada
 */
const registrarSalidaVisita = async (id, usuarioSalidaId) => {
  try {
    logger.info(`Servicio: Verificando si la visita ID ${id} existe`);
    
    // Verificar si la visita existe
    const visita = await repository.findById(id);
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    logger.info(`Servicio: Visita encontrada:`, visita);
    
    // Verificar si la visita ya tiene salida registrada
    if (visita.fecha_salida) {
      logger.info(`Servicio: La visita ya tiene salida registrada: ${visita.fecha_salida}`);
      throw new AppError('La visita ya tiene salida registrada', 400);
    }
    
    logger.info(`Servicio: Llamando al repositorio para registrar salida`);
    
    // Registrar salida
    const updatedVisita = await repository.registrarSalida(id, usuarioSalidaId);
    
    logger.info(`Servicio: Salida registrada exitosamente para visita ID: ${id}`);
    logger.info(`Servicio: Visita actualizada:`, updatedVisita);
    
    return updatedVisita;
    
  } catch (error) {
    logger.error(`Error registrando salida para visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener estadísticas de visitas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de visitas
 */
const getEstadisticas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticas(fechaInicio, fechaFin);
    return stats;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de visitas:', error);
    throw error;
  }
};

module.exports = {
  getAllVisitas,
  getVisitasActivas,
  getVisitaById,
  createVisita,
  registrarSalidaVisita,
  getEstadisticas
};
