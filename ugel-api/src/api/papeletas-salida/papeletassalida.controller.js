/**
 * Controlador para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./papeletassalida.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las papeletas de salida con paginación y filtros
 * @route GET /api/papeletas-salida
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de papeletas de salida');
  
  const result = await service.getAllPapeletas(req.query);
  
  res.json({
    success: true,
    message: 'Papeletas de salida obtenidas exitosamente',
    data: result.papeletas,
    pagination: result.pagination
  });
});

/**
 * Obtener papeletas de salida pendientes de retorno
 * @route GET /api/papeletas-salida/pendientes
 */
const getPendientes = asyncHandler(async (req, res) => {
  logger.info('Solicitud de papeletas de salida pendientes');
  
  const result = await service.getPapeletasPendientes(req.query);
  
  res.json({
    success: true,
    message: 'Papeletas de salida pendientes obtenidas exitosamente',
    data: result.papeletas,
    pagination: result.pagination
  });
});

/**
 * Obtener papeleta de salida por ID
 * @route GET /api/papeletas-salida/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de papeleta de salida por ID: ${id}`);
  
  const papeleta = await service.getPapeletaById(id);
  
  res.json({
    success: true,
    message: 'Papeleta de salida obtenida exitosamente',
    data: papeleta
  });
});

/**
 * Registrar nueva papeleta de salida
 * @route POST /api/papeletas-salida
 */
const create = asyncHandler(async (req, res) => {
  logger.info('Registrando nueva papeleta de salida');
  
  // Agregar el ID del usuario que registra
  const papeletaData = {
    ...req.body,
    usuarioRegistroId: req.user.id
  };
  
  const papeleta = await service.createPapeleta(papeletaData);
  
  logger.info(`Papeleta de salida registrada exitosamente con ID: ${papeleta.id}`);
  
  res.status(201).json({
    success: true,
    message: 'Papeleta de salida registrada exitosamente',
    data: papeleta
  });
});

/**
 * Registrar retorno de papeleta de salida
 * @route PUT /api/papeletas-salida/:id/retorno
 */
const registrarRetorno = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Registrando retorno para papeleta de salida ID: ${id}`);
  
  const papeleta = await service.registrarRetorno(id, req.user.id);
  
  logger.info(`Retorno registrado exitosamente para papeleta de salida ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Retorno de papeleta registrado exitosamente',
    data: papeleta
  });
});

/**
 * Anular papeleta de salida
 * @route DELETE /api/papeletas-salida/:id
 */
const anular = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Anulando papeleta de salida ID: ${id}`);
  
  await service.anularPapeleta(id, req.user.id);
  
  logger.info(`Papeleta de salida anulada exitosamente ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Papeleta de salida anulada exitosamente'
  });
});

module.exports = {
  getAll,
  getPendientes,
  getById,
  create,
  registrarRetorno,
  anular
};
