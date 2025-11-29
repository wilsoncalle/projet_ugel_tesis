/**
 * Punto de entrada principal del servidor
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

require('dotenv').config();
const app = require('./app');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { nowLima } = require('./src/utils/fechas');
const cron = require('node-cron');

const PORT = config.port || 3000;
const SYSTEM_USER_ID = config.systemUserId;

// Validar que SYSTEM_USER_ID esté configurado
if (!SYSTEM_USER_ID) {
  logger.warn('SYSTEM_USER_ID no está configurado. Las tareas automáticas podrían fallar por FK.');
}

// Inicializar el servidor HTTP y Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('socketio', io);

// Middleware de autenticación para Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }
  
  const { verifyTokenSilent } = require('./src/middleware/authHandler');
  const decoded = verifyTokenSilent(token);
  
  if (!decoded) {
    return next(new Error('Token inválido o expirado'));
  }
  
  // Guardar información del usuario en el socket
  socket.user = decoded;
  next();
});

io.on('connection', (socket) => {
  logger.info(`Socket conectado: ${socket.id} (Usuario: ${socket.user.nombreUsuario})`);
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
    // Usa el usuario técnico del sistema
    const resultado = await visitasService.cerrarVisitasAutomaticamente(SYSTEM_USER_ID);
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

  // =========================================================================
  // TAREAS PROGRAMADAS (CRON JOBS)
  // =========================================================================

  /**
   * TAREA 1: Evaluación Reactiva de Asistencia (Cada 15 minutos)
   * Horario: De 8:00 AM a 6:00 PM (Hora 18)
   * Días: Lunes a Viernes (1-5)
   * Objetivo: Marcar Permisos si existen o Ausentes si ya pasó su tolerancia.
   */
  cron.schedule('*/15 8-18 * * 1-5', async () => {
    try {
      logger.info('CRON: Ejecutando evaluación reactiva de asistencia...');
      const resultado = await asistenciaPersonalService.evaluarAsistenciasAutomaticas(SYSTEM_USER_ID);
      logger.info(`CRON: Evaluación completada. Permisos: ${resultado.permisos}, Ausentes nuevos: ${resultado.ausentes}, Aún en tiempo: ${resultado.ignorados}`);
    } catch (error) {
      logger.error('CRON Error en evaluación reactiva:', error);
    }
  });

  /**
   * TAREA 2: Cierre Final del Día (Barrido de seguridad)
   * Horario: 6:05 PM (18:05)
   * Días: Lunes a Viernes (1-5)
   * Objetivo: Asegurar que cualquier registro que haya quedado en el limbo se marque como Ausente.
   * Nota: Reutiliza la misma lógica, ya que a las 18:05 todos habrán superado su hora de entrada.
   */
  cron.schedule('5 18 * * 1-5', async () => {
    try {
      logger.info('CRON: Ejecutando cierre final del día (Barrido de las 18:05)...');
      const resultado = await asistenciaPersonalService.evaluarAsistenciasAutomaticas(SYSTEM_USER_ID);
      logger.info(`CRON: Cierre final completado. ${resultado.ausentes} ausencias forzadas.`);
    } catch (error) {
      logger.error('CRON Error en cierre final:', error);
    }
  });

  /**
   * TAREA 3: Sincronización de Papeletas Diarias (Mantenimiento)
   * Horario: 6:00 AM
   * Días: Todos los días (incluye fines de semana por si hay comisiones especiales)
   */
  cron.schedule('0 6 * * *', async () => {
      const { fecha: hoy } = nowLima();
      // Sincroniza desde el inicio del mes hasta hoy por si hubo cambios retroactivos aprobados
      const inicioMes = `${hoy.slice(0, 7)}-01`;
      await asistenciaPersonalService.sincronizarPapeletas(inicioMes, hoy, SYSTEM_USER_ID);
  });
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
