/**
 * Repositorio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { toLimaDateYYYYMMDD } = require('../../utils/fechas');

/**
 * Buscar todos los registros de asistencia con filtros y paginación
 * Si hay filtro de fecha, incluye TODOS los personal activos mostrando ausentes
 * @param {Object} options - Opciones de búsqueda
 * @returns {Object} Registros de asistencia encontrados y total
 */
const findAll = async (options = {}) => {
  let { 
    page = 1, 
    limit = 20, 
    search = '',
    fecha,
    fechaInicio,
    fechaFin,
    personalId,
    estadoPresencia,
    areaId
  } = options;
  
  // Normalizar fechas a YYYY-MM-DD (zona Lima) antes de construir el SQL
  fecha = toLimaDateYYYYMMDD(fecha);
  fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
  fechaFin = toLimaDateYYYYMMDD(fechaFin);
  
  const offset = (page - 1) * limit;
  
  try {
    // Si hay filtro de fecha específica o fechaInicio, incluir TODOS los personal activos
    // para mostrar ausentes (personal sin registro de asistencia)
    // Incluir ausentes cuando hay fecha específica o cuando hay fechaInicio (para historial)
    const incluirAusentes = (fecha && typeof fecha === 'string' && fecha.trim() !== '') || 
                            (fechaInicio && typeof fechaInicio === 'string' && fechaInicio.trim() !== '');
    
    // Si se proporciona rango (inicio/fin), ignorar fecha exacta para evitar duplicar condiciones
    // Pero guardar fecha original si existe para usar en el LEFT JOIN
    const fechaOriginal = fecha;
    if (fechaInicio || fechaFin) {
      fecha = null;
    }
    
    if (incluirAusentes) {
      // Construir la consulta con LEFT JOIN para incluir personal sin registro
      const queryParams = [];
      let paramCounter = 1;
      
      // Usar fecha específica si existe, sino usar fechaInicio (para historial de un día específico)
      // Si fechaInicio y fechaFin son iguales, es un solo día, usar esa fecha
      let fechaJoin = fechaOriginal;
      if (!fechaJoin && fechaInicio) {
        fechaJoin = fechaInicio;
      }
      
      // Validar que fechaJoin no sea null o undefined
      if (!fechaJoin || typeof fechaJoin !== 'string' || fechaJoin.trim() === '') {
        throw new AppError('Fecha inválida para consulta de asistencia', 400);
      }
      
      // Construir la consulta base con LEFT JOIN
      let query = `
        SELECT 
          COALESCE(ca.id, NULL) as id,
          p.id as personal_id,
          p.tipo_documento as personal_tipo_documento,
          p.numero_documento as personal_numero_documento,
          p.nombres as personal_nombres,
          p.apellidos as personal_apellidos,
          c.nombre_cargo as personal_cargo_nombre,
          a.nombre_area as area_nombre,
          COALESCE(ca.fecha, $${paramCounter}::date) as fecha,
          ca.hora_ingreso,
          ca.hora_salida,
          COALESCE(ca.estado_presencia, 'Ausente') as estado_presencia,
          ca.usuario_registro_id,
          u.nombre_usuario as usuario_registro,
          ca.fecha_registro
        FROM Personal p
        LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
        LEFT JOIN Cargos c ON p.cargo_id = c.id
        LEFT JOIN ControlAsistenciaPersonal ca ON ca.personal_id = p.id 
          AND ca.fecha = $${paramCounter}::date
        LEFT JOIN Usuarios u ON ca.usuario_registro_id = u.id
      `;
      
      // Agregar parámetro de fecha para el join
      queryParams.push(fechaJoin);
      paramCounter++;
      
      // Construir condiciones WHERE
      const whereConditions = ['p.activo = true'];
      
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
      
      // Filtro por rango de fechas (si hay rango, filtrar en la fecha del registro)
      if (fechaInicio && !fecha) {
        // Para rangos, necesitamos una consulta diferente o usar UNION
        // Por ahora, si hay rango, solo mostramos registros del primer día con ausentes
        // TODO: Mejorar para rangos de fechas
      }
      
      // Filtro por personal
      if (personalId) {
        whereConditions.push(`p.id = $${paramCounter}`);
        queryParams.push(personalId);
        paramCounter++;
      }
      
      // Filtro por área
      if (areaId) {
        whereConditions.push(`p.area_destino_id = $${paramCounter}`);
        queryParams.push(areaId);
        paramCounter++;
      }
      
      // Filtro por estado de presencia
      if (estadoPresencia) {
        whereConditions.push(`COALESCE(ca.estado_presencia, 'Ausente') = $${paramCounter}`);
        queryParams.push(estadoPresencia);
        paramCounter++;
      }
      
      // Agregar condiciones WHERE
      query += ` WHERE ${whereConditions.join(' AND ')}`;
      
      // Construir countQuery de forma más simple con los mismos parámetros
      const countWhereConditions = ['p.activo = true'];
      const countParamsSimplified = [fechaJoin];
      let countParamCounter = 2;
      
      if (search) {
        countWhereConditions.push(`(
          p.nombres ILIKE $${countParamCounter} OR 
          p.apellidos ILIKE $${countParamCounter} OR 
          p.numero_documento ILIKE $${countParamCounter}
        )`);
        countParamsSimplified.push(`%${search}%`);
        countParamCounter++;
      }
      
      if (personalId) {
        countWhereConditions.push(`p.id = $${countParamCounter}`);
        countParamsSimplified.push(personalId);
        countParamCounter++;
      }
      
      if (areaId) {
        countWhereConditions.push(`p.area_destino_id = $${countParamCounter}`);
        countParamsSimplified.push(areaId);
        countParamCounter++;
      }
      
      if (estadoPresencia) {
        countWhereConditions.push(`COALESCE(ca.estado_presencia, 'Ausente') = $${countParamCounter}`);
        countParamsSimplified.push(estadoPresencia);
        countParamCounter++;
      }
      
      const countQueryFinal = `
        SELECT COUNT(*) as total
        FROM Personal p
        LEFT JOIN ControlAsistenciaPersonal ca ON ca.personal_id = p.id 
          AND ca.fecha = $1::date
        WHERE ${countWhereConditions.join(' AND ')}
      `;
      
      // Agregar ordenamiento y paginación
      query += `
        ORDER BY COALESCE(ca.fecha, $1::date) DESC, p.apellidos ASC, p.nombres ASC
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      
      // Agregar parámetros de paginación
      queryParams.push(limit, offset);
      
      // Ejecutar consultas en paralelo
      const [asistenciasResult, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQueryFinal, countParamsSimplified)
      ]);
      
      return {
        asistencias: asistenciasResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    } else {
      // Construir la consulta base (comportamiento original sin incluir ausentes)
      let query = `
        SELECT 
          ca.id,
          ca.personal_id,
          p.tipo_documento as personal_tipo_documento,
          p.numero_documento as personal_numero_documento,
          p.nombres as personal_nombres,
          p.apellidos as personal_apellidos,
          c.nombre_cargo as personal_cargo_nombre,
          a.nombre_area as area_nombre,
          ca.fecha,
          ca.hora_ingreso,
          ca.hora_salida,
          ca.estado_presencia,
          ca.usuario_registro_id,
          u.nombre_usuario as usuario_registro,
          ca.fecha_registro
        FROM ControlAsistenciaPersonal ca
        JOIN Personal p ON ca.personal_id = p.id
        JOIN AreasDestino a ON p.area_destino_id = a.id
        LEFT JOIN Cargos c ON p.cargo_id = c.id
        JOIN Usuarios u ON ca.usuario_registro_id = u.id
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
      
      // Filtro por fecha específica
      if (fecha) {
        whereConditions.push(`ca.fecha = $${paramCounter}::date`);
        queryParams.push(fecha);
        paramCounter++;
      }
      
      // Filtro por rango de fechas (inclusivo, usando < fechaFin + 1 día para incluir todo el día final)
      if (fechaInicio) {
        whereConditions.push(`ca.fecha >= $${paramCounter}::date`);
        queryParams.push(fechaInicio);
        paramCounter++;
      }
      
      if (fechaFin) {
        // Fin exclusivo = día siguiente → incluye TODO el día fin
        whereConditions.push(`ca.fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
        queryParams.push(fechaFin);
        paramCounter++;
      }
      
      // Filtro por personal
      if (personalId) {
        whereConditions.push(`ca.personal_id = $${paramCounter}`);
        queryParams.push(personalId);
        paramCounter++;
      }
      
      // Filtro por área
      if (areaId) {
        whereConditions.push(`p.area_destino_id = $${paramCounter}`);
        queryParams.push(areaId);
        paramCounter++;
      }
      
      // Filtro por estado de presencia
      if (estadoPresencia) {
        whereConditions.push(`ca.estado_presencia = $${paramCounter}`);
        queryParams.push(estadoPresencia);
        paramCounter++;
      }
      
      // Agregar condiciones WHERE si existen
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
      
      // Consulta para contar el total
      // Clonar parámetros ANTES de agregar limit/offset para el countQuery
      const countParams = [...queryParams];
      
      // Agregar ordenamiento y paginación
      query += `
        ORDER BY ca.fecha DESC, p.apellidos ASC, p.nombres ASC
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      
      // Agregar parámetros de paginación a queryParams (solo para la query principal)
      queryParams.push(limit, offset);
      
      // Construir countQuery con los parámetros correctos (sin limit/offset)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ControlAsistenciaPersonal ca
        JOIN Personal p ON ca.personal_id = p.id
        ${whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''}
      `;
      
      // Ejecutar consultas en paralelo
      const [asistenciasResult, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, countParams)
      ]);
      
      return {
        asistencias: asistenciasResult.rows,
        total: parseInt(countResult.rows[0].total)
      };
    }
    
  } catch (error) {
    logger.error('Error en repositorio buscando registros de asistencia:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    // Si es un error de AppError, relanzarlo; sino, crear uno nuevo
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(`Error obteniendo registros de asistencia: ${error.message}`, 500);
  }
};

/**
 * Buscar registro de asistencia por ID
 * @param {number} id - ID del registro de asistencia
 * @returns {Object|null} Registro de asistencia encontrado o null
 */
const findById = async (id) => {
  try {
    const query = `
      SELECT 
        ca.id,
        ca.personal_id,
        p.tipo_documento as personal_tipo_documento,
        p.numero_documento as personal_numero_documento,
        p.nombres as personal_nombres,
        p.apellidos as personal_apellidos,
        c.nombre_cargo as personal_cargo_nombre,
        a.nombre_area as area_nombre,
        ca.fecha,
        ca.hora_ingreso,
        ca.hora_salida,
        ca.estado_presencia,
        ca.usuario_registro_id,
        u.nombre_usuario as usuario_registro,
        ca.fecha_registro
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      LEFT JOIN Cargos c ON p.cargo_id = c.id
      JOIN Usuarios u ON ca.usuario_registro_id = u.id
      WHERE ca.id = $1
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando registro de asistencia por ID ${id}:`, error);
    throw new AppError('Error obteniendo registro de asistencia', 500);
  }
};

/**
 * Buscar registro de asistencia por personal y fecha
 * @param {number} personalId - ID del personal
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object|null} Registro de asistencia encontrado o null
 */
const findByPersonalAndFecha = async (personalId, fecha) => {
  try {
    const query = `
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
    
    const result = await db.query(query, [personalId, fecha]);
    return result.rows[0] || null;
    
  } catch (error) {
    logger.error(`Error en repositorio buscando registro de asistencia para personal ID ${personalId} en fecha ${fecha}:`, error);
    throw new AppError('Error obteniendo registro de asistencia', 500);
  }
};

/**
 * Crear nuevo registro de asistencia
 * @param {Object} asistenciaData - Datos del registro de asistencia
 * @returns {Object} Registro de asistencia creado
 */
const create = async (asistenciaData) => {
  try {
    const { 
      personal_id, 
      fecha, 
      hora_ingreso,
      hora_salida,
      estado_presencia,
      usuario_registro_id
    } = asistenciaData;
    
    const query = `
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
    
    const result = await db.query(query, [
      personal_id, 
      fecha, 
      hora_ingreso,
      hora_salida,
      estado_presencia,
      usuario_registro_id
    ]);
    
    if (result.rows.length === 0) {
      throw new AppError('Error creando registro de asistencia', 500);
    }
    
    // Obtener el registro completo
    return await findById(result.rows[0].id);
    
  } catch (error) {
    if (error.code === '23505') {
      // Violación de restricción única
      throw new AppError('Ya existe un registro de asistencia para este personal en esta fecha', 409);
    }
    
    if (error.code === '23503') {
      // Violación de clave foránea
      if (error.constraint && error.constraint.includes('personal_id')) {
        throw new AppError('Personal no encontrado', 404);
      }
      if (error.constraint && error.constraint.includes('usuario_registro_id')) {
        throw new AppError('Usuario de registro no encontrado', 404);
      }
    }
    
    logger.error('Error en repositorio creando registro de asistencia:', error);
    throw error instanceof AppError ? error : new AppError('Error creando registro de asistencia', 500);
  }
};

/**
 * Actualizar hora de ingreso de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} horaIngreso - Hora de ingreso en formato HH:MM:SS
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que actualiza
 * @returns {Object} Registro de asistencia actualizado
 */
const updateIngreso = async (id, horaIngreso, estadoPresencia, usuarioId) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET 
        hora_ingreso = $1,
        estado_presencia = $2,
        usuario_registro_id = $3
      WHERE id = $4
      RETURNING id
    `;
    
    const result = await db.query(query, [horaIngreso, estadoPresencia, usuarioId, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando ingreso para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando ingreso', 500);
  }
};

/**
 * Actualizar hora de salida de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Registro de asistencia actualizado
 */
const updateSalida = async (id, horaSalida) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET hora_salida = $1
      WHERE id = $2
      RETURNING id
    `;
    
    const result = await db.query(query, [horaSalida, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando salida para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando salida', 500);
  }
};

/**
 * Actualizar estado de presencia de un registro de asistencia
 * @param {number} id - ID del registro de asistencia
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que actualiza
 * @returns {Object} Registro de asistencia actualizado
 */
const updateEstadoPresencia = async (id, estadoPresencia, usuarioId) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET 
        estado_presencia = $1,
        usuario_registro_id = $2
      WHERE id = $3
      RETURNING id
    `;
    
    const result = await db.query(query, [estadoPresencia, usuarioId, id]);
    
    if (result.rows.length === 0) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    // Obtener el registro actualizado
    return await findById(id);
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando estado de presencia para registro ID ${id}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando estado de presencia', 500);
  }
};

/**
 * Marcar como ausentes a todos los personal activos que no tienen horaIngreso registrada para una fecha
 * EXCLUYE personal que tiene papeletas activas para esa fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {number} usuarioSistemaId - ID del usuario del sistema que ejecuta la acción
 * @returns {Object} Resultado con cantidad de registros actualizados
 */
const marcarAusentesAlFinalDelDia = async (fecha, usuarioSistemaId) => {
  try {
    // Normalizar fecha a YYYY-MM-DD (zona Lima)
    fecha = toLimaDateYYYYMMDD(fecha);
    
    if (!fecha || typeof fecha !== 'string' || fecha.trim() === '') {
      throw new AppError('Fecha inválida para marcar ausentes', 400);
    }
    
    // Buscar todos los personal activos que no tienen registro de asistencia con horaIngreso para esta fecha
    // EXCLUIR personal que tiene papeletas activas (APROBADO o EN_CURSO) para esa fecha
    // Primero, crear registros de asistencia para personal que no tiene ninguno (solo para esa fecha)
    // EXCLUIR personal con papeletas activas
    const queryCrearRegistros = `
      INSERT INTO ControlAsistenciaPersonal (
        personal_id,
        fecha,
        hora_ingreso,
        hora_salida,
        estado_presencia,
        usuario_registro_id
      )
      SELECT 
        p.id,
        $1::date,
        NULL,
        NULL,
        'Ausente',
        $2
      FROM Personal p
      WHERE p.activo = true
        AND p.id NOT IN (
          SELECT DISTINCT personal_id 
          FROM ControlAsistenciaPersonal 
          WHERE fecha = $1::date
        )
        AND p.id NOT IN (
          SELECT DISTINCT ps.personal_solicitante_id
          FROM PapeletasSalida ps
          WHERE ps.estado IN ('APROBADO', 'EN_CURSO')
            AND DATE(ps.fecha_hora_salida_programada) <= $1::date
            AND DATE(ps.fecha_hora_retorno_programada) >= $1::date
            AND ps.fecha_hora_retorno_real IS NULL
        )
      RETURNING id
    `;
    
    // Actualizar registros existentes que no tienen horaIngreso y no están marcados como ausente
    // EXCLUIR personal con papeletas activas
    const queryActualizarRegistros = `
      UPDATE ControlAsistenciaPersonal ca
      SET 
        estado_presencia = 'Ausente',
        usuario_registro_id = $2
      WHERE ca.fecha = $1::date
        AND (ca.hora_ingreso IS NULL OR ca.hora_ingreso = '')
        AND ca.estado_presencia != 'Ausente'
        AND ca.personal_id NOT IN (
          SELECT DISTINCT ps.personal_solicitante_id
          FROM PapeletasSalida ps
          WHERE ps.estado IN ('APROBADO', 'EN_CURSO')
            AND DATE(ps.fecha_hora_salida_programada) <= $1::date
            AND DATE(ps.fecha_hora_retorno_programada) >= $1::date
            AND ps.fecha_hora_retorno_real IS NULL
        )
      RETURNING id
    `;
    
    // Ejecutar ambas consultas
    const [crearResult, actualizarResult] = await Promise.all([
      db.query(queryCrearRegistros, [fecha, usuarioSistemaId]),
      db.query(queryActualizarRegistros, [fecha, usuarioSistemaId])
    ]);
    
    const creados = crearResult.rows.length;
    const actualizados = actualizarResult.rows.length;
    const total = creados + actualizados;
    
    logger.info(`Marcado de ausentes completado para fecha ${fecha}: ${creados} registros creados, ${actualizados} actualizados (total: ${total}). Personal con papeletas activas excluido.`);
    
    return {
      fecha,
      registrosCreados: creados,
      registrosActualizados: actualizados,
      total
    };
    
  } catch (error) {
    logger.error(`Error en repositorio marcando ausentes para fecha ${fecha}:`, error);
    throw error instanceof AppError ? error : new AppError('Error marcando ausentes', 500);
  }
};

/**
 * Actualizar estado de presencia por período para un personal específico
 * Útil para actualizar estados cuando una papeleta finaliza
 * @param {number} personalId - ID del personal
 * @param {string} fechaInicio - Fecha de inicio del período (YYYY-MM-DD)
 * @param {string} fechaFin - Fecha de fin del período (YYYY-MM-DD)
 * @param {string} estadoAnterior - Estado que debe tener para actualizarse
 * @param {string} estadoNuevo - Nuevo estado a asignar
 * @param {number} usuarioId - ID del usuario que realiza la actualización
 * @returns {Object} Resultado con cantidad de registros actualizados
 */
const actualizarEstadoPorPeriodo = async (personalId, fechaInicio, fechaFin, estadoAnterior, estadoNuevo, usuarioId) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal
      SET 
        estado_presencia = $1,
        usuario_registro_id = $2
      WHERE personal_id = $3
        AND fecha >= $4::date
        AND fecha <= $5::date
        AND estado_presencia = $6
      RETURNING id
    `;
    
    const result = await db.query(query, [estadoNuevo, usuarioId, personalId, fechaInicio, fechaFin, estadoAnterior]);
    
    const actualizados = result.rows.length;
    
    logger.info(`Actualizados ${actualizados} registros de asistencia para personal ID ${personalId} en período ${fechaInicio} a ${fechaFin} (${estadoAnterior} → ${estadoNuevo})`);
    
    return {
      actualizados,
      personalId,
      fechaInicio,
      fechaFin,
      estadoAnterior,
      estadoNuevo
    };
    
  } catch (error) {
    logger.error(`Error en repositorio actualizando estado por período para personal ID ${personalId}:`, error);
    throw error instanceof AppError ? error : new AppError('Error actualizando estado por período', 500);
  }
};

/**
 * Obtener estadísticas de asistencia
 * @param {string} fechaInicio - Fecha de inicio para el filtro
 * @param {string} fechaFin - Fecha de fin para el filtro
 * @returns {Object} Estadísticas de asistencia
 */
const getEstadisticas = async (fechaInicio, fechaFin) => {
  try {
    // Normalizar fechas a YYYY-MM-DD (zona Lima) antes de construir el SQL
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    // Construir las condiciones de fecha (inclusivo, usando < fechaFin + 1 día para incluir todo el día final)
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      // Fin exclusivo = día siguiente → incluye TODO el día fin
      whereCondition.push(`fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Estadísticas por estado de presencia
    const estadoQuery = `
      SELECT 
        estado_presencia,
        COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      GROUP BY estado_presencia
      ORDER BY total DESC
    `;
    
    // Estadísticas por día
    const diaQuery = `
      SELECT 
        fecha,
        COUNT(*) as total,
        COUNT(CASE WHEN estado_presencia = 'Presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN estado_presencia = 'Ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN estado_presencia = 'Tardanza' THEN 1 END) as tardanzas,
        COUNT(CASE WHEN estado_presencia = 'Falta' THEN 1 END) as faltas
      FROM ControlAsistenciaPersonal
      ${whereClause}
      GROUP BY fecha
      ORDER BY fecha DESC
    `;
    
    // Estadísticas por área
    const areaQuery = `
      SELECT 
        a.nombre_area,
        COUNT(*) as total,
        COUNT(CASE WHEN ca.estado_presencia = 'Presente' THEN 1 END) as presentes,
        COUNT(CASE WHEN ca.estado_presencia = 'Ausente' THEN 1 END) as ausentes,
        COUNT(CASE WHEN ca.estado_presencia = 'Tardanza' THEN 1 END) as tardanzas,
        COUNT(CASE WHEN ca.estado_presencia = 'Falta' THEN 1 END) as faltas
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      ${whereClause}
      GROUP BY a.nombre_area
      ORDER BY total DESC
    `;
    
    // Ejecutar consultas en paralelo
    const [estadoResult, diaResult, areaResult] = await Promise.all([
      db.query(estadoQuery, params),
      db.query(diaQuery, params),
      db.query(areaQuery, params)
    ]);
    
    return {
      por_estado: estadoResult.rows,
      por_dia: diaResult.rows,
      por_area: areaResult.rows
    };
    
  } catch (error) {
    logger.error('Error en repositorio obteniendo estadísticas de asistencia:', error);
    throw new AppError('Error obteniendo estadísticas de asistencia', 500);
  }
};

/**
 * Obtener estadísticas de total de asistencias por período
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Estadísticas de total de asistencias
 */
const getEstadisticasTotales = async (fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Total de asistencias
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      AND estado_presencia IN ('Presente', 'Tardanza')
    `;
    
    // Flujo diario
    const flujoDiarioQuery = `
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS asistencias
      FROM ControlAsistenciaPersonal
      ${whereClause}
      AND estado_presencia IN ('Presente', 'Tardanza')
      GROUP BY dia
      ORDER BY dia
    `;
    
    const [totalResult, flujoDiarioResult] = await Promise.all([
      db.query(totalQuery, params),
      db.query(flujoDiarioQuery, params)
    ]);
    
    return {
      total: parseInt(totalResult.rows[0]?.total || 0),
      flujo_diario: flujoDiarioResult.rows
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas totales:', error);
    throw new AppError('Error obteniendo estadísticas totales', 500);
  }
};

/**
 * Obtener estadísticas de puntualidad y tardanzas
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Estadísticas de puntualidad
 */
const getEstadisticasPuntualidad = async (fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Distribución por estado
    const distribucionQuery = `
      SELECT
        DATE(fecha) AS dia,
        estado_presencia,
        COUNT(*) AS cantidad
      FROM ControlAsistenciaPersonal
      ${whereClause}
      GROUP BY dia, estado_presencia
      ORDER BY dia
    `;
    
    // Distribución de hora de llegada
    const horaLlegadaQuery = `
      SELECT
        DATE_TRUNC('hour', hora_ingreso::time) AS hora,
        COUNT(*) AS cantidad,
        SUM(CASE WHEN estado_presencia = 'Tardanza' THEN 1 ELSE 0 END) AS tardanzas
      FROM ControlAsistenciaPersonal
      ${whereClause}
      AND estado_presencia IN ('Presente', 'Tardanza')
      AND hora_ingreso IS NOT NULL
      GROUP BY hora
      ORDER BY hora
    `;
    
    const [distribucionResult, horaLlegadaResult] = await Promise.all([
      db.query(distribucionQuery, params),
      db.query(horaLlegadaQuery, params)
    ]);
    
    return {
      distribucion_por_dia: distribucionResult.rows,
      distribucion_hora_llegada: horaLlegadaResult.rows
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de puntualidad:', error);
    throw new AppError('Error obteniendo estadísticas de puntualidad', 500);
  }
};

/**
 * Obtener estadísticas de ausencias y justificaciones
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Estadísticas de ausencias
 */
const getEstadisticasAusencias = async (fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`c.fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`c.fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Resumen por tipo de ausencia
    const tipoAusenciaQuery = `
      SELECT
        estado_presencia AS tipo_ausencia,
        COUNT(*) AS total
      FROM ControlAsistenciaPersonal
      ${whereClause.replace('c.fecha', 'fecha')}
      AND estado_presencia IN ('Ausente', 'En Permiso', 'Falta')
      GROUP BY estado_presencia
      ORDER BY total DESC
    `;
    
    // Faltas por persona (Top 10)
    const faltasPorPersonaQuery = `
      SELECT
        CONCAT(p.nombres, ' ', p.apellidos) AS personal,
        COUNT(*) AS faltas
      FROM ControlAsistenciaPersonal c
      JOIN Personal p ON c.personal_id = p.id
      ${whereClause}
      AND c.estado_presencia = 'Ausente'
      GROUP BY personal
      ORDER BY faltas DESC
      LIMIT 10
    `;
    
    const [tipoAusenciaResult, faltasPorPersonaResult] = await Promise.all([
      db.query(tipoAusenciaQuery, params),
      db.query(faltasPorPersonaQuery, params)
    ]);
    
    return {
      por_tipo: tipoAusenciaResult.rows,
      top_faltas: faltasPorPersonaResult.rows
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de ausencias:', error);
    throw new AppError('Error obteniendo estadísticas de ausencias', 500);
  }
};

/**
 * Obtener estadísticas por áreas
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Estadísticas por áreas
 */
const getEstadisticasAreas = async (fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`ca.fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`ca.fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Asistencias por área
    const asistenciasPorAreaQuery = `
      SELECT
        a.nombre_area,
        COUNT(*) AS asistencias,
        COUNT(CASE WHEN ca.estado_presencia = 'Presente' THEN 1 END) AS presentes,
        COUNT(CASE WHEN ca.estado_presencia = 'Tardanza' THEN 1 END) AS tardanzas,
        COUNT(CASE WHEN ca.estado_presencia = 'Ausente' THEN 1 END) AS ausentes
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      JOIN AreasDestino a ON p.area_destino_id = a.id
      ${whereClause}
      GROUP BY a.nombre_area
      ORDER BY asistencias DESC
    `;
    
    const result = await db.query(asistenciasPorAreaQuery, params);
    
    return {
      por_area: result.rows
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas por áreas:', error);
    throw new AppError('Error obteniendo estadísticas por áreas', 500);
  }
};

/**
 * Obtener estadísticas por personal
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @param {number} personalId - ID del personal (opcional)
 * @returns {Object} Estadísticas por personal
 */
const getEstadisticasPersonal = async (fechaInicio, fechaFin, personalId = null) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`ca.fecha >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`ca.fecha < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    if (personalId) {
      whereCondition.push(`ca.personal_id = $${paramCounter}`);
      params.push(personalId);
      paramCounter++;
    }
    
    const whereClause = whereCondition.length > 0 ? `WHERE ${whereCondition.join(' AND ')}` : '';
    
    // Top personal con mayor asistencia
    const topAsistenciaQuery = `
      SELECT
        CONCAT(p.nombres, ' ', p.apellidos) AS personal,
        p.id AS personal_id,
        COUNT(*) AS dias_asistidos,
        COUNT(CASE WHEN ca.estado_presencia = 'Presente' THEN 1 END) AS dias_puntuales,
        COUNT(CASE WHEN ca.estado_presencia = 'Tardanza' THEN 1 END) AS dias_tarde,
        COUNT(CASE WHEN ca.estado_presencia = 'Ausente' THEN 1 END) AS dias_ausente
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      ${whereClause}
      GROUP BY personal, p.id
      ORDER BY dias_asistidos DESC
      LIMIT 10
    `;
    
    // Si se especifica un personal, obtener su ficha detallada
    let fichaPersonalResult = null;
    if (personalId) {
      const fichaQuery = `
        SELECT
          SUM(CASE WHEN estado_presencia IN ('Presente', 'Tardanza') THEN 1 ELSE 0 END) AS dias_presentes,
          SUM(CASE WHEN estado_presencia = 'Tardanza' THEN 1 ELSE 0 END) AS dias_tarde,
          SUM(CASE WHEN estado_presencia = 'Ausente' THEN 1 ELSE 0 END) AS dias_falta,
          COUNT(*) AS total_registros,
          MAX(fecha) AS ultima_asistencia
        FROM ControlAsistenciaPersonal
        ${whereClause}
      `;
      
      fichaPersonalResult = await db.query(fichaQuery, params);
    }
    
    const topResult = await db.query(topAsistenciaQuery, params);
    
    return {
      top_asistencia: topResult.rows,
      ficha_personal: fichaPersonalResult ? fichaPersonalResult.rows[0] : null
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas por personal:', error);
    throw new AppError('Error obteniendo estadísticas por personal', 500);
  }
};

module.exports = {
  findAll,
  findById,
  findByPersonalAndFecha,
  create,
  updateIngreso,
  updateSalida,
  updateEstadoPresencia,
  marcarAusentesAlFinalDelDia,
  actualizarEstadoPorPeriodo,
  getEstadisticas,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticasPersonal
};
