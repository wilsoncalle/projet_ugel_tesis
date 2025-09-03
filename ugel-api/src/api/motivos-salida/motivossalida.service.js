/**
 * Servicio para gestión de motivos de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./motivossalida.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todos los motivos de salida con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Motivos de salida y datos de paginación
 */
const getAllMotivosSalida = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener motivos de salida con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      motivosSalida: result.motivosSalida,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo motivos de salida:', error);
    throw error;
  }
};

/**
 * Obtener motivo de salida por ID
 * @param {number} id - ID del motivo de salida
 * @returns {Object} Motivo de salida encontrado
 */
const getMotivoSalidaById = async (id) => {
  try {
    const motivoSalida = await repository.findById(id);
    
    if (!motivoSalida) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    
    return motivoSalida;
    
  } catch (error) {
    logger.error(`Error obteniendo motivo de salida ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nuevo motivo de salida
 * @param {Object} motivoSalidaData - Datos del motivo de salida
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Motivo de salida creado
 */
const createMotivoSalida = async (motivoSalidaData, userId) => {
  try {
    const { nombre } = motivoSalidaData;
    
    // Verificar si ya existe un motivo de salida con el mismo nombre
    const existingMotivoSalida = await repository.findByName(nombre);
    if (existingMotivoSalida) {
      throw new AppError('Ya existe un motivo de salida con este nombre', 409);
    }
    
    // Crear motivo de salida
    const newMotivoSalida = await repository.create({
      nombre_motivo: nombre,
      activo: true
    });
    
    logger.info(`Motivo de salida creado: ${nombre} por usuario ID: ${userId}`);
    
    return newMotivoSalida;
    
  } catch (error) {
    logger.error('Error creando motivo de salida:', error);
    throw error;
  }
};

/**
 * Actualizar motivo de salida existente
 * @param {number} id - ID del motivo de salida
 * @param {Object} motivoSalidaData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Motivo de salida actualizado
 */
const updateMotivoSalida = async (id, motivoSalidaData, userId) => {
  try {
    // Verificar si el motivo de salida existe
    const existingMotivoSalida = await repository.findById(id);
    if (!existingMotivoSalida) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    
    const { nombre, activo } = motivoSalidaData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombre !== undefined) {
      // Verificar si ya existe otro motivo de salida con el mismo nombre
      const duplicateMotivoSalida = await repository.findByName(nombre);
      if (duplicateMotivoSalida && duplicateMotivoSalida.id !== parseInt(id)) {
        throw new AppError('Ya existe otro motivo de salida con este nombre', 409);
      }
      
      updateData.nombre_motivo = nombre;
    }
    
    if (activo !== undefined) {
      updateData.activo = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingMotivoSalida;
    }
    
    // Actualizar motivo de salida
    const updatedMotivoSalida = await repository.update(id, updateData);
    
    logger.info(`Motivo de salida ID ${id} actualizado por usuario ID: ${userId}`);
    
    return updatedMotivoSalida;
    
  } catch (error) {
    logger.error(`Error actualizando motivo de salida ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar motivo de salida (soft delete)
 * @param {number} id - ID del motivo de salida
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteMotivoSalida = async (id, userId) => {
  try {
    // Verificar si el motivo de salida existe
    const existingMotivoSalida = await repository.findById(id);
    if (!existingMotivoSalida) {
      throw new AppError('Motivo de salida no encontrado', 404);
    }
    
    // Verificar si ya está inactivo
    if (!existingMotivoSalida.activo) {
      throw new AppError('El motivo de salida ya está inactivo', 400);
    }
    
    // Verificar si el motivo de salida está siendo usado
    const isInUse = await repository.checkMotivoSalidaInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el motivo de salida porque está siendo utilizado en registros existentes', 400);
    }
    
    // Soft delete (marcar como inactivo)
    await repository.softDelete(id);
    
    logger.info(`Motivo de salida ID ${id} eliminado (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando motivo de salida ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllMotivosSalida,
  getMotivoSalidaById,
  createMotivoSalida,
  updateMotivoSalida,
  deleteMotivoSalida
};
