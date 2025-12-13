/**
 * Servicio para gestión de asistencia de personal
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./asistenciapersonal.repository');
const personalRepository = require('../personal/personal.repository');
const papeletasRepository = require('../papeletas-salida/papeletassalida.repository');
const asistenciaConfigService = require('../asistencia-config/asistencia-config.service');
const mongoService = require('../external/mongoService'); 
const { nowLima } = require('../../utils/fechas');
const logger = require('../../utils/logger');
const { AppError } = require('../../middleware/errorHandler');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { getTheme } = require('../../config/exportStyles');
const config = require('../../config');

const VALID_PRESENCE_STATES = ['Presente', 'Tardanza', 'Ausente', 'Permiso', 'Comisión', 'Justificada'];

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
  return (h * 60) + m + Math.floor(s / 60);
};

// [NUEVO] Utilidad para extraer YYYY-MM-DD local sin desfases UTC
const getFechaLocalISO = (fechaInput) => {
  if (!fechaInput) return null;
  // Si es string YYYY-MM-DD
  if (typeof fechaInput === 'string' && fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return fechaInput;
  }
  // Si es string ISO completo o Date
  const fecha = new Date(fechaInput);
  // Ajuste manual simple para Lima (UTC-5) si el input fuera UTC puro
  // Pero generalmente queremos simplemente la parte de la fecha
  // Usamos split para evitar conversiones raras si ya viene como string ISO
  if (typeof fechaInput === 'string') return fechaInput.split('T')[0];
  
  // Si es objeto Date, asumimos que se guardó correctamente. 
  // Para comparar fechas sin horas, usamos toISOString que es estándar.
  return fecha.toISOString().split('T')[0];
};

/**
 * [CORREGIDO] Función robusta para integrar papeletas
 */
const integrarPapeletasEnAsistencias = async (asistencias, fechaInicio, fechaFin) => {
  try {
    if (!asistencias || asistencias.length === 0) return asistencias;

    // Obtener papeletas. Usamos fechas de los datos si no se proveen rangos.
    const fInicio = fechaInicio || asistencias[asistencias.length - 1].fecha;
    const fFin = fechaFin || asistencias[0].fecha;

    const papeletas = await mongoService.getPapeletasAprobadasExternas({ 
      fechaInicio: fInicio, 
      fechaFin: fFin 
    });

    if (!papeletas || papeletas.length === 0) return asistencias;

    return asistencias.map(asistencia => {
      // Intentamos corregir Ausente, Falta, o registros vacíos
      const estadosSusceptibles = ['Ausente', 'Falta', null, undefined, '', 'Sin marca'];
      
      if (estadosSusceptibles.includes(asistencia.estado_presencia)) {
        
        const fechaAsistenciaStr = getFechaLocalISO(asistencia.fecha);
        
        // Normalización de nombres para comparación robusta
        const nombreSQL = `${asistencia.personal_nombres || ''} ${asistencia.personal_apellidos || ''}`
          .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        
        const papeletaActiva = papeletas.find(p => {
            // 1. Verificar Identidad
            let esMismopersonal = false;
            
            // Prioridad: DNI
            if (asistencia.personal_numero_documento && p.solicitante_numero_documento) {
                esMismopersonal = p.solicitante_numero_documento === asistencia.personal_numero_documento;
            } 
            
            // Fallback: Nombre (si DNI falla o no existe)
            if (!esMismopersonal) {
                const nombreMongo = `${p.solicitante_nombres || ''} ${p.solicitante_apellidos || ''}`
                  .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                
                // Coincidencia parcial robusta
                esMismopersonal = nombreSQL.includes(nombreMongo) || nombreMongo.includes(nombreSQL);
            }
            
            if (!esMismopersonal) return false;

            // 2. Verificar Fechas
            const inicioStr = getFechaLocalISO(p.fecha_hora_salida_programada);
            const finStr = getFechaLocalISO(p.fecha_hora_retorno_programada);

            // Comparación de cadenas YYYY-MM-DD
            return fechaAsistenciaStr >= inicioStr && fechaAsistenciaStr <= finStr;
        });

        if (papeletaActiva) {
          const esComision = papeletaActiva.nombre_motivo?.toLowerCase().includes('comis');
          return {
            ...asistencia,
            estado_presencia: esComision ? 'Comisión' : 'Permiso', // Esto se mostrará en Historial/Hoy
            observacion: `Papeleta: ${papeletaActiva.codigo_papeleta}`,
            justificacion_estado: 'APROBADO',
            es_papeleta_externa: true
          };
        }
      }
      return asistencia;
    });
  } catch (error) {
    logger.error('Error integrando papeletas externas:', error);
    return asistencias;
  }
};

