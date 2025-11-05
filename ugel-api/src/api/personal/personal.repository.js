/**
 * Repositorio para gestión de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');

/**
 * Buscar todo el personal con filtros y paginación
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Personal encontrado y total
 */
const findAll = async (options = {}) => {
  const { page = 1, limit = 20, search = '', activo, areaId, tipoContratoId } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Verificación inicial de conexión a la base de datos
    try {
      await db.query('SELECT 1', []);
    } catch (dbError) {
      logger.error('Error de conexión a la base de datos en findAll personal:', dbError);
      return { 
        personal: [],
        total: 0
      };
    }
    // Construir la consulta base
    let query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.area_destino_id,
        a.nombre_area as area_nombre,
        p.tipo_contrato_id,
        tc.nombre_tipo as tipo_contrato_nombre,
        p.activo,
        
        -- Estado de asistencia de hoy
        ca.estado_presencia,
        
        -- Verificar si tiene papeleta activa
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM PapeletasSalida ps
            WHERE ps.personal_solicitante_id = p.id
              AND ps.estado IN ('APROBADO', 'EN_CURSO')
              AND ps.fecha_hora_salida_programada <= NOW()
              AND (
                ps.fecha_hora_retorno_real IS NULL
                AND ps.fecha_hora_retorno_programada >= NOW()
              )
          )
          THEN TRUE
          ELSE FALSE
        END AS tiene_papeleta_activa,
        
        -- Código de la papeleta activa (si existe)
        (
          SELECT ps.codigo_papeleta
          FROM PapeletasSalida ps
          WHERE ps.personal_solicitante_id = p.id
            AND ps.estado IN ('APROBADO', 'EN_CURSO')
            AND ps.fecha_hora_salida_programada <= NOW()
            AND (
              ps.fecha_hora_retorno_real IS NULL
              AND ps.fecha_hora_retorno_programada >= NOW()
            )
          ORDER BY ps.fecha_solicitud DESC
          LIMIT 1
        ) AS codigo_papeleta_activa
        
      FROM Personal p
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN TiposContrato tc ON p.tipo_contrato_id = tc.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      LEFT JOIN ControlAsistenciaPersonal ca 
        ON ca.personal_id = p.id 
        AND ca.fecha = CURRENT_DATE
    `;
    
    // Construir la cláusula WHERE
    const whereConditions = [];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(
        p.nombres ILIKE $${paramCounter} OR 
        p.apellidos ILIKE $${paramCounter} OR 
        p.numero_documento ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Filtro por estado activo - por defecto solo mostrar activos
    if (activo !== undefined) {
      whereConditions.push(`p.activo = $${paramCounter}`);
      queryParams.push(activo);
      paramCounter++;
    } else {
      // Por defecto, solo mostrar personal activo
      whereConditions.push(`p.activo = $${paramCounter}`);
      queryParams.push(true);
      paramCounter++;
    }
    
    // Filtro por área
    if (areaId) {
      whereConditions.push(`p.area_destino_id = $${paramCounter}`);
      queryParams.push(areaId);
      paramCounter++;
    }
    
    // Filtro por tipo de contrato
    if (tipoContratoId) {
      whereConditions.push(`p.tipo_contrato_id = $${paramCounter}`);
      queryParams.push(tipoContratoId);
      paramCounter++;
    }
    
    // Agregar condiciones WHERE si existen
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Personal p
      ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY p.apellidos ASC, p.nombres ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [personalResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    // Aseguramos que siempre se retorne un array de personal, incluso si está vacío
    // Y un total válido, incluso si hay error en la consulta de conteo
    return {
      personal: Array.isArray(personalResult?.rows) ? personalResult.rows : [],
      total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando personal:', error);
    throw new AppError('Error obteniendo personal', 500);
  }
};

/**
 * Buscar personal por ID
 * @param {number} id - ID del personal
 * @returns {Object|null} Personal encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.area_destino_id,
        a.nombre_area as area_nombre,
        p.tipo_contrato_id,
        tc.nombre_tipo as tipo_contrato_nombre,
        p.activo
      FROM Personal p
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN TiposContrato tc ON p.tipo_contrato_id = tc.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando personal por ID ${id}:`, error);
    throw new AppError('Error obteniendo personal', 500);
  }
};

/**
 * Buscar personal por tipo y número de documento
 * @param {string} tipoDocumento - Tipo de documento
 * @param {string} numeroDocumento - Número de documento
 * @returns {Object|null} Personal encontrado o null
 */
