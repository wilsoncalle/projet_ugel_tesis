/**
 * Repositorio para gestión de Papeletas de Salida
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/* =========================================================
 * Helpers
 * =======================================================*/

/**
 * Genera un código único tipo PS-YYYYMMDD-0001
 * Usa una secuencia global (papeletas_codigo_seq). Reinicia visualmente por día.
 * La unicidad real la impone el UNIQUE(codigo_papeleta).
 */
const generarCodigoPapeleta = async () => {
  const { rows } = await db.query(`SELECT nextval('papeletas_codigo_seq') AS n`);
  const n = String(rows[0].n).padStart(4, '0');
  const { rows: today } = await db.query(`SELECT to_char(NOW() AT TIME ZONE 'America/Lima', 'YYYYMMDD') AS d`);
  return `PS-${today[0].d}-${n}`;
};

/** Construye cláusulas dinámicas para filtros comunes */
const buildFilters = (opts = {}) => {
  const {
    search = '',
    estado,
    fechaInicio,       // aplica sobre fecha_solicitud si no se especifica campoFecha = 'solicitud'
    fechaFin,
    campoFecha = 'solicitud', // 'solicitud' | 'programada' | 'salida_real' | 'retorno_real'
    motivoSalidaId,
    solicitanteId,     // personal_solicitante_id
    autorizaId,        // personal_autoriza_id
    areaDestinoId,     // filtra por área del solicitante (join Personal)
  } = opts;

  const where = [];
  const params = [];
  let i = 1;

  // Texto libre
  if (search) {
    where.push(`(
      ps.codigo_papeleta ILIKE $${i}
      OR p.nombres ILIKE $${i}
      OR p.apellidos ILIKE $${i}
      OR p.numero_documento ILIKE $${i}
    )`);
    params.push(`%${search}%`); i++;
  }

  // Estado
  if (estado) {
    where.push(`ps.estado = $${i}`);
    params.push(estado); i++;
  }

  // Motivo
  if (motivoSalidaId) {
    where.push(`ps.motivo_salida_id = $${i}`);
    params.push(motivoSalidaId); i++;
  }

  // Solicitante
  if (solicitanteId) {
    where.push(`ps.personal_solicitante_id = $${i}`);
    params.push(solicitanteId); i++;
  }

  // Autoriza
  if (autorizaId) {
    where.push(`ps.personal_autoriza_id = $${i}`);
    params.push(autorizaId); i++;
  }

  // Área del solicitante (vía Personal.area_destino_id)
  if (areaDestinoId) {
    where.push(`p.area_destino_id = $${i}`);
    params.push(areaDestinoId); i++;
  }

  // Fechas
  const campoMap = {
    solicitud: 'ps.fecha_solicitud',
    programada: 'ps.fecha_hora_salida_programada',
    salida_real: 'ps.fecha_hora_salida_real',
    retorno_real: 'ps.fecha_hora_retorno_real',
  };
  const col = campoMap[campoFecha] || campoMap.solicitud;

  if (fechaInicio) {
    where.push(`${col} >= $${i}`); params.push(fechaInicio); i++;
  }
  if (fechaFin) {
    where.push(`${col} <= $${i}`); params.push(fechaFin); i++;
  }

  return { where, params, nextIndex: i };
};

/* =========================================================
 * Consultas
 * =======================================================*/

/**
 * Listado con filtros y paginación
 */
