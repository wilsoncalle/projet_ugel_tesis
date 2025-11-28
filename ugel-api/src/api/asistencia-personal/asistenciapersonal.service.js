/**
 * Servicio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./asistenciapersonal.repository');
const personalRepository = require('../personal/personal.repository');
const papeletasRepository = require('../papeletas-salida/papeletassalida.repository');
const asistenciaConfigService = require('../asistencia-config/asistencia-config.service');
const { nowLima, toLimaDateYYYYMMDD } = require('../../utils/fechas');
const logger = require('../../utils/logger');
const { AppError } = require('../../middleware/errorHandler');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { getTheme } = require('../../config/exportStyles');
const config = require('../../config');

// Estados de presencia válidos
const VALID_PRESENCE_STATES = ['Presente', 'Tardanza', 'Ausente', 'Permiso', 'Comisión'];

// Convierte HH:MM:SS a minutos absolutos
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  return (h * 60) + m + Math.floor(s / 60);
};

/**
 * Obtener registros de asistencia con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Registros de asistencia y datos de paginación
 */
const getAllAsistencias = async (options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    q = '',
    fecha,
    fechaInicio,
    fechaFin,
    personalId,
    estadoPresencia
  } = options;
  
  try {
    // Obtener asistencias con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      fecha,
      fechaInicio,
      fechaFin,
      personalId: personalId ? parseInt(personalId) : undefined,
      estadoPresencia
    });
    
    // Formatear respuesta
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia:', error);
    throw error;
  }
};

/**
 * Obtener registros de asistencia del día actual
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Registros de asistencia del día y datos de paginación
 */
const getAsistenciasHoy = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  
  try {
    // Obtener fecha actual en formato YYYY-MM-DD (Lima)
    const { fecha: hoy } = nowLima();
    
    // Obtener asistencias del día con paginación
    const result = await repository.findAll({
      page,
      limit,
      search: q,
      fecha: hoy
    });
    
    // Formatear respuesta
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia del día:', error);
    throw error;
  }
};

/**
 * Obtener resumen mensual de asistencia del personal logueado
 * @param {number} personalId
 * @param {Object} options { anio, mes }
 */
const getMiResumen = async (personalId, { anio, mes }) => {
  try {
    const year = parseInt(anio, 10) || new Date().getFullYear();
    const month = parseInt(mes, 10) || new Date().getMonth() + 1;

    // Configuración efectiva (global o por personal)
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);

    const diasToleranciaTotal =
      configAsistencia?.dias_tolerancia_por_mes ??
      configAsistencia?.dias_tolerancia_mes ??
      10;

    const horaEntradaRef = configAsistencia?.hora_entrada || '09:00:00';
    const fechaInicioConfig = configAsistencia?.aplica_desde || null;

    const diasToleranciaUsados = await repository.countDiasToleranciaUsados(
      personalId,
      month,
      year,
      horaEntradaRef,
      fechaInicioConfig
    );

    const diasToleranciaRestantes = Math.max(
      diasToleranciaTotal - diasToleranciaUsados,
      0
    );

    const resumenDB = await repository.getResumenMensualPersonal(
      personalId,
      year,
      month
    );

    return {
      diasToleranciaTotal,
      diasToleranciaUsados,
      diasToleranciaRestantes,
      presentes: parseInt(resumenDB.presentes || 0, 10),
      tardanzas: parseInt(resumenDB.tardanzas || 0, 10),
      ausentes: parseInt(resumenDB.ausentes || 0, 10),
      permisos: parseInt(resumenDB.permisos || 0, 10),
      justificadas: parseInt(resumenDB.justificadas || 0, 10),
      minutosTardanza: parseInt(resumenDB.minutos_tardanza_total || 0, 10),
    };
  } catch (error) {
    logger.error('Error obteniendo resumen mensual de asistencia personal:', error);
    throw error;
  }
};

/**
 * Obtener asistencias mensuales de un personal (Mi Asistencia) con paginación
 * @param {number} personalId
 * @param {Object} options { anio, mes, page, limit }
 */
