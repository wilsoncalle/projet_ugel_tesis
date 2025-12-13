/**
 * Controlador para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const service = require('./asistenciapersonal.service');
const { asyncHandler, AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { nowLima } = require('../../utils/fechas');

/**
 * Convierte un período en fechas de inicio y fin
 * @param {string} periodo - 'hoy', 'semana', 'mes', 'anio', 'todo'
 * @returns {Object} { fechaInicio, fechaFin }
 */
const convertirPeriodoAFechas = (periodo) => {
  const { fecha: hoyLima } = nowLima();
  const [year, month, day] = hoyLima.split('-').map(Number);
  const hoy = new Date(year, month - 1, day);
  let fechaInicio, fechaFin;

  switch (periodo) {
    case 'hoy':
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
      break;
    
    case 'semana':
      const diaSemana = hoy.getDay();
      const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diasHastaLunes);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
      break;
    
    case 'mes':
      fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
      break;
    
    case 'anio':
      fechaInicio = new Date(hoy.getFullYear(), 0, 1);
      fechaFin = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
      break;
    
    case 'todo':
    default:
      fechaInicio = null;
      fechaFin = null;
      break;
  }

  // Formatear fechas a YYYY-MM-DD
  const formatFecha = (date) => {
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    fechaInicio: formatFecha(fechaInicio),
    fechaFin: formatFecha(fechaFin)
  };
};

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
 * Obtener resumen mensual de asistencia del usuario logueado
 * @route GET /api/asistencia-personal/mi/resumen
 */
const getMiResumen = asyncHandler(async (req, res) => {
  logger.info('Solicitud de resumen de asistencia personal (Mi Resumen)');

  const personalId = req.user.personal_id || req.user.personalId;

  if (!personalId) {
    throw new AppError(
      'El usuario autenticado no está asociado a un registro de personal.',
      400
    );
  }

  const { anio, mes } = req.query;
  const year = parseInt(anio, 10) || new Date().getFullYear();
  const month = parseInt(mes, 10) || new Date().getMonth() + 1;

  const data = await service.getMiResumen(personalId, { anio: year, mes: month });

  res.json({
    success: true,
    message: 'Resumen de asistencia personal obtenido exitosamente',
    data,
  });
});

/**
 * Obtener asistencias mensuales del usuario logueado (con paginación)
 * @route GET /api/asistencia-personal/mi/asistencia
 */
