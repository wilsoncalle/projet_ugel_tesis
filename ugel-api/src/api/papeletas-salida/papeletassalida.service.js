/**
 * Servicio para gestión de papeletas de salida de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require("./papeletassalida.repository"); // nuevo repo
const personalRepository = require("../personal/personal.repository");
const motivosSalidaRepository = require("../motivos-salida/motivossalida.repository");
const { AppError } = require("../../middleware/errorHandler");
const logger = require("../../utils/logger");

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
    throw error;
  }
};

/**
 * Registrar salida en garita
 */
const registrarSalida = async (id, usuarioId) => {
  try {
    // Verificar existencia
    const p = await getPapeletaById(id);

    // No permitir salida si está cancelada/rechazada/finalizada
    if (["RECHAZADO", "CANCELADO", "FINALIZADO"].includes(p.estado)) {
      throw new AppError(
        `No se puede registrar salida para estado ${p.estado}`,
        400,
      );
    }

    return await repository.registrarSalida(id, usuarioId);
  } catch (error) {
    logger.error(`Error registrando salida (papeleta ${id}):`, error);
    throw error;
  }
};

/**
 * Registrar retorno en garita
 */
const registrarRetorno = async (id, usuarioId) => {
  try {
    const p = await getPapeletaById(id);
    if (p.fecha_hora_retorno_real) {
      throw new AppError("La papeleta ya tiene retorno registrado", 400);
    }
    return await repository.registrarRetorno(id, usuarioId);
  } catch (error) {
    logger.error(`Error registrando retorno (papeleta ${id}):`, error);
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
};