const getAllAsistencias = async (options = {}) => {
  const { page = 1, limit = 20, q = '', fecha, fechaInicio, fechaFin, personalId, estadoPresencia } = options;
  try {
    const result = await repository.findAll({
      page, limit, search: q, fecha, fechaInicio, fechaFin,
      personalId: personalId ? parseInt(personalId) : undefined,
      estadoPresencia
    });
    
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: result.total, totalPages: Math.ceil(result.total / limit)
      }
    };
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia:', error);
    throw error;
  }
};

const getAsistenciasHoy = async (options = {}) => {
  const { page = 1, limit = 20, q = '' } = options;
  try {
    const { fecha: hoy } = nowLima();
    const result = await repository.findAll({ page, limit, search: q, fecha: hoy });
    
    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: result.total, totalPages: Math.ceil(result.total / limit)
      }
    };
  } catch (error) {
    logger.error('Error obteniendo registros de asistencia del día:', error);
    throw error;
  }
};

const getMiResumen = async (personalId, { anio, mes }) => {
  try {
    const year = parseInt(anio, 10) || new Date().getFullYear();
    const month = parseInt(mes, 10) || new Date().getMonth() + 1;
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    
    const diasToleranciaTotal = configAsistencia?.dias_tolerancia_por_mes ?? configAsistencia?.dias_tolerancia_mes ?? 10;
    const horaEntradaRef = configAsistencia?.hora_entrada || '09:00:00';
    const fechaInicioConfig = configAsistencia?.aplica_desde || null;

    const diasToleranciaUsados = await repository.countDiasToleranciaUsados(personalId, month, year, horaEntradaRef, fechaInicioConfig);
    const diasToleranciaRestantes = Math.max(diasToleranciaTotal - diasToleranciaUsados, 0);
    const resumenDB = await repository.getResumenMensualpersonal(personalId, year, month);

    return {
      diasToleranciaTotal, diasToleranciaUsados, diasToleranciaRestantes,
      presentes: parseInt(resumenDB.presentes || 0, 10),
      tardanzas: parseInt(resumenDB.tardanzas || 0, 10),
      ausentes: parseInt(resumenDB.ausentes || 0, 10),
      permisos: parseInt(resumenDB.permisos || 0, 10),
      justificadas: parseInt(resumenDB.justificadas || 0, 10),
      minutosTardanza: parseInt(resumenDB.minutos_tardanza_total || 0, 10),
    };
  } catch (error) {
    logger.error('Error obteniendo resumen mensual:', error);
    throw error;
  }
};

const getMiAsistencia = async (personalId, options = {}) => {
  try {
    const year = parseInt(options.anio, 10) || new Date().getFullYear();
    const month = parseInt(options.mes, 10) || new Date().getMonth() + 1;
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 15;

    const monthStr = String(month).padStart(2, '0');
    const firstDay = `${year}-${monthStr}-01`;
    const lastDayDate = new Date(year, month, 0);
    const lastDayStr = String(lastDayDate.getDate()).padStart(2, '0');
    let lastDay = `${year}-${monthStr}-${lastDayStr}`;

    const { fecha: hoyLima } = nowLima();
    if (lastDay > hoyLima) lastDay = hoyLima;

    const result = await repository.findAll({
      page, limit, fechaInicio: firstDay, fechaFin: lastDay, personalId,
    });

    return {
      asistencias: result.asistencias,
      pagination: {
        page: parseInt(page), limit: parseInt(limit),
        total: result.total, totalPages: Math.ceil(result.total / limit)
      }
    };
  } catch (error) {
    logger.error('Error obteniendo asistencias mensuales:', error);
    throw error;
  }
};

const getAsistenciaById = async (id) => {
  try {
    const asistencia = await repository.findById(id);
    if (!asistencia) throw new AppError('Registro no encontrado', 404);
    return asistencia;
  } catch (error) {
    logger.error(`Error obteniendo asistencia ID ${id}:`, error);
    throw error;
  }
};