const findAll = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    orderBy = 'ps.fecha_solicitud',   // columna segura
    orderDir = 'DESC',                // ASC | DESC
    ...filtros
  } = options;

  const offset = (page - 1) * limit;

  try {
    const { where, params } = buildFilters(filtros);
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // whitelist de ordenamientos seguros
    const safeOrderCols = new Set([
      'ps.fecha_solicitud',
      'ps.fecha_hora_salida_programada',
      'ps.fecha_hora_retorno_programada',
      'ps.fecha_hora_salida_real',
      'ps.fecha_hora_retorno_real',
      'ps.codigo_papeleta'
    ]);
    const colOrden = safeOrderCols.has(orderBy) ? orderBy : 'ps.fecha_solicitud';
    const dirOrden = String(orderDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const baseSelect = `
      SELECT
        ps.id,
        ps.codigo_papeleta,
        ps.estado,
        ps.fecha_solicitud,
        ps.motivo_salida_id,
        m.nombre_motivo,
        ps.sustento_solicitud,
        ps.fecha_hora_salida_programada,
        ps.fecha_hora_retorno_programada,
        ps.fecha_hora_salida_real,
        ps.fecha_hora_retorno_real,
        ps.personal_solicitante_id,
        p.tipo_documento AS solicitante_tipo_documento,
        p.numero_documento AS solicitante_numero_documento,
        p.nombres AS solicitante_nombres,
        p.apellidos AS solicitante_apellidos,
        p.area_destino_id AS solicitante_area_destino_id,
        ps.personal_autoriza_id,
        pa.nombres AS autoriza_nombres,
        pa.apellidos AS autoriza_apellidos,
        ps.fecha_autorizacion,
        ps.observacion_autorizacion,
        ps.usuario_registro_salida_id,
        us.nombre_usuario AS usuario_registro_salida,
        ps.usuario_registro_retorno_id,
        ur.nombre_usuario AS usuario_registro_retorno
      FROM PapeletasSalida ps
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      LEFT JOIN Personal pa ON pa.id = ps.personal_autoriza_id
      LEFT JOIN Usuarios us ON us.id = ps.usuario_registro_salida_id
      LEFT JOIN Usuarios ur ON ur.id = ps.usuario_registro_retorno_id
      ${whereSQL}
      ORDER BY ${colOrden} ${dirOrden}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countSQL = `
      SELECT COUNT(*) AS total
      FROM PapeletasSalida ps
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      ${whereSQL}
    `;

    const queryParams = [...params, limit, offset];

    const [listRes, countRes] = await Promise.all([
      db.query(baseSelect, queryParams),
      db.query(countSQL, params),
    ]);

    return {
      papeletas: listRes.rows,
      total: parseInt(countRes.rows[0].total, 10) || 0,
    };
  } catch (error) {
    logger.error('Error listando papeletas:', error);
    throw new AppError('Error obteniendo papeletas', 500);
  }
};

/**
 * Pendientes para garita: aprobadas o en curso sin retorno real
 * Útil para el vigilante
 */
const findPendientes = async (options = {}) => {
  const {
    page = 1, limit = 20, search = '',
    areaDestinoId, motivoSalidaId,
  } = options;

  const offset = (page - 1) * limit;

  try {
    const where = [
      `(ps.estado IN ('APROBADO','EN_CURSO'))`,
      `ps.fecha_hora_retorno_real IS NULL`,
    ];
    const params = [];
    let i = 1;

    if (search) {
      where.push(`(
        ps.codigo_papeleta ILIKE $${i} OR
        p.nombres ILIKE $${i} OR
        p.apellidos ILIKE $${i} OR
        p.numero_documento ILIKE $${i}
      )`);
      params.push(`%${search}%`); i++;
    }

    if (areaDestinoId) {
      where.push(`p.area_destino_id = $${i}`); params.push(areaDestinoId); i++;
    }

    if (motivoSalidaId) {
      where.push(`ps.motivo_salida_id = $${i}`); params.push(motivoSalidaId); i++;
    }

    const whereSQL = `WHERE ${where.join(' AND ')}`;

    const listSQL = `
      SELECT
        ps.id,
        ps.codigo_papeleta,
        ps.estado,
        ps.motivo_salida_id,
        m.nombre_motivo,
        ps.fecha_hora_salida_programada,
        ps.fecha_hora_retorno_programada,
        ps.fecha_hora_salida_real,
        ps.fecha_hora_retorno_real,
        ps.personal_solicitante_id,
        p.nombres AS solicitante_nombres,
        p.apellidos AS solicitante_apellidos,
        p.numero_documento AS solicitante_numero_documento
      FROM PapeletasSalida ps
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      ${whereSQL}
      ORDER BY COALESCE(ps.fecha_hora_salida_real, ps.fecha_hora_salida_programada) ASC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const countSQL = `
      SELECT COUNT(*) AS total
      FROM PapeletasSalida ps
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      ${whereSQL}
    `;

    const queryParams = [...params, limit, offset];
    const [listRes, countRes] = await Promise.all([
      db.query(listSQL, queryParams),
      db.query(countSQL, params),
    ]);

    return {
      papeletas: listRes.rows,
      total: parseInt(countRes.rows[0].total, 10) || 0,
    };
  } catch (error) {
    logger.error('Error listando papeletas pendientes:', error);
    throw new AppError('Error obteniendo papeletas pendientes', 500);
  }
};