const findByDocumento = async (tipoDocumento, numeroDocumento) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.area_destino_id,
        a.nombre_area as area_nombre,
        p.tipo_contrato_id,
        tc.nombre_tipo as tipo_contrato_nombre,
        p.activo
      FROM Personal p
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN TiposContrato tc ON p.tipo_contrato_id = tc.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      WHERE p.tipo_documento = $1 AND p.numero_documento = $2
    `;
    
    const result = await db.query(query, [tipoDocumento, numeroDocumento]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando personal por documento ${tipoDocumento}-${numeroDocumento}:`, error);
    throw new AppError('Error obteniendo personal', 500);
  }
};

/**
 * Crear nuevo personal
 * @param {Object} personalData - Datos del personal
 * @returns {Object} Personal creado
 */
const create = async (personalData) => {
  try {
    const { 
      tipo_documento, 
      numero_documento, 
      nombres, 
      apellidos, 
      cargo_id,
      area_destino_id, 
      tipo_contrato_id,
      activo = true
    } = personalData;
    
    const query = `
      INSERT INTO Personal (
        tipo_documento, 
        numero_documento, 
        nombres, 
        apellidos, 
        cargo_id,
        area_destino_id, 
        tipo_contrato_id,
        activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      tipo_documento, 
      numero_documento, 
      nombres, 
      apellidos, 
      cargo_id,
      area_destino_id, 
      tipo_contrato_id,
      activo
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando personal', 500);
    }
    
    // Obtener el personal completo con los datos de área y tipo de contrato
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe personal con este documento', 409);
    }
    
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('area_destino_id')) {
        throw new AppError('Área de destino no encontrada', 404);
      }
      if (error.constraint && error.constraint.includes('tipo_contrato_id')) {
        throw new AppError('Tipo de contrato no encontrado', 404);
      }
    }
    
    logger.error('Error en repositorio creando personal:', error);
    throw error instanceof AppError ? error : new AppError('Error creando personal', 500);
  }
};

/**
 * Actualizar personal existente
 * @param {number} id - ID del personal
 * @param {Object} personalData - Datos a actualizar
 * @returns {Object} Personal actualizado
 */
const update = async (id, personalData) => {
  try {
    // Construir la consulta dinámica
    const updateFields = [];
    const queryParams = [id];
    let paramCounter = 2;
    
    // Agregar campos a actualizar
    if (personalData.tipo_documento !== undefined) {
      updateFields.push(`tipo_documento = $${paramCounter++}`);
      queryParams.push(personalData.tipo_documento);
    }
    
    if (personalData.numero_documento !== undefined) {
      updateFields.push(`numero_documento = $${paramCounter++}`);
      queryParams.push(personalData.numero_documento);
    }
    
    if (personalData.nombres !== undefined) {
      updateFields.push(`nombres = $${paramCounter++}`);
      queryParams.push(personalData.nombres);
    }
    
    if (personalData.apellidos !== undefined) {
      updateFields.push(`apellidos = $${paramCounter++}`);
      queryParams.push(personalData.apellidos);
    }
    
    if (personalData.cargo_id !== undefined) {
      updateFields.push(`cargo_id = $${paramCounter++}`);
      queryParams.push(personalData.cargo_id);
    }
    
    if (personalData.area_destino_id !== undefined) {
      updateFields.push(`area_destino_id = $${paramCounter++}`);
      queryParams.push(personalData.area_destino_id);
    }
    
    if (personalData.tipo_contrato_id !== undefined) {
      updateFields.push(`tipo_contrato_id = $${paramCounter++}`);
      queryParams.push(personalData.tipo_contrato_id);
    }
    
    if (personalData.activo !== undefined) {
      updateFields.push(`activo = $${paramCounter++}`);
      queryParams.push(personalData.activo);
    }
    
    // Si no hay campos para actualizar
    if (updateFields.length === 0) {
      const currentPersonal = await findById(id);
      return currentPersonal;
    }
    
    const query = `
      UPDATE Personal 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, queryParams);
    
    if (result.rows.length === 0) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Obtener el personal actualizado completo con los datos de área y tipo de contrato
    return await findById(id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe personal con este documento', 409);
    }
    
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('area_destino_id')) {
        throw new AppError('Área de destino no encontrada', 404);
      }
      if (error.constraint && error.constraint.includes('tipo_contrato_id')) {
        throw new AppError('Tipo de contrato no encontrado', 404);
      }
    }
    
    logger.error(`Error en repositorio actualizando personal ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando personal', 500);
  }
};

/**
 * Eliminar personal (soft delete)
 * @param {number} id - ID del personal
 * @returns {boolean} True si se eliminó correctamente
 */
const softDelete = async (id) => {
  try {
    const query = `
      UPDATE Personal 
      SET activo = false
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Error en repositorio eliminando personal ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error eliminando personal', 500);
  }
};

