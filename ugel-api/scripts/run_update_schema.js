const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_DATABASE || 'ugel_control_db',
  password: process.env.DB_PASSWORD || 'qwerty',
  port: process.env.DB_PORT || 5432,
});

async function runSchemaUpdate() {
  try {
    const sqlPath = path.join(__dirname, '../../update_schema.sql');
    console.log(`Reading SQL from ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing SQL update...');
    await pool.query(sql);
    console.log('Schema update completed successfully.');
  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await pool.end();
  }
}

runSchemaUpdate();
