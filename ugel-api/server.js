/**
 * Punto de entrada principal del servidor
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

require('dotenv').config();
const app = require('./app');
const config = require('./src/config');
const logger = require('./src/utils/logger');

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

/**
 * Función para marcar ausentes con opción de crear o solo actualizar
 * @param {boolean} crearSiNoExiste - Si es true, crea registros nuevos. Si es false, solo actualiza existentes
 */
const ejecutarMarcadoAusentes = async (crearSiNoExiste = true) => {
  try {
    const modoOperacion = crearSiNoExiste ? 'crear y actualizar' : 'solo actualizar';
    logger.info(`Ejecutando marcado automático de ausentes (modo: ${modoOperacion})...`);
    
    // Obtener fecha actual en zona horaria Lima
    const ahora = new Date();
    const limaOffset = -5 * 60; // -5 horas en minutos
    const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
    const limaTime = new Date(utcTime + (limaOffset * 60000));
    const fechaActual = limaTime.toISOString().split('T')[0];
    
    // Usar usuario técnico del sistema para acciones automáticas
    const resultado = await asistenciaPersonalService.marcarAusentesAlFinalDelDia(
      fechaActual,
      SYSTEM_USER_ID,
      crearSiNoExiste
    );

    logger.info(
      `Marcado de ausentes completado: ${resultado.total} registros procesados para fecha ${resultado.fecha} ` +
      `(${resultado.registrosCreados} creados, ${resultado.registrosActualizados} actualizados)` 
    );
  } catch (error) {
    logger.error('Error en marcado automático de ausentes:', error);
  }
};

/**
 * Calcular el tiempo hasta la próxima ejecución de un horario específico
 * @param {number} hora - Hora objetivo (0-23)
 * @param {number} minuto - Minuto objetivo (0-59)
 * @returns {number} Tiempo en milisegundos hasta el horario especificado
 */
const calcularTiempoHasta = (hora, minuto) => {
  const ahora = new Date();
  const limaOffset = -5 * 60; // -5 horas en minutos
  const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
  const limaTime = new Date(utcTime + (limaOffset * 60000));
  
  // Crear fecha objetivo para hoy con el horario especificado
  const objetivo = new Date(limaTime);
  objetivo.setHours(hora, minuto, 0, 0);
  
  // Si ya pasó el horario de hoy, programar para mañana
  if (limaTime >= objetivo) {
    objetivo.setDate(objetivo.getDate() + 1);
  }
  
  // Calcular diferencia en milisegundos
  const diferencia = objetivo.getTime() - limaTime.getTime();
  
  const horarioFormateado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
  logger.info(`Próxima ejecución de marcado de ausentes (${horarioFormateado}) programada para: ${objetivo.toISOString()} (en ${Math.round(diferencia / 1000 / 60)} minutos)`);
  
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
  
  // Configuración de horarios para marcado de ausentes
  // Formato: { hora, minuto, crearSiNoExiste }
  const horariosActualizacion = [
    { hora: 10, minuto: 0, crearSiNoExiste: false },  // 10:00 AM - Solo actualizar
    { hora: 12, minuto: 0, crearSiNoExiste: false },  // 12:00 PM - Solo actualizar
    { hora: 17, minuto: 0, crearSiNoExiste: false },  // 5:00 PM - Solo actualizar
    { hora: 23, minuto: 59, crearSiNoExiste: true }   // 11:59 PM - Crear y actualizar
  ];
  
  /**
   * Programar una ejecución de marcado de ausentes para un horario específico
   * @param {Object} config - Configuración del horario { hora, minuto, crearSiNoExiste }
   */
  const programarMarcadoParaHorario = (config) => {
    const { hora, minuto, crearSiNoExiste } = config;
    const horarioFormateado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
    
    const ejecutarYReprogramar = () => {
      // Ejecutar el marcado de ausentes
      ejecutarMarcadoAusentes(crearSiNoExiste);
      
      // Reprogramar para el mismo horario del día siguiente (24 horas después)
      const tiempoHastaProximaEjecucion = calcularTiempoHasta(hora, minuto);
      setTimeout(ejecutarYReprogramar, tiempoHastaProximaEjecucion);
    };
    
    // Calcular tiempo hasta la primera ejecución
    const tiempoHastaPrimeraEjecucion = calcularTiempoHasta(hora, minuto);
    setTimeout(ejecutarYReprogramar, tiempoHastaPrimeraEjecucion);
    
    const modoOperacion = crearSiNoExiste ? 'crear y actualizar' : 'solo actualizar';
    logger.info(`Tarea programada de marcado automático de ausentes configurada para ${horarioFormateado} (modo: ${modoOperacion})`);
  };
  
  /**
   * Verificar y crear registros de asistencia del día si es necesario
   * Solo crea registros si ya pasaron las 10:00 AM y no existen registros
   */
  const verificarYCrearRegistrosDiarios = async () => {
    try {
      // Obtener hora actual en zona horaria Lima
      const ahora = new Date();
      const limaOffset = -5 * 60; // -5 horas en minutos
      const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
      const limaTime = new Date(utcTime + (limaOffset * 60000));
      
      const horaActual = limaTime.getHours();
      const minutoActual = limaTime.getMinutes();
      const horaFormateada = `${horaActual.toString().padStart(2, '0')}:${minutoActual.toString().padStart(2, '0')}`;
      
      logger.info(`Verificando registros de asistencia del día... (Hora actual: ${horaFormateada})`);
      
      // Solo crear registros si ya pasaron las 10:00 AM
      if (horaActual < 10) {
        logger.info('Hora actual antes de las 10:00 AM. No se crearán registros. Esperando ejecución programada.');
        return;
      }
      
      // Verificar si existen registros para hoy
      const fechaActual = limaTime.toISOString().split('T')[0];
      const repository = require('./src/api/asistencia-personal/asistenciapersonal.repository');
      const verificacion = await repository.verificarRegistrosDelDia(fechaActual);
      
      logger.info(`Registros encontrados: ${verificacion.totalRegistros}/${verificacion.totalPersonalActivo} (${verificacion.porcentaje}%)`);
      
      // Si no hay registros o hay muy pocos (menos del 10%), crear registros base
      if (verificacion.necesitaCreacion || verificacion.porcentaje < 10) {
        logger.info('No se encontraron suficientes registros. Creando registros base...');
        await ejecutarMarcadoAusentes(true); // true = crear registros nuevos
        logger.info('Registros base creados exitosamente.');
      } else {
        logger.info('Ya existen registros suficientes. No se requiere creación inicial.');
      }
      
    } catch (error) {
      logger.error('Error verificando y creando registros diarios:', error);
      // No lanzar error para no bloquear el inicio del servidor
    }
  };
  
  /**
   * Programar todos los horarios de marcado de ausentes
   */
  const programarMarcadosMultiples = () => {
    horariosActualizacion.forEach(config => {
      programarMarcadoParaHorario(config);
    });
  };
  
  // Verificar y crear registros del día si es necesario (solo después de las 10:00 AM)
  verificarYCrearRegistrosDiarios().then(() => {
    // Después de verificar, programar los horarios múltiples
    programarMarcadosMultiples();
    logger.info(`Sistema de marcado automático de ausentes iniciado con ${horariosActualizacion.length} horarios configurados`);
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
