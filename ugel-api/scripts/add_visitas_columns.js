const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'ugel_control_db',
  password: process.env.DB_PASSWORD || 'qwerty',
  port: process.env.DB_PORT || 5432,
});

async function addColumns() {
  try {
    console.log('Adding columns to RegistrosVisitas...');
    
    await pool.query(`
      ALTER TABLE RegistrosVisitas 
      ADD COLUMN IF NOT EXISTS estado_visita VARCHAR(20) DEFAULT 'PENDIENTE',
      ADD COLUMN IF NOT EXISTS fecha_aceptacion TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS fecha_rechazo TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT NULL,
      ADD COLUMN IF NOT EXISTS delegado_por_id INT NULL,
      ADD COLUMN IF NOT EXISTS fecha_delegacion TIMESTAMP NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_delegado_por') THEN
          ALTER TABLE RegistrosVisitas
          ADD CONSTRAINT fk_delegado_por FOREIGN KEY (delegado_por_id) REFERENCES Personal(id);
        END IF;
      END
      $$;
    `);
    
    console.log('Columns added successfully.');
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await pool.end();
  }
}

addColumns();
