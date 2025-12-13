const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conexión PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Usuarios iniciales
const usuariosIniciales = [
  {
    nombre: 'admin',
    email: 'admin@ugel.gob.pe',
    pass: 'admin123.', 
    rol: 'Administrador',
    es_sistema: false    
  },
  {
    nombre: 'rrhh',
    email: 'rrhh@ugel.gob.pe',
    pass: 'rrhh123.',
    rol: 'RRHH',
    es_sistema: false
  },
  {
    nombre: 'vigilante',
    email: 'vigilante@ugel.gob.pe',
    pass: 'vigilante123.',
    rol: 'Vigilante',
    es_sistema: false
  },
  {
    nombre: 'system',
    email: 'system@ugel.local',
    pass: 'SYSTEM_INTERNAL',  // sin hashear
    rol: 'Sistema',
    es_sistema: true,
    sinHash: true, // bandera especial para que no se hashee
  }
];

async function seed() {
  try {
    console.log('Iniciando creación de usuarios...');

    for (const user of usuariosIniciales) {

      let hash = user.pass;

      // Si NO es usuario especial, se genera hash
      if (!user.sinHash) {
        const salt = await bcrypt.genSalt(12);
        hash = await bcrypt.hash(user.pass, salt);
      }

      // Verificar si ya existe
      const check = await pool.query(
        'SELECT id FROM usuario WHERE email = $1',
        [user.email]
      );

      if (check.rows.length === 0) {
        // Insertar y devolver el ID
        const result = await pool.query(
          `INSERT INTO usuario (nombre_usuario, hash_contrasena, email, rol, es_sistema, activo)
           VALUES ($1, $2, $3, $4, $5, true)
           RETURNING id`,
          [user.nombre, hash, user.email, user.rol, user.es_sistema]
        );

        const insertedId = result.rows[0].id;

        console.log(`Usuario creado: ${user.nombre}`);

        // 🔥 SI ES EL USUARIO DEL SISTEMA → IMPRIME EL ID PARA EL .env
        if (user.nombre === 'system') {
          console.log('------------------------------------------');
          console.log('       SYSTEM USER ID PARA .env'           );
          console.log('------------------------------------------');
          console.log(`SYSTEM_USER_ID=${insertedId}`              );
          console.log('------------------------------------------');
        }

      } else {
        console.log(`El usuario ${user.nombre} ya existe.`);
      }
    }
  } catch (err) {
    console.error('Error en el seed:', err);
  } finally {
    pool.end();
  }
}

seed();
