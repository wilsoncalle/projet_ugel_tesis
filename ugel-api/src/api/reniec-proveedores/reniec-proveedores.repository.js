const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler');

const mapRow = (row) => ({
  ...row,
  fecha_creacion: row.fecha_creacion,
  fecha_actualizacion: row.fecha_actualizacion,
  fecha_activacion: row.fecha_activacion,
  fecha_desactivacion: row.fecha_desactivacion,
});

const findAll = async () => {
  const query = `
    SELECT rp.*, u.nombre_usuario AS creado_por
    FROM reniecproveedor rp
    LEFT JOIN usuario u ON u.id = rp.usuario_creador_id
    ORDER BY rp.activo DESC, rp.fecha_actualizacion DESC, rp.id DESC
  `;
  const result = await db.query(query);
  return result.rows.map(mapRow);
};

const findById = async (id) => {
  const result = await db.query(
    `
      SELECT rp.*, u.nombre_usuario AS creado_por
      FROM reniecproveedor rp
      LEFT JOIN usuario u ON u.id = rp.usuario_creador_id
      WHERE rp.id = $1
    `,
    [id]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const findActive = async () => {
  const result = await db.query(
    `
      SELECT rp.*, u.nombre_usuario AS creado_por
      FROM reniecproveedor rp
      LEFT JOIN usuario u ON u.id = rp.usuario_creador_id
      WHERE rp.activo = true
      ORDER BY rp.fecha_activacion DESC NULLS LAST, rp.fecha_actualizacion DESC
      LIMIT 1
    `
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const create = async ({ nombre, baseUrl, token, notas, activo = false, usuarioCreadorId }) => {
  const result = await db.query(
    `
      INSERT INTO reniecproveedor (
        nombre,
        base_url,
        token,
        notas,
        activo,
        usuario_creador_id,
        fecha_activacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $5 = true THEN NOW() ELSE NULL END)
      RETURNING *;
    `,
    [nombre, baseUrl, token, notas || null, activo, usuarioCreadorId || null]
  );
  return mapRow(result.rows[0]);
};

const update = async (id, { nombre, baseUrl, token, notas, activo }) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (nombre !== undefined) {
    fields.push(`nombre = $${idx++}`);
    values.push(nombre);
  }

  if (baseUrl !== undefined) {
    fields.push(`base_url = $${idx++}`);
    values.push(baseUrl);
  }

  if (token !== undefined) {
    fields.push(`token = $${idx++}`);
    values.push(token);
  }

  if (notas !== undefined) {
    fields.push(`notas = $${idx++}`);
    values.push(notas);
  }

  if (activo !== undefined) {
    fields.push(`activo = $${idx++}`);
    values.push(activo);
  }

  if (!fields.length) {
    const existing = await findById(id);
    if (!existing) throw new AppError('Proveedor RENIEC no encontrado', 404);
    return existing;
  }

  fields.push(`fecha_actualizacion = NOW()`);

  const query = `
    UPDATE reniecproveedor
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;

  const result = await db.query(query, [...values, id]);
  if (!result.rows.length) throw new AppError('Proveedor RENIEC no encontrado', 404);
  return mapRow(result.rows[0]);
};

const setActive = async (id, usuarioId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const target = await client.query(
      'SELECT * FROM reniecproveedor WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!target.rows.length) {
      throw new AppError('Proveedor RENIEC no encontrado', 404);
    }

    await client.query(
      `
        UPDATE reniecproveedor
        SET activo = false, fecha_desactivacion = NOW()
        WHERE activo = true AND id <> $1
      `,
      [id]
    );

    const updated = await client.query(
      `
        UPDATE reniecproveedor
        SET 
          activo = true,
          fecha_activacion = COALESCE(fecha_activacion, NOW()),
          fecha_desactivacion = NULL,
          fecha_actualizacion = NOW(),
          usuario_creador_id = COALESCE(usuario_creador_id, $2)
        WHERE id = $1
        RETURNING *;
      `,
      [id, usuarioId || null]
    );

    await client.query('COMMIT');
    return mapRow(updated.rows[0]);
  } catch (error) {
    await db.safeRollback(client);
    throw error;
  } finally {
    client.release();
  }
};

const deleteById = async (id) => {
  const result = await db.query(
    'DELETE FROM reniecproveedor WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

module.exports = {
  findAll,
  findById,
  findActive,
  create,
  update,
  setActive,
  deleteById,
};
