const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

const createConfig = async ({ personalId, minutos, dias, aplicaDesde, activo = true }) => {
  const query = `
    INSERT INTO config_asistencia_personal (
      personal_id,
      minutos_tolerancia_por_dia,
      dias_tolerancia_por_mes,
      aplica_desde,
      activo
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [personalId || null, minutos, dias, aplicaDesde, activo];
  const result = await db.query(query, values);
  return result.rows[0];
};

const updateConfig = async (id, { minutos, dias, aplicaDesde, activo }) => {
  const query = `
    UPDATE config_asistencia_personal
    SET 
      minutos_tolerancia_por_dia = $1,
      dias_tolerancia_por_mes = $2,
      aplica_desde = $3,
      activo = $4
    WHERE id = $5
    RETURNING *;
  `;
  const values = [minutos, dias, aplicaDesde, activo, id];
  const result = await db.query(query, values);
  if (!result.rows.length) throw new AppError('Configuración no encontrada', 404);
  return result.rows[0];
};

// Config global (personal_id IS NULL)
const getConfigGlobalActiva = async () => {
  const query = `
    SELECT *
    FROM config_asistencia_personal
    WHERE personal_id IS NULL
      AND activo = true
    ORDER BY aplica_desde DESC
    LIMIT 1;
  `;
  const result = await db.query(query);
  return result.rows[0] || null;
};

// Config específica de un personal
const getConfigPersonalActiva = async (personalId) => {
  const query = `
    SELECT *
    FROM config_asistencia_personal
    WHERE personal_id = $1
      AND activo = true
    ORDER BY aplica_desde DESC
    LIMIT 1;
  `;
  const result = await db.query(query, [personalId]);
  return result.rows[0] || null;
};

// Para listar en la vista de admin
const listConfigs = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT c.*, p.nombres, p.apellidos, p.numero_documento
    FROM config_asistencia_personal c
    LEFT JOIN personal p ON p.id = c.personal_id
    ORDER BY c.personal_id NULLS FIRST, c.aplica_desde DESC
    LIMIT $1 OFFSET $2;
  `;
  const result = await db.query(query, [limit, offset]);

  const countRes = await db.query('SELECT COUNT(*) FROM config_asistencia_personal;');

  return {
    configs: result.rows,
    total: Number(countRes.rows[0].count)
  };
};

module.exports = {
  createConfig,
  updateConfig,
  getConfigGlobalActiva,
  getConfigPersonalActiva,
  listConfigs
};