const getMiAsistencia = asyncHandler(async (req, res) => {
  logger.info('Solicitud de historial de asistencia personal (Mi Asistencia)');

  const personalId = req.user.personal_id || req.user.personalId;

  if (!personalId) {
    throw new AppError(
      'El usuario autenticado no está asociado a un registro de personal.',
      400
    );
  }

  const { anio, mes, page, limit } = req.query;

  const year = parseInt(anio, 10) || new Date().getFullYear();
  const month = parseInt(mes, 10) || new Date().getMonth() + 1;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 15;

  const result = await service.getMiAsistencia(personalId, {
    anio: year,
    mes: month,
    page: pageNum,
    limit: limitNum,
  });

  res.json({
    success: true,
    message: 'Registros de asistencia personal obtenidos exitosamente',
    data: result.asistencias,
    pagination: result.pagination,
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
  
  const { personalId, fecha, hora, _isOfflineSync } = req.body;
  
  if (!personalId) {
    throw new AppError('ID de personal requerido', 400);
  }
  
  const asistencia = await service.registrarIngreso(personalId, req.user.id, { fecha, hora, _isOfflineSync });
  
  if (asistencia.alreadyRegistered) {
    return res.status(200).json({
      success: false,
      message: asistencia.message
    });
  }

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
  
  const { personalId, fecha, hora, _isOfflineSync } = req.body;
  
  if (!personalId) {
    throw new AppError('ID de personal requerido', 400);
  }
  
  const asistencia = await service.registrarSalida(personalId, req.user.id, { fecha, hora, _isOfflineSync });

  if (asistencia.alreadyRegistered) {
    return res.status(200).json({
      success: false,
      message: asistencia.message
    });
  }
  
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

/**
 * Obtener estadísticas de total de asistencias
 * @route GET /api/asistencia-personal/estadisticas/totales
 */
const getEstadisticasTotales = asyncHandler(async (req, res) => {
  logger.info('Solicitud de estadísticas totales de asistencia');
  
  const { periodo, fechaInicio: queryInicio, fechaFin: queryFin } = req.query;
  let fechaInicio, fechaFin;

  if (queryInicio && queryFin) {
    fechaInicio = queryInicio;
    fechaFin = queryFin;
  } else {
    const fechas = convertirPeriodoAFechas(periodo || 'mes');
    fechaInicio = fechas.fechaInicio;
    fechaFin = fechas.fechaFin;
  }
  
  const stats = await service.getEstadisticasTotales({ fechaInicio, fechaFin });
  
  res.json({
    success: true,
    message: 'Estadísticas totales obtenidas exitosamente',
    data: stats
  });
});

/**
 * Obtener estadísticas de puntualidad y tardanzas
 * @route GET /api/asistencia-personal/estadisticas/puntualidad
 */
const getEstadisticasPuntualidad = asyncHandler(async (req, res) => {
  logger.info('Solicitud de estadísticas de puntualidad');
  
  const { periodo, fechaInicio: queryInicio, fechaFin: queryFin } = req.query;
  let fechaInicio, fechaFin;

  if (queryInicio && queryFin) {
    fechaInicio = queryInicio;
    fechaFin = queryFin;
  } else {
    const fechas = convertirPeriodoAFechas(periodo || 'mes');
    fechaInicio = fechas.fechaInicio;
    fechaFin = fechas.fechaFin;
  }
  
  const stats = await service.getEstadisticasPuntualidad({ fechaInicio, fechaFin });
  
  res.json({
    success: true,
    message: 'Estadísticas de puntualidad obtenidas exitosamente',
    data: stats
  });
});

/**
 * Obtener estadísticas de ausencias y justificaciones
 * @route GET /api/asistencia-personal/estadisticas/ausencias
 */
const getEstadisticasAusencias = asyncHandler(async (req, res) => {
  logger.info('Solicitud de estadísticas de ausencias');
  
  const { periodo, fechaInicio: queryInicio, fechaFin: queryFin } = req.query;
  let fechaInicio, fechaFin;

  if (queryInicio && queryFin) {
    fechaInicio = queryInicio;
    fechaFin = queryFin;
  } else {
    const fechas = convertirPeriodoAFechas(periodo || 'mes');
    fechaInicio = fechas.fechaInicio;
    fechaFin = fechas.fechaFin;
  }
  
  const stats = await service.getEstadisticasAusencias({ fechaInicio, fechaFin });
  
  res.json({
    success: true,
    message: 'Estadísticas de ausencias obtenidas exitosamente',
    data: stats
  });
});

/**
 * Obtener estadísticas por áreas
 * @route GET /api/asistencia-personal/estadisticas/areas
 */
const getEstadisticasAreas = asyncHandler(async (req, res) => {
  logger.info('Solicitud de estadísticas por áreas');
  
  const { periodo } = req.query;
  const { fechaInicio, fechaFin } = convertirPeriodoAFechas(periodo || 'mes');
  
  const stats = await service.getEstadisticasAreas({ fechaInicio, fechaFin });
  
  res.json({
    success: true,
    message: 'Estadísticas por áreas obtenidas exitosamente',
    data: stats
  });
});

/**
 * Obtener estadísticas por personal
 * @route GET /api/asistencia-personal/estadisticas/personal
 */
const getEstadisticaspersonal = asyncHandler(async (req, res) => {
  logger.info('Solicitud de estadísticas por personal');
  
  const { periodo, personalId } = req.query;
  const { fechaInicio, fechaFin } = convertirPeriodoAFechas(periodo || 'mes');
  
  const stats = await service.getEstadisticaspersonal({ fechaInicio, fechaFin, personalId });
  
  res.json({
    success: true,
    message: 'Estadísticas por personal obtenidas exitosamente',
    data: stats
  });
});

/**
 * Obtener detalle completo de un personal
 * @route GET /api/asistencia-personal/estadisticas/personal-detalle/:personalId
 */
const getpersonalDetalle = asyncHandler(async (req, res) => {
  logger.info('Solicitud de detalle de personal');
  
  const { personalId } = req.params;
  const { periodo } = req.query;
  const { fechaInicio, fechaFin } = convertirPeriodoAFechas(periodo || 'mes');
  
  const detalle = await service.getpersonalDetalle(personalId, { fechaInicio, fechaFin });
  
  res.json({
    success: true,
    message: 'Detalle del personal obtenido exitosamente',
    data: detalle
  });
});

/**
 * Exportar asistencias a Excel
 * @route GET /api/asistencia-personal/export/excel
 */
const exportarAExcel = asyncHandler(async (req, res) => {
  logger.info('Solicitud de exportación a Excel con filtros:', req.query);
  
  const filtros = req.query;
  const buffer = await service.exportarAExcel(filtros);
  
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Asistencias_${fecha}.xlsx`);
  res.setHeader('Content-Length', buffer.length);
  
  res.send(buffer);
});

/**
 * Exportar asistencias a PDF
 * @route GET /api/asistencia-personal/export/pdf
 */
const exportarAPDF = asyncHandler(async (req, res) => {
  logger.info('Solicitud de exportación a PDF con filtros:', req.query);
  
  const filtros = req.query;
  const buffer = await service.exportarAPDF(filtros);
  
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Asistencias_${fecha}.pdf`);
  res.setHeader('Content-Length', buffer.length);
  
  res.send(buffer);
});

/**
 * Justificar inasistencia o tardanza
 * @route POST /api/asistencia-personal/:id/justificar
 */
const justificar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const archivo = req.file;

  logger.info(`Justificando asistencia ID: ${id}, Motivo: ${motivo}`);

  if (!motivo) {
    throw new AppError('El motivo es requerido', 400);
  }

  const result = await service.justificarAsistencia(id, motivo, archivo, req.user.id);

  res.json({
    success: true,
    message: 'Justificación registrada exitosamente',
    data: result
  });
});


/**
 * Obtener listado de justificaciones (RRHH/Admin)
 * @route GET /api/asistencia-personal/justificaciones
 */
const getJustificaciones = asyncHandler(async (req, res) => {
  const { estado, q } = req.query;
  const justificaciones = await service.getJustificaciones({ estado, q });
  
  res.json({
    success: true,
    data: justificaciones
  });
});

/**
 * Evaluar justificación (RRHH/Admin)
 * @route PUT /api/asistencia-personal/justificaciones/:id/evaluar
 */
const evaluarJustificacion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estado, observacion } = req.body;
  
  if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
    throw new AppError('Estado inválido. Debe ser APROBADO o RECHAZADO', 400);
  }
  
  const result = await service.evaluarJustificacion(id, { estado, observacion }, req.user.id);
  
  res.json({
    success: true,
    message: `Justificación ${estado.toLowerCase()} correctamente`,
    data: result
  });
});

/**
 * Obtener movimientos de una asistencia
 * @route GET /api/asistencia-personal/:id/movimientos
 */
const getMovimientos = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const movimientos = await service.getMovimientos(id);
  res.json({
    success: true,
    data: movimientos
  });
});

module.exports = {
  getAll,
  getHoy,
  getById,
  registrarIngreso,
  registrarSalida,
  registrarEstado,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticaspersonal,
  getpersonalDetalle,
  exportarAExcel,
  exportarAPDF,
  getMiResumen,
  getMiAsistencia,
  justificar,
  getJustificaciones,
  evaluarJustificacion,
  getMovimientos
};