const registrarIngreso = async (personalId, usuarioId, offlineData = {}) => {
  try {
    const personal = await personalRepository.findById(personalId);
    if (!personal) throw new AppError('personal no encontrado', 404);
    if (!personal.activo) throw new AppError('personal inactivo', 400);
    
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    const fechaOffline = offlineData?._isOfflineSync ? offlineData.fecha : null;
    const horaOffline = offlineData?._isOfflineSync ? offlineData.hora : null;
    const fechaEvento = fechaOffline || fechaActual;
    const horaEvento = horaOffline || horaActual;

    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    
    const minutosToleranciaDia = Number(configAsistencia?.minutos_tolerancia_por_dia ?? configAsistencia?.minutos_tolerancia_dia ?? 10);
    const diasToleranciaMes = Number(configAsistencia?.dias_tolerancia_por_mes ?? configAsistencia?.dias_tolerancia_mes ?? 10);
    const horaEntradaConfig = configAsistencia?.hora_entrada || '09:00:00';
    const horaEntradaTardeConfig = configAsistencia?.hora_entrada_tarde; // Nueva config
    const fechaInicioConfig = configAsistencia?.aplica_desde || null;

    const minutosLlegada = timeToMinutes(horaEvento);
    
    // Determinar si es turno mañana o tarde
    // Heurística simple: Si la hora es después de las 13:00 (o si config tarde existe y estamos cerca), usar tarde
    let esTurnoTarde = false;
    let horaReferencia = horaEntradaConfig;
    
    if (horaEntradaTardeConfig) {
      const minutosTarde = timeToMinutes(horaEntradaTardeConfig);
      // Si la hora actual es mayor a la hora de entrada tarde - 2 horas (ej. 13:00 para entrada 15:00), asumimos tarde
      // O simplemente si es despues de las 13:00 PM (780 min)
      if (minutosLlegada > 780) { 
        esTurnoTarde = true;
        horaReferencia = horaEntradaTardeConfig;
      }
    }

    const minutosEntrada = timeToMinutes(horaReferencia);
    const diferenciaMinutos = minutosLlegada - minutosEntrada;

    const fechaObj = new Date(fechaEvento);
    const diasUsados = await repository.countDiasToleranciaUsados(personalId, fechaObj.getMonth() + 1, fechaObj.getFullYear(), horaEntradaConfig, fechaInicioConfig);
    const tieneSaldoTolerancia = diasUsados < diasToleranciaMes;

    const papeletaActiva = await papeletasRepository.encontrarPapeletaActivaPorFecha(personalId, fechaEvento);
    const registroExistente = await repository.findBypersonalAndFecha(personalId, fechaEvento);
    
    // 1. Siempre registrar movimiento
    let controlId = registroExistente?.id;
    let tipoMovimiento = 'INGRESO';
    
    // Si no existe control, lo creamos primero (INGRESO MAÑANA)
    if (!registroExistente) {
      const nuevoControl = await repository.create({
          personal_id: personalId, fecha: fechaEvento, hora_ingreso: horaEvento, hora_salida: null,
          estado_presencia: 'Presente', usuario_registro_id: usuarioId, minutos_tardanza: 0
      });
      controlId = nuevoControl.id;
      tipoMovimiento = 'INGRESO';
    } else {
      // Si ya existe, es un RETORNO de refrigerio (Turno Tarde)
      tipoMovimiento = 'RETORNO_REFRIGERIO';
    }
    
    // Validar si es turno tarde según config para observación
    esTurnoTarde = (tipoMovimiento === 'RETORNO_REFRIGERIO'); 
    
    // Registrar el movimiento en historial detallado
    await repository.createMovimiento({
      control_asistencia_id: controlId,
      tipo: tipoMovimiento,
      fecha_hora: `${fechaEvento} ${horaEvento}`,
      usuario_registro_id: usuarioId,
      observacion: esTurnoTarde ? 'Ingreso Tarde / Retorno Refrigerio' : 'Ingreso Mañana'
    });

    // 2. Lógica de Actualización de Estado / Tardanza
    let minutosTardanzaCalculados = 0;
    
    if (papeletaActiva && papeletaActiva.estado === 'EN_CURSO') {
        // Lógica de retorno de papeleta
        const retornoProg = new Date(papeletaActiva.fecha_hora_retorno_programada);
        const minProg = retornoProg.getHours() * 60 + retornoProg.getMinutes();
        const diff = minutosLlegada - minProg;
        if (diff > 0) minutosTardanzaCalculados = diff;
        
        await papeletasRepository.registrarRetorno(papeletaActiva.id, usuarioId);
        const totalMinutosTardanza = (registroExistente?.minutos_tardanza || 0) + minutosTardanzaCalculados;
        const nuevoEstado = totalMinutosTardanza > 0 ? 'Tardanza' : (registroExistente?.estado_presencia || 'Presente');
        
        return await repository.updateIngreso(controlId, registroExistente ? registroExistente.hora_ingreso : horaEvento, nuevoEstado, usuarioId, totalMinutosTardanza);
    }
    
    // Calcular tardanza del turno actual
    let minutosAImputar = 0;
    let nuevoEstado = registroExistente ? registroExistente.estado_presencia : 'Presente';

    // Si es Retorno Refrigerio, verificamos tolerancia de tarde si existe, o usamos la estándar
    // Si hay config tarde, usamos esa hora. Si no, quizas deberíamos usar 14:00 o 15:00?
    // Por ahora usamos la lógica previa de diferenciaMinutos basada en horaReferencia
    
    if (diferenciaMinutos > 0) {
      if (tieneSaldoTolerancia) {
        if (diferenciaMinutos > minutosToleranciaDia) {
          nuevoEstado = 'Tardanza';
          minutosAImputar = diferenciaMinutos - minutosToleranciaDia;
        }
      } else {
        nuevoEstado = 'Tardanza';
        minutosAImputar = diferenciaMinutos;
      }
    }
    
    // Si ya existía y tenía tardanza, sumamos (si es un nuevo turno que genera tardanza)
    // Para evitar duplicar tardanza en re-conexiones o doble click, verificaríamos si ya se cobró.
    // Pero como "registrarIngreso" se puede llamar N veces, simplificamos:
    // Si es el PRIMER ingreso del día (creación), asignamos minutosAImputar.
    // Si es un ingreso POSTERIOR (actualización), sumamos SOLO si es turno tarde y no se había sumado antes.
    
    let totalMinutos = (registroExistente?.minutos_tardanza || 0);
    
    if (!registroExistente) {
      // Primer ingreso del día
      totalMinutos = minutosAImputar;
    } else {
      // Ingreso posterior (ej. regreso de almuerzo)
      // Solo sumamos si hay tardanza calculada para ESTE evento específico
      // Y idealmente si no hemos procesado ya este turno. 
      // Por simplicidad: Sumamos siempre que haya tardanza (asumimos que el usuario no marca 2 veces seguidas en < 1 min)
      if (minutosAImputar > 0) {
         totalMinutos += minutosAImputar;
         nuevoEstado = 'Tardanza';
      }
      
      // Si el estado actual ya era Tardanza, se mantiene, si no, se actualiza a Tardanza si corresponde
      if (registroExistente.estado_presencia === 'Tardanza') nuevoEstado = 'Tardanza';
    }

    // Actualizamos el registro principal
    // Si ya existía, guardamos la hora de ingreso ORIGINAL (primer ingreso), NO sobrescribimos con la de la tarde
    const horaIngresoFinal = registroExistente ? registroExistente.hora_ingreso : horaEvento;
    
    return await repository.updateIngreso(controlId, horaIngresoFinal, nuevoEstado, usuarioId, totalMinutos);

  } catch (error) {
    logger.error(`Error registrando ingreso ID ${personalId}:`, error);
    throw error;
  }
};

