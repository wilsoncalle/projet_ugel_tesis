/**
 * Repositorio para gestión de visitantes
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todos los visitantes con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Visitantes encontrados y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base
    let query = `
      SELECT 
        v.id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        td.nombre_completo as tipo_documento_nombre,
        v.numero_documento,
        v.nombres,
        v.apellidos,
        v.fecha_ultima_actualizacion_api
      FROM Visitantes v
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
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
        v.numero_documento ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Visitantes v
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY v.apellidos ASC, v.nombres ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [visitantesResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      visitantes: visitantesResult.rows,
      total: parseInt(countResult.rows[0].total)
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando visitantes:', error);
    throw new AppError('Error obteniendo visitantes', 500);
  }
};

/**
 * Buscar visitante por ID
 * @param {number} id - ID del visitante
 * @returns {Object|null} Visitante encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        v.id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        td.nombre_completo as tipo_documento_nombre,
        v.numero_documento,
        v.nombres,
        v.apellidos,
        v.fecha_ultima_actualizacion_api
      FROM Visitantes v
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      WHERE v.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando visitante por ID ${id}:`, error);
    throw new AppError('Error obteniendo visitante', 500);
  }
};

/**
 * Buscar visitante por tipo y número de documento
 * @param {number} tipoDocumentoId - ID del tipo de documento
 * @param {string} numeroDocumento - Número de documento
 * @returns {Object|null} Visitante encontrado o null
 */
const findByDocumento = async (tipoDocumentoId, numeroDocumento) => {
  try {
    const query = `
      SELECT 
        v.id,
        v.tipo_documento_id,
        td.codigo as tipo_documento_codigo,
        td.nombre_completo as tipo_documento_nombre,
        v.numero_documento,
        v.nombres,
        v.apellidos,
        v.fecha_ultima_actualizacion_api
      FROM Visitantes v
      JOIN TiposDocumento td ON v.tipo_documento_id = td.id
      WHERE v.tipo_documento_id = $1 AND v.numero_documento = $2
    `;
    
    const result = await db.query(query, [tipoDocumentoId, numeroDocumento]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando visitante por documento:`, error);
    throw new AppError('Error obteniendo visitante', 500);
  }
};

/**
 * Crear nuevo visitante
 * @param {Object} visitanteData - Datos del visitante
 * @returns {Object} Visitante creado
 */
const create = async (visitanteData) => {
  try {
    // Mapear campos camelCase a snake_case para la base de datos
    const { 
      tipoDocumentoId, 
      numeroDocumento, 
      nombres, 
      apellidos
    } = visitanteData;
    
    const query = `
      INSERT INTO Visitantes (
        tipo_documento_id, 
        numero_documento, 
        nombres, 
        apellidos
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      tipoDocumentoId, 
      numeroDocumento, 
      nombres, 
      apellidos
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando visitante', 500);
    }
    
    // Obtener el visitante completo
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un visitante con este documento', 409);
    }
    
    if (error.code === '23503' && error.constraint && error.constraint.includes('tipo_documento_id')) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    logger.error('Error en repositorio creando visitante:', error);
    throw error instanceof AppError ? error : new AppError('Error creando visitante', 500);
  }
};

/**
 * Actualizar visitante existente
 * @param {number} id - ID del visitante
 * @param {Object} visitanteData - Datos a actualizar
 * @returns {Object} Visitante actualizado
 */
const update = async (id, visitanteData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar (mapear camelCase a snake_case)
    if (visitanteData.tipoDocumentoId !== undefined) {
      updateFields.push(`tipo_documento_id = $${paramCounter++}`);
      queryParams.push(visitanteData.tipoDocumentoId);
    }
    
    if (visitanteData.numeroDocumento !== undefined) {
      updateFields.push(`numero_documento = $${paramCounter++}`);
      queryParams.push(visitanteData.numeroDocumento);
    }
    
    if (visitanteData.nombres !== undefined) {
      updateFields.push(`nombres = $${paramCounter++}`);
      queryParams.push(visitanteData.nombres);
    }
    
    if (visitanteData.apellidos !== undefined) {
      updateFields.push(`apellidos = $${paramCounter++}`);
      queryParams.push(visitanteData.apellidos);
    }
    
    if (visitanteData.fechaUltimaActualizacionApi !== undefined) {
      updateFields.push(`fecha_ultima_actualizacion_api = $${paramCounter++}`);
      queryParams.push(visitanteData.fechaUltimaActualizacionApi);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentVisitante = await findById(id);
      return currentVisitante;
    }
    
    const query = `
      UPDATE Visitantes 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Visitante no encontrado', 404);
    }
    
    // Obtener el visitante actualizado completo
    return await findById(id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un visitante con este documento', 409);
    }
    
    if (error.code === '23503' && error.constraint && error.constraint.includes('tipo_documento_id')) {
      throw new AppError('Tipo de documento no encontrado', 404);
    }
    
    logger.error(`Error en repositorio actualizando visitante ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando visitante', 500);
  }
};

/**
 * Obtener historial de visitas de un visitante
 * @param {number} id - ID del visitante
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Historial de visitas y datos de paginación
 */
const getHistorialVisitas = async (id, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;
  
  try {
    const query = `
      SELECT 
        rv.id,
        rv.fecha_ingreso,
        rv.fecha_salida,
        a.nombre_area,
        mv.nombre_motivo,
        CASE WHEN p.id IS NOT NULL THEN CONCAT(p.nombres, ' ', p.apellidos) ELSE NULL END as personal_visitado
      FROM RegistrosVisitas rv
      JOIN AreasDestino a ON rv.area_destino_id = a.id
      JOIN MotivosVisita mv ON rv.motivo_visita_id = mv.id
      LEFT JOIN Personal p ON rv.personal_visitado_id = p.id
      WHERE rv.visitante_id = $1
      ORDER BY rv.fecha_ingreso DESC
      LIMIT $2 OFFSET $3
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM RegistrosVisitas
      WHERE visitante_id = $1
    `;
    
    const [visitasResult, countResult] = await Promise.all([
      db.query(query, [id, limit, offset]),
      db.query(countQuery, [id])
    ]);
    
    return {
      visitas: visitasResult.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    };
    
  } catch (error) {
    logger.error(`Error en repositorio obteniendo historial de visitas para visitante ID ${id}:`, error);
    throw new AppError('Error obteniendo historial de visitas', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByDocumento,
  create,
  update,
  getHistorialVisitas
};
