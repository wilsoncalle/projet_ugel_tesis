/**
 * Repositorio para Papeletas Externas (Caché Local en Postgres)
 * Reemplaza el acceso directo a Mongo para lectura rápida.
 */

const { pool } = require('../../config/database');

const paginate = (rows, page = 1, limit = 20) => {
    // Si ya paginamos en SQL, esto solo formatea
    return {
        data: rows,
        total: rows.length // Ojo: SQL devuelve total aparte
    };
};

const buildDateFilter = (fechaInicio, fechaFin) => {
    let clauses = '';
    const params = [];
    let idx = 1;

    if (fechaInicio) {
        clauses += ` AND fecha_salida >= $${idx++}`;
        params.push(fechaInicio);
    }
    if (fechaFin) {
        clauses += ` AND fecha_salida <= $${idx++}`;
        params.push(`${fechaFin} 23:59:59`);
    }
    return { clauses, params, nextIdx: idx };
};

const findAll = async (options = {}) => {
    const { page = 1, limit = 20, search = '', estado, fechaInicio, fechaFin } = options;
    
    let where = 'WHERE 1=1';
    let params = [];
    let idx = 1;

    if (fechaInicio) {
        where += ` AND fecha_salida >= $${idx++}::timestamp`;
        params.push(fechaInicio);
    }
    if (fechaFin) {
        where += ` AND fecha_salida <= $${idx++}::timestamp`;
        params.push(`${fechaFin} 23:59:59`);
    }

    if (estado) {
        where += ` AND UPPER(estado_virtual) = $${idx++}`;
        params.push(estado.toUpperCase());
    }

    if (search) {
        const q = `%${search.toLowerCase()}%`;
        where += ` AND (
            LOWER(codigo_papeleta) LIKE $${idx} OR 
            LOWER(solicitante_nombres) LIKE $${idx} OR 
            LOWER(solicitante_apellidos) LIKE $${idx} OR 
            LOWER(motivo) LIKE $${idx}
        )`;
        params.push(q);
        idx++; // Increment after reusing
    }

    // Count
    const countQuery = `SELECT COUNT(*) FROM papeletaexterna ${where}`;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0].count);

    // Data
    const offset = (page - 1) * limit;
    const query = `
        SELECT 
            external_id as id,
            codigo_papeleta,
            solicitante_nombres,
            solicitante_apellidos,
            solicitante_dni as solicitante_numero_documento,
            motivo as nombre_motivo,
            motivo_detalle as motivo,
            fecha_salida as fecha_hora_salida_programada,
            fecha_retorno as fecha_hora_retorno_programada,
            estado_virtual as estado,
            solicitante_area as nombre_area
        FROM papeletaexterna
        ${where}
        ORDER BY fecha_salida DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    return { papeletas: result.rows, total };
};

const findPendientes = async (options = {}) => {
    // Reutilizamos findAll forzando estado
    // Pero en realidad 'Pendientes' suele ser APROBADO o EN_CURSO para garita
    // La logica original filtraba en memoria.
    
    // Mejor hacemos una consulta especifica si se requiere, pero findAll con filtro 'estado' solo acepta uno.
    // Vamos a hacer una query custom.
    const { page = 1, limit = 20, search = '', fechaInicio, fechaFin } = options;
    
    let where = "WHERE estado_virtual IN ('APROBADO', 'EN_CURSO')";
    let params = [];
    let idx = 1;

    if (fechaInicio) {
        where += ` AND fecha_salida >= $${idx++}::timestamp`;
        params.push(fechaInicio);
    }
    if (fechaFin) {
        where += ` AND fecha_salida <= $${idx++}::timestamp`;
        params.push(`${fechaFin} 23:59:59`);
    }

    if (search) {
        const q = `%${search.toLowerCase()}%`;
        where += ` AND (
            LOWER(codigo_papeleta) LIKE $${idx} OR 
            LOWER(solicitante_nombres) LIKE $${idx} OR 
            LOWER(solicitante_apellidos) LIKE $${idx} OR 
            LOWER(solicitante_dni) LIKE $${idx}
        )`;
        params.push(q);
        idx++;
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM papeletaexterna ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    const query = `
        SELECT external_id as id, codigo_papeleta, solicitante_nombres, solicitante_apellidos, solicitante_dni,
               fecha_salida, fecha_retorno, estado_virtual
        FROM papeletaexterna ${where}
        ORDER BY fecha_salida ASC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, (page - 1) * limit);
    const res = await pool.query(query, params);
    return { papeletas: res.rows, total };
};

// ESTADISTICAS

