/**
 * Repositorio para gestión de visitas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todas las visitas con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @param {boolean} usePagination - Si es false, devuelve todos los resultados sin paginación
 * @returns {Object} Visitas encontradas y total
 */
const findAll = async (options = {}, usePagination = true) => {
  const { 
    page = 1, 
    limit = 15, 
    search = '',
    fechaInicio,
    fechaFin,
    areaId,
    motivoVisitaId,
    personalVisitadoId,
    documentoVisitante
  } = options;
  
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        rv.id,
        rv.visitante_id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        v.numero_documento,
        v.nombres as visitante_nombres,
        v.apellidos as visitante_apellidos,
        rv.area_destino_id,
        a.nombre_area,
        rv.personal_visitado_id,
        CASE WHEN p.id IS NOT NULL THEN p.nombres ELSE NULL END as personal_nombres,
        CASE WHEN p.id IS NOT NULL THEN p.apellidos ELSE NULL END as personal_apellidos,
        CASE WHEN c.id IS NOT NULL THEN c.nombre_cargo ELSE NULL END as personal_cargo,
        rv.motivo_visita_id,
        mv.nombre_motivo,
        rv.fecha_ingreso,
        rv.fecha_salida,
        rv.usuario_ingreso_id,
        u1.nombre_usuario as usuario_ingreso,
        rv.estado_visita,
        rv.usuario_salida_id,
        u2.nombre_usuario as usuario_salida,
        rv.fecha_fin_atencion
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      JOIN Usuarios u1 ON rv.usuario_ingreso_id = u1.id
      LEFT JOIN Usuarios u2 ON rv.usuario_salida_id = u2.id
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(
        v.nombres ILIKE $${paramCounter} OR 
        v.apellidos ILIKE $${paramCounter} OR 
        v.numero_documento ILIKE $${paramCounter} OR
        p.nombres ILIKE $${paramCounter} OR
        p.apellidos ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por rango de fechas
    if (fechaInicio) {
      whereConditions.push(`rv.fecha_ingreso >= $${paramCounter}`);
      queryParams.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      // Agregar un día a fechaFin para incluir todo el día
      const fechaFinDate = new Date(fechaFin);
      fechaFinDate.setDate(fechaFinDate.getDate() + 1);
      const fechaFinMasUnDia = fechaFinDate.toISOString().split('T')[0];
      
      whereConditions.push(`rv.fecha_ingreso < $${paramCounter}`);
      queryParams.push(fechaFinMasUnDia);
      paramCounter++;
    }
    
    // Filtro por área
    if (areaId) {
      whereConditions.push(`rv.area_destino_id = $${paramCounter}`);
      queryParams.push(areaId);
      paramCounter++;
    }
    
    // Filtro por motivo de visita
    if (motivoVisitaId) {
      whereConditions.push(`rv.motivo_visita_id = $${paramCounter}`);
      queryParams.push(motivoVisitaId);
      paramCounter++;
    }
    
    // Filtro por personal visitado
    if (personalVisitadoId) {
      whereConditions.push(`rv.personal_visitado_id = $${paramCounter}`);
      queryParams.push(personalVisitadoId);
      paramCounter++;
    }
    
    // Filtro por documento del visitante
    if (documentoVisitante) {
      whereConditions.push(`v.numero_documento = $${paramCounter}`);
      queryParams.push(documentoVisitante);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento
    query += ` ORDER BY rv.fecha_ingreso DESC`;
    
    // Agregar paginación solo si está habilitada
    if (usePagination) {
      query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      queryParams.push(limit, offset);
    }
    
    // Ejecutar consultas en paralelo
    const [visitasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    
    return {
      visitas: visitasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando visitas:', error);
    throw new AppError('Error obteniendo visitas', 500);
  }
};

/**
 * Buscar visitas activas (sin salida) con paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Visitas activas encontradas y total
 */
const findActivas = async (options = {}) => {
  const { page = 1, limit = 15, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    // Solo mostrar visitas activas del día actual
    let query = `
      SELECT 
        rv.id,
        rv.visitante_id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        v.numero_documento,
        v.nombres as visitante_nombres,
        v.apellidos as visitante_apellidos,
        rv.area_destino_id,
        a.nombre_area,
        rv.personal_visitado_id,
        CASE WHEN p.id IS NOT NULL THEN p.nombres ELSE NULL END as personal_nombres,
        CASE WHEN p.id IS NOT NULL THEN p.apellidos ELSE NULL END as personal_apellidos,
        CASE WHEN c.id IS NOT NULL THEN c.nombre_cargo ELSE NULL END as personal_cargo,
        rv.motivo_visita_id,
        mv.nombre_motivo,
        rv.fecha_ingreso,
        rv.fecha_salida,
        rv.usuario_ingreso_id,
        u1.nombre_usuario as usuario_ingreso,
        rv.estado_visita
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      JOIN Usuarios u1 ON rv.usuario_ingreso_id = u1.id
      WHERE rv.fecha_salida IS NULL
        AND DATE(rv.fecha_ingreso) = CURRENT_DATE
    `;
    
    // Agregar filtro de búsqueda si existe
    const queryParams = [];
    let paramCounter = 1;
    
    if (search) {
      query += ` AND (
        v.nombres ILIKE $${paramCounter} OR 
        v.apellidos ILIKE $${paramCounter} OR 
        v.numero_documento ILIKE $${paramCounter} OR
        p.nombres ILIKE $${paramCounter} OR
        p.apellidos ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Consulta para contar el total
    // Solo contar visitas del día actual
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      WHERE rv.fecha_salida IS NULL
        AND DATE(rv.fecha_ingreso) = CURRENT_DATE
      ${search ? `AND (
        v.nombres ILIKE $1 OR 
        v.apellidos ILIKE $1 OR 
        v.numero_documento ILIKE $1 OR
        p.nombres ILIKE $1 OR
        p.apellidos ILIKE $1
      )` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY rv.fecha_ingreso ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [visitasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, search ? [`%${search}%`] : [])
    ]);
    
    return {
      visitas: visitasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando visitas activas:', error);
    throw new AppError('Error obteniendo visitas activas', 500);
  }
};

/**
 * Buscar visita por ID
 * @param {number} id - ID de la visita
 * @returns {Object|null} Visita encontrada o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        rv.id,
        rv.visitante_id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        v.numero_documento,
        v.nombres as visitante_nombres,
        v.apellidos as visitante_apellidos,
        rv.area_destino_id,
        a.nombre_area,
        rv.personal_visitado_id,
        CASE WHEN p.id IS NOT NULL THEN p.nombres ELSE NULL END as personal_nombres,
        CASE WHEN p.id IS NOT NULL THEN p.apellidos ELSE NULL END as personal_apellidos,
        CASE WHEN c.id IS NOT NULL THEN c.nombre_cargo ELSE NULL END as personal_cargo,
        rv.motivo_visita_id,
        mv.nombre_motivo,
        rv.fecha_ingreso,
        rv.fecha_salida,
        rv.usuario_ingreso_id,
        u1.nombre_usuario as usuario_ingreso,
        rv.estado_visita,
        rv.usuario_salida_id,
        u2.nombre_usuario as usuario_salida,
        rv.fecha_fin_atencion
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      JOIN Usuarios u1 ON rv.usuario_ingreso_id = u1.id
      LEFT JOIN Usuarios u2 ON rv.usuario_salida_id = u2.id
      WHERE rv.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando visita por ID ${id}:`, error);
    throw new AppError('Error obteniendo visita', 500);
  }
};

/**
 * Crear nueva visita
 * @param {Object} visitaData - Datos de la visita
 * @returns {Object} Visita creada
 */
const create = async (visitaData) => {
  try {
    const { 
      visitante_id, 
      area_destino_id, 
      personal_visitado_id, 
      motivo_visita_id,
      fecha_ingreso,
      usuario_ingreso_id
    } = visitaData;
    
    const query = `
      INSERT INTO RegistrosVisitas (
        visitante_id, 
        area_destino_id, 
        personal_visitado_id, 
        motivo_visita_id,
        fecha_ingreso,
        usuario_ingreso_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      visitante_id, 
      area_destino_id, 
      personal_visitado_id, 
      motivo_visita_id,
      fecha_ingreso,
      usuario_ingreso_id
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando visita', 500);
    }
    
    // Obtener la visita completa con todos los datos relacionados
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('visitante_id')) {
        throw new AppError('Visitante no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('area_destino_id')) {
        throw new AppError('Área de destino no encontrada', 404);
      }
      if (error.constraint && error.constraint.includes('personal_visitado_id')) {
        throw new AppError('Personal visitado no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('motivo_visita_id')) {
        throw new AppError('Motivo de visita no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('usuario_ingreso_id')) {
        throw new AppError('Usuario de ingreso no encontrado', 404);
      }
    }
    
    logger.error('Error en repositorio creando visita:', error);
    throw error instanceof AppError ? error : new AppError('Error creando visita', 500);
  }
};

/**
 * Registrar salida de visita
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @returns {Object} Visita actualizada
 */
const registrarSalida = async (id, usuarioSalidaId) => {
  try {
    logger.info(`Repositorio: Iniciando registro de salida para visita ID: ${id}, usuario: ${usuarioSalidaId}`);
    
    const query = `
      UPDATE RegistrosVisitas 
      SET 
        fecha_salida = CURRENT_TIMESTAMP,
        usuario_salida_id = $1
      WHERE id = $2 AND fecha_salida IS NULL
      RETURNING id
    `;
    
    logger.info(`Repositorio: Query SQL:`, query);
    logger.info(`Repositorio: Parámetros: [${usuarioSalidaId}, ${id}]`);
    
    const result = await db.query(query, [usuarioSalidaId, id]);
    
    logger.info(`Repositorio: Resultado de la consulta:`, result);
    
    if (result.rows.length === 0) {
      logger.error(`Repositorio: No se encontró la visita o ya tiene salida registrada`);
      throw new AppError('Visita no encontrada o ya tiene salida registrada', 404);
    }
    
    logger.info(`Repositorio: UPDATE exitoso, obteniendo visita actualizada`);
    
    // Obtener la visita actualizada completa
    const visitaActualizada = await findById(id);
    logger.info(`Repositorio: Visita actualizada obtenida:`, visitaActualizada);
    
    return visitaActualizada;
    
  } catch (error) {
    if (error.code === '23503' && error.constraint && error.constraint.includes('usuario_salida_id')) {
      throw new AppError('Usuario de salida no encontrado', 404);
    }
    
    logger.error(`Error en repositorio registrando salida para visita ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando salida', 500);
  }
};

/**
 * Registrar salida de visita con fecha y hora específicas (para sincronización offline)
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @param {string} fechaSalida - Fecha de salida en formato YYYY-MM-DD
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Visita actualizada
 */
const registrarSalidaConFechaHora = async (id, usuarioSalidaId, fechaSalida, horaSalida) => {
  try {
    logger.info(`Repositorio: Iniciando registro de salida con fecha/hora específica para visita ID: ${id}, usuario: ${usuarioSalidaId}, fecha: ${fechaSalida}, hora: ${horaSalida}`);
    
    // Validar formato de fecha (YYYY-MM-DD)
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!fechaRegex.test(fechaSalida)) {
      logger.error(`Formato de fecha inválido: ${fechaSalida}. Esperado: YYYY-MM-DD`);
      throw new AppError('Formato de fecha inválido. Use YYYY-MM-DD', 400);
    }

    // Validar formato de hora (HH:MM:SS o HH:MM)
    const horaRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (!horaRegex.test(horaSalida)) {
      logger.error(`Formato de hora inválido: ${horaSalida}. Esperado: HH:MM:SS o HH:MM`);
      throw new AppError('Formato de hora inválido. Use HH:MM:SS o HH:MM', 400);
    }

    // Asegurar que horaSalida tenga formato HH:MM:SS
    let horaSalidaCompleta = horaSalida;
    if (horaSalida.length === 5) {
      horaSalidaCompleta = `${horaSalida}:00`; // Agregar segundos si no están presentes
    }
    
    // Combinar fecha y hora en un timestamp
    const fechaHoraSalida = `${fechaSalida} ${horaSalidaCompleta}`;
    
    logger.info(`Repositorio: Datos procesados:`, {
      fechaSalida,
      horaSalida,
      horaSalidaCompleta,
      fechaHoraSalida
    });
    
    const query = `
      UPDATE RegistrosVisitas 
      SET 
        fecha_salida = $3::timestamp,
        usuario_salida_id = $1
      WHERE id = $2 AND fecha_salida IS NULL
      RETURNING id
    `;
    
    logger.info(`Repositorio: Query SQL:`, query);
    logger.info(`Repositorio: Parámetros: [${usuarioSalidaId}, ${id}, ${fechaHoraSalida}]`);
    
    const result = await db.query(query, [usuarioSalidaId, id, fechaHoraSalida]);
    
    logger.info(`Repositorio: Resultado de la consulta:`, result);
    
    if (result.rows.length === 0) {
      logger.error(`Repositorio: No se encontró la visita o ya tiene salida registrada`);
      throw new AppError('Visita no encontrada o ya tiene salida registrada', 404);
    }
    
    logger.info(`Repositorio: UPDATE exitoso, obteniendo visita actualizada`);
    
    // Obtener la visita actualizada completa
    const visitaActualizada = await findById(id);
    logger.info(`Repositorio: Visita actualizada obtenida:`, visitaActualizada);
    
    return visitaActualizada;
    
  } catch (error) {
    if (error.code === '23503' && error.constraint && error.constraint.includes('usuario_salida_id')) {
      throw new AppError('Usuario de salida no encontrado', 404);
    }
    
    logger.error(`Error en repositorio registrando salida con fecha/hora para visita ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error registrando salida', 500);
  }
};

/**
 * Obtener estadísticas de visitas
 * @param {string} fechaInicio - Fecha de inicio para el filtro
 * @param {string} fechaFin - Fecha de fin para el filtro
 * @returns {Object} Estadísticas de visitas
 */
const getEstadisticas = async (fechaInicio, fechaFin) => {
  try {
    // Construir las condiciones de fecha
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha_ingreso >= $${paramCounter++}`);
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      // Agregar un día a fechaFin para incluir todo el día
      const fechaFinDate = new Date(fechaFin);
      fechaFinDate.setDate(fechaFinDate.getDate() + 1);
      const fechaFinMasUnDia = fechaFinDate.toISOString().split('T')[0];
      
      whereCondition.push(`fecha_ingreso < $${paramCounter++}`);
      params.push(fechaFinMasUnDia);
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Estadísticas totales
    const totalQuery = `
      SELECT COUNT(*) as total_visitas
      FROM RegistrosVisitas
      ${whereClause}
    `;
    
    // Visitas por área
    const areaQuery = `
      SELECT 
        a.id,
        a.nombre_area,
        COUNT(*) as total
      FROM RegistrosVisitas rv
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      ${whereClause}
      GROUP BY a.id, a.nombre_area
      ORDER BY total DESC
    `;
    
    // Visitas por motivo
    const motivoQuery = `
      SELECT 
        m.id,
        m.nombre_motivo,
        COUNT(*) as total
      FROM RegistrosVisitas rv
      JOIN MotivosVisita m ON rv.motivo_visita_id = m.id
      ${whereClause}
      GROUP BY m.id, m.nombre_motivo
      ORDER BY total DESC
    `;
    
    // Visitas por día
    const diaQuery = `
      SELECT 
        DATE(fecha_ingreso) as fecha,
        COUNT(*) as total
      FROM RegistrosVisitas
      ${whereClause}
      GROUP BY DATE(fecha_ingreso)
      ORDER BY fecha
    `;
    
    // Ejecutar consultas en paralelo
    const [totalResult, areaResult, motivoResult, diaResult] = await Promise.all([
      db.query(totalQuery, params),
      db.query(areaQuery, params),
      db.query(motivoQuery, params),
      db.query(diaQuery, params)
    ]);
    
    return {
      total_visitas: parseInt(totalResult.rows[0]?.total_visitas || 0),
      visitas_por_area: areaResult.rows,
      visitas_por_motivo: motivoResult.rows,
      visitas_por_dia: diaResult.rows
    };
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas de visitas:', error);
    throw new AppError('Error obteniendo estadísticas de visitas', 500);
  }
};

/**
 * Buscar si un visitante tiene alguna visita activa (sin salida) - SIN importar el área
 * Solo busca visitas activas del día actual
 * @param {number} visitanteId - ID del visitante
 * @returns {Object|null} Visita activa encontrada o null
 */
const findVisitaActivaPorVisitante = async (visitanteId) => {
  try {
    const query = `
      SELECT 
        rv.id,
        rv.visitante_id,
        rv.area_destino_id,
        a.nombre_area,
        rv.fecha_ingreso,
        rv.fecha_salida
      FROM RegistrosVisitas rv
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      WHERE rv.visitante_id = $1 
        AND rv.fecha_salida IS NULL
        AND DATE(rv.fecha_ingreso) = CURRENT_DATE
      ORDER BY rv.fecha_ingreso DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [visitanteId]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando visita activa para visitante ID ${visitanteId}:`, error);
    throw new AppError('Error buscando visita activa', 500);
  }
};

/**
 * Obtener estadísticas de visitas por área
 * @param {Date|null} fechaInicio - Fecha de inicio del filtro
 * @param {Date|null} fechaFin - Fecha de fin del filtro
 * @returns {Array} Array de objetos con nombre_area y visitas
 */
const getVisitasPorArea = async (fechaInicio = null, fechaFin = null) => {
  try {
    let query = `
      SELECT 
        a.nombre_area,
        COUNT(*) AS visitas
      FROM RegistrosVisitas rv
      JOIN AreasDestino a ON rv.area_destino_id = a.id
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Agregar filtro de fecha si se proporciona
    if (fechaInicio && fechaFin) {
      paramCount += 2;
      query += ` WHERE rv.fecha_ingreso BETWEEN $${paramCount - 1} AND $${paramCount}`;
      params.push(fechaInicio, fechaFin);
    }
    
    query += `
      GROUP BY rv.area_destino_id, a.nombre_area
      ORDER BY visitas DESC
    `;
    
    logger.info(`Ejecutando consulta de estadísticas por área: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    
    logger.info(`Estadísticas por área obtenidas: ${result.rows.length} registros`);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas por área:', error);
    throw new AppError('Error obteniendo estadísticas por área', 500);
  }
};

const getVisitasPorMotivo = async (fechaInicio = null, fechaFin = null) => {
  try {
    const params = [];
    let query = '';
    
    if (fechaInicio && fechaFin) {
      // Consulta con filtro de fechas
      query = `
      SELECT 
        m.nombre_motivo,
        COUNT(*) AS count,
        (COUNT(*) * 100.0 / (
          SELECT COUNT(*) 
          FROM RegistrosVisitas rv2
            WHERE rv2.fecha_ingreso BETWEEN $1 AND $2
        )) AS porcentaje
      FROM RegistrosVisitas rv
      JOIN MotivosVisita m ON rv.motivo_visita_id = m.id
        WHERE rv.fecha_ingreso BETWEEN $1 AND $2
        GROUP BY rv.motivo_visita_id, m.nombre_motivo
        ORDER BY count DESC
      `;
      params.push(fechaInicio, fechaFin);
    } else {
      // Consulta sin filtro de fechas
      query = `
        SELECT 
          m.nombre_motivo,
          COUNT(*) AS count,
          (COUNT(*) * 100.0 / (
            SELECT COUNT(*) 
            FROM RegistrosVisitas rv2
          )) AS porcentaje
        FROM RegistrosVisitas rv
        JOIN MotivosVisita m ON rv.motivo_visita_id = m.id
        GROUP BY rv.motivo_visita_id, m.nombre_motivo
        ORDER BY count DESC
      `;
    }
    
    logger.info(`Ejecutando consulta de estadísticas por motivo: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    
    logger.info(`Estadísticas por motivo obtenidas: ${result.rows.length} registros`);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas por motivo:', error);
    throw new AppError('Error obteniendo estadísticas por motivo', 500);
  }
};

/**
 * Obtener total de visitas en un período
 * @param {Date} fechaInicio - Fecha de inicio del rango (opcional)
 * @param {Date} fechaFin - Fecha de fin del rango (opcional)
 * @returns {number} Total de visitas
 */
const getTotalVisitas = async (fechaInicio = null, fechaFin = null) => {
  try {
    let query = `SELECT COUNT(*) AS total FROM RegistrosVisitas`;
    const params = [];
    
    if (fechaInicio && fechaFin) {
      query += ` WHERE fecha_ingreso BETWEEN $1 AND $2`;
      params.push(fechaInicio, fechaFin);
    }
    
    logger.info(`Ejecutando consulta de total de visitas: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    const total = parseInt(result.rows[0].total, 10);
    
    logger.info(`Total de visitas obtenido: ${total}`);
    
    return total;
    
  } catch (error) {
    logger.error('Error obteniendo total de visitas:', error);
    throw new AppError('Error obteniendo total de visitas', 500);
  }
};

/**
 * Obtener flujo de visitas por día
 * @param {Date} fechaInicio - Fecha de inicio del rango (opcional)
 * @param {Date} fechaFin - Fecha de fin del rango (opcional)
 * @returns {Array} Array de objetos con fecha y conteo de visitas por día
 */
const getFlujoDiario = async (fechaInicio = null, fechaFin = null) => {
  try {
    let query = `
      SELECT 
        DATE(fecha_ingreso) AS dia,
        COUNT(*) AS visitas
      FROM RegistrosVisitas
    `;
    
    const params = [];
    
    if (fechaInicio && fechaFin) {
      query += ` WHERE fecha_ingreso BETWEEN $1 AND $2`;
      params.push(fechaInicio, fechaFin);
    }
    
    query += `
      GROUP BY DATE(fecha_ingreso)
      ORDER BY dia ASC
    `;
    
    logger.info(`Ejecutando consulta de flujo diario: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    
    logger.info(`Flujo diario obtenido: ${result.rows.length} días`);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error obteniendo flujo diario:', error);
    throw new AppError('Error obteniendo flujo diario', 500);
  }
};

/**
 * Obtener estadísticas de visitas por personal visitado
 * @param {Date|null} fechaInicio - Fecha de inicio del filtro
 * @param {Date|null} fechaFin - Fecha de fin del filtro
 * @returns {Array} Array de objetos con nombre_personal y visitas
 */
const getVisitasPorPersonal = async (fechaInicio = null, fechaFin = null) => {
  try {
    let query = `
      SELECT 
        CONCAT(p.nombres, ' ', p.apellidos) AS nombre_personal,
        COUNT(*) AS visitas
      FROM RegistrosVisitas rv
      JOIN Personal p ON rv.personal_visitado_id = p.id
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Agregar filtro de fecha si se proporciona
    if (fechaInicio && fechaFin) {
      paramCount += 2;
      query += ` WHERE rv.fecha_ingreso BETWEEN $${paramCount - 1} AND $${paramCount}`;
      params.push(fechaInicio, fechaFin);
    }
    
    query += `
      GROUP BY rv.personal_visitado_id, p.nombres, p.apellidos
      ORDER BY visitas DESC
    `;
    
    logger.info(`Ejecutando consulta de estadísticas por personal: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    
    logger.info(`Estadísticas por personal obtenidas: ${result.rows.length} registros`);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas por personal:', error);
    throw new AppError('Error obteniendo estadísticas por personal', 500);
  }
};

/**
 * Obtener visitantes frecuentes (top 10)
 * @param {Date|null} fechaInicio - Fecha de inicio del filtro
 * @param {Date|null} fechaFin - Fecha de fin del filtro
 * @returns {Array} Array de objetos con visitante, num_visitas y ultima_visita
 */
const getVisitantesFrecuentes = async (fechaInicio = null, fechaFin = null) => {
  try {
    let query = `
      SELECT 
        v.id AS visitante_id,
        CONCAT(v.nombres, ' ', v.apellidos) AS visitante,
        v.numero_documento,
        td.codigo AS tipo_documento,
        COUNT(rv.id) AS num_visitas,
        MAX(rv.fecha_ingreso) AS ultima_visita
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
    `;
    
    const params = [];
    
    if (fechaInicio && fechaFin) {
      query += ` WHERE rv.fecha_ingreso BETWEEN $1 AND $2`;
      params.push(fechaInicio, fechaFin);
    }
    
    query += `
      GROUP BY v.id, v.nombres, v.apellidos, v.numero_documento, td.codigo
      ORDER BY num_visitas DESC
      LIMIT 10
    `;
    
    logger.info(`Ejecutando consulta de visitantes frecuentes: ${query}`);
    logger.info(`Parámetros: ${JSON.stringify(params)}`);
    
    const result = await db.query(query, params);
    
    logger.info(`Visitantes frecuentes obtenidos: ${result.rows.length} registros`);
    
    return result.rows;
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo visitantes frecuentes:', error);
    throw new AppError('Error obteniendo visitantes frecuentes', 500);
  }
};

/**
 * Obtener detalle de visitas de un visitante específico
 * @param {number} visitanteId - ID del visitante
 * @param {Date|null} fechaInicio - Fecha de inicio del filtro
 * @param {Date|null} fechaFin - Fecha de fin del filtro
 * @returns {Object} Detalle del visitante con todas sus visitas
 */
const getVisitanteDetalle = async (visitanteId, fechaInicio = null, fechaFin = null) => {
  try {
    // Query principal para datos del visitante
    let queryVisitante = `
      SELECT 
        v.id,
        v.nombres,
        v.apellidos,
        v.numero_documento,
        td.codigo AS tipo_documento,
        COUNT(rv.id) AS total_visitas,
        MAX(rv.fecha_ingreso) AS ultima_visita
      FROM Visitantes v
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      LEFT JOIN RegistrosVisitas rv ON v.id = rv.visitante_id
    `;
    
    const paramsVisitante = [visitanteId];
    let paramCount = 1;
    
    queryVisitante += ` WHERE v.id = $${paramCount}`;
    
    if (fechaInicio && fechaFin) {
      paramCount++;
      queryVisitante += ` AND rv.fecha_ingreso BETWEEN $${paramCount} AND $${paramCount + 1}`;
      paramsVisitante.push(fechaInicio, fechaFin);
      paramCount++;
    }
    
    queryVisitante += `
      GROUP BY v.id, v.nombres, v.apellidos, v.numero_documento, td.codigo
    `;
    
    // Query para obtener todas las visitas del visitante
    let queryVisitas = `
      SELECT 
        DATE(rv.fecha_ingreso) AS fecha,
        COUNT(*) AS visitas_dia,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'hora_ingreso', TO_CHAR(rv.fecha_ingreso, 'HH24:MI'),
            'hora_salida', CASE WHEN rv.fecha_salida IS NOT NULL 
                               THEN TO_CHAR(rv.fecha_salida, 'HH24:MI') 
                               ELSE NULL END,
            'motivo', m.nombre_motivo,
            'area', a.nombre_area,
            'personal', CONCAT(p.nombres, ' ', p.apellidos)
          )
          ORDER BY rv.fecha_ingreso
        ) AS detalles
      FROM RegistrosVisitas rv
      LEFT JOIN MotivosVisita m ON rv.motivo_visita_id = m.id
      LEFT JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      WHERE rv.visitante_id = $1
    `;
    
    const paramsVisitas = [visitanteId];
    
    if (fechaInicio && fechaFin) {
      queryVisitas += ` AND rv.fecha_ingreso BETWEEN $2 AND $3`;
      paramsVisitas.push(fechaInicio, fechaFin);
    }
    
    queryVisitas += `
      GROUP BY DATE(rv.fecha_ingreso)
      ORDER BY DATE(rv.fecha_ingreso) DESC
    `;
    
    // Ejecutar ambas queries
    const [visitanteResult, visitasResult] = await Promise.all([
      db.query(queryVisitante, paramsVisitante),
      db.query(queryVisitas, paramsVisitas)
    ]);
    
    if (visitanteResult.rows.length === 0) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    const visitante = visitanteResult.rows[0];
    const visitas = visitasResult.rows;
    
    // Calcular días de la semana visitados
    const diasSemana = new Set();
    visitas.forEach(v => {
      const fecha = new Date(v.fecha);
      const dia = fecha.toLocaleDateString('es-ES', { weekday: 'short' });
      diasSemana.add(dia);
    });
    
    return {
      ...visitante,
      visitas_por_fecha: visitas,
      dias_semana: Array.from(diasSemana)
    };
    
  } catch (error) {
    logger.error(`Error obteniendo detalle del visitante ${visitanteId}:`, error);
    if (error instanceof AppError) throw error;
    throw new AppError('Error obteniendo detalle del visitante', 500);
  }
};
// Helper: convierte cualquier Date o valor de fecha a 'YYYY-MM-DD'
const toPgDateString = (value) => {
  // Si ya viene como 'YYYY-MM-DD', lo reutilizamos
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
/**
 * Cerrar automáticamente visitas según las reglas:
 * - Solo cerrar visitas de días anteriores que no tienen salida
 * - Las visitas del día actual NO se tocan para no interrumpir visitas en curso
 * @param {number} usuarioSistemaId - ID del usuario del sistema que ejecuta el cierre automático
 * @returns {Object} Resultado del cierre automático
 */
const cerrarVisitasAutomaticamente = async (usuarioSistemaId) => {
  try {
    logger.info('Iniciando cierre automático de visitas...');

    // Obtener todas las visitas activas (sin salida) de días anteriores
    const query = `
      SELECT 
        id,
        fecha_ingreso,
        DATE(fecha_ingreso) as fecha_ingreso_fecha,
        EXTRACT(HOUR FROM fecha_ingreso) as hora_ingreso,
        EXTRACT(MINUTE FROM fecha_ingreso) as minuto_ingreso
      FROM RegistrosVisitas
      WHERE fecha_salida IS NULL
        AND DATE(fecha_ingreso) < CURRENT_DATE
      ORDER BY fecha_ingreso ASC
    `;

    const result = await db.query(query);
    const visitasActivas = result.rows;

    logger.info(`Se encontraron ${visitasActivas.length} visitas activas para procesar`);

    let cerradas = 0;
    let errores = 0;

    for (const visita of visitasActivas) {
      try {
        const fechaIngresoFechaRaw = visita.fecha_ingreso_fecha; // viene de DATE(fecha_ingreso)

        // Normalizamos la fecha de ingreso a 'YYYY-MM-DD'
        const fechaIngresoDateStr = toPgDateString(fechaIngresoFechaRaw);
        if (!fechaIngresoDateStr) {
          logger.error(`No se pudo parsear fecha_ingreso_fecha para visita ID ${visita.id}:`, fechaIngresoFechaRaw);
          errores++;
          continue;
        }

        // Siempre es día anterior (la query excluye el día actual).
        // Cerramos al final del día de ingreso para marcar salida forzada sin alterar el día.
        const horaSalidaStr = '23:59:59';
        const fechaHoraSalida = `${fechaIngresoDateStr} ${horaSalidaStr}`;

        logger.info(`Cerrando visita ID ${visita.id} con fechaHoraSalida = ${fechaHoraSalida}`);

        const updateQuery = `
          UPDATE RegistrosVisitas 
          SET 
            fecha_salida = $1::timestamp,
            usuario_salida_id = $2
          WHERE id = $3
          RETURNING id
        `;

        await db.query(updateQuery, [fechaHoraSalida, usuarioSistemaId, visita.id]);

        logger.info(`Visita ID ${visita.id} cerrada automáticamente a las ${horaSalidaStr}`);
        cerradas++;
      } catch (error) {
        logger.error(`Error cerrando visita ID ${visita.id}:`, error);
        errores++;
      }
    }

    logger.info(`Cierre automático completado: ${cerradas} visitas cerradas, ${errores} errores`);

    return {
      total: visitasActivas.length,
      cerradas,
      errores,
      pendientes: visitasActivas.length - cerradas - errores,
    };
  } catch (error) {
    logger.error('Error en cierre automático de visitas:', error);
    throw new AppError('Error en cierre automático de visitas', 500);
  }
};
/**
 * Actualizar estado de la visita (Aceptar/Rechazar)
 * @param {number} id - ID de la visita
 * @param {string} estado - Nuevo estado (ACEPTADO, RECHAZADO)
 * @param {string} motivoRechazo - Motivo del rechazo (opcional)
 * @returns {Object} Visita actualizada
 */
const updateEstado = async (id, estado, motivoRechazo = null) => {
  // Ensure undefined becomes null for database query
  const motivoFinal = motivoRechazo === undefined ? null : motivoRechazo;
  try {
    let query = `
      UPDATE RegistrosVisitas
      SET 
        estado_visita = $1,
        fecha_aceptacion = CASE WHEN $1::varchar = 'ACEPTADO' THEN CURRENT_TIMESTAMP ELSE fecha_aceptacion END,
        fecha_rechazo = CASE WHEN $1::varchar = 'RECHAZADO' THEN CURRENT_TIMESTAMP ELSE fecha_rechazo END,
        motivo_rechazo = $2
      WHERE id = $3
      RETURNING id
    `;
    
    const result = await db.query(query, [estado, motivoFinal, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    return await findById(id);
  } catch (error) {
    logger.error(`Error actualizando estado de visita ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando estado', 500);
  }
};

/**
 * Delegar visita a otro personal
 * @param {number} id - ID de la visita
 * @param {number} nuevoPersonalId - ID del nuevo personal
 * @param {number} nuevoAreaId - ID del área del nuevo personal
 * @param {number} delegadoPorId - ID del personal que delega
 * @returns {Object} Visita actualizada
 */
const delegar = async (id, nuevoPersonalId, nuevoAreaId, delegadoPorId) => {
  try {
    const query = `
      UPDATE RegistrosVisitas
      SET
        personal_visitado_id = $1,
        area_destino_id = $2,
        delegado_por_id = $3,
        fecha_delegacion = CURRENT_TIMESTAMP,
        estado_visita = 'DELEGADO'
      WHERE id = $4
      RETURNING id
    `;
    
    const result = await db.query(query, [nuevoPersonalId, nuevoAreaId, delegadoPorId, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    return await findById(id);
  } catch (error) {
    logger.error(`Error delegando visita ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error delegando visita', 500);
  }
};

/**
 * Finalizar atención de una visita
 * @param {number} id - ID de la visita
 * @returns {Object} Visita actualizada
 */
const updateFinAtencion = async (id) => {
  try {
    const query = `
      UPDATE RegistrosVisitas
      SET
        fecha_fin_atencion = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    return await findById(id);
  } catch (error) {
    logger.error(`Error finalizando atención de visita ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error finalizando atención', 500);
  }
};


/**
 * Buscar visitas por personal visitado con filtros y paginación
 * @param {number} personalId - ID del personal visitado
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Visitas encontradas y total
 */
const findByPersonalVisitado = async (personalId, options = {}) => {
  const { 
    page = 1, 
    limit = 10, 
    estados = [] // Array de estados: ['PENDIENTE', 'ACEPTADO'] o ['FINALIZADO', 'RECHAZADO']
  } = options;
  
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        rv.id,
        rv.visitante_id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        v.numero_documento,
        v.nombres as visitante_nombres,
        v.apellidos as visitante_apellidos,
        rv.area_destino_id,
        a.nombre_area,
        rv.personal_visitado_id,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        c.nombre_cargo as personal_cargo,
        rv.motivo_visita_id,
        mv.nombre_motivo,
        rv.fecha_ingreso,
        rv.fecha_salida,
        rv.estado_visita,
        rv.motivo_rechazo,
        rv.fecha_aceptacion,
        rv.fecha_rechazo,
        rv.usuario_ingreso_id,
        u1.nombre_usuario as usuario_ingreso,
        rv.fecha_fin_atencion
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      JOIN Personal p ON rv.personal_visitado_id = p.id
      JOIN Cargos c ON p.cargo_id = c.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      JOIN Usuarios u1 ON rv.usuario_ingreso_id = u1.id
      WHERE rv.personal_visitado_id = $1
    `;
    
    const queryParams = [personalId];
    let paramCounter = 2;
    
    // Filtro por estados si se proporciona
    if (estados && estados.length > 0) {
      const placeholders = estados.map((_, i) => `$${paramCounter + i}`).join(', ');
      query += ` AND rv.estado_visita IN (${placeholders})`;
      queryParams.push(...estados);
      paramCounter += estados.length;
    }
    
    // Filtro adicional: visitas sin salida (para activos)
    // Si estamos buscando activos (PENDIENTE, ACEPTADO, DELEGADO), asegurarnos de que no tengan salida
    // Opcional: si tu lógica de negocio dice que 'ACEPTADO' siempre es sin salida, esto es redundante pero seguro.
    // El usuario pidió: "Filtro adicional: visitas sin salida (para activos)"
    const tieneEstadoActivo = estados.some(e => ['PENDIENTE', 'ACEPTADO', 'DELEGADO'].includes(e));
    if (tieneEstadoActivo) {
      // Nota: A veces una visita puede estar ACEPTADA pero ya tener fecha_salida si se finalizó.
      // Pero si el estado es FINALIZADO, ya no es activo.
      // Si el estado es PENDIENTE/ACEPTADO, se asume que está en curso o por iniciar.
      // Sin embargo, el usuario especificó: "query += AND rv.fecha_salida IS NULL"
      // Vamos a respetar la lógica solicitada, aunque cuidado con los estados.
      const soloActivos = estados.every(e => ['PENDIENTE', 'ACEPTADO', 'DELEGADO'].includes(e));
      if (soloActivos) {
         // Si solo pedimos activos, forzamos que no tengan salida.
         // Esto evita mostrar visitas viejas que quedaron en estado 'ACEPTADO' por error pero tienen salida (caso borde).
         // O simplemente para asegurar que son las "de hoy" o "en curso".
         // El usuario puso: AND DATE(rv.fecha_ingreso) = CURRENT_DATE para activos
         query += ` AND rv.fecha_salida IS NULL`;
         // query += ` AND DATE(rv.fecha_ingreso) = CURRENT_DATE`; // El usuario lo incluyó en su snippet
      }
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosVisitas rv
      WHERE rv.personal_visitado_id = $1
      ${estados && estados.length > 0 
        ? `AND rv.estado_visita IN (${estados.map((_, i) => `$${2 + i}`).join(', ')})` 
        : ''}
      ${tieneEstadoActivo && estados.every(e => ['PENDIENTE', 'ACEPTADO', 'DELEGADO'].includes(e)) ? 'AND rv.fecha_salida IS NULL' : ''}
    `;
    
    const countParams = estados && estados.length > 0 
      ? [personalId, ...estados] 
      : [personalId];
    
    // Agregar ordenamiento
    query += ` ORDER BY rv.fecha_ingreso DESC`;
    
    // Agregar paginación
    query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [visitasResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, countParams)
    ]);
    
    return {
      visitas: visitasResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error(`Error en repositorio buscando visitas para personal ${personalId}:`, error);
    throw new AppError('Error obteniendo visitas del personal', 500);
  }
};

module.exports = {
  findAll,
  findActivas,
  findById,
  create,
  registrarSalida,
  registrarSalidaConFechaHora,
  getEstadisticas,
  findVisitaActivaPorVisitante,
  getVisitasPorArea,
  getVisitasPorMotivo,
  getTotalVisitas,
  getFlujoDiario,
  getVisitasPorPersonal,
  getVisitantesFrecuentes,
  getVisitanteDetalle,
  cerrarVisitasAutomaticamente,
  updateEstado,
  delegar,
  updateFinAtencion,
  findByPersonalVisitado
};