/**
 * Buscar personal por área
 * @param {number} areaId - ID del área
 * @returns {Array} Personal encontrado
 */
const findByArea = async (areaId) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.activo
      FROM Personal p
      WHERE p.area_destino_id = $1 AND p.activo = true
      ORDER BY p.apellidos ASC, p.nombres ASC
    `;
    
    const result = await db.query(query, [areaId]);
    return result.rows;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando personal por área ID ${areaId}:`, error);
    throw new AppError('Error obteniendo personal por área', 500);
  }
};

/**
 * Contar personal activo
 * @returns {number} Cantidad de personal activo
 */
const countActivePersonal = async () => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM Personal
      WHERE activo = true
    `;
    
    const result = await db.query(query);
    return parseInt(result.rows[0].count);
    
  } catch (error) {
    logger.error('Error en repositorio contando personal activo:', error);
    throw new AppError('Error contando personal', 500);
  }
};

/**
 * Buscar personal eliminado (soft delete)
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Personal eliminado y total
 */
const findDeleted = async (options = {}) => {
  const { page = 1, limit = 20, search = '' } = options;
  const offset = (page - 1) * limit;
  
  try {
    // Construir la consulta base para personal eliminado
    let query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.area_destino_id,
        a.nombre_area as area_nombre,
        p.tipo_contrato_id,
        tc.nombre_tipo as tipo_contrato_nombre,
        p.activo
      FROM Personal p
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN TiposContrato tc ON p.tipo_contrato_id = tc.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      WHERE p.activo = false
    `;
    
    // Construir la cláusula WHERE adicional
    const whereConditions = ['p.activo = false'];
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtro por texto
    if (search) {
      whereConditions.push(`(
        p.nombres ILIKE $${paramCounter} OR 
        p.apellidos ILIKE $${paramCounter} OR 
        p.numero_documento ILIKE $${paramCounter}
      )`);
      queryParams.push(`%${search}%`);
      paramCounter++;
    }
    
    // Consulta para contar el total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Personal p
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    // Agregar ordenamiento y paginación
    query += `
      ORDER BY p.apellidos ASC, p.nombres ASC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;
    
    // Agregar parámetros de paginación
    queryParams.push(limit, offset);
    
    // Ejecutar consultas en paralelo
    const [personalResult, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, queryParams.slice(0, paramCounter - 1))
    ]);
    
    return {
      personal: Array.isArray(personalResult?.rows) ? personalResult.rows : [],
      total: countResult?.rows?.[0]?.total ? parseInt(countResult.rows[0].total) : 0
    };
    
  } catch (error) {
    logger.error('Error en repositorio buscando personal eliminado:', error);
    throw new AppError('Error obteniendo personal eliminado', 500);
  }
};

/**
 * Buscar personal por ID incluyendo eliminados
 * @param {number} id - ID del personal
 * @returns {Object|null} Personal encontrado o null
 */
const findByIdIncludingDeleted = async (id) => {
  try {
    const query = `
      SELECT 
        p.id,
        p.tipo_documento,
        p.numero_documento,
        p.nombres,
        p.apellidos,
        p.cargo_id,
        c.nombre_cargo as cargo_nombre,
        p.area_destino_id,
        a.nombre_area as area_nombre,
        p.tipo_contrato_id,
        tc.nombre_tipo as tipo_contrato_nombre,
        p.activo
      FROM Personal p
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN TiposContrato tc ON p.tipo_contrato_id = tc.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      WHERE p.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando personal por ID (incluyendo eliminados) ${id}:`, error);
    throw new AppError('Error obteniendo personal', 500);
  }
};

/**
 * Restaurar personal eliminado
 * @param {number} id - ID del personal
 * @returns {Object} Personal restaurado
 */
const restore = async (id) => {
  try {
    const query = `
      UPDATE Personal 
      SET activo = true
      WHERE id = $1
      RETURNING id
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Obtener el personal restaurado completo con los datos de área y tipo de contrato
    return await findByIdIncludingDeleted(id);
    
  } catch (error) {
    logger.error(`Error en repositorio restaurando personal ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error restaurando personal', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByDocumento,
  create,
  update,
  softDelete,
  findByArea,
  countActivePersonal,
  findDeleted,
  findByIdIncludingDeleted,
  restore
};
