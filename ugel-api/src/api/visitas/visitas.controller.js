/**
 * Controlador para gestión de visitas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./visitas.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Obtener todas las visitas con paginación y filtros
 * @route GET /api/visitas
 */
const getAll = asyncHandler(async (req, res) => {
  logger.info('Solicitud de listado de visitas');
  
  const result = await service.getAllVisitas(req.query);
  
  res.json({
    success: true,
    message: 'Visitas obtenidas exitosamente',
    data: result.visitas,
    pagination: result.pagination
  });
});

/**
 * Obtener visitas activas (sin salida)
 * @route GET /api/visitas/activas
 */
const getActivas = asyncHandler(async (req, res) => {
  logger.info('Solicitud de visitas activas');
  
  const result = await service.getVisitasActivas(req.query);
  
  res.json({
    success: true,
    message: 'Visitas activas obtenidas exitosamente',
    data: result.visitas,
    pagination: result.pagination
  });
});

/**
 * Obtener visita por ID
 * @route GET /api/visitas/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Solicitud de visita por ID: ${id}`);
  
  const visita = await service.getVisitaById(id);
  
  res.json({
    success: true,
    message: 'Visita obtenida exitosamente',
    data: visita
  });
});

/**
 * Registrar nueva visita
 * @route POST /api/visitas
 */
const create = asyncHandler(async (req, res) => {
  logger.info('Registrando nueva visita');
  
  // Agregar el ID del usuario que registra
  const visitaData = {
    ...req.body,
    usuarioIngresoId: req.user.id
  };
  
  const visita = await service.createVisita(visitaData);

  // Emitir evento tiempo real a todos los clientes
  try {
    const io = req.app.get('socketio');
    if (io && visita) {
      io.emit('nueva_visita_registrada', visita);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de nueva visita:', e.message);
  }
  
  logger.info(`Visita registrada exitosamente con ID: ${visita.id}`);
  
  res.status(201).json({
    success: true,
    message: 'Visita registrada exitosamente',
    data: visita
  });
});

/**
 * Registrar salida de visita
 * @route PUT /api/visitas/:id/salida
 */
const registrarSalida = asyncHandler(async (req, res) => {
  const { id } = req.params;
  logger.info(`Registrando salida para visita ID: ${id}`);
  
  // Agregar el ID del usuario que registra la salida
  const usuarioSalidaId = req.user.id;
  logger.info(`Usuario que registra la salida ID: ${usuarioSalidaId}`);
  
  logger.info(`Llamando al servicio registrarSalidaVisita con ID: ${id}, usuarioSalidaId: ${usuarioSalidaId}`);
  const visita = await service.registrarSalidaVisita(id, usuarioSalidaId);
  
  logger.info(`Salida registrada exitosamente para visita ID: ${id}`);
  logger.info(`Datos de la visita actualizada:`, visita);
  
  // Emitir evento de salida registrada a todos los clientes
  try {
    const io = req.app.get('socketio');
    if (io && visita) {
      io.emit('salida_visita_registrada', { visitaId: parseInt(id) });
      logger.info(`Evento 'salida_visita_registrada' emitido para visita ID: ${id}`);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de salida registrada:', e.message);
  }
  
  res.json({
    success: true,
    message: 'Salida de visita registrada exitosamente',
    data: visita
  });
});

module.exports = {
  getAll,
  getActivas,
  getById,
  create,
  registrarSalida
};