const registrarSalida = async (personalId, usuarioId, offlineData = {}) => {
  try {
    const personal = await personalRepository.findById(personalId);
    if (!personal) throw new AppError('personal no encontrado', 404);
    
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    const fechaOffline = offlineData?._isOfflineSync ? offlineData.fecha : null;
    const horaOffline = offlineData?._isOfflineSync ? offlineData.hora : null;
    const fechaEvento = fechaOffline || fechaActual;
    const horaEvento = horaOffline || horaActual;

    const registroExistente = await repository.findBypersonalAndFecha(personalId, fechaEvento);
    
    if (!registroExistente) throw new AppError('No hay registro de ingreso para hoy. Debe marcar ingreso primero.', 400);
    // Nota: Ya no bloqueamos si hora_salida existe, porque permitimos múltiples salidas (refrigerio)

    // Determinar Tipo de Salida
    // Heurística simple: Si hay config de "entrada tarde", asumimos turno partido.
    // Si la hora es antes de, digamos, las 15:00 (3 PM), y hay turno partido, es SALIDA_REFRIGERIO.
    // O mejor: contemos cuántos movimientos de SALIDA tiene hoy.
    
    // Obtenemos movimientos previos
    const movimientosPrevios = await repository.getMovimientosByControlId(registroExistente.id);
    const salidasPrevias = movimientosPrevios.filter(m => m.tipo.includes('SALIDA'));
    
    let tipoSalida = 'SALIDA';
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    const horaEntradaTardeConfig = configAsistencia?.hora_entrada_tarde;
    
    if (horaEntradaTardeConfig) {
       // Hay horario partido configurado
       // Si es la primera salida, es REFRIGERIO
       if (salidasPrevias.length === 0) {
         tipoSalida = 'SALIDA_REFRIGERIO';
       } else {
         // Si ya hubo salidas, es SALIDA final (o segunda salida)
         tipoSalida = 'SALIDA';
       }
    } else {
       // Horario corrido
       tipoSalida = 'SALIDA';
    }

    // Registrar movimiento
    await repository.createMovimiento({
      control_asistencia_id: registroExistente.id,
      tipo: tipoSalida,
      fecha_hora: `${fechaEvento} ${horaEvento}`,
      usuario_registro_id: usuarioId,
      observacion: tipoSalida === 'SALIDA_REFRIGERIO' ? 'Salida a Refrigerio' : 'Salida Final'
    });

    // Actualizar salida (siempre guardamos la última hora marcada como hora de salida "oficial" del día)
    return await repository.updateSalida(registroExistente.id, horaEvento);
  } catch (error) {
    logger.error(`Error registrando salida ID ${personalId}:`, error);
    throw error;
  }
};

