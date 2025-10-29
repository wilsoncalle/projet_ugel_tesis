/**
 * Servicio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./asistenciapersonal.repository');
const personalRepository = require('../personal/personal.repository');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');

/**
 * Obtener registros de asistencia con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Registros de asistencia y datos de paginación
 */
const getAllAsistencias = async (options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    q = '',
    fecha,
    fechaInicio,
    fechaFin,
    personalId,
    estadoPresencia
  } = options;
  
  try {
    // Obtener asistencias con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      fecha,
      fechaInicio,
      fechaFin,
      personalId: personalId ? parseInt(personalId) : undefined,
      estadoPresencia
    });
    
    // Formatear respuesta
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia:', error);
    throw error;
  }
};

/**
 * Obtener registros de asistencia del día actual
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Registros de asistencia del día y datos de paginación
 */
const getAsistenciasHoy = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener fecha actual en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];
    
    // Obtener asistencias del día con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      fecha: hoy
    });
    
    // Formatear respuesta
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia del día:', error);
    throw error;
  }
};

/**
 * Obtener registro de asistencia por ID
 * @param {number} id - ID del registro de asistencia
 * @returns {Object} Registro de asistencia encontrado
 */
const getAsistenciaById = async (id) => {
  try {
    const asistencia = await repository.findById(id);
    
    if (!asistencia) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    return asistencia;
    
  } catch (error) {
    logger.error(`Error obteniendo registro de asistencia ID ${id}:`, error);
    throw error;
  }
};

/**
 * Determinar estado de presencia según la hora de ingreso
 * @param {string} horaIngreso - Hora en formato HH:MM:SS
 * @returns {string} Estado de presencia: 'Presente' o 'Tardanza'
 */
const determinarEstadoPresencia = (horaIngreso) => {
  if (!horaIngreso) {
    return 'Ausente';
  }
  
  // Separar la hora en componentes
  const partesHora = horaIngreso.split(':');
  if (partesHora.length < 2) {
    return 'Presente'; // Por defecto si no se puede parsear
  }
  
  const horas = parseInt(partesHora[0], 10);
  const minutos = parseInt(partesHora[1], 10);
  
  // Validar que sean números válidos
  if (isNaN(horas) || isNaN(minutos)) {
    return 'Presente'; // Por defecto si no son números válidos
  }
  
  // Convertir a minutos totales desde medianoche para comparar
  const minutosTotales = horas * 60 + minutos;
  const limiteMinutos = 9 * 60 + 15; // 9:15 = 555 minutos
  
  // Si llega a las 9:00, 9:15 o antes → Presente
  // Si llega después de las 9:15 → Tardanza
  if (minutosTotales <= limiteMinutos) {
    return 'Presente';
  } else {
    return 'Tardanza';
  }
};

/**
 * Registrar ingreso de personal
 * @param {number} personalId - ID del personal
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia creado o actualizado
 */