/**
 * Pendientes por personal (sin retorno real)
 */
const findPendientesByPersonal = async (personalId) => {
  try {
    const sql = `
      SELECT id, codigo_papeleta, estado
      FROM PapeletasSalida
      WHERE personal_solicitante_id = $1
        AND fecha_hora_retorno_real IS NULL
        AND estado IN ('APROBADO','EN_CURSO','SOLICITADO')
      ORDER BY fecha_solicitud DESC
    `;
    const { rows } = await db.query(sql, [personalId]);
    return rows;
  } catch (error) {
    logger.error(`Error buscando pendientes por personal ${personalId}:`, error);
    throw new AppError('Error obteniendo pendientes por personal', 500);
  }
};

/**
 * Detalle por ID
 */
const findById = async (id) => {
  try {
    const sql = `
      SELECT
        ps.*,
        m.nombre_motivo,
        p.tipo_documento AS solicitante_tipo_documento,
        p.numero_documento AS solicitante_numero_documento,
        p.nombres AS solicitante_nombres,
        p.apellidos AS solicitante_apellidos,
        pa.nombres AS autoriza_nombres,
        pa.apellidos AS autoriza_apellidos,
        us.nombre_usuario AS usuario_registro_salida,
        ur.nombre_usuario AS usuario_registro_retorno
      FROM PapeletasSalida ps
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      LEFT JOIN Personal pa ON pa.id = ps.personal_autoriza_id
      LEFT JOIN Usuarios us ON us.id = ps.usuario_registro_salida_id
      LEFT JOIN Usuarios ur ON ur.id = ps.usuario_registro_retorno_id
      WHERE ps.id = $1
    `;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    logger.error(`Error buscando papeleta id ${id}:`, error);
    throw new AppError('Error obteniendo papeleta', 500);
  }
};

/**
 * Crear papeleta (ingreso como SOLICITADO por defecto)
 */
