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
        rv.usuario_salida_id,
        u2.nombre_usuario as usuario_salida
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
        u1.nombre_usuario as usuario_ingreso
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      JOIN Usuarios u1 ON rv.usuario_ingreso_id = u1.id
      WHERE rv.fecha_salida IS NULL
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
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosVisitas rv
      JOIN Visitantes v ON rv.visitante_id = v.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      WHERE rv.fecha_salida IS NULL
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
        rv.usuario_salida_id,
        u2.nombre_usuario as usuario_salida
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

module.exports = {
  findAll,
  findActivas,
  findById,
  create,
  registrarSalida,
  getEstadisticas,
  findVisitaActivaPorVisitante
};