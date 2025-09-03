/**
 * Controlador para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./asistenciapersonal.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener registros de asistencia con paginación y filtros
 * @route GET /api/asistencia-personal
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de registros de asistencia');
  
  const result = await service.getAllAsistencias(req.query);
  
  res.json({
    success: true,
    message: 'Registros de asistencia obtenidos exitosamente',
    data: result.asistencias,
    pagination: result.pagination
  });
});

/**
 * Obtener registros de asistencia del día actual
 * @route GET /api/asistencia-personal/hoy
 */
const getHoy = asyncHandler(async (req, res) => {
  logger.info('Solicitud de registros de asistencia del día actual');
  
  const result = await service.getAsistenciasHoy(req.query);
  
  res.json({
    success: true,
    message: 'Registros de asistencia del día obtenidos exitosamente',
    data: result.asistencias,
    pagination: result.pagination
  });
});

/**
 * Obtener registro de asistencia por ID
 * @route GET /api/asistencia-personal/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de registro de asistencia por ID: ${id}`);
  
  const asistencia = await service.getAsistenciaById(id);
  
  res.json({
    success: true,
    message: 'Registro de asistencia obtenido exitosamente',
    data: asistencia
  });
});

/**
 * Registrar ingreso de personal
 * @route POST /api/asistencia-personal/ingreso
 */
const registrarIngreso = asyncHandler(async (req, res) => {
  logger.info('Registrando ingreso de personal');
  
  const { personalId } = req.body;
  
  if (!personalId) {
    throw new AppError('ID de personal requerido', 400);
  }
  
  const asistencia = await service.registrarIngreso(personalId, req.user.id);
  
  logger.info(`Ingreso registrado exitosamente para personal ID: ${personalId}`);
  
  res.status(201).json({
    success: true,
    message: 'Ingreso registrado exitosamente',
    data: asistencia
  });
});

/**
 * Registrar salida de personal
 * @route PUT /api/asistencia-personal/salida
 */
const registrarSalida = asyncHandler(async (req, res) => {
  logger.info('Registrando salida de personal');
  
  const { personalId } = req.body;
  
  if (!personalId) {
    throw new AppError('ID de personal requerido', 400);
  }
  
  const asistencia = await service.registrarSalida(personalId, req.user.id);
  
  logger.info(`Salida registrada exitosamente para personal ID: ${personalId}`);
  
  res.json({
    success: true,
    message: 'Salida registrada exitosamente',
    data: asistencia
  });
});

/**
 * Registrar estado de presencia (presente, ausente, etc.)
 * @route POST /api/asistencia-personal/estado
 */
const registrarEstado = asyncHandler(async (req, res) => {
  logger.info('Registrando estado de presencia');
  
  const { personalId, estadoPresencia } = req.body;
  
  if (!personalId || !estadoPresencia) {
    throw new AppError('ID de personal y estado de presencia requeridos', 400);
  }
  
  const asistencia = await service.registrarEstadoPresencia(personalId, estadoPresencia, req.user.id);
  
  logger.info(`Estado de presencia '${estadoPresencia}' registrado exitosamente para personal ID: ${personalId}`);
  
  res.status(201).json({
    success: true,
    message: 'Estado de presencia registrado exitosamente',
    data: asistencia
  });
});

module.exports = {
  getAll,
  getHoy,
  getById,
  registrarIngreso,
  registrarSalida,
  registrarEstado
};
