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
  const { _isOfflineSync, ...visitaData } = req.body;
  const visitaDataWithUser = {
    ...visitaData,
    usuarioIngresoId: req.user.id
  };
  
  const visita = await service.createVisita(visitaDataWithUser);

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
  const { _isOfflineSync, fechaSalida, horaSalida, ...salidaData } = req.body;
  logger.info(`Registrando salida para visita ID: ${id}`);
  
  const usuarioSalidaId = req.user.id;
  let visita;
  
  if (fechaSalida && horaSalida) {
    if (typeof fechaSalida !== 'string' || typeof horaSalida !== 'string') {
      throw new AppError('Formato de fecha/hora inválido', 400);
    }
    visita = await service.registrarSalidaVisitaConFechaHora(id, usuarioSalidaId, fechaSalida, horaSalida);
  } else {
    visita = await service.registrarSalidaVisita(id, usuarioSalidaId);
  }
  
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
  const filtros = req.query;
  const buffer = await service.exportarAExcel(filtros);
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Reporte_Visitas_${fecha}.xlsx`);
  res.send(buffer);
});

/**
 * Exportar visitas a PDF
 * @route GET /api/visitas/export/pdf
 */
const exportarAPDF = asyncHandler(async (req, res) => {
  logger.info('Solicitud de exportación a PDF con filtros:', req.query);
  const filtros = req.query;
  const buffer = await service.exportarAPDF(filtros);
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Reporte_Visitas_${fecha}.pdf`);
  res.send(buffer);
});

/**
 * Obtener estadísticas de visitas por área
 */
const getVisitasPorArea = asyncHandler(async (req, res) => {
  const { periodo = 'todo' } = req.query;
  const result = await service.getVisitasPorArea(periodo);
  res.json({ success: true, message: 'Estadísticas por área obtenidas exitosamente', data: result });
});

const getVisitasPorMotivo = asyncHandler(async (req, res) => {
  const { periodo = 'todo' } = req.query;
  const result = await service.getVisitasPorMotivo(periodo);
  res.json({ success: true, message: 'Estadísticas por motivo obtenidas exitosamente', data: result });
});

const getVisitasTotales = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  const result = await service.getVisitasTotales(periodo);
  res.json({ success: true, message: 'Estadísticas totales obtenidas exitosamente', data: result });
});

const getVisitasPorpersonal = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  const result = await service.getVisitasPorpersonal(periodo);
  res.json({ success: true, message: 'Estadísticas por personal obtenidas exitosamente', data: result });
});

const getvisitanteFrecuentes = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  const result = await service.getvisitanteFrecuentes(periodo);
  res.json({ success: true, message: 'visitante frecuentes obtenidos exitosamente', data: result });
});

const getVisitanteDetalle = asyncHandler(async (req, res) => {
  const { visitanteId } = req.params;
  const { periodo = 'mes' } = req.query;
  const result = await service.getVisitanteDetalle(parseInt(visitanteId), periodo);
  res.json({ success: true, message: 'Detalle del visitante obtenido exitosamente', data: result });
});

const cerrarVisitasAutomaticamente = asyncHandler(async (req, res) => {
  try {
    const usuarioSistemaId = req.user?.id || 1; 
    const result = await service.cerrarVisitasAutomaticamente(usuarioSistemaId);
    res.status(200).json({ success: true, message: `Cierre automático completado: ${result.cerradas} visitas cerradas`, data: result });
  } catch (error) {
    logger.error('Error en cierre automático de visitas:', error);
    throw error;
  }
});

// ==========================================
// MÉTODOS ACTUALIZADOS PARA SOCKETS (DRY)
// ==========================================

const accept = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const personalId = req.user.personalId;
  
  if (!personalId) throw new AppError('Usuario no asociado a personal', 400);
  
  const visita = await service.acceptVisita(id, personalId);
  
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'ACEPTADO',
        fecha_aceptacion: visita.fecha_aceptacion,
        personal_visitado_id: visita.personal_visitado_id // NUEVO: Para actualizar badge
      });
    }
  } catch (e) { logger.warn('Error socket:', e.message); }
  
  res.json({ success: true, message: 'Visita aceptada exitosamente', data: visita });
});