const registrarEstadoPresencia = async (personalId, estadoPresencia, usuarioId) => {
  try {
    const personal = await personalRepository.findById(personalId);
    if (!personal) throw new AppError('personal no encontrado', 404);
    if (!VALID_PRESENCE_STATES.includes(estadoPresencia)) throw new AppError('Estado inválido', 400);
    
    const { fecha: fechaActual } = nowLima();
    const registroExistente = await repository.findBypersonalAndFecha(personalId, fechaActual);
    
    if (registroExistente) {
      return await repository.updateEstadoPresencia(registroExistente.id, estadoPresencia, usuarioId);
    } else {
      return await repository.create({
        personal_id: personalId, fecha: fechaActual, hora_ingreso: null, hora_salida: null,
        estado_presencia: estadoPresencia, usuario_registro_id: usuarioId
      });
    }
  } catch (error) {
    logger.error(`Error registrando estado ID ${personalId}:`, error);
    throw error;
  }
};

const marcarAusentesAlFinalDelDia = async (fecha = null, usuarioSistemaId = config.systemUserId, crearSiNoExiste = true) => {
  try {
    let fechaProcesar = fecha;
    if (!fechaProcesar) {
      const { fechaHora } = nowLima();
      const limaAyer = new Date(fechaHora);
      limaAyer.setDate(limaAyer.getDate() - 1);
      fechaProcesar = limaAyer.toISOString().split('T')[0];
    }
    return await repository.marcarAusentesAlFinalDelDia(fechaProcesar, usuarioSistemaId, crearSiNoExiste);
  } catch (error) {
    logger.error('Error marcando ausentes:', error);
    throw error;
  }
};

const marcarAusentesProgresivo = async (usuarioSistemaId = config.systemUserId) => {
  const { fecha: hoy, hora, fechaHora } = nowLima();
  const minutosAhora = timeToMinutes(hora);
  const mes = fechaHora.getMonth() + 1;
  const anio = fechaHora.getFullYear();

  const { personal = [] } = await personalRepository.findAll({ page: 1, limit: 5000, activo: true, fecha: hoy });

  let procesados = 0, ausentes = 0;

  for (const p of personal) {
    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(p.id);
    const minutosEntrada = timeToMinutes(configAsistencia?.hora_entrada || '09:00:00');
    const minutosTolerancia = Number(configAsistencia?.minutos_tolerancia_por_dia || 0);

    if (minutosAhora < minutosEntrada + minutosTolerancia) continue;

    const registroHoy = await repository.findBypersonalAndFecha(p.id, hoy);
    if (registroHoy && registroHoy.estado_presencia && registroHoy.estado_presencia !== 'Ausente') {
      procesados++; continue;
    }

    // Aquí podría integrarse chequeo de papeleta en tiempo real, pero lo manejamos en el GET
    if (!registroHoy) {
      await repository.create({
        personal_id: p.id, fecha: hoy, hora_ingreso: null, hora_salida: null,
        estado_presencia: 'Ausente', usuario_registro_id: usuarioSistemaId
      });
      ausentes++;
    } else if (registroHoy.estado_presencia !== 'Ausente') {
      await repository.updateEstadoPresencia(registroHoy.id, 'Ausente', usuarioSistemaId);
      ausentes++;
    }
    procesados++;
  }
  return { fecha: hoy, procesados, ausentes };
};

/**
 * Sincroniza papeletas externas (Mongo) en la tabla de asistencia (Postgres).
 * Inserta/actualiza estado Permiso/Comisión por cada día cubierto.
 */
