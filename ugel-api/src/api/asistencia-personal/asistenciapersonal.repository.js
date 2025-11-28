/**
 * Repositorio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const { toLimaDateYYYYMMDD, nowLima } = require('../../utils/fechas');

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
      // Ahora soportando RANGOS de fechas usando generate_series y CROSS JOIN
      const queryParams = [];
      let paramCounter = 1;
      
      // Determinar rango de fechas
      let startDate = fecha || fechaInicio;
      let endDate = fechaFin || (fecha ? fecha : fechaInicio);
      
      if (!startDate) {
        throw new AppError('Fecha inválida para consulta de asistencia', 400);
      }
      
      // Agregar parámetros para generate_series ($1 y $2)
      queryParams.push(startDate);
      queryParams.push(endDate);
      
      // Agregar fecha actual de Lima para comparación ($3)
      const { fecha: hoyLima } = nowLima();
      queryParams.push(hoyLima);
      
      paramCounter = 4;
      
      // Construir la consulta base
      // 1. Generar serie de fechas
      // 2. CROSS JOIN con Personal (todos los empleados x todos los días)
      // 3. LEFT JOIN con Asistencias y Papeletas
      let query = `
        WITH DateSeries AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha_serie
        )
        SELECT 
          COALESCE(ca.id, NULL) as id,
          p.id as personal_id,
          p.tipo_documento as personal_tipo_documento,
          p.numero_documento as personal_numero_documento,
          p.nombres as personal_nombres,
          p.apellidos as personal_apellidos,
          c.nombre_cargo as personal_cargo_nombre,
          a.nombre_area as area_nombre,
          ds.fecha_serie as fecha,
          ca.hora_ingreso,
          ca.hora_salida,
          CASE
            WHEN ca.estado_presencia IS NOT NULL THEN ca.estado_presencia
            WHEN ps.id IS NOT NULL THEN 'Permiso'
            WHEN ds.fecha_serie < $3::date THEN 'Ausente'
            ELSE NULL
          END as estado_presencia,
          ca.usuario_registro_id,
          u.nombre_usuario as usuario_registro,
          ca.minutos_tardanza,
          ca.fecha_registro
        FROM DateSeries ds
        CROSS JOIN Personal p
        LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
        LEFT JOIN Cargos c ON p.cargo_id = c.id
        LEFT JOIN ControlAsistenciaPersonal ca ON ca.personal_id = p.id 
          AND ca.fecha = ds.fecha_serie
        LEFT JOIN PapeletasSalida ps ON ps.personal_solicitante_id = p.id
          AND ps.estado IN ('APROBADO', 'EN_CURSO')
          AND DATE(ps.fecha_hora_salida_programada) <= ds.fecha_serie
          AND DATE(ps.fecha_hora_retorno_programada) >= ds.fecha_serie
          AND ps.fecha_hora_retorno_real IS NULL
        LEFT JOIN Usuarios u ON ca.usuario_registro_id = u.id
      `;
      
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
        whereConditions.push(`
          CASE
            WHEN ca.estado_presencia IS NOT NULL THEN ca.estado_presencia
            WHEN ps.id IS NOT NULL THEN 'Permiso'
            WHEN ds.fecha_serie < $3::date THEN 'Ausente'
            ELSE NULL
          END = $${paramCounter}
        `);
        queryParams.push(estadoPresencia);
        paramCounter++;
      }
      
      // Agregar condiciones WHERE
      query += ` WHERE ${whereConditions.join(' AND ')}`;
      
      // Construir countQuery (total de registros generados)
      const countQuery = `
        WITH DateSeries AS (
            SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS fecha_serie
        )
        SELECT COUNT(*) as total
        FROM DateSeries ds
        CROSS JOIN Personal p
        LEFT JOIN ControlAsistenciaPersonal ca ON ca.personal_id = p.id 
          AND ca.fecha = ds.fecha_serie
        LEFT JOIN PapeletasSalida ps ON ps.personal_solicitante_id = p.id
          AND ps.estado IN ('APROBADO', 'EN_CURSO')
          AND DATE(ps.fecha_hora_salida_programada) <= ds.fecha_serie
          AND DATE(ps.fecha_hora_retorno_programada) >= ds.fecha_serie
          AND ps.fecha_hora_retorno_real IS NULL
        WHERE ($3::text IS NOT NULL OR true) AND ${whereConditions.join(' AND ')}
      `;
      
      // Clonar parámetros para el count (sin limit/offset)
      const countParams = [...queryParams];
      
      // Agregar ordenamiento y paginación
      query += `
        ORDER BY ds.fecha_serie DESC, p.apellidos ASC, p.nombres ASC
        LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
      `;
      
      // Agregar parámetros de paginación
      queryParams.push(limit, offset);
      
      // Ejecutar consultas en paralelo
      const [asistenciasResult, countResult] = await Promise.all([
        db.query(query, queryParams),
        db.query(countQuery, countParams)
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
          ca.minutos_tardanza,
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
      usuario_registro_id,
      minutos_tardanza
    } = asistenciaData;
    
    const query = `
      INSERT INTO ControlAsistenciaPersonal (
        personal_id, 
        fecha, 
        hora_ingreso,
        hora_salida,
        estado_presencia,
        usuario_registro_id,
        minutos_tardanza
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      personal_id, 
      fecha, 
      hora_ingreso,
      hora_salida,
      estado_presencia,
      usuario_registro_id,
      minutos_tardanza || 0
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
const updateIngreso = async (id, horaIngreso, estadoPresencia, usuarioId, minutosTardanza = 0) => {
  try {
    const query = `
      UPDATE ControlAsistenciaPersonal 
      SET 
        hora_ingreso = $1,
        estado_presencia = $2,
        usuario_registro_id = $3,
        minutos_tardanza = $4
      WHERE id = $5
      RETURNING id
    `;
    
    const result = await db.query(query, [horaIngreso, estadoPresencia, usuarioId, minutosTardanza, id]);
    
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
 * @param {boolean} crearSiNoExiste - Si es true, crea registros nuevos. Si es false, solo actualiza existentes (default: true)
 * @returns {Object} Resultado con cantidad de registros actualizados
 */
