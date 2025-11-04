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
const asistenciaPersonalService = require('./src/api/asistencia-personal/asistenciapersonal.service');

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

/**
 * Función para marcar ausentes al final del día
 * Esta función se ejecuta diariamente a las 23:59 para marcar ausentes del día anterior
 */
const ejecutarMarcadoAusentes = async () => {
  try {
    logger.info('Ejecutando marcado automático de ausentes...');
    // Usar usuario ID 1 como usuario del sistema para acciones automáticas
    const resultado = await asistenciaPersonalService.marcarAusentesAlFinalDelDia(null, 1);
    logger.info(`Marcado de ausentes completado: ${resultado.total} registros procesados para fecha ${resultado.fecha}`);
  } catch (error) {
    logger.error('Error en marcado automático de ausentes:', error);
  }
};

/**
 * Calcular el tiempo hasta la próxima ejecución a las 23:59
 * @returns {number} Tiempo en milisegundos hasta las 23:59
 */
const calcularTiempoHasta2359 = () => {
  const ahora = new Date();
  const limaOffset = -5 * 60; // -5 horas en minutos
  const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
  const limaTime = new Date(utcTime + (limaOffset * 60000));
  
  // Crear fecha objetivo para hoy a las 23:59:00
  const objetivo = new Date(limaTime);
  objetivo.setHours(23, 59, 0, 0);
  
  // Si ya pasó las 23:59 de hoy, programar para mañana
  if (limaTime >= objetivo) {
    objetivo.setDate(objetivo.getDate() + 1);
  }
  
  // Calcular diferencia en milisegundos
  const diferencia = objetivo.getTime() - limaTime.getTime();
  
  logger.info(`Próxima ejecución de marcado de ausentes programada para: ${objetivo.toISOString()} (en ${Math.round(diferencia / 1000 / 60)} minutos)`);
  
  return diferencia;
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
  
  // Programar marcado de ausentes diariamente a las 23:59
  const programarMarcadoAusentes = () => {
    const tiempoHasta2359 = calcularTiempoHasta2359();
    
    setTimeout(() => {
      // Ejecutar el marcado de ausentes
      ejecutarMarcadoAusentes();
      
      // Programar la próxima ejecución (24 horas después)
      setInterval(ejecutarMarcadoAusentes, 24 * 60 * 60 * 1000);
    }, tiempoHasta2359);
  };
  
  programarMarcadoAusentes();
  logger.info('Tarea programada de marcado automático de ausentes iniciada (diariamente a las 23:59)');
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
