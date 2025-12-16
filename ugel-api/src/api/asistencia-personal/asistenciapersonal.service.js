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
    
    // Configuración de Horarios
    const horaEntradaManana = configAsistencia?.hora_entrada || '09:00:00';
    const horaEntradaTarde = configAsistencia?.hora_entrada_tarde || '14:00:00';
    // Tolerancias
    const minutosTolerancia = Number(configAsistencia?.minutos_tolerancia_por_dia || 10);
    const diasToleranciaTotales = Number(configAsistencia?.dias_tolerancia_por_mes || 0);

    // Convertir a minutos para comparaciones
    const minEvento = timeToMinutes(horaEvento);
    const minEntradaManana = timeToMinutes(horaEntradaManana);
    const minEntradaTarde = timeToMinutes(horaEntradaTarde);

    const registroExistente = await repository.findBypersonalAndFecha(personalId, fechaEvento);
    
    let controlId = registroExistente?.id;
    let tipoMovimiento = 'INGRESO';
    let observacion = '';
    // IMPORTANTE: Si existe registro con estado Ausente, empezar con 'Presente' 
    // y luego calcular si debe ser Tardanza según la hora
    let nuevoEstado = (registroExistente && registroExistente.estado_presencia !== 'Ausente') 
        ? registroExistente.estado_presencia 
        : 'Presente';
    let minutosTardanzaCalculados = 0;

    // Lógica clasificación REFINADA
    if (!registroExistente) {
      // 1. PRIMER MARKING -> SIEMPRE INGRESO (Mañana)
      // Incluso si es tarde (ej. 11am), cuenta como ingreso principal con tardanza
      tipoMovimiento = 'INGRESO';
      observacion = 'Ingreso Mañana';
      
      // Crear registro
      const nuevoControl = await repository.create({
          personal_id: personalId, fecha: fechaEvento, hora_ingreso: horaEvento, hora_salida: null,
          estado_presencia: nuevoEstado, usuario_registro_id: usuarioId, minutos_tardanza: 0
      });
      controlId = nuevoControl.id;

    } else {
      // 2. YA EXISTE REGISTRO -> RETORNO
      // Verificar cuál fue el último movimiento para saber si es Retorno Refrigerio o Entrada Intermitente
      const movimientosPrevios = await repository.getMovimientosByControlId(controlId);
      const ultimoMovimiento = movimientosPrevios[movimientosPrevios.length - 1];
      
      if (ultimoMovimiento && ultimoMovimiento.tipo === 'SALIDA_REFRIGERIO') {
          tipoMovimiento = 'RETORNO_REFRIGERIO';
          observacion = 'Ingreso Tarde / Retorno Refrigerio';
      } else if (ultimoMovimiento && (ultimoMovimiento.tipo.includes('SALIDA'))) {
          // Si salió (final, intermitente, etc.) y vuelve
          tipoMovimiento = 'INGRESO_INTERMITENTE';
          observacion = 'Entrada Intermitente';
      } else {
          // El último movimiento FUE un ingreso (INGRESO, RETORNO_REFRIGERIO, etc.)
          // EXCEPCIÓN: Si el estado actual es 'Ausente', permitir registrar ingreso tardío
          if (registroExistente.estado_presencia === 'Ausente') {
              // Permitir registrar como ingreso intermitente (ya que es un reingreso después de ausencia)
              tipoMovimiento = 'INGRESO_INTERMITENTE';
              observacion = 'Ingreso Tardío (después de marcado Ausente)';
          } else {
              // No permitir dos ingresos seguidos si ya está presente
              return { alreadyRegistered: true, message: 'El personal ya se encuentra dentro de la institución.' };
          }
      }
    }
    
    // Cálculo de Tardanza y Tolerancia
    const diasUsados = await repository.countDiasToleranciaUsados(personalId, new Date(fechaEvento).getMonth() + 1, new Date(fechaEvento).getFullYear(), horaEntradaManana, configAsistencia?.aplica_desde);
    const tieneSaldo = diasUsados < diasToleranciaTotales;

    // CASO 1: Ingreso Mañana
    if (observacion === 'Ingreso Mañana') {
        if (minEvento > minEntradaManana) {
            const diff = minEvento - minEntradaManana;
            
            // "usar los minutos de tolerancia" -> Entiendo que se descuentan si hay saldo.
            if (tieneSaldo) {
                if (diff <= minutosTolerancia) {
                    // Cubierto por tolerancia
                } else {
                    // Excede tolerancia
                    // Asumiendo que se cobra la diferencia (perdonamos tolerancia)
                    minutosTardanzaCalculados = diff - minutosTolerancia;
                    nuevoEstado = 'Tardanza';
                }
            } else {
                // Sin saldo -> Se cobra todo
                minutosTardanzaCalculados = diff;
                nuevoEstado = 'Tardanza';
            }
        }
    } 
    // CASO 2: Retorno Refrigerio (Turno Tarde logic)
    else if (observacion === 'Ingreso Tarde / Retorno Refrigerio') {
         // Aplicar misma lógica de tolerancia para la tarde
         // Usar horaEntradaTarde como base
         if (minEvento > minEntradaTarde) {
             const diff = minEvento - minEntradaTarde;
             
             if (tieneSaldo) {
                 if (diff <= minutosTolerancia) {
                      // Cubierto
                 } else {
                      minutosTardanzaCalculados = diff - minutosTolerancia;
                      nuevoEstado = 'Tardanza';
                 }
             } else {
                 minutosTardanzaCalculados = diff;
                 nuevoEstado = 'Tardanza';
             }
         }
    }
        // CASO 3: Ingreso Tardío (después de marcado Ausente)
    else if (observacion.includes('Ingreso Tardío')) {
         // Calcular tardanza desde la hora de entrada de la mañana
         if (minEvento > minEntradaManana) {
             const diff = minEvento - minEntradaManana;
             
             // Aplicar tolerancia si tiene saldo
             if (tieneSaldo && diff <= minutosTolerancia) {
                 minutosTardanzaCalculados = 0;
                 nuevoEstado = 'Presente';
             } else if (tieneSaldo) {
                 minutosTardanzaCalculados = diff - minutosTolerancia;
                 nuevoEstado = 'Tardanza';
             } else {
                 minutosTardanzaCalculados = diff;
                 nuevoEstado = 'Tardanza';
             }
         }
     }
    
    // Papeletas (Lógica existente)
    const papeletaActiva = await papeletasRepository.encontrarPapeletaActivaPorFecha(personalId, fechaEvento);
    if (papeletaActiva && papeletaActiva.estado === 'EN_CURSO') {
        const retornoProg = new Date(papeletaActiva.fecha_hora_retorno_programada);
        const minProg = retornoProg.getHours() * 60 + retornoProg.getMinutes();
        const diff = minEvento - minProg;
        if (diff > 0) minutosTardanzaCalculados += diff;
        
        await papeletasRepository.registrarRetorno(papeletaActiva.id, usuarioId);
        observacion += ' (Retorno Papeleta)'; 
        if (minutosTardanzaCalculados > 0) nuevoEstado = 'Tardanza';
    }

    await repository.createMovimiento({
      control_asistencia_id: controlId,
      tipo: tipoMovimiento, 
      fecha_hora: `${fechaEvento} ${horaEvento}`,
      usuario_registro_id: usuarioId,
      observacion: observacion
    });

    const totalMinutos = (registroExistente?.minutos_tardanza || 0) + minutosTardanzaCalculados;
    
    // Hora ingreso padre: Si estaba Ausente con hora 00:00:00 (creado por cron), usar la hora actual
    // De lo contrario, mantener la original
    const esHoraCron = registroExistente?.hora_ingreso === '00:00:00' || 
                       registroExistente?.hora_ingreso === '00:00:00.000' ||
                       !registroExistente?.hora_ingreso;
    
    const horaIngresoFinal = (registroExistente && !esHoraCron) 
        ? registroExistente.hora_ingreso 
        : horaEvento;
    
    // IMPORTANTE: Mantener el peor estado
    // Si ya estaba en Tardanza o si el nuevo estado es Tardanza, mantener Tardanza
    // Si estaba Ausente y ahora llega (Presente o Tardanza), usar el nuevo estado
    if (registroExistente) {
        if (registroExistente.estado_presencia === 'Tardanza') {
            nuevoEstado = 'Tardanza';
        } else if (registroExistente.estado_presencia === 'Ausente') {
            // Si estaba Ausente, usar el nuevo estado calculado (Presente o Tardanza)
            // nuevoEstado ya está calculado arriba
        } else if (nuevoEstado === 'Tardanza') {
            // Si el nuevo estado es peor (Tardanza), usarlo
            nuevoEstado = 'Tardanza';
        }
    }

    console.log('[registrarIngreso] Valores finales antes de actualizar DB:');
    console.log('  - controlId:', controlId);
    console.log('  - horaIngresoFinal:', horaIngresoFinal);
    console.log('  - nuevoEstado:', nuevoEstado);
    console.log('  - totalMinutos:', totalMinutos);
    console.log('  - registroExistente.estado_presencia (antes):', registroExistente?.estado_presencia);

    const resultado = await repository.updateIngreso(controlId, horaIngresoFinal, nuevoEstado, usuarioId, totalMinutos);
    
    console.log('[registrarIngreso] Resultado de updateIngreso:', resultado);
    
    return resultado;

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

    // Verificar si el último movimiento ya fue una salida
    const movimientosPrevios = await repository.getMovimientosByControlId(registroExistente.id);
    const ultimoMovimiento = movimientosPrevios[movimientosPrevios.length - 1];

    if (ultimoMovimiento && ultimoMovimiento.tipo.includes('SALIDA')) {
        return { alreadyRegistered: true, message: 'El personal ya registró su salida.' };
    }

    const configAsistencia = await asistenciaConfigService.getConfigEfectiva(personalId);
    const horaEntradaTarde = configAsistencia?.hora_entrada_tarde || '14:00:00';
    const horaSalida = configAsistencia?.hora_salida || '17:00:00'; // Se agregó hora_salida al config

    const minEvento = timeToMinutes(horaEvento);
    const minEntradaTarde = timeToMinutes(horaEntradaTarde);
    const minSalidaOficial = timeToMinutes(horaSalida);
    const minInicioRefrigerio = minEntradaTarde - 60; 

    let tipoSalida = 'SALIDA';
    let observacion = '';

    // Ventana Refrigerio Estricta: [EntradaTarde - 60, EntradaTarde]
    if (minEvento >= minInicioRefrigerio && minEvento <= minEntradaTarde) { // <= para incluir la hora exacta
        tipoSalida = 'SALIDA_REFRIGERIO';
        observacion = 'Salida a Refrigerio';
    } 
    // Ventana Salida Final: >= SalidaOficial
    else if (minEvento >= minSalidaOficial) {
        // Verificar si ya hubo una Salida Final (o SALIDA simple) con observacion 'Salida Final' hoy
        const movimientosHoy = await repository.getMovimientosByControlId(registroExistente.id);
        const yaTieneSalidaFinal = movimientosHoy.some(m => m.observacion === 'Salida Final');

        if (yaTieneSalidaFinal) {
            tipoSalida = 'SALIDA_INTERMITENTE';
            observacion = 'Salida Intermitente';
        } else {
            tipoSalida = 'SALIDA';
            observacion = 'Salida Final';
        }
    }
    // Intermitente (Fuera de ventanas)
    else {
        // Salida antes de hora o rara
        tipoSalida = 'SALIDA_INTERMITENTE';
        observacion = 'Salida Intermitente';
    }

    await repository.createMovimiento({
      control_asistencia_id: registroExistente.id,
      tipo: tipoSalida,
      fecha_hora: `${fechaEvento} ${horaEvento}`,
      usuario_registro_id: usuarioId,
      observacion: observacion
    });

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