const marcarAusentesAlFinalDelDia = async (fecha, usuarioSistemaId, crearSiNoExiste = true) => {
  try {
    // Normalizar fecha a YYYY-MM-DD (zona Lima)
    fecha = toLimaDateYYYYMMDD(fecha);
    
    if (!fecha || typeof fecha !== 'string' || fecha.trim() === '') {
      throw new AppError('Fecha inválida para marcar ausentes', 400);
    }
    
    // PASO 1: Crear registros con estado "Permiso" para personal con papeleta activa
    const queryCrearPermisos = `
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
        'Permiso',
        $2
      FROM Personal p
      WHERE p.activo = true
        AND p.id NOT IN (
          SELECT DISTINCT personal_id 
          FROM ControlAsistenciaPersonal 
          WHERE fecha = $1::date
        )
        AND p.id IN (
          SELECT DISTINCT ps.personal_solicitante_id
          FROM PapeletasSalida ps
          WHERE ps.estado IN ('APROBADO', 'EN_CURSO')
            AND DATE(ps.fecha_hora_salida_programada) <= $1::date
            AND DATE(ps.fecha_hora_retorno_programada) >= $1::date
            AND ps.fecha_hora_retorno_real IS NULL
        )
      RETURNING id
    `;
    
    // PASO 2: Crear registros con estado "Ausente" para el resto sin papeleta
    const queryCrearAusentes = `
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
    
    // PASO 3: Actualizar registros existentes que no tienen horaIngreso
    // NO sobrescribir Permisos existentes ni personal con papeletas activas
    const queryActualizarRegistros = `
    UPDATE ControlAsistenciaPersonal ca
    SET 
      estado_presencia = 'Ausente',
      usuario_registro_id = $2
    WHERE ca.fecha = $1::date
      AND ca.hora_ingreso IS NULL
      AND ca.estado_presencia != 'Ausente'
      AND ca.estado_presencia != 'Permiso'
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
    
    // Ejecutar consultas según el parámetro crearSiNoExiste
    let creadosPermiso = 0;
    let creadosAusente = 0;
    let actualizados = 0;
    
    if (crearSiNoExiste) {
      // Modo completo: crear registros nuevos (Permiso + Ausente) Y actualizar existentes
      const [permisoResult, ausenteResult, actualizarResult] = await Promise.all([
        db.query(queryCrearPermisos, [fecha, usuarioSistemaId]),
        db.query(queryCrearAusentes, [fecha, usuarioSistemaId]),
        db.query(queryActualizarRegistros, [fecha, usuarioSistemaId])
      ]);
      
      creadosPermiso = permisoResult.rows.length;
      creadosAusente = ausenteResult.rows.length;
      actualizados = actualizarResult.rows.length;
    } else {
      // Modo solo actualización: NO crear registros nuevos, solo actualizar existentes
      const actualizarResult = await db.query(queryActualizarRegistros, [fecha, usuarioSistemaId]);
      actualizados = actualizarResult.rows.length;
    }
    
    const creados = creadosPermiso + creadosAusente;
    const total = creados + actualizados;
    const modoOperacion = crearSiNoExiste ? 'crear y actualizar' : 'solo actualizar';
    
    logger.info(`Marcado de ausentes completado para fecha ${fecha} (modo: ${modoOperacion}): ${creados} registros creados (${creadosPermiso} permisos, ${creadosAusente} ausentes), ${actualizados} actualizados (total: ${total}).`);
    
    return {
      fecha,
      registrosCreados: creados,
      registrosPermisoCreados: creadosPermiso,
      registrosAusentesCreados: creadosAusente,
      registrosActualizados: actualizados,
      total
    };
    
  } catch (error) {
    logger.error(`Error en repositorio marcando ausentes para fecha ${fecha}:`, error);
    throw error instanceof AppError ? error : new AppError('Error marcando ausentes', 500);
  }
};

