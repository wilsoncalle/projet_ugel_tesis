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
  
  // Extraer flag de sincronización offline y otros datos
  const { _isOfflineSync, ...visitaData } = req.body;
  
  // Agregar el ID del usuario que registra
  const visitaDataWithUser = {
    ...visitaData,
    usuarioIngresoId: req.user.id
  };
  
  const visita = await service.createVisita(visitaDataWithUser);

  // Solo emitir evento si NO es sincronización offline
  if (!_isOfflineSync) {
    try {
      const io = req.app.get('socketio');
      if (io && visita) {
        io.emit('nueva_visita_registrada', visita);
        logger.info(`Evento 'nueva_visita_registrada' emitido para visita ID: ${visita.id}`);
      }
    } catch (e) {
      logger.warn('No se pudo emitir evento de nueva visita:', e.message);
    }
  } else {
    logger.info(`Sincronización offline detectada, omitiendo emisión de socket para visita ID: ${visita.id}`);
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
  const { _isOfflineSync, fechaSalida, horaSalida, ...salidaData } = req.body; // Extraer flag de sincronización offline
  logger.info(`Registrando salida para visita ID: ${id}`);
  logger.info(`Datos recibidos en el cuerpo de la petición:`, { fechaSalida, horaSalida, _isOfflineSync, body: req.body });
  
  // Agregar el ID del usuario que registra la salida
  const usuarioSalidaId = req.user.id;
  logger.info(`Usuario que registra la salida ID: ${usuarioSalidaId}`);
  
  let visita;
  
  // Si se proporcionan fecha y hora específicas (sincronización offline)
  if (fechaSalida && horaSalida) {
    logger.info(`Registrando salida con fecha/hora específica: ${fechaSalida} ${horaSalida}`);
    logger.info(`Tipo de datos: fechaSalida=${typeof fechaSalida}, horaSalida=${typeof horaSalida}`);
    logger.info(`Valores exactos recibidos:`, { 
      fechaSalida: JSON.stringify(fechaSalida), 
      horaSalida: JSON.stringify(horaSalida),
      fechaSalidaLength: fechaSalida?.length,
      horaSalidaLength: horaSalida?.length
    });
    
    // Validar formato básico
    if (typeof fechaSalida !== 'string' || typeof horaSalida !== 'string') {
      logger.error(`Tipos de datos incorrectos: fechaSalida=${typeof fechaSalida}, horaSalida=${typeof horaSalida}`);
      throw new AppError('Formato de fecha/hora inválido', 400);
    }
    
    visita = await service.registrarSalidaVisitaConFechaHora(id, usuarioSalidaId, fechaSalida, horaSalida);
  } else {
    // Registro normal con fecha/hora actual
    logger.info(`Llamando al servicio registrarSalidaVisita con ID: ${id}, usuarioSalidaId: ${usuarioSalidaId}`);
    logger.info(`No se proporcionaron fecha/hora específicas, usando fecha/hora actual`);
    logger.info(`Valores recibidos: fechaSalida=${fechaSalida}, horaSalida=${horaSalida}`);
    visita = await service.registrarSalidaVisita(id, usuarioSalidaId);
  }
  
  logger.info(`Salida registrada exitosamente para visita ID: ${id}`);
  logger.info(`Datos de la visita actualizada:`, visita);
  
  // Solo emitir evento si NO es sincronización offline
  if (!_isOfflineSync) {
    try {
      const io = req.app.get('socketio');
      if (io && visita) {
        io.emit('salida_visita_registrada', { visitaId: parseInt(id) });
        logger.info(`Evento 'salida_visita_registrada' emitido para visita ID: ${id}`);
      }
    } catch (e) {
      logger.warn('No se pudo emitir evento de salida registrada:', e.message);
    }
  } else {
    logger.info(`Sincronización offline detectada, omitiendo emisión de socket para salida de visita ID: ${id}`);
  }
  
  res.json({
    success: true,
    message: 'Salida de visita registrada exitosamente',
    data: visita
  });
});

/**
 * Exportar visitas a Excel
 * @route GET /api/visitas/export/excel
 */
const exportarAExcel = asyncHandler(async (req, res) => {
  logger.info('Solicitud de exportación a Excel con filtros:', req.query);
  
  // Pasamos los filtros desde query params
  const filtros = req.query;
  
  // Llamar al servicio para generar el archivo
  const buffer = await service.exportarAExcel(filtros);
  
  // Configurar las cabeceras de respuesta para descarga
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Reporte_Visitas_${fecha}.xlsx`
  );
  
  logger.info('Archivo Excel generado exitosamente');
  
  // Enviar el archivo
  res.send(buffer);
});

/**
 * Exportar visitas a PDF
 * @route GET /api/visitas/export/pdf
 */
const exportarAPDF = asyncHandler(async (req, res) => {
  logger.info('Solicitud de exportación a PDF con filtros:', req.query);
  
  // Pasamos los filtros desde query params
  const filtros = req.query;
  
  // Llamar al servicio para generar el archivo
  const buffer = await service.exportarAPDF(filtros);
  
  // Configurar las cabeceras de respuesta para descarga
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Reporte_Visitas_${fecha}.pdf`
  );
  
  logger.info('Archivo PDF generado exitosamente');
  
  // Enviar el archivo
  res.send(buffer);
});

module.exports = {
  getAll,
  getActivas,
  getById,
  create,
  registrarSalida,
  exportarAExcel,
  exportarAPDF
};