const sincronizarPapeletas = async (fechaInicio, fechaFin, usuarioId = config.systemUserId || 1) => {
  try {
    logger.info(`CRON: Sincronizando papeletas ${fechaInicio} - ${fechaFin}`);

    const papeletas = await mongoService.getPapeletasAprobadasExternas({ fechaInicio, fechaFin });
    if (!papeletas || papeletas.length === 0) {
      logger.info('CRON: Sin papeletas para sincronizar');
      return { procesados: 0 };
    }

    const { personal: listapersonal = [] } = await personalRepository.findAll({
      page: 1,
      limit: 10000,
      activo: true
    });

    let procesados = 0;

    for (const p of papeletas) {
      const persona = listapersonal.find((per) => {
        if (per.numero_documento && p.solicitante_numero_documento) {
          return per.numero_documento === p.solicitante_numero_documento;
        }
        const nombrePer = `${per.nombres || ''} ${per.apellidos || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const nombrePap = `${p.solicitante_nombres || ''} ${p.solicitante_apellidos || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        return nombrePer && nombrePap && (nombrePer.includes(nombrePap) || nombrePap.includes(nombrePer));
      });
      if (!persona) continue;

      const esComision = p.nombre_motivo?.toLowerCase().includes('comis');
      const nuevoEstado = esComision ? 'Comisión' : 'Permiso';
      const observacion = `Sincronizado Auto: ${p.codigo_papeleta}`;

      const inicio = new Date(p.fecha_hora_salida_programada);
      const fin = new Date(p.fecha_hora_retorno_programada);

      for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
        const fechaStr = d.toISOString().split('T')[0];
        if (fechaInicio && fechaStr < fechaInicio) continue;
        if (fechaFin && fechaStr > fechaFin) continue;

        const actualizado = await repository.updatePorPapeletaExterna(
          persona.id,
          fechaStr,
          nuevoEstado,
          observacion,
          usuarioId
        );
        if (actualizado) procesados++;
      }
    }

    logger.info(`CRON: Sincronización completada. Registros afectados: ${procesados}`);
    return { procesados };
  } catch (error) {
    logger.error('CRON: Error sincronizando papeletas externas:', error);
    return { procesados: 0, error: error.message };
  }
};

const getEstadisticas = async (opt) => await repository.getEstadisticas(opt.fechaInicio, opt.fechaFin);
const getEstadisticasTotales = async (opt) => await repository.getEstadisticasTotales(opt.fechaInicio, opt.fechaFin);
const getEstadisticasPuntualidad = async (opt) => await repository.getEstadisticasPuntualidad(opt.fechaInicio, opt.fechaFin);
const getEstadisticasAusencias = async (opt) => {
  try {
    // 1. Obtener estadísticas locales (Postgres) - Prioridad alta
    const statsLocal = await repository.getEstadisticasAusencias(opt.fechaInicio, opt.fechaFin);
    
    // 2. Obtener estadísticas externas (Mongo) - Fallback silencioso
    let statsMotivosMongo = { por_motivo: [] };
    let statsHorasMongo = { por_persona: [] };
    
    try {
      if (mongoService) {
        [statsMotivosMongo, statsHorasMongo] = await Promise.all([
          mongoService.getEstadisticasMotivosExternas({ fechaInicio: opt.fechaInicio, fechaFin: opt.fechaFin }),
          mongoService.getEstadisticasHorasExternas({ fechaInicio: opt.fechaInicio, fechaFin: opt.fechaFin })
        ]);
      }
    } catch (externError) {
      logger.warn('Advertencia: No se pudieron obtener estadísticas externas (Mongo). Se mostrarán solo datos locales.', externError.message);
    }

    // 3. Combinar Motivos (tipo_ausencia)
    const motivosMap = {};
    
    // Agregar locales
    if (statsLocal.por_tipo) {
      statsLocal.por_tipo.forEach(item => {
        motivosMap[item.tipo_ausencia] = (motivosMap[item.tipo_ausencia] || 0) + parseInt(item.total);
      });
    }
    
    // Agregar externos
    if (statsMotivosMongo && statsMotivosMongo.por_motivo) {
      statsMotivosMongo.por_motivo.forEach(item => {
        const nombre = item.nombre_motivo || 'Otros';
        motivosMap[nombre] = (motivosMap[nombre] || 0) + item.total;
      });
    }
    
    const por_tipo_combinado = Object.keys(motivosMap).map(key => ({
      tipo_ausencia: key,
      total: motivosMap[key]
    })).sort((a, b) => b.total - a.total);

    // 4. Combinar Top Faltas (personal)
    const personalMap = {};
    
    if (statsLocal.top_faltas) {
      statsLocal.top_faltas.forEach(item => {
        personalMap[item.personal] = (personalMap[item.personal] || 0) + parseInt(item.faltas);
      });
    }
    
    if (statsHorasMongo && statsHorasMongo.por_persona) {
      statsHorasMongo.por_persona.forEach(item => {
        personalMap[item.personal] = (personalMap[item.personal] || 0) + item.total_papeletas;
      });
    }
    
    const top_faltas_combinado = Object.keys(personalMap).map(key => ({
      personal: key,
      faltas: personalMap[key]
    }))
    .sort((a, b) => b.faltas - a.faltas)
    .slice(0, 10);

    return {
      por_tipo: por_tipo_combinado,
      top_faltas: top_faltas_combinado
    };
  } catch (error) {
    logger.error('Error combinando estadísticas de ausencias:', error);
    // Fallback a local si falla algo crítico
    return await repository.getEstadisticasAusencias(opt.fechaInicio, opt.fechaFin);
  }
};
const getEstadisticasAreas = async (opt) => await repository.getEstadisticasAreas(opt.fechaInicio, opt.fechaFin);
const getEstadisticaspersonal = async (opt) => await repository.getEstadisticaspersonal(opt.fechaInicio, opt.fechaFin, opt.personalId);
const getpersonalDetalle = async (id, opt) => await repository.getpersonalDetalle(id, opt.fechaInicio, opt.fechaFin);

