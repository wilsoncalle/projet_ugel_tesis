/**
 * Servicio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./asistenciapersonal.repository');
const personalRepository = require('../personal/personal.repository');
const papeletasRepository = require('../papeletas-salida/papeletassalida.repository');
const { AppError } = require('../../middleware/errorHandler');
const config = require('../../config');
const logger = require('../../utils/logger');
const { nowLima, toLimaDateYYYYMMDD } = require('../../utils/fechas');

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
 * IMPORTANTE: Esta función SOLO debe llamarse cuando SÍ hay una horaIngreso.
 * El estado "Ausente" se asigna al final del día por proceso automático.
 * @param {string} horaIngreso - Hora en formato HH:MM:SS (debe existir)
 * @returns {string} Estado de presencia: 'Presente' o 'Tardanza'
 */
const determinarEstadoPresencia = (horaIngreso) => {
  // Si no hay horaIngreso, no debería llamarse a esta función
  // Pero por seguridad, retornamos 'Presente' como fallback
  if (!horaIngreso) {
    logger.warn('determinarEstadoPresencia llamada sin horaIngreso. Retornando Presente por defecto.');
    return 'Presente';
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
  
  // Si llega a las 9:15 o antes → Presente
  // Si llega después de las 9:15 → Tardanza (sin importar qué tan tarde sea)
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
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    
    // Verificar si el personal tiene una papeleta activa para esta fecha
    // Si tiene papeleta activa, debe marcarse como 'En Permiso' (no tardanza ni ausente)
    const papeletaActiva = await papeletasRepository.encontrarPapeletaActivaPorFecha(personalId, fechaActual);
    
    // Determinar estado según la hora de ingreso
    // Si tiene papeleta activa, siempre es 'En Permiso' (no se marca tardanza)
    let estadoPresencia;
    if (papeletaActiva) {
      estadoPresencia = 'En Permiso';
      logger.info(`Personal ID ${personalId} tiene papeleta activa (${papeletaActiva.codigo_papeleta}) - Estado: En Permiso`);
    } else {
      estadoPresencia = determinarEstadoPresencia(horaActual);
      logger.info(`Registrando ingreso - Hora Lima: ${horaActual}, Estado: ${estadoPresencia}`);
    }
    
    // Verificar si ya existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (registroExistente) {
      // Si ya existe un registro con hora de ingreso, no permitir registrar nuevamente
      // (esto previene duplicados, pero el registro de ingreso NUNCA debe estar bloqueado por el estado)
      if (registroExistente.hora_ingreso) {
        throw new AppError('El personal ya tiene un ingreso registrado para hoy', 400);
      }
      
      // Si existe un registro pero sin hora de ingreso (ej. se marcó como ausente manualmente),
      // actualizarlo con la hora de ingreso y recalcular el estado
      const asistencia = await repository.updateIngreso(registroExistente.id, horaActual, estadoPresencia, usuarioId);
      
      logger.info(`Ingreso actualizado para personal ID ${personalId} a las ${horaActual} - Estado: ${estadoPresencia}`);
      
      return asistencia;
    } else {
      // Si no existe un registro, crear uno nuevo
      // IMPORTANTE: El registro siempre se crea, sin importar la hora del día
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
    
    // Obtener fecha y hora actual en zona horaria de Lima (UTC-5)
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    
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
    
    // Obtener fecha actual en formato YYYY-MM-DD (Lima)
    const { fecha: fechaActual } = nowLima();
    
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
 * Marcar como ausentes a todos los personal activos que no tienen horaIngreso registrada
 * Esta función debe ejecutarse al final del día (ej. 23:59) para marcar ausentes del día anterior
 * @param {string} fecha - Fecha en formato YYYY-MM-DD (opcional, por defecto usa el día anterior)
 * @param {number} usuarioSistemaId - ID del usuario del sistema que ejecuta la acción
 * @returns {Object} Resultado con cantidad de registros actualizados
 */
const marcarAusentesAlFinalDelDia = async (fecha = null, usuarioSistemaId = 1) => {
  try {
    // Si no se proporciona fecha, usar el día anterior (en zona horaria Lima)
    let fechaProcesar = fecha;
    
    if (!fechaProcesar) {
      const ahora = new Date();
      const limaOffset = -5 * 60; // -5 horas en minutos
      const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
      const limaTime = new Date(utcTime + (limaOffset * 60000));
      
      // Obtener el día anterior
      limaTime.setDate(limaTime.getDate() - 1);
      fechaProcesar = limaTime.toISOString().split('T')[0];
    }
    
    logger.info(`Iniciando marcado de ausentes para fecha: ${fechaProcesar}`);
    
    const resultado = await repository.marcarAusentesAlFinalDelDia(fechaProcesar, usuarioSistemaId);
    
    logger.info(`Marcado de ausentes completado: ${resultado.total} registros procesados (${resultado.registrosCreados} creados, ${resultado.registrosActualizados} actualizados)`);
    
    return resultado;
    
  } catch (error) {
    logger.error('Error marcando ausentes al final del día:', error);
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

/**
 * Obtener estadísticas de total de asistencias
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de total de asistencias
 */
const getEstadisticasTotales = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasTotales(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas totales:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de puntualidad y tardanzas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de puntualidad
 */
const getEstadisticasPuntualidad = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasPuntualidad(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas de puntualidad:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de ausencias y justificaciones
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de ausencias
 */
const getEstadisticasAusencias = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasAusencias(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas de ausencias:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por áreas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas por áreas
 */
const getEstadisticasAreas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasAreas(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas por áreas:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por personal
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas por personal
 */
const getEstadisticasPersonal = async (options = {}) => {
  const { fechaInicio, fechaFin, personalId } = options;
  
  try {
    const stats = await repository.getEstadisticasPersonal(fechaInicio, fechaFin, personalId);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas por personal:', error);
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
  marcarAusentesAlFinalDelDia,
  getEstadisticas,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticasPersonal
};
