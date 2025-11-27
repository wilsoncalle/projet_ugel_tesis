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

async function checkColumns() {
  try {
    console.log('Checking columns in RegistrosVisitas...');
    
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'registrosvisitas';
    `);
    
    console.log('Columns found:', res.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();