const reject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const personalId = req.user.personalId;
  
  if (!personalId) throw new AppError('Usuario no asociado a personal', 400);
  
  const visita = await service.rejectVisita(id, personalId, motivo);
  
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'RECHAZADO',
        fecha_rechazo: visita.fecha_rechazo,
        motivo_rechazo: motivo,
        personal_visitado_id: visita.personal_visitado_id // NUEVO: Para actualizar badge
      });
    }
  } catch (e) { logger.warn('Error socket:', e.message); }
  
  res.json({ success: true, message: 'Visita rechazada exitosamente', data: visita });
});

const delegate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nuevoPersonalId } = req.body;
  const personalId = req.user.personalId;
  
  if (!personalId) throw new AppError('Usuario no asociado a personal', 400);
  
  const visita = await service.delegateVisita(id, personalId, nuevoPersonalId);
  
  try {
    const io = req.app.get('socketio');
    if (io) {
      // Notificar cambio de estado
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'DELEGADO',
        fecha_delegacion: visita.fecha_delegacion,
        delegado_por_id: personalId,         // NUEVO: Para que el que delegó baje su badge
        nuevo_personal_id: visita.personal_visitado_id, // NUEVO: Para que el nuevo suba su badge
        // Datos UI
        nuevo_personal_nombres: visita.personal_nombres,
        nuevo_personal_apellidos: visita.personal_apellidos,
        nuevo_area_nombre: visita.nombre_area
      });

      const visitaCompleta = await service.getVisitaById(id);
      
      // Emitir evento ESPECÍFICO de delegación
      io.emit('visita_delegada', {
        visita_id: visitaCompleta.id,
        personal_visitado_id: visitaCompleta.personal_visitado_id,
        nombres_visitante: visitaCompleta.visitante_nombres,
        apellidos_visitante: visitaCompleta.visitante_apellidos,
        nombre_motivo: visitaCompleta.nombre_motivo,
        delegado_por_id: personalId,
        delegado_por_nombres: visitaCompleta.delegado_por_nombres,
        delegado_por_apellidos: visitaCompleta.delegado_por_apellidos
      });

      // Emitir visita completa pero marcada como delegación para evitar doble notificación
      io.emit('nueva_visita_registrada', { ...visitaCompleta, es_delegacion: true });
    }
  } catch (e) { logger.warn('Error socket:', e.message); }
  
  res.json({ success: true, message: 'Visita delegada exitosamente', data: visita });
});

const finalizarAtencion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const personalId = req.user.personalId;
  
  if (!personalId) throw new AppError('Usuario no asociado a personal', 400);
  
  const visita = await service.finalizarAtencion(id, personalId);
  
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'FINALIZADO',
        personal_visitado_id: visita.personal_visitado_id // NUEVO
      });
    }
  } catch (e) { logger.warn('Error socket:', e.message); }
  
  res.json({ success: true, message: 'Atención finalizada exitosamente', data: visita });
});

const getMisVisitas = asyncHandler(async (req, res) => {
  try {
    const personalId = req.user?.personal_id || req.user?.personalId;
    if (!personalId) return res.status(400).json({ success: false, message: 'Usuario no asociado a un personal' });
    
    const { page = 1, limit = 10, estados = '', anio, mes } = req.query;
    const estadosArray = estados ? estados.split(',').map(e => e.trim()) : [];
    
    const { visitas, total } = await service.findBypersonalVisitado(
      personalId,
      { page: parseInt(page), limit: parseInt(limit), estados: estadosArray, anio: anio ? parseInt(anio) : undefined, mes: mes ? parseInt(mes) : undefined }
    );
    
    res.json({ success: true, message: 'Mis visitas obtenidas exitosamente', data: visitas, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('Error en controlador getMisVisitas:', error);
    throw error;
  }
});

module.exports = {
  getAll, getActivas, getById, create, registrarSalida, cerrarVisitasAutomaticamente,
  exportarAExcel, exportarAPDF, getVisitasPorArea, getVisitasPorMotivo, getVisitasTotales,
  getVisitasPorpersonal, getvisitanteFrecuentes, getVisitanteDetalle,
  accept, reject, delegate, getMisVisitas, finalizarAtencion
};
