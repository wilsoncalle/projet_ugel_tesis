/**
 * Servicio para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require("./papeletassalida.repository"); // nuevo repo
const personalRepository = require("../personal/personal.repository");
const motivosSalidaRepository = require("../motivos-salida/motivossalida.repository");
const asistenciaRepository = require("../asistencia-personal/asistenciapersonal.repository");
const { AppError } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");
const { nowLima, toLimaTime, toLimaDateYYYYMMDD } = require("../../utils/fechas");

/* ===========================
 * Helpers
 * =========================*/
const toIntOrUndef = (v) =>
  v === undefined || v === null || v === "" ? undefined : parseInt(v, 10);

/**
 * Mapear opciones del frontend a filtros del repositorio
 */
const mapListOptions = (options = {}) => {
  const {
    page = 1,
    limit = 20,
    q = "",
    estado,
    fechaInicio,
    fechaFin,
    campoFecha, // 'solicitud' | 'programada' | 'salida_real' | 'retorno_real'
    motivoSalidaId,
    solicitanteId, // personal_solicitante_id
    autorizaId, // personal_autoriza_id
    areaDestinoId,
    orderBy, // columna segura (ver repo)
    orderDir, // 'ASC' | 'DESC'
  } = options;

  return {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    orderBy,
    orderDir,
    search: q || "",
    estado,
    fechaInicio,
    fechaFin,
    campoFecha,
    motivoSalidaId: toIntOrUndef(motivoSalidaId),
    solicitanteId: toIntOrUndef(solicitanteId),
    autorizaId: toIntOrUndef(autorizaId),
    areaDestinoId: toIntOrUndef(areaDestinoId),
  };
};

/* ===========================
 * Listados
 * =========================*/

/**
 * Obtener todas las papeletas de salida con paginación y filtros
 */
const getAllPapeletas = async (options = {}) => {
  try {
    const mapped = mapListOptions(options);

    const result = await repository.findAll(mapped);

    return {
      papeletas: result.papeletas,
      pagination: {
        page: mapped.page,
        limit: mapped.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / mapped.limit || 1),
      },
    };
  } catch (error) {
    logger.error("Error obteniendo papeletas de salida:", error);
    throw error;
  }
};

/**
 * Obtener papeletas de salida pendientes para garita con paginación
 * (APROBADO/EN_CURSO y sin retorno real)
 */
const getPapeletasPendientes = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      q = "",
      areaDestinoId,
      motivoSalidaId,
    } = options;

    const result = await repository.findPendientes({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search: q || "",
      areaDestinoId: toIntOrUndef(areaDestinoId),
      motivoSalidaId: toIntOrUndef(motivoSalidaId),
    });

    return {
      papeletas: result.papeletas,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit, 10) || 1),
      },
    };
  } catch (error) {
    logger.error("Error obteniendo papeletas de salida pendientes:", error);
    throw error;
  }
};

/**
 * Obtener papeleta de salida por ID
 */
const getPapeletaById = async (id) => {
  try {
    const papeleta = await repository.findById(id);
    if (!papeleta) throw new AppError("Papeleta de salida no encontrada", 404);
    return papeleta;
  } catch (error) {
    logger.error(`Error obteniendo papeleta de salida ID ${id}:`, error);
    throw error;
  }
};

/* ===========================
 * Creación y flujo de aprobación/garita
 * =========================*/

/**
 * Crear nueva papeleta de salida (SOLICITADO por defecto, o APROBADO si se indica)
 */
