/**
 * Servicio para gestión de áreas de destino
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./areas.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las áreas con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Áreas y datos de paginación
 */
const getAllAreas = async (options = {}) => {
  const { page = 1, limit = 20, q = '', activo } = options;
  
  try {
    // Obtener áreas con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      activo: activo !== undefined ? activo === 'true' : undefined
    });
    
    // Formatear respuesta
    return {
      areas: result.areas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo áreas:', error);
    throw error;
  }
};

/**
 * Obtener área por ID
 * @param {number} id - ID del área
 * @returns {Object} Área encontrada
 */
const getAreaById = async (id) => {
  try {
    const area = await repository.findById(id);
    
    if (!area) {
      throw new AppError('Área no encontrada', 404);
    }
    
    return area;
    
  } catch (error) {
    logger.error(`Error obteniendo área ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nueva área
 * @param {Object} areaData - Datos del área
 * @param {number} userId - ID del usuario que crea
 * @returns {Object} Área creada
 */
const createArea = async (areaData, userId) => {
  try {
    const { nombre } = areaData;
    
    // Verificar si ya existe un área con el mismo nombre
    const existingArea = await repository.findByName(nombre);
    if (existingArea) {
      throw new AppError('Ya existe un área con este nombre', 409);
    }
    
    // Crear área
    const newArea = await repository.create({
      nombre_area: nombre,
      activa: true
    });
    
    logger.info(`Área creada: ${nombre} por usuario ID: ${userId}`);
    
    return newArea;
    
  } catch (error) {
    logger.error('Error creando área:', error);
    throw error;
  }
};

/**
 * Actualizar área existente
 * @param {number} id - ID del área
 * @param {Object} areaData - Datos a actualizar
 * @param {number} userId - ID del usuario que actualiza
 * @returns {Object} Área actualizada
 */
const updateArea = async (id, areaData, userId) => {
  try {
    // Verificar si el área existe
    const existingArea = await repository.findById(id);
    if (!existingArea) {
      throw new AppError('Área no encontrada', 404);
    }
    
    const { nombre, activo } = areaData;
    const updateData = {};
    
    // Preparar datos a actualizar
    if (nombre !== undefined) {
      // Verificar si ya existe otra área con el mismo nombre
      const duplicateArea = await repository.findByName(nombre);
      if (duplicateArea && duplicateArea.id !== parseInt(id)) {
        throw new AppError('Ya existe otra área con este nombre', 409);
      }
      
      updateData.nombre_area = nombre;
    }
    
    if (activo !== undefined) {
      updateData.activa = activo;
    }
    
    // Si no hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      return existingArea;
    }
    
    // Actualizar área
    const updatedArea = await repository.update(id, updateData);
    
    logger.info(`Área ID ${id} actualizada por usuario ID: ${userId}`);
    
    return updatedArea;
    
  } catch (error) {
    logger.error(`Error actualizando área ID ${id}:`, error);
    throw error;
  }
};

/**
 * Eliminar área (soft delete)
 * @param {number} id - ID del área
 * @param {number} userId - ID del usuario que elimina
 * @returns {boolean} True si se eliminó correctamente
 */
const deleteArea = async (id, userId) => {
  try {
    // Verificar si el área existe
    const existingArea = await repository.findById(id);
    if (!existingArea) {
      throw new AppError('Área no encontrada', 404);
    }
    
    // Verificar si ya está inactiva
    if (!existingArea.activa) {
      throw new AppError('El área ya está inactiva', 400);
    }
    
    // Verificar si el área está siendo usada por personal
    const isInUse = await repository.checkAreaInUse(id);
    if (isInUse) {
      throw new AppError('No se puede eliminar el área porque está siendo utilizada por personal activo', 400);
    }
    
    // Soft delete (marcar como inactiva)
    await repository.softDelete(id);
    
    logger.info(`Área ID ${id} eliminada (soft delete) por usuario ID: ${userId}`);
    
    return true;
    
  } catch (error) {
    logger.error(`Error eliminando área ID ${id}:`, error);
    throw error;
  }
};

module.exports = {
  getAllAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea
};
