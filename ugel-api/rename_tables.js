const { pool } = require('./src/config/database');

const tablesToRename = [
  { old: 'AreasDestino', new: 'areadestino' },
  { old: 'TiposContrato', new: 'tipocontrato' },
  { old: 'TiposDocumento', new: 'tipodocumento' },
  { old: 'MotivosVisita', new: 'motivovisita' },
  { old: 'Cargos', new: 'cargo' },
  { old: 'Personal', new: 'personal' },
  { old: 'Usuarios', new: 'usuario' },
  { old: 'Visitantes', new: 'visitante' },
  { old: 'RegistrosVisitas', new: 'registrovisita' },
  { old: 'ControlAsistenciaPersonal', new: 'controlasistenciapersonal' },
  { old: 'ReniecProveedores', new: 'reniecproveedor' },
  { old: 'PapeletasExternas', new: 'papeletaexterna' },
  { old: 'MotivosSalidaPersonal', new: 'motivosalidapersonal' }, // Just in case
  { old: 'RegistrosSalidaPersonal', new: 'registrosalidapersonal' } // Just in case
];

const runMigration = async () => {
  console.log("Iniciando renombrado de tablas...");
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    for (const tables of tablesToRename) {
      try {
        // Check if old table exists
        const checkRes = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [tables.old]);

        if (checkRes.rows[0].exists) {
          console.log(`Renombrando ${tables.old} a ${tables.new}...`);
          // Use quotes for old name just in case it was created case-sensitive (though usually not)
          // But safer to try RENAME TO.
          // Note: "new" name should be unquoted to be standard lowercase.
          await client.query(`ALTER TABLE "${tables.old}" RENAME TO ${tables.new}`);
        } else {
          // Check if it exists as lowercase already (maybe standard postgres folding?)
           const checkLower = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [tables.old.toLowerCase()]);
          
          if (checkLower.rows[0].exists) {
             console.log(`Tabla ${tables.old} ya parece estar en minúsculas/renombrada.`);
             if (tables.old.toLowerCase() !== tables.new) {
                 // Example: cargos -> cargo
                 console.log(`Ajustando singular: ${tables.old.toLowerCase()} -> ${tables.new}`);
                 await client.query(`ALTER TABLE "${tables.old.toLowerCase()}" RENAME TO ${tables.new}`);
             }
          } else {
             console.log(`Tabla ${tables.old} no encontrada. Saltando.`);
          }
        }
      } catch (err) {
        console.warn(`Error procesando ${tables.old}: ${err.message}`);
      }
    }

    await client.query('COMMIT');
    console.log("Renombrado completado exitosamente.");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error crítico en migración:", error);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