const createPapeleta = async (payload) => {
  try {
    const {
      personalSolicitanteId, // requerido
      motivoSalidaId, // requerido
      sustentoSolicitud, // opcional
      fechaHoraSalidaProgramada, // requerido
      fechaHoraRetornoProgramada, // requerido
      crearComoAprobada = false, // opcional: true -> entra como APROBADO
      personalAutorizaId = null, // requerido si crearComoAprobada = true
      observacionAutorizacion = null,
    } = payload;

    // 1) Validaciones de existencia/estado
    const personal = await personalRepository.findById(personalSolicitanteId);
    if (!personal)
      throw new AppError("Personal solicitante no encontrado", 404);
    if (personal.activo === false)
      throw new AppError("Personal solicitante inactivo", 400);

    const motivo = await motivosSalidaRepository.findById(motivoSalidaId);
    if (!motivo) throw new AppError("Motivo de salida no encontrado", 404);
    if (motivo.activo === false)
      throw new AppError("Motivo de salida inactivo", 400);

    // 2) Validación de fechas (programadas)
    if (fechaHoraSalidaProgramada && fechaHoraRetornoProgramada) {
      const salida = new Date(fechaHoraSalidaProgramada);
      const retorno = new Date(fechaHoraRetornoProgramada);
      if (isNaN(salida.getTime()) || isNaN(retorno.getTime())) {
        throw new AppError("Fechas programadas inválidas", 400);
      }
      if (salida > retorno) {
        throw new AppError(
          "La salida programada no puede ser posterior al retorno programado",
          400,
        );
      }
    } else {
      throw new AppError("Debe indicar salida y retorno programados", 400);
    }

    // 3) No duplicar papeletas pendientes para el mismo solicitante
    const pendientes = await repository.findPendientesByPersonal(
      personalSolicitanteId,
    );
    if (pendientes && pendientes.length > 0) {
      throw new AppError("El solicitante ya tiene una papeleta pendiente", 400);
    }

    // 4) Preparar estado y datos de autorización inicial
    let estado = "SOLICITADO";
    let _personal_autoriza_id = null;
    let _fecha_autorizacion = null;
    let _observacion_autorizacion = observacionAutorizacion || null;

    if (crearComoAprobada) {
      if (!personalAutorizaId) {
        throw new AppError("Debe indicar el personal que autoriza", 400);
      }
      estado = "APROBADO";
      _personal_autoriza_id = personalAutorizaId;
      _fecha_autorizacion = new Date();
    }

    // 5) Crear papeleta
    const nueva = await repository.create({
      personal_solicitante_id: personalSolicitanteId,
      motivo_salida_id: motivoSalidaId,
      sustento_solicitud: sustentoSolicitud || null,
      fecha_hora_salida_programada: fechaHoraSalidaProgramada,
      fecha_hora_retorno_programada: fechaHoraRetornoProgramada,
      estado,
      personal_autoriza_id: _personal_autoriza_id,
      fecha_autorizacion: _fecha_autorizacion,
      observacion_autorizacion: _observacion_autorizacion,
    });

    logger.info(
      `Papeleta creada para solicitante ID ${personalSolicitanteId} (estado: ${estado})`,
    );
    return nueva;
  } catch (error) {
    logger.error("Error creando papeleta de salida:", error);
    throw error;
  }
};

/**
 * Aprobar/Rechazar papeleta
 * accion: 'APROBAR' | 'RECHAZAR'
 */