const getMiAsistencia = async (personalId, options = {}) => {
  try {
    const year = parseInt(options.anio, 10) || new Date().getFullYear();
    const month = parseInt(options.mes, 10) || new Date().getMonth() + 1;
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 15;

    const monthStr = String(month).padStart(2, '0');
    const firstDay = `${year}-${monthStr}-01`;
    const lastDayDate = new Date(year, month, 0); // día 0 del mes siguiente = último día
    const lastDayStr = String(lastDayDate.getDate()).padStart(2, '0');
    let lastDay = `${year}-${monthStr}-${lastDayStr}`;

    // Validar que no se muestren días futuros
    const { fecha: hoyLima } = nowLima();
    if (lastDay > hoyLima) {
      lastDay = hoyLima;
    }

    // Usamos findAll con fechaInicio/fechaFin y personalId
    const result = await repository.findAll({
      page,
      limit,
      fechaInicio: firstDay,
      fechaFin: lastDay,
      personalId,
    });

    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
  } catch (error) {
    logger.error('Error obteniendo asistencias mensuales del personal:', error);
    throw error;
  }
};

/**
 * Obtener registro de asistencia por ID
 * @param {number} id - ID del registro de asistencia
 * @returns {Object} Registro de asistencia encontrado
 */
const getAsistenciaById = async (id) => {
  try {
    const asistencia = await repository.findById(id);
    
    if (!asistencia) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }
    
    return asistencia;
    
  } catch (error) {
    logger.error(`Error obteniendo registro de asistencia ID ${id}:`, error);
    throw error;
  }
};

/**
 * Determinar estado de presencia según la hora de ingreso
 * IMPORTANTE: Esta función SOLO debe llamarse cuando SÍ hay una horaIngreso.
 * El estado "Ausente" se asigna al final del día por proceso automático.
 * @param {string} horaIngreso - Hora en formato HH:MM:SS (debe existir)
 * @returns {string} Estado de presencia: 'Presente' o 'Tardanza'
 */
const determinarEstadoPresencia = (horaIngreso) => {
  // Si no hay horaIngreso, no debería llamarse a esta función
  // Pero por seguridad, retornamos 'Presente' como fallback
  if (!horaIngreso) {
    logger.warn('determinarEstadoPresencia llamada sin horaIngreso. Retornando Presente por defecto.');
    return 'Presente';
  }
  
  // Separar la hora en componentes
  const partesHora = horaIngreso.split(':');
  if (partesHora.length < 2) {
    return 'Presente'; // Por defecto si no se puede parsear
  }
  
  const horas = parseInt(partesHora[0], 10);
  const minutos = parseInt(partesHora[1], 10);
  
  // Validar que sean números válidos
  if (isNaN(horas) || isNaN(minutos)) {
    return 'Presente'; // Por defecto si no son números válidos
  }
  
  // Convertir a minutos totales desde medianoche para comparar
  const minutosTotales = horas * 60 + minutos;
  const limiteMinutos = 9 * 60 + 15; // 9:15 = 555 minutos
  
  // Si llega a las 9:15 o antes → Presente
  // Si llega después de las 9:15 → Tardanza (sin importar qué tan tarde sea)
  if (minutosTotales <= limiteMinutos) {
    return 'Presente';
  } else {
    return 'Tardanza';
  }
};

/**
 * Registrar ingreso de personal
 * @param {number} personalId - ID del personal
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia creado o actualizado
 */