const registrarIngreso = async (personalId, usuarioId) => {
  try {
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    if (!personal.activo) {
      throw new AppError('Personal inactivo', 400);
    }
    
    // Obtener fecha y hora actual en zona horaria de Lima (UTC-5)
    const ahora = new Date();
    // Obtener la hora en Lima (UTC-5)
    const limaOffset = -5 * 60; // -5 horas en minutos
    const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const limaTime = new Date(utcTime + (limaOffset * 60000));
    
    // Obtener fecha actual en formato YYYY-MM-DD (Lima)
    const fechaActual = limaTime.toISOString().split('T')[0];
    
    // Obtener hora actual en formato HH:MM:SS (Lima)
    const horaActual = limaTime.toTimeString().split(' ')[0];
    
    // Determinar estado según la hora de ingreso
    const estadoPresencia = determinarEstadoPresencia(horaActual);
    
    logger.info(`Registrando ingreso - Hora Lima: ${horaActual}, Estado: ${estadoPresencia}`);
    
    // Verificar si ya existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (registroExistente) {
      // Si ya existe un registro con hora de ingreso, no permitir registrar nuevamente
      if (registroExistente.hora_ingreso) {
        throw new AppError('El personal ya tiene un ingreso registrado para hoy', 400);
      }
      
      // Si existe un registro pero sin hora de ingreso, actualizarlo
      const asistencia = await repository.updateIngreso(registroExistente.id, horaActual, estadoPresencia, usuarioId);
      
      logger.info(`Ingreso actualizado para personal ID ${personalId} a las ${horaActual} - Estado: ${estadoPresencia}`);
      
      return asistencia;
    } else {
      // Si no existe un registro, crear uno nuevo
      const asistencia = await repository.create({
        personal_id: personalId,
        fecha: fechaActual,
        hora_ingreso: horaActual,
        hora_salida: null,
        estado_presencia: estadoPresencia,
        usuario_registro_id: usuarioId
      });
      
      logger.info(`Ingreso registrado para personal ID ${personalId} a las ${horaActual} - Estado: ${estadoPresencia}`);
      
      return asistencia;
    }
    
  } catch (error) {
    logger.error(`Error registrando ingreso para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Registrar salida de personal
 * @param {number} personalId - ID del personal
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia actualizado
 */
const registrarSalida = async (personalId, usuarioId) => {
  try {
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Obtener fecha actual en formato YYYY-MM-DD
    const fechaActual = new Date().toISOString().split('T')[0];
    
    // Verificar si existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (!registroExistente) {
      throw new AppError('No hay un registro de ingreso para hoy', 400);
    }
    
    // Si ya existe un registro con hora de salida, no permitir registrar nuevamente
    if (registroExistente.hora_salida) {
      throw new AppError('El personal ya tiene una salida registrada para hoy', 400);
    }
    
    // Actualizar el registro con la hora de salida
    const horaActual = new Date().toTimeString().split(' ')[0];
    const asistencia = await repository.updateSalida(registroExistente.id, horaActual);
    
    logger.info(`Salida registrada para personal ID ${personalId} a las ${horaActual}`);
    
    return asistencia;
    
  } catch (error) {
    logger.error(`Error registrando salida para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Registrar estado de presencia (presente, ausente, etc.)
 * @param {number} personalId - ID del personal
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia creado o actualizado
 */
const registrarEstadoPresencia = async (personalId, estadoPresencia, usuarioId) => {
  try {
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar que el estado de presencia sea válido
    if (!config.validation.validPresenceStates.includes(estadoPresencia)) {
      throw new AppError(`Estado de presencia inválido. Estados válidos: ${config.validation.validPresenceStates.join(', ')}`, 400);
    }
    
    // Obtener fecha actual en formato YYYY-MM-DD
    const fechaActual = new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (registroExistente) {
      // Actualizar el registro existente
      const asistencia = await repository.updateEstadoPresencia(registroExistente.id, estadoPresencia, usuarioId);
      
      logger.info(`Estado de presencia actualizado a '${estadoPresencia}' para personal ID ${personalId}`);
      
      return asistencia;
    } else {
      // Crear un nuevo registro
      const asistencia = await repository.create({
        personal_id: personalId,
        fecha: fechaActual,
        hora_ingreso: null,
        hora_salida: null,
        estado_presencia: estadoPresencia,
        usuario_registro_id: usuarioId
      });
      
      logger.info(`Estado de presencia '${estadoPresencia}' registrado para personal ID ${personalId}`);
      
      return asistencia;
    }
    
  } catch (error) {
    logger.error(`Error registrando estado de presencia para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Obtener estadísticas de asistencia
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de asistencia
 */
const getEstadisticas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticas(fechaInicio, fechaFin);
    return stats;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de asistencia:', error);
    throw error;
  }
};

module.exports = {
  getAllAsistencias,
  getAsistenciasHoy,
  getAsistenciaById,
  registrarIngreso,
  registrarSalida,
  registrarEstadoPresencia,
  getEstadisticas
};
