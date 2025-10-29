/**
 * Punto de entrada principal del servidor
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

require('dotenv').config();
const app = require('./app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

const PORT = config.port || 3000;

// Inicializar el servidor HTTP y Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('socketio', io);

io.on('connection', (socket) => {
  logger.info(`Socket conectado: ${socket.id}`);
});

// Importar servicios para tareas programadas
const visitasService = require('./src/api/visitas/visitas.service');

/**
 * Función para ejecutar el cierre automático de visitas
 */
const ejecutarCierreAutomatico = async () => {
  try {
    logger.info('Ejecutando cierre automático de visitas programado...');
    // Usar usuario ID 1 como usuario del sistema para cierres automáticos
    const resultado = await visitasService.cerrarVisitasAutomaticamente(1);
    logger.info(`Cierre automático completado: ${resultado.cerradas} visitas cerradas, ${resultado.errores} errores`);
  } catch (error) {
    logger.error('Error en cierre automático programado:', error);
  }
};

server.listen(PORT, () => {
  logger.info(`Servidor UGEL API ejecutándose en puerto ${PORT}`);
  logger.info(`Entorno: ${config.nodeEnv}`);
  logger.info(`Base de datos: ${config.database.host}:${config.database.port}/${config.database.database}`);
  
  // Ejecutar cierre automático al iniciar el servidor
  ejecutarCierreAutomatico();
  
  // Programar ejecución cada 30 minutos (1800000 ms)
  // También se ejecutará automáticamente cuando se superen las horas límite
  setInterval(ejecutarCierreAutomatico, 30 * 60 * 1000);
  logger.info('Tarea programada de cierre automático de visitas iniciada (cada 30 minutos)');
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor HTTP...');
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido. Cerrando servidor HTTP...');
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
});

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada en:', promise, 'razón:', reason);
  process.exit(1);
});

module.exports = server;