const exportarAExcel = async (filtros = {}, themeName = 'corporate') => {
  try {
    const theme = getTheme(themeName);
    const result = await repository.findAll({
      search: filtros.q || '', fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin,
      personalId: filtros.personalId ? parseInt(filtros.personalId) : undefined, estadoPresencia: filtros.estadoPresencia
    });
    
    // Integración en Excel
    const asistencias = await integrarPapeletasEnAsistencias(result.asistencias, filtros.fechaInicio, filtros.fechaFin);
    
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Historial');
    const styles = theme.excel;

    worksheet.columns = [
      { header: 'N°', key: 'numero', width: 5 },
      { header: 'personal', key: 'personal', width: 30 },
      { header: 'Área', key: 'area', width: 20 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Ingreso', key: 'horaIngreso', width: 15 },
      { header: 'Salida', key: 'horaSalida', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Usuario', key: 'usuarioRegistro', width: 20 }
    ];

    asistencias.forEach((asistencia, index) => {
      worksheet.addRow({
        numero: index + 1,
        personal: `${asistencia.personal_nombres} ${asistencia.personal_apellidos}`,
        area: asistencia.area_nombre || 'N/A',
        cargo: asistencia.personal_cargo_nombre || 'N/A',
        fecha: asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-PE') : 'N/A',
        horaIngreso: asistencia.hora_ingreso || 'N/A',
        horaSalida: asistencia.hora_salida || 'Sin registro',
        estado: asistencia.estado_presencia,
        usuarioRegistro: asistencia.usuario_registro || 'N/A'
      });
    });

    return await workbook.xlsx.writeBuffer();
  } catch (error) {
    logger.error('Error Excel:', error);
    throw error;
  }
};

const exportarAPDF = async (filtros = {}) => {
  try {
    const result = await repository.findAll({
      search: filtros.q || '', fechaInicio: filtros.fechaInicio, fechaFin: filtros.fechaFin,
      personalId: filtros.personalId ? parseInt(filtros.personalId) : undefined, estadoPresencia: filtros.estadoPresencia
    }, false);

    const asistencias = result.asistencias;
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(18).text('HISTORIAL DE ASISTENCIAS', { align: 'center' });
        
        const table = {
          headers: ['N°', 'personal', 'Área', 'Fecha', 'Ingreso', 'Salida', 'Estado'],
          rows: asistencias.map((a, i) => [
            i + 1,
            `${a.personal_nombres} ${a.personal_apellidos}`,
            a.area_nombre || '-',
            a.fecha ? new Date(a.fecha).toLocaleDateString('es-PE') : '-',
            a.hora_ingreso || '-',
            a.hora_salida || '-',
            a.estado_presencia
          ])
        };
        
        doc.table(table, { prepareHeader: () => doc.fontSize(10), prepareRow: () => doc.fontSize(8) });
        doc.end();
    });
  } catch (error) {
    logger.error('Error PDF:', error);
    throw error;
  }
};

async function justificarAsistencia(asistenciaId, motivo, archivo, usuarioId) {
  const asistencia = await repository.findById(asistenciaId);
  if (!asistencia) throw new AppError('No encontrado', 404);
  let evidenciaUrl = archivo ? `/uploads/justificaciones/${archivo.filename}` : null;
  await repository.createJustificacion({
    control_asistencia_id: asistenciaId, motivo, evidencia_url: evidenciaUrl, estado: 'PENDIENTE', usuario_solicitante_id: usuarioId
  });
  return { message: 'Enviada' };
}

async function getJustificaciones(filtros = {}) {
  return await repository.findAllJustificaciones(filtros);
}

async function evaluarJustificacion(id, data, usuarioRespuestaId) {
  const justificacion = await repository.updateJustificacionEstado(id, data.estado, data.observacion, usuarioRespuestaId);
  if (!justificacion) throw new AppError('No encontrada', 404);
  if (data.estado === 'APROBADO') {
     await repository.updateEstadoPresencia(justificacion.control_asistencia_id, 'Justificada', usuarioRespuestaId);
  }
  return justificacion;
}

