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

/**
 * Obtener estadísticas de visitas por área
 * @route GET /api/visitas/por-area
 */
const getVisitasPorArea = asyncHandler(async (req, res) => {
  const { periodo = 'todo' } = req.query;
  logger.info(`Solicitud de estadísticas por área para periodo: ${periodo}`);
  
  const result = await service.getVisitasPorArea(periodo);
  
  res.json({
    success: true,
    message: 'Estadísticas por área obtenidas exitosamente',
    data: result
  });
});

const getVisitasPorMotivo = asyncHandler(async (req, res) => {
  const { periodo = 'todo' } = req.query;
  logger.info(`Solicitud de estadísticas por motivo para periodo: ${periodo}`);
  
  const result = await service.getVisitasPorMotivo(periodo);
  
  res.json({
    success: true,
    message: 'Estadísticas por motivo obtenidas exitosamente',
    data: result
  });
});

/**
 * Obtener estadísticas de visitas totales
 * @route GET /api/visitas/totales
 */
const getVisitasTotales = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  logger.info(`Solicitud de estadísticas totales para periodo: ${periodo}`);
  
  const result = await service.getVisitasTotales(periodo);
  
  res.json({
    success: true,
    message: 'Estadísticas totales obtenidas exitosamente',
    data: result
  });
});

/**
 * Obtener estadísticas de visitas por personal visitado
 * @route GET /api/visitas/por-personal
 */
const getVisitasPorPersonal = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  logger.info(`Solicitud de estadísticas por personal para periodo: ${periodo}`);
  
  const result = await service.getVisitasPorPersonal(periodo);
  
  res.json({
    success: true,
    message: 'Estadísticas por personal obtenidas exitosamente',
    data: result
  });
});

/**
 * Obtener visitantes frecuentes
 * @route GET /api/visitas/visitantes-frecuentes
 */
const getVisitantesFrecuentes = asyncHandler(async (req, res) => {
  const { periodo = 'mes' } = req.query;
  logger.info(`Solicitud de visitantes frecuentes para periodo: ${periodo}`);
  
  const result = await service.getVisitantesFrecuentes(periodo);
  
  res.json({
    success: true,
    message: 'Visitantes frecuentes obtenidos exitosamente',
    data: result
  });
});

/**
 * Obtener detalle de visitas de un visitante específico
 * @route GET /api/visitas/visitante/:visitanteId/detalle
 */
const getVisitanteDetalle = asyncHandler(async (req, res) => {
  const { visitanteId } = req.params;
  const { periodo = 'mes' } = req.query;
  logger.info(`Solicitud de detalle del visitante ${visitanteId} para periodo: ${periodo}`);
  
  const result = await service.getVisitanteDetalle(parseInt(visitanteId), periodo);
  
  res.json({
    success: true,
    message: 'Detalle del visitante obtenido exitosamente',
    data: result
  });
});

/**
 * Cerrar automáticamente visitas pendientes
 * @route POST /api/visitas/cerrar-automatico
 */
const cerrarVisitasAutomaticamente = asyncHandler(async (req, res) => {
  try {
    // Obtener el ID del usuario del sistema (o usar el usuario que hace la petición)
    const usuarioSistemaId = req.user?.id || 1; // Fallback a usuario 1 si no hay usuario autenticado
    
    logger.info(`Solicitud de cierre automático de visitas por usuario ${usuarioSistemaId}`);
    
    const result = await service.cerrarVisitasAutomaticamente(usuarioSistemaId);
    
    res.status(200).json({
      success: true,
      message: `Cierre automático completado: ${result.cerradas} visitas cerradas`,
      data: result
    });
  } catch (error) {
    logger.error('Error en cierre automático de visitas:', error);
    throw error;
  }
});

/**
 * Aceptar visita
 * @route POST /api/visitas/:id/aceptar
 */
const accept = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const personalId = req.user.personalId;
  
  if (!personalId) {
    throw new AppError('Usuario no asociado a personal', 400);
  }
  
  const visita = await service.acceptVisita(id, personalId);
  
  // Emitir evento de socket
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'ACEPTADO',
        fecha_aceptacion: visita.fecha_aceptacion
      });
      logger.info(`Evento 'estado_visita_actualizado' (ACEPTADO) emitido para visita ID: ${id}`);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de visita aceptada:', e.message);
  }
  
  res.json({
    success: true,
    message: 'Visita aceptada exitosamente',
    data: visita
  });
});

/**
 * Rechazar visita
 * @route POST /api/visitas/:id/rechazar
 */
