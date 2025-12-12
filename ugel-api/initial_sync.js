const { sincronizarPapeletas } = require('./src/jobs/syncPapeletas');
const { pool } = require('./src/config/database');

const run = async () => {
    console.log("Ejecutando sincronización inicial...");
    await sincronizarPapeletas();
    console.log("Sincronización inicial terminada.");
    await pool.end();
};

run();