/**
 * Verificar si existen registros de asistencia para una fecha específica
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Object} Información sobre registros existentes
 */
const verificarRegistrosDelDia = async (fecha) => {
  try {
    // Normalizar fecha a YYYY-MM-DD (zona Lima)
    fecha = toLimaDateYYYYMMDD(fecha);
    
    if (!fecha || typeof fecha !== 'string' || fecha.trim() === '') {
      throw new AppError('Fecha inválida para verificar registros', 400);
    }
    
    // Contar total de personal activo
    const queryPersonalActivo = `
      SELECT COUNT(*) as total
      FROM Personal
      WHERE activo = true
    `;
    
    // Contar registros de asistencia para la fecha
    const queryRegistrosExistentes = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      WHERE fecha = $1::date
    `;
    
    const [personalResult, registrosResult] = await Promise.all([
      db.query(queryPersonalActivo),
      db.query(queryRegistrosExistentes, [fecha])
    ]);
    
    const totalPersonalActivo = parseInt(personalResult.rows[0].total);
    const totalRegistros = parseInt(registrosResult.rows[0].total);
    const porcentaje = totalPersonalActivo > 0 ? Math.round((totalRegistros / totalPersonalActivo) * 100) : 0;
    const necesitaCreacion = totalRegistros === 0;
    
    return {
      fecha,
      totalPersonalActivo,
      totalRegistros,
      porcentaje,
      necesitaCreacion
    };
    
  } catch (error) {
    logger.error(`Error verificando registros del día para fecha ${fecha}:`, error);
    throw error instanceof AppError ? error : new AppError('Error verificando registros del día', 500);
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
    
    // Total de asistencias (Presente + Tardanza)
    const totalAsistenciasQuery = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Presente', 'Tardanza')
    `;
    
    // Total de inasistencias (Ausente + Falta)
    const totalInasistenciasQuery = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Ausente', 'Falta')
    `;
    
    // Total de permisos (Permiso + En Permiso + Comisión)
    const totalPermisosQuery = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Permiso', 'En Permiso', 'Comisión')
    `;
    
    // Flujo diario de asistencias
    const flujoDiarioAsistenciasQuery = `
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS asistencias
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Presente', 'Tardanza')
      GROUP BY dia
      ORDER BY dia
    `;
    
    // Flujo diario de inasistencias
    const flujoDiarioInasistenciasQuery = `
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS inasistencias
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Ausente', 'Falta')
      GROUP BY dia
      ORDER BY dia
    `;
    
    // Flujo diario de permisos
    const flujoDiarioPermisosQuery = `
      SELECT 
        DATE(fecha) AS dia,
        COUNT(*) AS permisos
      FROM ControlAsistenciaPersonal
      ${whereClause}
      ${whereCondition.length > 0 ? 'AND' : 'WHERE'} estado_presencia IN ('Permiso', 'En Permiso', 'Comisión')
      GROUP BY dia
      ORDER BY dia
    `;
    
    const [
      totalAsistenciasResult,
      totalInasistenciasResult,
      totalPermisosResult,
      flujoDiarioAsistenciasResult,
      flujoDiarioInasistenciasResult,
      flujoDiarioPermisosResult
    ] = await Promise.all([
      db.query(totalAsistenciasQuery, params),
      db.query(totalInasistenciasQuery, params),
      db.query(totalPermisosQuery, params),
      db.query(flujoDiarioAsistenciasQuery, params),
      db.query(flujoDiarioInasistenciasQuery, params),
      db.query(flujoDiarioPermisosQuery, params)
    ]);
    
    return {
      asistencias: {
        total: parseInt(totalAsistenciasResult.rows[0]?.total || 0),
        flujo_diario: flujoDiarioAsistenciasResult.rows
      },
      inasistencias: {
        total: parseInt(totalInasistenciasResult.rows[0]?.total || 0),
        flujo_diario: flujoDiarioInasistenciasResult.rows
      },
      permisos: {
        total: parseInt(totalPermisosResult.rows[0]?.total || 0),
        flujo_diario: flujoDiarioPermisosResult.rows
      }
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
    
    // Condiciones para hora de llegada
    const horaLlegadaConditions = [...whereCondition];
    horaLlegadaConditions.push(`estado_presencia IN ('Presente', 'Tardanza')`);
    horaLlegadaConditions.push(`hora_ingreso IS NOT NULL`);
    const horaLlegadaWhereClause = `WHERE ${horaLlegadaConditions.join(' AND ')}`;
    
    // Distribución de hora de llegada
    const horaLlegadaQuery = `
      SELECT
        DATE_TRUNC('hour', hora_ingreso::time) AS hora,
        COUNT(*) AS cantidad,
        SUM(CASE WHEN estado_presencia = 'Tardanza' THEN 1 ELSE 0 END) AS tardanzas
      FROM ControlAsistenciaPersonal
      ${horaLlegadaWhereClause}
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
 * Obtener estadísticas de salidas por motivo (papeletas)
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Estadísticas de salidas por motivo
 */
const getEstadisticasAusencias = async (fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [];
    let paramCounter = 1;
    
    if (fechaInicio) {
      whereCondition.push(`DATE(ps.fecha_hora_salida_real) >= $${paramCounter}::date`);
      params.push(fechaInicio);
      paramCounter++;
    }
    
    if (fechaFin) {
      whereCondition.push(`DATE(ps.fecha_hora_salida_real) < ($${paramCounter}::date + INTERVAL '1 day')`);
      params.push(fechaFin);
      paramCounter++;
    }
    
    // Condiciones para estadísticas de motivos
    const motivosConditions = [...whereCondition];
    motivosConditions.push(`ps.estado IN ('EN_CURSO', 'FINALIZADO')`);
    motivosConditions.push(`ps.fecha_hora_salida_real IS NOT NULL`);
    const motivosWhereClause = `WHERE ${motivosConditions.join(' AND ')}`;
    
    // Distribución por motivo de salida
    const motivosSalidaQuery = `
      SELECT
        m.nombre_motivo AS tipo_ausencia,
        COUNT(*) AS total
      FROM PapeletasSalida ps
      JOIN MotivosSalidaPersonal m ON ps.motivo_salida_id = m.id
      ${motivosWhereClause}
      GROUP BY m.nombre_motivo
      ORDER BY total DESC
    `;
    
    // Top 10 personal con más salidas
    const topSalidasQuery = `
      SELECT
        CONCAT(p.nombres, ' ', p.apellidos) AS personal,
        COUNT(*) AS faltas
      FROM PapeletasSalida ps
      JOIN Personal p ON ps.personal_solicitante_id = p.id
      ${motivosWhereClause}
      GROUP BY personal
      ORDER BY faltas DESC
      LIMIT 10
    `;
    
    const [motivosResult, topSalidasResult] = await Promise.all([
      db.query(motivosSalidaQuery, params),
      db.query(topSalidasQuery, params)
    ]);
    
    return {
      por_tipo: motivosResult.rows,
      top_faltas: topSalidasResult.rows
    };
  } catch (error) {
    logger.error('Error obteniendo estadísticas de salidas:', error);
    throw new AppError('Error obteniendo estadísticas de salidas', 500);
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

/**
 * Obtener detalle completo de un personal específico
 * @param {number} personalId - ID del personal
 * @param {string} fechaInicio - Fecha de inicio
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object} Detalle completo del personal
 */
const getPersonalDetalle = async (personalId, fechaInicio, fechaFin) => {
  try {
    fechaInicio = toLimaDateYYYYMMDD(fechaInicio);
    fechaFin = toLimaDateYYYYMMDD(fechaFin);
    
    const whereCondition = [];
    const params = [personalId];
    let paramCounter = 2;
    
    whereCondition.push(`ca.personal_id = $1`);
    
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
    
    const whereClause = `WHERE ${whereCondition.join(' AND ')}`;
    
    // Resumen general
    const resumenQuery = `
      SELECT
        COUNT(*) AS total_asistencias,
        COUNT(CASE WHEN estado_presencia = 'Presente' THEN 1 END) AS dias_puntuales,
        COUNT(CASE WHEN estado_presencia = 'Tardanza' THEN 1 END) AS dias_tarde,
        COUNT(CASE WHEN estado_presencia = 'Ausente' THEN 1 END) AS dias_ausente,
        MAX(fecha) AS ultima_asistencia
      FROM ControlAsistenciaPersonal ca
      ${whereClause}
    `;
    
    // Asistencias por fecha (para calendario)
    const asistenciasPorFechaQuery = `
      SELECT
        DATE(ca.fecha) AS fecha,
        COUNT(*) AS asistencias_dia,
        json_agg(
          json_build_object(
            'estado_presencia', ca.estado_presencia,
            'hora_ingreso', TO_CHAR(ca.hora_ingreso, 'HH24:MI'),
            'hora_salida', TO_CHAR(ca.hora_salida, 'HH24:MI'),
            'personal', CONCAT(p.nombres, ' ', p.apellidos),
            'area', a.nombre_area
          ) ORDER BY ca.hora_ingreso
        ) AS detalles
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      ${whereClause}
      GROUP BY DATE(ca.fecha)
      ORDER BY fecha DESC
    `;
    
    // Historial detallado
    const historialQuery = `
      SELECT
        ca.fecha,
        ca.estado_presencia,
        TO_CHAR(ca.hora_ingreso, 'HH24:MI') AS hora_ingreso,
        TO_CHAR(ca.hora_salida, 'HH24:MI') AS hora_salida,
        a.nombre_area AS area
      FROM ControlAsistenciaPersonal ca
      JOIN Personal p ON ca.personal_id = p.id
      LEFT JOIN AreasDestino a ON p.area_destino_id = a.id
      ${whereClause}
      ORDER BY ca.fecha DESC
      LIMIT 100
    `;
    
    const [resumenResult, asistenciasPorFechaResult, historialResult] = await Promise.all([
      db.query(resumenQuery, params),
      db.query(asistenciasPorFechaQuery, params),
      db.query(historialQuery, params)
    ]);
    
    return {
      ...resumenResult.rows[0],
      asistencias_por_fecha: asistenciasPorFechaResult.rows,
      historial: historialResult.rows
    };
  } catch (error) {
    logger.error('Error obteniendo detalle del personal:', error);
    throw new AppError('Error obteniendo detalle del personal', 500);
  }
};

/**
 * Obtener configuración de asistencia
 * @param {number} personalId - ID del personal (opcional)
 * @returns {Object} Configuración
 */
const getConfiguracion = async (personalId = null) => {
  try {
    let query;
    let params = [];

    if (personalId) {
      // Buscar configuración específica o global (específica tiene prioridad)
      query = `
        SELECT minutos_tolerancia_por_dia, dias_tolerancia_por_mes, hora_entrada
        FROM config_asistencia_personal
        WHERE personal_id = $1 OR personal_id IS NULL
        ORDER BY personal_id NULLS LAST
        LIMIT 1
      `;
      params = [personalId];
    } else {
      // Solo global
      query = `
        SELECT minutos_tolerancia_por_dia, dias_tolerancia_por_mes, hora_entrada
        FROM config_asistencia_personal
        WHERE personal_id IS NULL
        LIMIT 1
      `;
    }

    const result = await db.query(query, params);
    
    if (result.rows.length > 0) {
        return {
            minutos_tolerancia_dia: result.rows[0].minutos_tolerancia_por_dia,
            dias_tolerancia_mes: result.rows[0].dias_tolerancia_por_mes,
            hora_entrada: result.rows[0].hora_entrada
        };
    }
    
    return { dias_tolerancia_mes: 10, minutos_tolerancia_dia: 10, hora_entrada: '09:00:00' };
  } catch (error) {
    logger.error('Error obteniendo configuración de asistencia:', error);
    return { dias_tolerancia_mes: 10, minutos_tolerancia_dia: 10, hora_entrada: '09:00:00' };
  }
};

/**
 * Contar días de tolerancia usados en el mes
 * @param {number} personalId
 * @param {number} mes
 * @param {number} anio
 * @returns {number} Días usados
 */
const countDiasToleranciaUsados = async (personalId, mes, anio, horaEntradaRef = '09:00:00', fechaInicioConfig = null) => {
  try {
    const query = `
      SELECT COUNT(*) as total
      FROM ControlAsistenciaPersonal
      WHERE personal_id = $1
        AND EXTRACT(MONTH FROM fecha) = $2
        AND EXTRACT(YEAR FROM fecha) = $3
        AND hora_ingreso::time > $4::time
        AND estado_presencia IN ('Presente', 'Tardanza')
        AND ($5::date IS NULL OR fecha >= $5::date)
    `;
    
    const result = await db.query(query, [personalId, mes, anio, horaEntradaRef, fechaInicioConfig]);
    return parseInt(result.rows[0].total);
    
  } catch (error) {
    logger.error('Error contando días de tolerancia:', error);
    return 0;
  }
};

/**
 * Obtener resumen mensual de asistencia de un personal
 * @param {number} personalId
 * @param {number} anio
 * @param {number} mes
 * @returns {Object}
 */
const getResumenMensualPersonal = async (personalId, anio, mes) => {
  try {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN estado_presencia = 'Presente' THEN 1 END), 0) AS presentes,
        COALESCE(SUM(CASE WHEN estado_presencia = 'Tardanza' THEN 1 END), 0) AS tardanzas,
        COALESCE(SUM(CASE WHEN estado_presencia = 'Ausente' THEN 1 END), 0) AS ausentes,
        COALESCE(SUM(
          CASE WHEN estado_presencia IN ('Permiso', 'En Permiso', 'Comisión') THEN 1 END
        ), 0) AS permisos,
        COALESCE(SUM(CASE WHEN estado_presencia = 'Justificada' THEN 1 END), 0) AS justificadas,
        COALESCE(SUM(minutos_tardanza), 0) AS minutos_tardanza_total
      FROM ControlAsistenciaPersonal
      WHERE personal_id = $1
        AND EXTRACT(YEAR FROM fecha) = $2
        AND EXTRACT(MONTH FROM fecha) = $3
    `;

    const result = await db.query(query, [personalId, anio, mes]);
    return result.rows[0] || {};
  } catch (error) {
    logger.error(
      `Error en repositorio obteniendo resumen mensual para personal ID ${personalId}:`,
      error
    );
    throw new AppError('Error obteniendo resumen mensual de asistencia', 500);
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
  verificarRegistrosDelDia,
  actualizarEstadoPorPeriodo,
  getEstadisticas,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticasPersonal,
  getPersonalDetalle,
  getConfiguracion,
  countDiasToleranciaUsados,
  getResumenMensualPersonal
};
