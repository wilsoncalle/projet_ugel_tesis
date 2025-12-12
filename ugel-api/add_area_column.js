const { pool } = require('./src/config/database');

const runMigration = async () => {
  const query = `
    ALTER TABLE PapeletasExternas 
    ADD COLUMN IF NOT EXISTS solicitante_area VARCHAR(150);
  `;

  try {
    await pool.query(query);
    console.log("Columna solicitante_area agregada correctamente.");
  } catch (error) {
    console.error("Error alterando tabla:", error);
  } finally {
    await pool.end();
  }
};

runMigration();