const create = async (data) => {
  const client = await db.getClient();
  try {
    const {
      personal_solicitante_id,
      motivo_salida_id,
      sustento_solicitud,
      fecha_hora_salida_programada,
      fecha_hora_retorno_programada,
      // opcional: creación ya aprobada
      estado = 'SOLICITADO',
      personal_autoriza_id = null,
      fecha_autorizacion = null,
      observacion_autorizacion = null,
    } = data;

    await client.query('BEGIN');

    const codigo = await generarCodigoPapeleta();

    const insertSQL = `
      INSERT INTO PapeletasSalida (
        codigo_papeleta,
        personal_solicitante_id,
        estado,
        fecha_solicitud,
        motivo_salida_id,
        sustento_solicitud,
        fecha_hora_salida_programada,
        fecha_hora_retorno_programada,
        personal_autoriza_id,
        fecha_autorizacion,
        observacion_autorizacion
      ) VALUES ($1,$2,$3, CURRENT_TIMESTAMP, $4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `;

    const { rows } = await client.query(insertSQL, [
      codigo,
      personal_solicitante_id,
      estado,
      motivo_salida_id,
      sustento_solicitud,
      fecha_hora_salida_programada,
      fecha_hora_retorno_programada,
      personal_autoriza_id,
      fecha_autorizacion,
      observacion_autorizacion,
    ]);

    await client.query('COMMIT');
    return await findById(rows[0].id);
  } catch (error) {
    await db.safeRollback(client);
    if (error.code === '23505' && /codigo_papeleta/.test(error.constraint || '')) {
      // choque improbable de código -> reintentar una vez
      logger.warn('Colisión de codigo_papeleta, reintentando…');
      return await create(data);
    }
    if (error.code === '23503') {
      if (error.constraint?.includes('personal_solicitante_id')) throw new AppError('Personal solicitante no encontrado', 404);
      if (error.constraint?.includes('motivo_salida_id')) throw new AppError('Motivo de salida no encontrado', 404);
      if (error.constraint?.includes('personal_autoriza_id')) throw new AppError('Personal que autoriza no encontrado', 404);
    }
    logger.error('Error creando papeleta:', error);
    throw error instanceof AppError ? error : new AppError('Error creando papeleta', 500);
  } finally {
    client.release?.();
  }
};

/**
 * Autorizar/Rechazar papeleta
 * accion: 'APROBAR' | 'RECHAZAR'
 */
