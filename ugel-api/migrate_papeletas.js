const { pool } = require('./src/config/database');

const runMigration = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS PapeletasExternas (
        id SERIAL PRIMARY KEY,
        external_id VARCHAR(50) NOT NULL UNIQUE,
        codigo_papeleta VARCHAR(50),
        solicitante_nombres VARCHAR(150),
        solicitante_apellidos VARCHAR(150),
        solicitante_dni VARCHAR(20),
        motivo VARCHAR(100),
        motivo_detalle TEXT,
        fecha_salida TIMESTAMP,
        fecha_retorno TIMESTAMP,
        estado_original VARCHAR(50),
        estado_virtual VARCHAR(50),
        fecha_sincronizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_papeletas_ext_dni ON PapeletasExternas(solicitante_dni);
    CREATE INDEX IF NOT EXISTS idx_papeletas_ext_fechas ON PapeletasExternas(fecha_salida);
  `;

  try {
    await pool.query(query);
    console.log("Tabla PapeletasExternas creada correctamente.");
  } catch (error) {
    console.error("Error creando tabla:", error);
  } finally {
    await pool.end();
  }
};

runMigration();
