/**
 * Servicio para gestión de motivos de visita
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./motivosvisita.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los motivos de visita con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Motivos de visita y datos de paginación
 */
const getAllMotivosVisita = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener motivos de visita con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      motivosVisita: result.motivosVisita,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo motivos de visita:', error);
    throw error;
  }
};

/**
 * Obtener motivo de visita por ID
 * @param {number} id - ID del motivo de visita
 * @returns {Object} Motivo de visita encontrado
 */
const getMotivoVisitaById = async (id) => {
  try {
    const motivoVisita = await repository.findById(id);
    
    if (!motivoVisita) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    
    return motivoVisita;
    
  } catch (error) {
    logger.error(`Error obteniendo motivo de visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo motivo de visita
 * @param {Object} motivoVisitaData - Datos del motivo de visita
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Motivo de visita creado
 */
const createMotivoVisita = async (motivoVisitaData, userId) => {
  try {
    const { nombre } = motivoVisitaData;
    
    // Verificar si ya existe un motivo de visita con el mismo nombre
    const existingMotivoVisita = await repository.findByName(nombre);
    if (existingMotivoVisita) {
      throw new AppError('Ya existe un motivo de visita con este nombre', 409);
    }
    
    // Crear motivo de visita
    const newMotivoVisita = await repository.create({
      nombre_motivo: nombre,
      activo: true
    });
    
    logger.info(`Motivo de visita creado: ${nombre} por usuario ID: ${userId}`);
    
    return newMotivoVisita;
    
  } catch (error) {
    logger.error('Error creando motivo de visita:', error);
    throw error;
  }
};

/**
 * Actualizar motivo de visita existente
 * @param {number} id - ID del motivo de visita
 * @param {Object} motivoVisitaData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Motivo de visita actualizado
 */
const updateMotivoVisita = async (id, motivoVisitaData, userId) => {
  try {
    // Verificar si el motivo de visita existe
    const existingMotivoVisita = await repository.findById(id);
    if (!existingMotivoVisita) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    
    const { nombre, activo } = motivoVisitaData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombre !== undefined) {
      // Verificar si ya existe otro motivo de visita con el mismo nombre
      const duplicateMotivoVisita = await repository.findByName(nombre);
      if (duplicateMotivoVisita && duplicateMotivoVisita.id !== parseInt(id)) {
        throw new AppError('Ya existe otro motivo de visita con este nombre', 409);
      }
      
      updateData.nombre_motivo = nombre;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingMotivoVisita;
    }
    
    // Actualizar motivo de visita
    const updatedMotivoVisita = await repository.update(id, updateData);
    
    logger.info(`Motivo de visita ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedMotivoVisita;
    
  } catch (error) {
    logger.error(`Error actualizando motivo de visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar motivo de visita (soft delete)
 * @param {number} id - ID del motivo de visita
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteMotivoVisita = async (id, userId) => {
  try {
    // Verificar si el motivo de visita existe
    const existingMotivoVisita = await repository.findById(id);
    if (!existingMotivoVisita) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingMotivoVisita.activo) {
      throw new AppError('El motivo de visita ya está inactivo', 400);
    }
    
    // Verificar si el motivo de visita está siendo usado
    const isInUse = await repository.checkMotivoVisitaInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el motivo de visita porque está siendo utilizado en registros existentes', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Motivo de visita ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando motivo de visita ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllMotivosVisita,
  getMotivoVisitaById,
  createMotivoVisita,
  updateMotivoVisita,
  deleteMotivoVisita
};