const evaluarAsistenciasAutomaticas = async (usuarioSistemaId) => {
  // 1. Obtener fecha y hora exacta en Lima
  const { fecha: fechaHoy, hora: horaActualStr, fechaHora } = nowLima();
  const minutosActuales = timeToMinutes(horaActualStr);
  const diaSemana = fechaHora.getDay(); // 0 = Domingo, 6 = Sábado

  // Doble seguridad para no ejecutar en fin de semana (aunque el cron lo limite)
  if (diaSemana === 0 || diaSemana === 6) {
    logger.info('Intento de ejecución en fin de semana bloqueado por lógica de negocio.');
    return { procesados: 0, mensaje: 'Fin de semana' };
  }

  // 2. Obtener personal activo sin asistencia registrada hoy
  // Nota: Debes asegurarte que tu repositorio soporte filtrar "sin registro hoy" o hacerlo en memoria
  const { personal } = await personalRepository.findAll({ page: 1, limit: 10000, activo: true });
  
  // Obtener todas las papeletas aprobadas para hoy de una sola vez para optimizar
  const papeletasHoy = await mongoService.getPapeletasAprobadasExternas({ 
    fechaInicio: fechaHoy, 
    fechaFin: fechaHoy 
  });

  let contadores = { permisos: 0, ausentes: 0, ignorados: 0 };

  for (const p of personal) {
    // Verificar si ya tiene registro hoy (Ingreso, Falta, Permiso, etc.)
    const registroExistente = await repository.findBypersonalAndFecha(p.id, fechaHoy);
    if (registroExistente) {
      continue; // Ya tiene estado, pasamos al siguiente
    }

    // --- NIVEL 1: Verificar Papeletas (Permisos/Comisiones) ---
    // Buscamos si tiene papeleta válida para hoy
    const papeleta = papeletasHoy.find(pap => 
      pap.solicitante_numero_documento === p.numero_documento && 
      pap.estado === 'APROBADO'
    );

    if (papeleta) {
      const esComision = papeleta.nombre_motivo?.toLowerCase().includes('comis');
      await repository.create({
        personal_id: p.id,
        fecha: fechaHoy,
        hora_ingreso: null,
        hora_salida: null,
        estado_presencia: esComision ? 'Comisión' : 'Permiso',
        usuario_registro_id: usuarioSistemaId,
        observacion: `Generado Automático: ${papeleta.codigo_papeleta}`
      });
      contadores.permisos++;
      continue; // Terminamos con este usuario
    }

    // --- NIVEL 2: Verificar Configuración y Tolerancia ---
    const config = await asistenciaConfigService.getConfigEfectiva(p.id);
    const horaEntradaConfig = config?.hora_entrada || '08:00:00'; // Hora defecto si falla config
    const minutosTolerancia = Number(config?.minutos_tolerancia_por_dia || 0); // Tolerancia diaria
    
    // Calcular minutos límite (Entrada + Tolerancia)
    const minutosEntrada = timeToMinutes(horaEntradaConfig);
    const minutosLimite = minutosEntrada + minutosTolerancia;

    // --- NIVEL 3: Decisión de Ausencia ---
    // Solo marcamos ausente si la hora actual YA SUPERÓ el límite
    if (minutosActuales > minutosLimite) {
      await repository.create({
        personal_id: p.id,
        fecha: fechaHoy,
        hora_ingreso: null,
        hora_salida: null,
        estado_presencia: 'Ausente',
        usuario_registro_id: usuarioSistemaId,
        minutos_tardanza: 0 // La tardanza se calcula si llegan, la ausencia es estado
      });
      contadores.ausentes++;
    } else {
      // Aún está a tiempo de llegar, no hacemos nada
      contadores.ignorados++;
    }
  }

  return { fecha: fechaHoy, ...contadores };
};

const getMovimientos = async (controlId) => {
  return await repository.getMovimientosByControlId(controlId);
};

module.exports = {
  getAllAsistencias,
  getAsistenciasHoy,
  getAsistenciaById,
  registrarIngreso,
  registrarSalida,
  registrarEstadoPresencia,
  marcarAusentesAlFinalDelDia,
  marcarAusentesProgresivo,
  sincronizarPapeletas,
  getEstadisticas,
  getEstadisticasTotales,
  getEstadisticasPuntualidad,
  getEstadisticasAusencias,
  getEstadisticasAreas,
  getEstadisticaspersonal,
  getpersonalDetalle,
  exportarAExcel,
  exportarAPDF,
  getMiResumen,
  getMiAsistencia,
  justificarAsistencia,
  getJustificaciones,
  evaluarJustificacion,
  evaluarAsistenciasAutomaticas,
  getMovimientos
};