const decidirPapeleta = async (
  id,
  { accion, personalAutorizaId, observacionAutorizacion = null },
) => {
  try {
    if (!["APROBAR", "RECHAZAR"].includes(accion)) {
      throw new AppError("Acción inválida (use APROBAR o RECHAZAR)", 400);
    }
    if (!personalAutorizaId) {
      throw new AppError("Debe indicar el personal que autoriza", 400);
    }
    // Verificar existencia
    await getPapeletaById(id);

    return await repository.decidirPapeleta(id, {
      accion,
      personal_autoriza_id: personalAutorizaId,
      observacion_autorizacion: observacionAutorizacion,
    });
  } catch (error) {
    logger.error(`Error al decidir papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError("Error al decidir la papeleta", 500);
  }
};

/**
 * Registrar salida en garita
 * Cuando la papeleta pasa a EN_CURSO, se registra automáticamente la salida en asistencia
 * Usa transacción conjunta para garantizar consistencia entre papeleta y asistencia
 */
const registrarSalida = async (id, usuarioId) => {
  const db = require('../../config/database');
  const client = await db.getClient();
  
  try {
    // Verificar existencia y obtener papeleta actual
    const p = await getPapeletaById(id);

    // Validación 1: Bloquear si ya tiene salida registrada
    if (p.fecha_hora_salida_real) {
      throw new AppError('La papeleta ya tiene salida registrada', 400);
    }

    // Validación 2: Solo permitir estados APROBADO o EN_CURSO
    if (!['APROBADO', 'EN_CURSO'].includes(p.estado)) {
      throw new AppError(
        `No se puede registrar salida para estado ${p.estado} (solo APROBADO/EN_CURSO)`,
        400,
      );
    }

    // Guardar estado anterior para verificar si cambia a EN_CURSO
    const estadoAnterior = p.estado;

    // Iniciar transacción
    await client.query('BEGIN');

    try {
      // Registrar salida en la papeleta dentro de la transacción
      const papeletaActualizada = await repository.registrarSalidaTx(client, id, usuarioId);

      // Si la papeleta ahora está en EN_CURSO (cambió de estado), registrar salida automática en asistencia
      if (papeletaActualizada.estado === 'EN_CURSO' && estadoAnterior !== 'EN_CURSO') {
        await registrarSalidaAsistenciaDesdePapeletaTx(client, papeletaActualizada, usuarioId);
      }

      // Commit de la transacción
      await client.query('COMMIT');
      
      logger.info(`Salida registrada exitosamente para papeleta ${id} con transacción conjunta`);
      return papeletaActualizada;
      
    } catch (errorTx) {
      // Rollback en caso de error
      await db.safeRollback(client);
      throw errorTx;
    }
    
  } catch (error) {
    logger.error(`Error registrando salida (papeleta ${id}):`, error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Helper: Registrar salida en asistencia cuando una papeleta pasa a EN_CURSO (versión transaccional)
 * Actualiza el estado a 'En Permiso' cuando se registra la salida
 * Usa timezone de Lima consistentemente
 * @param {Object} client - Cliente de PostgreSQL de la transacción
 * @param {Object} papeleta - Objeto papeleta con fecha_hora_salida_real o fecha_hora_salida_programada
 * @param {number} usuarioId - ID del usuario que registra
 */
const registrarSalidaAsistenciaDesdePapeletaTx = async (client, papeleta, usuarioId) => {
  try {
    const personalId = papeleta.personal_solicitante_id;
    
    // Determinar la fecha y hora de salida de la papeleta
    // Priorizar fecha_hora_salida_real si existe, sino usar fecha_hora_salida_programada
    const fechaHoraSalida = papeleta.fecha_hora_salida_real || papeleta.fecha_hora_salida_programada;
    
    if (!fechaHoraSalida) {
      logger.warn(`Papeleta ${papeleta.id} no tiene fecha de salida definida, no se registra salida en asistencia`);
      return;
    }

    // Convertir a timezone de Lima
    const fechaSalida = toLimaDateYYYYMMDD(fechaHoraSalida);
    const horaSalida = toLimaTime(fechaHoraSalida);

    if (!fechaSalida || !horaSalida) {
      logger.warn(`Papeleta ${papeleta.id} tiene fecha/hora inválida, no se registra salida en asistencia`);
      return;
    }

    logger.info(`Registrando salida automática en asistencia para personal ID ${personalId} desde papeleta ${papeleta.id} - Fecha: ${fechaSalida}, Hora: ${horaSalida} (Lima)`);

    // Buscar registro de asistencia existente para esa fecha (dentro de la transacción)
    const findSql = `
      SELECT 
        id,
        personal_id,
        fecha,
        hora_ingreso,
        hora_salida,
        estado_presencia,
        usuario_registro_id,
        fecha_registro
      FROM ControlAsistenciaPersonal
      WHERE personal_id = $1 AND fecha = $2
    `;
    const { rows } = await client.query(findSql, [personalId, fechaSalida]);
    const registroExistente = rows[0] || null;

    if (registroExistente) {
      // Si ya existe un registro, actualizar hora_salida y estado a 'En Permiso'
      if (!registroExistente.hora_salida) {
        const updateSalidaSql = `
          UPDATE ControlAsistenciaPersonal 
          SET hora_salida = $1
          WHERE id = $2
        `;
        await client.query(updateSalidaSql, [horaSalida, registroExistente.id]);
        
        // Actualizar estado a 'En Permiso' si no lo está ya
        if (registroExistente.estado_presencia !== 'En Permiso') {
          const updateEstadoSql = `
            UPDATE ControlAsistenciaPersonal 
            SET estado_presencia = $1, usuario_registro_id = $2
            WHERE id = $3
          `;
          await client.query(updateEstadoSql, ['En Permiso', usuarioId, registroExistente.id]);
        }
        logger.info(`Salida y estado actualizados en asistencia para personal ID ${personalId} en fecha ${fechaSalida} - Estado: En Permiso`);
      } else {
        // Si ya tiene salida, solo actualizar estado si no está en 'En Permiso'
        if (registroExistente.estado_presencia !== 'En Permiso') {
          const updateEstadoSql = `
            UPDATE ControlAsistenciaPersonal 
            SET estado_presencia = $1, usuario_registro_id = $2
            WHERE id = $3
          `;
          await client.query(updateEstadoSql, ['En Permiso', usuarioId, registroExistente.id]);
          logger.info(`Estado actualizado a 'En Permiso' para personal ID ${personalId} en fecha ${fechaSalida}`);
        }
      }
    } else {
      // Si no existe registro, crear uno con la salida y estado 'En Permiso'
      const insertSql = `
        INSERT INTO ControlAsistenciaPersonal (
          personal_id, 
          fecha, 
          hora_ingreso,
          hora_salida,
          estado_presencia,
          usuario_registro_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      await client.query(insertSql, [
        personalId,
        fechaSalida,
        null, // Puede que no haya registrado ingreso si salió con la papeleta
        horaSalida,
        'En Permiso',
        usuarioId
      ]);
      logger.info(`Registro de asistencia creado con salida y estado 'En Permiso' para personal ID ${personalId} en fecha ${fechaSalida}`);
    }
  } catch (error) {
    logger.error(`Error en registrarSalidaAsistenciaDesdePapeletaTx:`, error);
    throw error;
  }
};

/**
 * Registrar retorno en garita
 * Cuando la papeleta pasa a FINALIZADO, se actualiza el estado de asistencia a 'Presente'
 */
const registrarRetorno = async (id, usuarioId) => {
  try {
    const p = await getPapeletaById(id);
    if (p.fecha_hora_retorno_real) {
      throw new AppError("La papeleta ya tiene retorno registrado", 400);
    }

    // Registrar retorno en la papeleta (esto cambia el estado a FINALIZADO)
    const papeletaActualizada = await repository.registrarRetorno(id, usuarioId);

    // Si la papeleta ahora está en FINALIZADO, actualizar el estado de asistencia a 'Presente'
    if (papeletaActualizada.estado === 'FINALIZADO') {
      try {
        await actualizarEstadoAsistenciaAlRetorno(papeletaActualizada, usuarioId);
      } catch (errorAsistencia) {
        // Log el error pero no fallar la operación de la papeleta
        logger.error(`Error actualizando estado en asistencia desde papeleta ${id}:`, errorAsistencia);
        // No relanzamos el error para no bloquear el flujo de la papeleta
      }
    }

    return papeletaActualizada;
  } catch (error) {
    logger.error(`Error registrando retorno (papeleta ${id}):`, error);
    throw error;
  }
};

/**
 * Helper: Actualizar estado de asistencia cuando el personal regresa (papeleta finalizada)
 * Cambia el estado de 'En Permiso' a 'Presente' en todas las fechas del período de la papeleta
 * @param {Object} papeleta - Objeto papeleta finalizada con fecha_hora_retorno_real
 * @param {number} usuarioId - ID del usuario que registra
 */
const actualizarEstadoAsistenciaAlRetorno = async (papeleta, usuarioId) => {
  try {
    const personalId = papeleta.personal_solicitante_id;
    
    // Obtener las fechas del período de la papeleta
    const fechaHoraSalida = papeleta.fecha_hora_salida_real || papeleta.fecha_hora_salida_programada;
    const fechaHoraRetorno = papeleta.fecha_hora_retorno_real || papeleta.fecha_hora_retorno_programada;
    
    if (!fechaHoraSalida || !fechaHoraRetorno) {
      logger.warn(`Papeleta ${papeleta.id} no tiene fechas completas, no se actualiza estado en asistencia`);
      return;
    }

    // Convertir fechas a timezone de Lima
    const fechaSalida = toLimaDateYYYYMMDD(fechaHoraSalida);
    const fechaRetorno = toLimaDateYYYYMMDD(fechaHoraRetorno);

    logger.info(`Actualizando estado de asistencia a 'Presente' para personal ID ${personalId} desde papeleta ${papeleta.id} - Período: ${fechaSalida} a ${fechaRetorno}`);

    // Actualizar todos los registros de asistencia en el período de la papeleta
    // que estén en estado 'En Permiso' y cambiarlos a 'Presente'
    const resultado = await asistenciaRepository.actualizarEstadoPorPeriodo(
      personalId,
      fechaSalida,
      fechaRetorno,
      'En Permiso',
      'Presente',
      usuarioId
    );

    logger.info(`Estado actualizado en ${resultado.actualizados} registros de asistencia para personal ID ${personalId}`);
  } catch (error) {
    logger.error(`Error en actualizarEstadoAsistenciaAlRetorno:`, error);
    throw error;
  }
};

/**
 * Cancelar papeleta (antes de salir)
 */
const cancelarPapeleta = async (id, observacionAutorizacion = null) => {
  try {
    const p = await getPapeletaById(id);
    if (p.fecha_hora_salida_real) {
      throw new AppError(
        "No se puede cancelar: la salida ya fue registrada",
        400,
      );
    }
    return await repository.cancelar(id, observacionAutorizacion);
  } catch (error) {
    logger.error(`Error cancelando papeleta ${id}:`, error);
    throw error;
  }
};

/**
 * Anular (DELETE físico) — usar con cuidado
 */
const anularPapeleta = async (id, usuarioId) => {
  try {
    await getPapeletaById(id);
    await repository.anular(id);
    logger.info(`Papeleta ID ${id} anulada por usuario ID ${usuarioId}`);
    return true;
  } catch (error) {
    logger.error(`Error anulando papeleta ID ${id}:`, error);
    throw error;
  }
};

/* ===========================
 * Estadísticas
 * =========================*/

/**
 * Obtener estadísticas de papeletas de salida
 * options: { fechaInicio, fechaFin, campoFecha }
 */
const getEstadisticas = async (options = {}) => {
  try {
    const { fechaInicio, fechaFin, campoFecha } = options;
    return await repository.getEstadisticas(fechaInicio, fechaFin, campoFecha);
  } catch (error) {
    logger.error(
      "Error obteniendo estadísticas de papeletas de salida:",
      error,
    );
    throw error;
  }
};

/**
 * Obtener estadísticas de estado de papeletas
 */
const getEstadisticasEstado = async (options = {}) => {
  try {
    const { fechaInicio, fechaFin, periodo } = options;
    return await repository.getEstadisticasEstado(fechaInicio, fechaFin, periodo);
  } catch (error) {
    logger.error("Error obteniendo estadísticas de estado:", error);
    throw error;
  }
};

/**
 * Obtener estadísticas de motivos de salida
 */
const getEstadisticasMotivos = async (options = {}) => {
  try {
    const { fechaInicio, fechaFin, periodo } = options;
    return await repository.getEstadisticasMotivos(fechaInicio, fechaFin, periodo);
  } catch (error) {
    logger.error("Error obteniendo estadísticas de motivos:", error);
    throw error;
  }
};

/**
 * Obtener estadísticas de horas autorizadas vs usadas
 */
const getEstadisticasHoras = async (options = {}) => {
  try {
    const { fechaInicio, fechaFin, periodo } = options;
    return await repository.getEstadisticasHoras(fechaInicio, fechaFin, periodo);
  } catch (error) {
    logger.error("Error obteniendo estadísticas de horas:", error);
    throw error;
  }
};

/**
 * Obtener estadísticas de áreas y colaboradores
 */
const getEstadisticasAreas = async (options = {}) => {
  try {
    const { fechaInicio, fechaFin, periodo } = options;
    return await repository.getEstadisticasAreas(fechaInicio, fechaFin, periodo);
  } catch (error) {
    logger.error("Error obteniendo estadísticas de áreas:", error);
    throw error;
  }
};

module.exports = {
  // listados
  getAllPapeletas,
  getPapeletasPendientes,
  getPapeletaById,

  // creación/flujo
  createPapeleta,
  decidirPapeleta,
  registrarSalida,
  registrarRetorno,
  cancelarPapeleta,
  anularPapeleta,

  // stats
  getEstadisticas,
  getEstadisticasEstado,
  getEstadisticasMotivos,
  getEstadisticasHoras,
  getEstadisticasAreas,
};