const registrarIngreso = async (personalId, usuarioId) => {
  try {
    // 1. Verificar personal
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    if (!personal.activo) {
      throw new AppError('Personal inactivo', 400);
    }
    
    // 2. Obtener fecha/hora actual (Lima)
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    
    // 3. Obtener Configuración Efectiva
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    
    // Valores de configuración
    const minutosToleranciaDia = Number(configAsistencia?.minutos_tolerancia_por_dia ?? configAsistencia?.minutos_tolerancia_dia ?? 10);
    const diasToleranciaMes = Number(configAsistencia?.dias_tolerancia_por_mes ?? configAsistencia?.dias_tolerancia_mes ?? 10);
    const horaEntradaConfig = configAsistencia?.hora_entrada || '09:00:00';
    
    // NUEVO: Obtenemos la fecha de inicio de la configuración
    const fechaInicioConfig = configAsistencia?.aplica_desde || null;

    // 4. Calcular diferencia de minutos
    const minutosLlegada = timeToMinutes(horaActual);
    const minutosEntrada = timeToMinutes(horaEntradaConfig);
    const diferenciaMinutos = minutosLlegada - minutosEntrada;

    // 5. Verificar Saldo de Tolerancia
    // PASAMOS fechaInicioConfig para que el conteo respete el "aplica_desde"
    const fechaObj = new Date(fechaActual);
    const diasUsados = await repository.countDiasToleranciaUsados(
      personalId,
      fechaObj.getMonth() + 1,
      fechaObj.getFullYear(),
      horaEntradaConfig,
      fechaInicioConfig
    );
    
    const tieneSaldoTolerancia = diasUsados < diasToleranciaMes;

    const papeletaActiva = await papeletasRepository.encontrarPapeletaActivaPorFecha(personalId, fechaActual);
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    let minutosTardanzaCalculados = 0;

    // 6. Validaciones de registro existente
    if (registroExistente && registroExistente.hora_ingreso) {
        // Ya tiene ingreso registrado
        if (papeletaActiva && papeletaActiva.estado === 'EN_CURSO') {
            // Es retorno de papeleta
            const retornoProg = new Date(papeletaActiva.fecha_hora_retorno_programada);
            
            // Ajuste básico para obtener minutos del día de la fecha programada
            const minProg = retornoProg.getHours() * 60 + retornoProg.getMinutes();
            
            const diff = minutosLlegada - minProg;
            if (diff > 0) {
                minutosTardanzaCalculados = diff;
            }
            
            // Actualizar papeleta marcando retorno real
            await papeletasRepository.registrarRetorno(papeletaActiva.id, usuarioId);
            
            // Para retorno de papeleta, actualizamos el registro existente pero mantenemos el estado original si era Presente/Tardanza
            // O recalculamos? Por ahora solo actualizamos la hora de retorno si es necesario, pero aquí estamos en registrarIngreso.
            // Si es retorno de papeleta, actualizamos el registro de asistencia?
            // El código original actualizaba el ingreso. Asumimos que se mantiene esa lógica.
            
            const nuevoEstado = minutosTardanzaCalculados > 0 ? 'Tardanza' : 'Presente';
            const totalMinutosTardanza = (registroExistente.minutos_tardanza || 0) + minutosTardanzaCalculados;
            
            const asistencia = await repository.updateIngreso(
                registroExistente.id, 
                registroExistente.hora_ingreso, // No cambiamos la hora de ingreso original
                nuevoEstado, // Podría cambiar si llegó tarde del permiso
                usuarioId,
                totalMinutosTardanza
            );
            logger.info(`Retorno de papeleta registrado para personal ID ${personalId}`);
            return asistencia;

        } else {
            // Ya tiene asistencia y no es papeleta -> Bloquear
            const nombreCompleto = `${personal.nombres} ${personal.apellidos}`;
            const estado = registroExistente.estado_presencia;
            return {
                alreadyRegistered: true,
                message: `${nombreCompleto} ya tiene asistencia registrada hoy - Estado: ${estado}`
            };
        }
    }

    // 7. DETERMINAR ESTADO Y MINUTOS (Para nuevo ingreso)
    let nuevoEstado = 'Presente';
    let minutosAImputar = 0;

    if (diferenciaMinutos > 0) {
      if (tieneSaldoTolerancia) {
        // Aún tiene saldo: Aplicamos beneficios
        if (diferenciaMinutos <= minutosToleranciaDia) {
          // Dentro del rango (Ej. 9:05 vs 9:10): Gratis
          nuevoEstado = 'Presente';
          minutosAImputar = 0;
        } else {
          // Fuera del rango (Ej. 9:12 vs 9:10): Paga diferencia
          nuevoEstado = 'Tardanza';
          minutosAImputar = diferenciaMinutos - minutosToleranciaDia;
        }
      } else {
        // Saldo agotado: Paga todo
        nuevoEstado = 'Tardanza';
        minutosAImputar = diferenciaMinutos;
      }
    } else {
      // Llegada temprano/puntual
      nuevoEstado = 'Presente';
      minutosAImputar = 0;
    }
    
    // Si ya estaba en Tardanza (por alguna razón previa), se mantiene
    if (registroExistente && registroExistente.estado_presencia === 'Tardanza') {
        nuevoEstado = 'Tardanza';
    }

    // 8. Guardar
    if (registroExistente) {
        const asistencia = await repository.updateIngreso(
            registroExistente.id, 
            horaActual, 
            nuevoEstado, 
            usuarioId,
            minutosAImputar
        );
        logger.info(`Ingreso actualizado para personal ID ${personalId} - Estado: ${nuevoEstado}, Tardanza: ${minutosAImputar} min`);
        return asistencia;
    } else {
        const asistencia = await repository.create({
            personal_id: personalId,
            fecha: fechaActual,
            hora_ingreso: horaActual,
            hora_salida: null,
            estado_presencia: nuevoEstado,
            usuario_registro_id: usuarioId,
            minutos_tardanza: minutosAImputar
        });
        logger.info(`Ingreso registrado para personal ID ${personalId} - Estado: ${nuevoEstado}, Tardanza: ${minutosAImputar} min`);
        return asistencia;
    }
    
  } catch (error) {
    logger.error(`Error registrando ingreso para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Registrar salida de personal
 * @param {number} personalId - ID del personal
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia actualizado
 */
const registrarSalida = async (personalId, usuarioId) => {
  try {
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Obtener fecha y hora actual en zona horaria de Lima (UTC-5)
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    
    // Verificar si existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (!registroExistente) {
      throw new AppError('No hay un registro de ingreso para hoy', 400);
    }
    
    // Si ya existe un registro con hora de salida, no permitir registrar nuevamente
    if (registroExistente.hora_salida) {
      throw new AppError('El personal ya tiene una salida registrada para hoy', 400);
    }
    
    // Actualizar el registro con la hora de salida
    const asistencia = await repository.updateSalida(registroExistente.id, horaActual);
    
    logger.info(`Salida registrada para personal ID ${personalId} a las ${horaActual}`);
    
    return asistencia;
    
  } catch (error) {
    logger.error(`Error registrando salida para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Registrar estado de presencia (presente, ausente, etc.)
 * @param {number} personalId - ID del personal
 * @param {string} estadoPresencia - Estado de presencia
 * @param {number} usuarioId - ID del usuario que registra
 * @returns {Object} Registro de asistencia creado o actualizado
 */
const registrarEstadoPresencia = async (personalId, estadoPresencia, usuarioId) => {
  try {
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    
    // Verificar que el estado de presencia sea válido
    if (!VALID_PRESENCE_STATES.includes(estadoPresencia)) {
      throw new AppError(`Estado de presencia inválido. Estados válidos: ${VALID_PRESENCE_STATES.join(', ')}`, 400);
    }
    
    // Obtener fecha actual en formato YYYY-MM-DD (Lima)
    const { fecha: fechaActual } = nowLima();
    
    // Verificar si ya existe un registro para este personal en la fecha actual
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    if (registroExistente) {
      // Actualizar el registro existente
      const asistencia = await repository.updateEstadoPresencia(registroExistente.id, estadoPresencia, usuarioId);
      
      logger.info(`Estado de presencia actualizado a '${estadoPresencia}' para personal ID ${personalId}`);
      
      return asistencia;
    } else {
      // Crear un nuevo registro
      const asistencia = await repository.create({
        personal_id: personalId,
        fecha: fechaActual,
        hora_ingreso: null,
        hora_salida: null,
        estado_presencia: estadoPresencia,
        usuario_registro_id: usuarioId
      });
      
      logger.info(`Estado de presencia '${estadoPresencia}' registrado para personal ID ${personalId}`);
      
      return asistencia;
    }
    
  } catch (error) {
    logger.error(`Error registrando estado de presencia para personal ID ${personalId}:`, error);
    throw error;
  }
};

/**
 * Marcar como ausentes a todos los personal activos que no tienen horaIngreso registrada
 * Esta función debe ejecutarse al final del día (ej. 23:59) para marcar ausentes del día anterior
 * @param {string} fecha - Fecha en formato YYYY-MM-DD (opcional, por defecto usa el día anterior)
 * @param {number} usuarioSistemaId - ID del usuario del sistema que ejecuta la acción
 * @param {boolean} crearSiNoExiste - Si es true, crea registros nuevos para personal sin asistencia. Si es false, solo actualiza existentes (default: true)
 * @returns {Object} Resultado con cantidad de registros actualizados
 */
const marcarAusentesAlFinalDelDia = async (
  fecha = null,
  usuarioSistemaId = config.systemUserId,
  crearSiNoExiste = true
) => {
  try {
    // Si no se proporciona fecha, usar el día anterior (en zona horaria Lima)
    let fechaProcesar = fecha;
    
    if (!fechaProcesar) {
      const { fechaHora } = nowLima();
      const limaAyer = new Date(fechaHora);
      limaAyer.setDate(limaAyer.getDate() - 1);
      fechaProcesar = limaAyer.toISOString().split('T')[0];
    }
    
    const modoOperacion = crearSiNoExiste ? 'crear y actualizar' : 'solo actualizar';
    logger.info(`Iniciando marcado de ausentes para fecha: ${fechaProcesar} (modo: ${modoOperacion})`);
    
    const resultado = await repository.marcarAusentesAlFinalDelDia(
      fechaProcesar,
      usuarioSistemaId,
      crearSiNoExiste
    );
    
    logger.info(
      `Marcado de ausentes completado: ${resultado.total} registros procesados ` +
      `(${resultado.registrosCreados} creados, ${resultado.registrosActualizados} actualizados)` 
    );
    
    return resultado;
    
  } catch (error) {
    logger.error('Error marcando ausentes al final del día:', error);
    throw error;
  }
};

/**
 * Marcado reactivo de ausentes según hora_entrada + tolerancia.
 * Se ejecuta de manera periódica (ej. cada pocos minutos) y evita usar fecha UTC.
 */
const marcarAusentesProgresivo = async (usuarioSistemaId = config.systemUserId) => {
  const { fecha: hoy, hora, fechaHora } = nowLima();
  const minutosAhora = timeToMinutes(hora);
  const mes = fechaHora.getMonth() + 1;
  const anio = fechaHora.getFullYear();

  // Traer personal activo en un batch razonable (evita cargas masivas)
  const { personal = [] } = await personalRepository.findAll({
    page: 1,
    limit: 5000,
    activo: true,
    fecha: hoy
  });

  let procesados = 0;
  let ausentes = 0;
  let permisos = 0;

  for (const p of personal) {
    const personalId = p.id;

    // Config efectiva (personal o global)
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    const minutosEntrada = timeToMinutes(configAsistencia?.hora_entrada || '09:00:00');
    const minutosTolerancia = Number(configAsistencia?.minutos_tolerancia_por_dia ?? configAsistencia?.minutos_tolerancia_dia ?? 0);
    const diasToleranciaMes = Number(configAsistencia?.dias_tolerancia_por_mes ?? configAsistencia?.dias_tolerancia_mes ?? 0);

    // Antes de la hora de entrada: no hacer nada
    if (minutosAhora < minutosEntrada) continue;

    const registroHoy = await repository.findByPersonalAndFecha(personalId, hoy);

    // Si ya tiene un estado distinto a Ausente, no tocar
    if (registroHoy && registroHoy.estado_presencia && registroHoy.estado_presencia !== 'Ausente') {
      procesados++;
      continue;
    }

    // TODO: Integrar detección real de papeleta desde Mongo (por DNI/personalId)
    // Por ahora, asumimos que no hay papeleta activa.

    // Ventana de tolerancia por minutos: esperar antes de marcar ausencia
    const minutosLimite = minutosEntrada + minutosTolerancia;
    if (minutosAhora < minutosLimite) {
      continue;
    }

    // Evaluar saldo de días de tolerancia usados en el mes
    const diasUsados = await repository.countDiasToleranciaUsados(personalId, mes, anio);
    const sinSaldoTolerancia = diasUsados >= diasToleranciaMes;

    // Marcar ausencia si no hay registro o está en Ausente
    if (!registroHoy) {
      await repository.create({
        personal_id: personalId,
        fecha: hoy,
        hora_ingreso: null,
        hora_salida: null,
        estado_presencia: 'Ausente',
        usuario_registro_id: usuarioSistemaId
      });
      ausentes++;
    } else if (registroHoy.estado_presencia !== 'Ausente') {
      await repository.updateEstadoPresencia(registroHoy.id, 'Ausente', usuarioSistemaId);
      ausentes++;
    }

    // Nota: sinSaldoTolerancia queda disponible para evoluciones (alertas, etc.)
    if (sinSaldoTolerancia) {
      // No se registra nada extra; el estado ya quedó en Ausente.
    }

    procesados++;
  }

  return { fecha: hoy, procesados, ausentes, permisos };
};

/**
 * Obtener estadísticas de asistencia
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de asistencia
 */
const getEstadisticas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticas(fechaInicio, fechaFin);
    return stats;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de asistencia:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de total de asistencias
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de total de asistencias
 */
const getEstadisticasTotales = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasTotales(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas totales:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de puntualidad y tardanzas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de puntualidad
 */
const getEstadisticasPuntualidad = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasPuntualidad(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas de puntualidad:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de ausencias y justificaciones
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de ausencias
 */
const getEstadisticasAusencias = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasAusencias(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas de salidas:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por áreas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas por áreas
 */
const getEstadisticasAreas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticasAreas(fechaInicio, fechaFin);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas por áreas:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas por personal
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas por personal
 */
const getEstadisticasPersonal = async (options = {}) => {
  const { fechaInicio, fechaFin, personalId } = options;
  
  try {
    const stats = await repository.getEstadisticasPersonal(fechaInicio, fechaFin, personalId);
    return stats;
  } catch (error) {
    logger.error('Error obteniendo estadísticas por personal:', error);
    throw error;
  }
};

/**
 * Obtener detalle completo de un personal
 * @param {number} personalId - ID del personal
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Detalle del personal
 */
const getPersonalDetalle = async (personalId, options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const detalle = await repository.getPersonalDetalle(personalId, fechaInicio, fechaFin);
    return detalle;
  } catch (error) {
    logger.error('Error obteniendo detalle del personal:', error);
    throw error;
  }
};

/**
 * Exportar asistencias a Excel
 * @param {Object} filtros - Filtros para la consulta
 * @returns {Buffer} Buffer del archivo Excel
 */
const exportarAExcel = async (filtros = {}, themeName = 'corporate') => {
  try {
    const theme = getTheme(themeName);
    const styles = theme.excel;
    
    // Obtener todos los datos sin paginación
    const result = await repository.findAll({
      search: filtros.q || '',
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      personalId: filtros.personalId ? parseInt(filtros.personalId) : undefined,
      estadoPresencia: filtros.estadoPresencia
    });
    
    const asistencias = result.asistencias;
    
    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Control de Acceso UGEL';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Historial de Asistencias');
    
    // Definir las columnas usando configuración
    worksheet.columns = [
      { header: 'N°', key: 'numero', width: styles.dimensions.columnWidths.numero },
      { header: 'Personal', key: 'personal', width: styles.dimensions.columnWidths.visitante },
      { header: 'Área', key: 'area', width: styles.dimensions.columnWidths.lugar },
      { header: 'Cargo', key: 'cargo', width: styles.dimensions.columnWidths.cargo },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Hora Ingreso', key: 'horaIngreso', width: 15 },
      { header: 'Hora Salida', key: 'horaSalida', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Usuario Registro', key: 'usuarioRegistro', width: styles.dimensions.columnWidths.usuarioRegistro }
    ];
    
    // Estilo para la cabecera usando configuración
    const headerRow = worksheet.getRow(1);
    headerRow.font = { 
      bold: styles.fonts.header.bold,
      color: { argb: styles.colors.headerText },
      size: styles.fonts.header.size,
      name: styles.fonts.header.name
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: styles.colors.headerBackground }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = styles.dimensions.headerHeight;
    
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Agregar los datos
    asistencias.forEach((asistencia, index) => {
      const row = worksheet.addRow({
        numero: index + 1,
        personal: `${asistencia.personal_nombres} ${asistencia.personal_apellidos}`,
        area: asistencia.area_nombre || 'N/A',
        cargo: asistencia.cargo_nombre || 'N/A',
        fecha: asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-PE') : 'N/A',
        horaIngreso: asistencia.hora_ingreso || 'N/A',
        horaSalida: asistencia.hora_salida || 'Sin registro',
        estado: asistencia.estado_presencia,
        usuarioRegistro: asistencia.usuario_registro || 'N/A'
      });
      
      // Estilo alternado para las filas
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: styles.colors.alternateRow }
        };
      }
      
      // Aplicar fuente personalizada a todas las filas de datos
      row.font = { 
        name: styles.fonts.data.name,
        size: styles.fonts.data.size,
        bold: styles.fonts.data.bold,
        color: { argb: styles.colors.dataText }
      };
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: styles.colors.border } },
          left: { style: 'thin', color: { argb: styles.colors.border } },
          bottom: { style: 'thin', color: { argb: styles.colors.border } },
          right: { style: 'thin', color: { argb: styles.colors.border } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      
      row.getCell('numero').alignment = { vertical: 'middle', horizontal: 'center' };
    });
    
    // Agregar información adicional
    const footerRowNum = worksheet.rowCount + 2;
    const footerRow = worksheet.getRow(footerRowNum);
    footerRow.getCell(1).value = `Total de registros: ${asistencias.length}`;
    footerRow.getCell(1).font = { bold: true, size: 10 };
    
    const dateRow = worksheet.getRow(footerRowNum + 1);
    dateRow.getCell(1).value = `Generado el: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`;
    dateRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
    
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
    
  } catch (error) {
    logger.error('Error exportando a Excel:', error);
    throw error;
  }
};

/**
 * Exportar asistencias a PDF
 * @param {Object} filtros - Filtros para la consulta
 * @returns {Buffer} Buffer del archivo PDF
 */
const exportarAPDF = async (filtros = {}) => {
  try {
    // Obtener todos los datos sin paginación
    const result = await repository.findAll({
      search: filtros.q || '',
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      personalId: filtros.personalId ? parseInt(filtros.personalId) : undefined,
      estadoPresencia: filtros.estadoPresencia
    }, false);
    
    const asistencias = result.asistencias;
    
    return new Promise((resolve, reject) => {
      try {
        // Crear documento PDF en orientación horizontal para más espacio
        const doc = new PDFDocument({ 
          size: 'A4',
          layout: 'landscape',
          margin: 40,
          bufferPages: true
        });
        
        const chunks = [];
        
        // Capturar el buffer
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        // Configuración de colores
        const primaryColor = '#1F2937'; // Gris oscuro
        const textColor = '#374151'; // Gris medio
        const lightGray = '#F9FAFB'; // Gris muy claro
        const accentColor = '#059669'; // Verde para acentos
        
        // Función para dibujar encabezado de página
        const drawPageHeader = () => {
          // Título principal
          doc.fontSize(20)
             .fillColor(primaryColor)
             .font('Helvetica-Bold')
             .text('HISTORIAL DE ASISTENCIAS', doc.page.margins.left, 40, { align: 'center' });
          
          // Subtítulo
          doc.fontSize(11)
             .fillColor(textColor)
             .font('Helvetica')
             .text('Sistema de Control de Acceso - UGEL Talara', doc.page.margins.left, 65, { align: 'center' });
          
          // Información de filtros
          doc.fontSize(9)
             .fillColor('#6B7280')
             .text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`, doc.page.margins.left, 85, { align: 'left' });
          
          if (filtros.fechaInicio || filtros.fechaFin) {
            let rangoText = 'Rango de fechas: ';
            if (filtros.fechaInicio) rangoText += `Desde ${filtros.fechaInicio} `;
            if (filtros.fechaFin) rangoText += `Hasta ${filtros.fechaFin}`;
            doc.text(rangoText, doc.page.margins.left, 100, { align: 'left' });
          }
          
          doc.text(`Total de registros: ${asistencias.length}`, doc.page.margins.left, 115, { align: 'left' });
          
          // Línea separadora
          doc.moveTo(doc.page.margins.left, 135)
             .lineTo(doc.page.width - doc.page.margins.right, 135)
             .stroke('#D1D5DB');
        };
        
        // Dibujar encabezado en la primera página
        drawPageHeader();
        
        // Calcular ancho total de la tabla
        const columnWidths = [30, 100, 80, 80, 60, 50, 50, 60];
        const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const tableX = doc.page.margins.left + (pageWidth - totalTableWidth) / 2;
        
        // Preparar datos para la tabla
        const table = {
          headers: [
            { label: 'N°', width: 30, align: 'center' },
            { label: 'Personal', width: 100, align: 'left' },
            { label: 'Área', width: 80, align: 'left' },
            { label: 'Cargo', width: 80, align: 'left' },
            { label: 'Fecha', width: 60, align: 'left' },
            { label: 'Ingreso', width: 50, align: 'left' },
            { label: 'Salida', width: 50, align: 'left' },
            { label: 'Estado', width: 60, align: 'left' }
          ],
          rows: asistencias.map((asistencia, index) => [
            index + 1,
            `${asistencia.personal_nombres} ${asistencia.personal_apellidos}`.substring(0, 30),
            (asistencia.area_nombre || 'N/A').substring(0, 22),
            (asistencia.cargo_nombre || 'N/A').substring(0, 22),
            asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-PE') : 'N/A',
            asistencia.hora_ingreso || 'N/A',
            asistencia.hora_salida || 'Sin registro',
            asistencia.estado_presencia
          ])
        };
        
        // Dibujar la tabla usando pdfkit-table
        doc.table(table, {
          x: tableX,
          y: 150,
          width: totalTableWidth,
          padding: 5,
          columnSpacing: 5,
          prepareHeader: () => {
            if (doc.y > 150) {
              doc.addPage();
              drawPageHeader();
              doc.y = 150;
            }
            doc.font('Helvetica-Bold').fontSize(9).fillColor('#222831');
          },
          prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            const {x, y, width, height} = rectRow;
            
            // Dibujar fondo SOLO en la primera columna para evitar acumulación
            if (indexRow % 2 === 0 && indexColumn === 0) {
              doc.save();
              doc.rect(x, y, width, height)
                 .fill(lightGray);
              doc.restore();
            }
            
            // Resetear opacidad SIEMPRE antes de configurar el texto
            doc.fillOpacity(1)
               .strokeOpacity(1)
               .fillColor(textColor)
               .font('Helvetica')
               .fontSize(8);
            
            // Bordes
            doc.lineWidth(0.5)
               .strokeColor('#D1D5DB')
               .moveTo(x, y)
               .lineTo(x + width, y)
               .stroke();
            
            if (indexColumn === 0) {
              doc.moveTo(x, y)
                 .lineTo(x, y + height)
                 .stroke();
            }
            
            doc.moveTo(x + width, y)
               .lineTo(x + width, y + height)
               .stroke();
            
            if (indexColumn === table.headers.length - 1) {
              doc.moveTo(x + width, y + height)
                 .lineTo(x, y + height)
                 .stroke();
            }
          }
        });
        
        // Agregar números de página en el encabezado
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(9)
             .fillColor('#6B7280')
             .text(`Página ${i + 1} de ${range.count}`, doc.page.width - doc.page.margins.right - 100, 40, { align: 'right' });
        }
        
        doc.end();
        
      } catch (error) {
        reject(error);
      }
    });
    
  } catch (error) {
    logger.error('Error exportando a PDF:', error);
    throw error;
  }
};

module.exports = {
  getAllAsistencias,
  getAsistenciasHoy,
  getAsistenciaById,
  registrarIngreso,
  registrarSalida,
  registrarEstadoPresencia,
  marcarAusentesAlFinalDelDia,
  getEstadisticas,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticasPersonal,
  getPersonalDetalle,
  exportarAExcel,
  exportarAPDF,
  getMiResumen,
  getMiAsistencia,
  marcarAusentesProgresivo,
  justificarAsistencia
};

/**
 * Justificar inasistencia o tardanza
 * @param {number} asistenciaId - ID de la asistencia
 * @param {string} motivo - Motivo de la justificación
 * @param {Object} archivo - Archivo adjunto (opcional)
 * @param {number} usuarioId - ID del usuario que registra
 */
async function justificarAsistencia(asistenciaId, motivo, archivo, usuarioId) {
  try {
    const asistencia = await repository.findById(asistenciaId);
    if (!asistencia) {
      throw new AppError('Registro de asistencia no encontrado', 404);
    }

    let evidenciaUrl = null;
    if (archivo) {
      // En un entorno real, aquí subiríamos el archivo a S3/Cloudinary/Local
      // Por ahora, simulamos la ruta
      evidenciaUrl = `/uploads/justificaciones/${archivo.filename}`;
    }

    // Crear la justificación
    await repository.createJustificacion({
      control_asistencia_id: asistenciaId,
      motivo,
      evidencia_url: evidenciaUrl,
      estado: 'PENDIENTE',
      usuario_solicitante_id: usuarioId
    });

    // Opcional: Actualizar estado de la asistencia a algo que indique "En proceso"
    // Por ahora no cambiamos el estado de presencia hasta que RRHH apruebe.
    // Pero podríamos tener un estado 'Pendiente Justificación' si el sistema lo soporta.
    
    return { message: 'Justificación enviada correctamente' };
  } catch (error) {
    logger.error('Error justificando asistencia:', error);
    throw error;
  }
};