const reject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const personalId = req.user.personalId;
  
  if (!personalId) {
    throw new AppError('Usuario no asociado a personal', 400);
  }
  
  const visita = await service.rejectVisita(id, personalId, motivo);
  
  // Emitir evento de socket
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'RECHAZADO',
        fecha_rechazo: visita.fecha_rechazo,
        motivo_rechazo: motivo
      });
      logger.info(`Evento 'estado_visita_actualizado' (RECHAZADO) emitido para visita ID: ${id}`);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de visita rechazada:', e.message);
  }
  
  res.json({
    success: true,
    message: 'Visita rechazada exitosamente',
    data: visita
  });
});

/**
 * Delegar visita
 * @route POST /api/visitas/:id/delegar
 */
const delegate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nuevoPersonalId } = req.body;
  const personalId = req.user.personalId;
  
  if (!personalId) {
    throw new AppError('Usuario no asociado a personal', 400);
  }
  
  const visita = await service.delegateVisita(id, personalId, nuevoPersonalId);
  
  // Emitir evento de socket
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'DELEGADO',
        fecha_delegacion: visita.fecha_delegacion,
        delegado_por_id: personalId,
        delegado_por_nombres: visita.delegado_por_nombres,
        delegado_por_apellidos: visita.delegado_por_apellidos,
        // Datos del nuevo personal para actualizar la UI
        nuevo_personal_id: visita.personal_visitado_id,
        nuevo_personal_nombres: visita.personal_nombres,
        nuevo_personal_apellidos: visita.personal_apellidos,
        nuevo_personal_cargo: visita.personal_cargo,
        nuevo_area_id: visita.area_destino_id,
        nuevo_area_nombre: visita.nombre_area
      });
      logger.info(`Evento 'estado_visita_actualizado' (DELEGADO) emitido para visita ID: ${id}`);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de visita delegada:', e.message);
  }
  
  res.json({
    success: true,
    message: 'Visita delegada exitosamente',
    data: visita
  });
});

/**
 * Obtener mis visitas (Personal)
 * @route GET /api/visitas/mis-visitas
 */
const getMisVisitas = asyncHandler(async (req, res) => {
  try {
    // Obtener personal_id del usuario autenticado
    const personalId = req.user?.personal_id || req.user?.personalId;
    
    if (!personalId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no asociado a un personal'
      });
    }
    
    const { 
      page = 1, 
      limit = 10,
      estados = '', // Parámetro opcional: 'PENDIENTE,ACEPTADO' o 'FINALIZADO,RECHAZADO'
      anio,
      mes
    } = req.query;
    
    // Convertir estados de string a array
    const estadosArray = estados ? estados.split(',').map(e => e.trim()) : [];
    
    // Usar el nuevo método del repositorio
    const { visitas, total } = await service.findByPersonalVisitado(
      personalId,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        estados: estadosArray,
        anio: anio ? parseInt(anio) : undefined,
        mes: mes ? parseInt(mes) : undefined
      }
    );
    
    res.json({
      success: true,
      message: 'Mis visitas obtenidas exitosamente',
      data: visitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    logger.error('Error en controlador getMisVisitas:', error);
    throw error;
  }
});

/**
 * Finalizar atención de visita
 * @route POST /api/visitas/:id/finalizar-atencion
 */
const finalizarAtencion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const personalId = req.user.personalId;
  
  if (!personalId) {
    throw new AppError('Usuario no asociado a personal', 400);
  }
  
  const visita = await service.finalizarAtencion(id, personalId);
  
  // Emitir evento de socket
  try {
    const io = req.app.get('socketio');
    if (io) {
      io.emit('estado_visita_actualizado', {
        id: parseInt(id),
        estado: 'FINALIZADO'
      });
      logger.info(`Evento 'estado_visita_actualizado' (FINALIZADO) emitido para visita ID: ${id}`);
    }
  } catch (e) {
    logger.warn('No se pudo emitir evento de visita finalizada:', e.message);
  }
  
  res.json({
    success: true,
    message: 'Atención finalizada exitosamente',
    data: visita
  });
});

module.exports = {
  getAll,
  getActivas,
  getById,
  create,
  registrarSalida,
  cerrarVisitasAutomaticamente,
  exportarAExcel,
  exportarAPDF,
  getVisitasPorArea,
  getVisitasPorMotivo,
  getVisitasTotales,
  getVisitasPorPersonal,
  getVisitantesFrecuentes,
  getVisitanteDetalle,
  accept,
  reject,
  delegate,
  getMisVisitas,
  finalizarAtencion
};