const getEstadisticasEstado = async ({ fechaInicio, fechaFin }) => {
    let where = 'WHERE 1=1';
    let params = [];
    let idx = 1;
    if (fechaInicio) { where += ` AND fecha_salida >= $${idx++}::timestamp`; params.push(fechaInicio); }
    if (fechaFin) { where += ` AND fecha_salida <= $${idx++}::timestamp`; params.push(`${fechaFin} 23:59:59`); }

    // Distribucion Estados
    const qEstados = `SELECT estado_virtual as estado, COUNT(*) as total FROM papeletaexterna ${where} GROUP BY estado_virtual`;
    const resEstados = await pool.query(qEstados, params);
    const distribucion_estados = resEstados.rows;

    // Flujo Diario
    const qFlujo = `
        SELECT TO_CHAR(fecha_salida, 'YYYY-MM-DD') as dia, COUNT(*) as total 
        FROM papeletaexterna ${where} 
        GROUP BY 1 ORDER BY 1
    `;
    const resFlujo = await pool.query(qFlujo, params);
    const flujo_diario = resFlujo.rows;

    const totalRes = await pool.query(`SELECT COUNT(*) FROM papeletaexterna ${where}`, params);
    const total = parseInt(totalRes.rows[0].count);

    return { distribucion_estados, flujo_diario, total };
};

const getEstadisticasMotivos = async ({ fechaInicio, fechaFin }) => {
    let where = 'WHERE 1=1';
    let params = [];
    let idx = 1;
    if (fechaInicio) { where += ` AND fecha_salida >= $${idx++}::timestamp`; params.push(fechaInicio); }
    if (fechaFin) { where += ` AND fecha_salida <= $${idx++}::timestamp`; params.push(`${fechaFin} 23:59:59`); }

    const query = `SELECT motivo as nombre_motivo, COUNT(*) as total FROM papeletaexterna ${where} GROUP BY 1 ORDER BY 2 DESC`;
    const res = await pool.query(query, params);
    
    // Total
    const tRes = await pool.query(`SELECT COUNT(*) FROM papeletaexterna ${where}`, params);
    return { por_motivo: res.rows, total: parseInt(tRes.rows[0].count) };
};

const getEstadisticasHoras = async ({ fechaInicio, fechaFin }) => {
    // En realidad es "Top Personas"
    let where = 'WHERE 1=1';
    let params = [];
    let idx = 1;
    if (fechaInicio) { where += ` AND fecha_salida >= $${idx++}::timestamp`; params.push(fechaInicio); }
    if (fechaFin) { where += ` AND fecha_salida <= $${idx++}::timestamp`; params.push(`${fechaFin} 23:59:59`); }

    const query = `
        SELECT 
            CONCAT(solicitante_nombres, ' ', solicitante_apellidos) as personal,
            COALESCE(solicitante_area, 'Desconocido') as nombre_area,
            COUNT(*) as total_papeletas
        FROM papeletaexterna
        ${where}
        GROUP BY 1, 2
        ORDER BY 3 DESC
        LIMIT 10
    `;
    const res = await pool.query(query, params);

    // Resumen
    const qResumen = `
        SELECT 
            COUNT(DISTINCT solicitante_dni) as total_empleados,
            COUNT(*) as total_papeletas
        FROM papeletaexterna ${where}
    `;
    const sumRes = await pool.query(qResumen, params);
    const { total_empleados, total_papeletas } = sumRes.rows[0];
    const promedio = total_empleados > 0 ? (total_papeletas / total_empleados).toFixed(2) : 0;

    return {
        por_persona: res.rows,
        resumen: {
            total_empleados,
            total_papeletas_global: total_papeletas,
            promedio_por_empleado: promedio
        }
    };
};

const getEstadisticasAreas = async ({ fechaInicio, fechaFin }) => {
    let where = 'WHERE 1=1';
    let params = [];
    let idx = 1;
    if (fechaInicio) { where += ` AND fecha_salida >= $${idx++}::timestamp`; params.push(fechaInicio); }
    if (fechaFin) { where += ` AND fecha_salida <= $${idx++}::timestamp`; params.push(`${fechaFin} 23:59:59`); }

    const query = `
        SELECT COALESCE(solicitante_area, 'Sin Área') as nombre_area, COUNT(*) as total_papeletas
        FROM papeletaexterna ${where}
        GROUP BY 1
        ORDER BY 2 DESC
    `;
    const res = await pool.query(query, params);

    // Top personas (reutilizado del original) - No es muy eficiente repetirlo pero bueno
    // Lo simplificaremos a null o lo incluimos si el front lo usa
    // El original devuelve { por_area, por_persona }
    
    // Voy a reusar getEstadisticasHoras para la parte de personas
    const personasData = await getEstadisticasHoras({ fechaInicio, fechaFin });

    return {
        por_area: res.rows,
        por_persona: personasData.por_persona
    };
};

// Métodos vacíos o no soportados para mantener interfaz
module.exports = {
  findAll,
  findPendientes,
  findPendientesBypersonal: async () => ({ papeletas: [], total: 0 }),
  findById: async () => null,
  create: async () => { throw new Error('Operación no soportada localmente'); },
  decidirPapeleta: async () => { throw new Error('Operación no soportada localmente'); },
  registrarSalida: async () => null,
  registrarSalidaTx: async () => null,
  registrarRetorno: async () => null,
  cancelar: async () => { throw new Error('Operación no soportada localmente'); },
  anular: async () => { throw new Error('Operación no soportada localmente'); },
  encontrarPapeletaActivaPorFecha: async () => null,
  
  // Estadísticas
  getEstadisticas: getEstadisticasEstado, // Alias
  getEstadisticasEstado,
  getEstadisticasMotivos,
  getEstadisticasHoras,
  getEstadisticasAreas,
};
