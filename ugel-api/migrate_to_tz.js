const { pool } = require('./src/config/database');

const runMigration = async () => {
  const query = `
    ALTER TABLE PapeletasExternas 
    ALTER COLUMN fecha_salida TYPE TIMESTAMPTZ,
    ALTER COLUMN fecha_retorno TYPE TIMESTAMPTZ,
    ALTER COLUMN fecha_sincronizacion TYPE TIMESTAMPTZ;
  `;

  try {
    await pool.query(query);
    console.log("Columnas de PapeletasExternas migradas a TIMESTAMPTZ correctamente.");
  } catch (error) {
    console.error("Error migrando a TIMESTAMPTZ:", error);
  } finally {
    await pool.end();
  }
};

runMigration();