const decidirPapeleta = async (id, { accion, personal_autoriza_id, observacion_autorizacion = null }) => {
  try {
    const nextEstado = accion === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';
    const sql = `
      UPDATE PapeletasSalida
      SET estado = $1,
          personal_autoriza_id = $2,
          fecha_autorizacion = CURRENT_TIMESTAMP,
          observacion_autorizacion = $3
      WHERE id = $4 AND estado IN ('SOLICITADO','RECHAZADO','APROBADO')
      RETURNING id
    `;
    const { rows } = await db.query(sql, [nextEstado, personal_autoriza_id, observacion_autorizacion, id]);
    if (!rows.length) throw new AppError('Papeleta no encontrada o ya decidida', 404);
    return await findById(id);
  } catch (error) {
    logger.error(`Error decidiendo papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error al decidir la papeleta', 500);
  }
};

/**
 * Registrar salida en garita (versión normal, sin transacción)
 */
const registrarSalida = async (id, usuario_registro_salida_id) => {
  try {
    const sql = `
      UPDATE PapeletasSalida
      SET fecha_hora_salida_real = COALESCE(fecha_hora_salida_real, CURRENT_TIMESTAMP),
          usuario_registro_salida_id = COALESCE(usuario_registro_salida_id, $2),
          estado = 'EN_CURSO'
      WHERE id = $1
      RETURNING id
    `;
    const { rows } = await db.query(sql, [id, usuario_registro_salida_id]);
    if (!rows.length) throw new AppError('Papeleta no encontrada', 404);
    return await findById(id);
  } catch (error) {
    logger.error(`Error registrando salida en papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando salida', 500);
  }
};

/**
 * Registrar salida en garita (versión transaccional)
 * @param {Object} client - Cliente de PostgreSQL de la transacción
 * @param {number} id - ID de la papeleta
 * @param {number} usuario_registro_salida_id - ID del usuario que registra
 * @returns {Object} Papeleta actualizada
 */
const registrarSalidaTx = async (client, id, usuario_registro_salida_id) => {
  try {
    const sql = `
      UPDATE PapeletasSalida
      SET fecha_hora_salida_real = COALESCE(fecha_hora_salida_real, CURRENT_TIMESTAMP),
          usuario_registro_salida_id = COALESCE(usuario_registro_salida_id, $2),
          estado = 'EN_CURSO'
      WHERE id = $1
      RETURNING id
    `;
    const { rows } = await client.query(sql, [id, usuario_registro_salida_id]);
    if (!rows.length) throw new AppError('Papeleta no encontrada', 404);
    
    // Obtener la papeleta completa dentro de la transacción
    const findByIdSql = `
      SELECT
        ps.*,
        m.nombre_motivo,
        p.tipo_documento AS solicitante_tipo_documento,
        p.numero_documento AS solicitante_numero_documento,
        p.nombres AS solicitante_nombres,
        p.apellidos AS solicitante_apellidos,
        pa.nombres AS autoriza_nombres,
        pa.apellidos AS autoriza_apellidos,
        us.nombre_usuario AS usuario_registro_salida,
        ur.nombre_usuario AS usuario_registro_retorno
      FROM PapeletasSalida ps
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      JOIN Personal p ON p.id = ps.personal_solicitante_id
      LEFT JOIN Personal pa ON pa.id = ps.personal_autoriza_id
      LEFT JOIN Usuarios us ON us.id = ps.usuario_registro_salida_id
      LEFT JOIN Usuarios ur ON ur.id = ps.usuario_registro_retorno_id
      WHERE ps.id = $1
    `;
    const { rows: papeletaRows } = await client.query(findByIdSql, [id]);
    return papeletaRows[0] || null;
  } catch (error) {
    logger.error(`Error registrando salida en papeleta ${id} (transacción):`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando salida', 500);
  }
};

/**
 * Registrar retorno en garita
 */
const registrarRetorno = async (id, usuario_registro_retorno_id) => {
  try {
    const sql = `
      UPDATE PapeletasSalida
      SET fecha_hora_retorno_real = CURRENT_TIMESTAMP,
          usuario_registro_retorno_id = $2,
          estado = 'FINALIZADO'
      WHERE id = $1 AND fecha_hora_retorno_real IS NULL
      RETURNING id
    `;
    const { rows } = await db.query(sql, [id, usuario_registro_retorno_id]);
    if (!rows.length) throw new AppError('Papeleta no encontrada o ya finalizada', 404);
    return await findById(id);
  } catch (error) {
    logger.error(`Error registrando retorno en papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando retorno', 500);
  }
};

/**
 * Cancelar papeleta (por solicitante antes de salir)
 */
const cancelar = async (id, observacion_autorizacion = null) => {
  try {
    const sql = `
      UPDATE PapeletasSalida
      SET estado = 'CANCELADO',
          observacion_autorizacion = COALESCE($2, observacion_autorizacion)
      WHERE id = $1 AND fecha_hora_salida_real IS NULL
      RETURNING id
    `;
    const { rows } = await db.query(sql, [id, observacion_autorizacion]);
    if (!rows.length) throw new AppError('No se puede cancelar (no existe o ya inició)', 400);
    return await findById(id);
  } catch (error) {
    logger.error(`Error cancelando papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error cancelando papeleta', 500);
  }
};

/**
 * Anular (DELETE físico) — opcional, preferible evitar por auditoría
 */
const anular = async (id) => {
  try {
    const { rows } = await db.query(`DELETE FROM PapeletasSalida WHERE id = $1 RETURNING id`, [id]);
    if (!rows.length) throw new AppError('Papeleta no encontrada', 404);
    return true;
  } catch (error) {
    logger.error(`Error anulando papeleta ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error anulando papeleta', 500);
  }
};

/**
 * Verificar si un personal tiene una papeleta activa para una fecha específica
 * Una papeleta está activa si:
 * - Estado es 'EN_CURSO' o 'APROBADO'
 * - La fecha está dentro del rango: fecha_hora_salida_programada <= fecha <= fecha_hora_retorno_programada
 * @param {number} personalId - ID del personal
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object|null} Papeleta activa encontrada o null
 */
const encontrarPapeletaActivaPorFecha = async (personalId, fecha) => {
  try {
    const sql = `
      SELECT 
        ps.id,
        ps.codigo_papeleta,
        ps.estado,
        ps.personal_solicitante_id,
        ps.fecha_hora_salida_programada,
        ps.fecha_hora_retorno_programada,
        ps.fecha_hora_salida_real,
        ps.fecha_hora_retorno_real
      FROM PapeletasSalida ps
      WHERE ps.personal_solicitante_id = $1
        AND ps.estado IN ('APROBADO', 'EN_CURSO')
        AND DATE(ps.fecha_hora_salida_programada) <= $2::date
        AND DATE(ps.fecha_hora_retorno_programada) >= $2::date
        AND ps.fecha_hora_retorno_real IS NULL
      ORDER BY ps.fecha_hora_salida_programada DESC
      LIMIT 1
    `;
    const { rows } = await db.query(sql, [personalId, fecha]);
    return rows[0] || null;
  } catch (error) {
    logger.error(`Error buscando papeleta activa para personal ${personalId} en fecha ${fecha}:`, error);
    throw new AppError('Error verificando papeleta activa', 500);
  }
};

/**
 * Estadísticas (por rango y por tipo)
 * - totales por estado
 * - por motivo
 * - por día (solicitud y finales)
 */
const getEstadisticas = async (fechaInicio, fechaFin, campoFecha = 'solicitud') => {
  try {
    const { where, params } = buildFilters({ fechaInicio, fechaFin, campoFecha });
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalesSQL = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'SOLICITADO') AS solicitadas,
        COUNT(*) FILTER (WHERE estado = 'APROBADO') AS aprobadas,
        COUNT(*) FILTER (WHERE estado = 'RECHAZADO') AS rechazadas,
        COUNT(*) FILTER (WHERE estado = 'EN_CURSO') AS en_curso,
        COUNT(*) FILTER (WHERE estado = 'FINALIZADO') AS finalizadas,
        COUNT(*) FILTER (WHERE estado = 'CANCELADO') AS canceladas,
        COUNT(*) FILTER (WHERE fecha_hora_retorno_real IS NULL AND estado IN ('APROBADO','EN_CURSO')) AS pendientes_garita
      FROM PapeletasSalida ps
      ${whereSQL}
    `;

    const porMotivoSQL = `
      SELECT m.id, m.nombre_motivo, COUNT(*) AS total
      FROM PapeletasSalida ps
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      ${whereSQL}
      GROUP BY m.id, m.nombre_motivo
      ORDER BY total DESC
    `;

    const porDiaSQL = `
      SELECT
        DATE(${campoFecha === 'programada' ? 'ps.fecha_hora_salida_programada'
          : campoFecha === 'salida_real' ? 'ps.fecha_hora_salida_real'
          : campoFecha === 'retorno_real' ? 'ps.fecha_hora_retorno_real'
          : 'ps.fecha_solicitud'}) AS fecha,
        COUNT(*) AS total
      FROM PapeletasSalida ps
      ${whereSQL}
      GROUP BY DATE(${campoFecha === 'programada' ? 'ps.fecha_hora_salida_programada'
        : campoFecha === 'salida_real' ? 'ps.fecha_hora_salida_real'
        : campoFecha === 'retorno_real' ? 'ps.fecha_hora_retorno_real'
        : 'ps.fecha_solicitud'})
      ORDER BY fecha
    `;

    const [tot, mot, dia] = await Promise.all([
      db.query(totalesSQL, params),
      db.query(porMotivoSQL, params),
      db.query(porDiaSQL, params),
    ]);

    const t = tot.rows[0] || {};
    return {
      total: parseInt(t.total || 0, 10),
      solicitadas: parseInt(t.solicitadas || 0, 10),
      aprobadas: parseInt(t.aprobadas || 0, 10),
      rechazadas: parseInt(t.rechazadas || 0, 10),
      en_curso: parseInt(t.en_curso || 0, 10),
      finalizadas: parseInt(t.finalizadas || 0, 10),
      canceladas: parseInt(t.canceladas || 0, 10),
      pendientes_garita: parseInt(t.pendientes_garita || 0, 10),
      por_motivo: mot.rows,
      por_dia: dia.rows,
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de papeletas:', error);
    throw new AppError('Error obteniendo estadísticas de papeletas', 500);
  }
};

/**
 * Estadísticas específicas para RRHH - Estado de papeletas
 * Retorna distribución por estado y flujo por día
 */
const getEstadisticasEstado = async (fechaInicio, fechaFin, periodo = 'mes') => {
  try {
    const { where, params } = buildFilters({ fechaInicio, fechaFin, campoFecha: 'solicitud' });
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Distribución por estado
    const estadosSQL = `
      SELECT
        estado,
        COUNT(*) AS total
      FROM PapeletasSalida ps
      LEFT JOIN Personal p ON p.id = ps.personal_solicitante_id
      ${whereSQL}
      GROUP BY estado
      ORDER BY total DESC
    `;

    // Flujo por día
    const flujoDiarioSQL = `
      SELECT
        DATE(ps.fecha_solicitud) AS dia,
        COUNT(*) AS total
      FROM PapeletasSalida ps
      LEFT JOIN Personal p ON p.id = ps.personal_solicitante_id
      ${whereSQL}
      GROUP BY dia
      ORDER BY dia
    `;

    const [estados, flujo] = await Promise.all([
      db.query(estadosSQL, params),
      db.query(flujoDiarioSQL, params),
    ]);

    return {
      distribucion_estados: estados.rows,
      flujo_diario: flujo.rows,
      total: estados.rows.reduce((sum, row) => sum + parseInt(row.total || 0, 10), 0),
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de estado:', error);
    throw new AppError('Error obteniendo estadísticas de estado', 500);
  }
};

/**
 * Estadísticas específicas para RRHH - Motivos de salida
 */
const getEstadisticasMotivos = async (fechaInicio, fechaFin, periodo = 'mes') => {
  try {
    const { where, params } = buildFilters({ fechaInicio, fechaFin, campoFecha: 'solicitud' });
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const motivosSQL = `
      SELECT 
        m.id,
        m.nombre_motivo,
        COUNT(*) AS total
      FROM PapeletasSalida ps
      JOIN MotivosSalidaPersonal m ON m.id = ps.motivo_salida_id
      LEFT JOIN Personal p ON p.id = ps.personal_solicitante_id
      ${whereSQL}
      GROUP BY m.id, m.nombre_motivo
      ORDER BY total DESC
    `;

    const { rows } = await db.query(motivosSQL, params);
    const total = rows.reduce((sum, row) => sum + parseInt(row.total || 0, 10), 0);

    return {
      por_motivo: rows,
      total,
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de motivos:', error);
    throw new AppError('Error obteniendo estadísticas de motivos', 500);
  }
};

/**
 * Estadísticas específicas para RRHH - Horas autorizadas vs usadas
 */
const getEstadisticasHoras = async (fechaInicio, fechaFin, periodo = 'mes') => {
  try {
    const { where, params } = buildFilters({ fechaInicio, fechaFin, campoFecha: 'solicitud' });
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const horasSQL = `
      SELECT
        ps.id,
        ps.codigo_papeleta,
        CONCAT(p.nombres, ' ', p.apellidos) AS personal,
        p.area_destino_id,
        ad.nombre_area,
        EXTRACT(EPOCH FROM (ps.fecha_hora_retorno_programada - ps.fecha_hora_salida_programada)) / 60.0 AS minutos_programados,
        EXTRACT(EPOCH FROM (ps.fecha_hora_retorno_real - ps.fecha_hora_salida_real)) / 60.0 AS minutos_reales,
        (EXTRACT(EPOCH FROM (ps.fecha_hora_retorno_real - ps.fecha_hora_salida_real)) -
         EXTRACT(EPOCH FROM (ps.fecha_hora_retorno_programada - ps.fecha_hora_salida_programada))) / 60.0 AS minutos_desviacion
      FROM PapeletasSalida ps
      JOIN Personal p ON ps.personal_solicitante_id = p.id
      LEFT JOIN AreasDestino ad ON p.area_destino_id = ad.id
      ${whereSQL}
        AND ps.fecha_hora_salida_real IS NOT NULL
        AND ps.fecha_hora_retorno_real IS NOT NULL
      ORDER BY minutos_desviacion DESC
    `;

    const { rows } = await db.query(horasSQL, params);

    // Calcular promedios
    const totalRegistros = rows.length;
    const promedioDesviacion = totalRegistros > 0
      ? rows.reduce((sum, row) => sum + parseFloat(row.minutos_desviacion || 0), 0) / totalRegistros
      : 0;

    // Agrupar por persona
    const porPersona = {};
    rows.forEach(row => {
      if (!porPersona[row.personal]) {
        porPersona[row.personal] = {
          personal: row.personal,
          total_papeletas: 0,
          desviacion_total: 0,
        };
      }
      porPersona[row.personal].total_papeletas++;
      porPersona[row.personal].desviacion_total += parseFloat(row.minutos_desviacion || 0);
    });

    const porPersonaArray = Object.values(porPersona).map(item => ({
      ...item,
      desviacion_promedio: item.total_papeletas > 0 ? item.desviacion_total / item.total_papeletas : 0,
    })).sort((a, b) => Math.abs(b.desviacion_promedio) - Math.abs(a.desviacion_promedio));

    return {
      detalle: rows,
      resumen: {
        total_registros: totalRegistros,
        promedio_desviacion_minutos: promedioDesviacion,
      },
      por_persona: porPersonaArray.slice(0, 10), // Top 10
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de horas:', error);
    throw new AppError('Error obteniendo estadísticas de horas', 500);
  }
};

/**
 * Estadísticas específicas para RRHH - Áreas y colaboradores con más papeletas
 */
const getEstadisticasAreas = async (fechaInicio, fechaFin, periodo = 'mes') => {
  try {
    const { where, params } = buildFilters({ fechaInicio, fechaFin, campoFecha: 'solicitud' });
    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Por área
    const areasSQL = `
      SELECT
        ad.id,
        ad.nombre_area,
        COUNT(*) AS total_papeletas
      FROM PapeletasSalida ps
      JOIN Personal p ON ps.personal_solicitante_id = p.id
      JOIN AreasDestino ad ON p.area_destino_id = ad.id
      ${whereSQL}
        AND ps.estado IN ('APROBADO', 'EN_CURSO', 'FINALIZADO')
      GROUP BY ad.id, ad.nombre_area
      ORDER BY total_papeletas DESC
    `;

    // Por persona (Top 10)
    const personasSQL = `
      SELECT
        p.id,
        CONCAT(p.nombres, ' ', p.apellidos) AS personal,
        ad.nombre_area,
        COUNT(*) AS total_papeletas
      FROM PapeletasSalida ps
      JOIN Personal p ON ps.personal_solicitante_id = p.id
      LEFT JOIN AreasDestino ad ON p.area_destino_id = ad.id
      ${whereSQL}
        AND ps.estado IN ('APROBADO', 'EN_CURSO', 'FINALIZADO')
      GROUP BY p.id, personal, ad.nombre_area
      ORDER BY total_papeletas DESC
      LIMIT 10
    `;

    const [areas, personas] = await Promise.all([
      db.query(areasSQL, params),
      db.query(personasSQL, params),
    ]);

    return {
      por_area: areas.rows,
      por_persona: personas.rows,
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de áreas:', error);
    throw new AppError('Error obteniendo estadísticas de áreas', 500);
  }
};

module.exports = {
  // listados
  findAll,
  findPendientes,
  findPendientesByPersonal,

  // CRUD
  findById,
  create,
  decidirPapeleta,
  registrarSalida,
  registrarSalidaTx,
  registrarRetorno,
  cancelar,
  anular,

  // helpers
  encontrarPapeletaActivaPorFecha,

  // stats
  getEstadisticas,
  getEstadisticasEstado,
  getEstadisticasMotivos,
  getEstadisticasHoras,
  getEstadisticasAreas,
};
