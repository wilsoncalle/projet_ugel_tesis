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
    // Obtener fecha actual en formato YYYY-MM-DD
    const hoy = new Date().toISOString().split('T')[0];
    
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
    // Verificar que el personal exista y esté activo
    const personal = await personalRepository.findById(personalId);
    if (!personal) {
      throw new AppError('Personal no encontrado', 404);
    }
    if (!personal.activo) {
      throw new AppError('Personal inactivo', 400);
    }
    
    // Obtener fecha y hora actual en zona horaria de Lima (UTC-5)
    const { fecha: fechaActual, hora: horaActual } = nowLima();
    
    // Obtener configuración efectiva de tolerancia (por personal o global)
    const configAsistencia = await asistenciaConfigService.getConfigForPersonal(personalId);

    // Valores por defecto si aún no hay config en la tabla
    const minutosToleranciaDia = configAsistencia?.minutos_tolerancia_por_dia ?? 10;
    const diasToleranciaMes = configAsistencia?.dias_tolerancia_por_mes ?? 10;

    // Días de tolerancia ya usados en el mes actual
    const fechaObj = new Date(fechaActual);
    const diasUsados = await repository.countDiasToleranciaUsados(
      personalId,
      fechaObj.getMonth() + 1,
      fechaObj.getFullYear()
    );

    const papeletaActiva = await papeletasRepository.encontrarPapeletaActivaPorFecha(personalId, fechaActual);
    const registroExistente = await repository.findByPersonalAndFecha(personalId, fechaActual);
    
    let minutosTardanzaCalculados = 0;
    let esRetornoPapeleta = false;

    // Calcular minutos de tardanza
    if (registroExistente && registroExistente.hora_ingreso && papeletaActiva && papeletaActiva.estado === 'EN_CURSO') {
        // Retorno de papeleta
        esRetornoPapeleta = true;
        const retornoProg = new Date(papeletaActiva.fecha_hora_retorno_programada);
        
        const [hAct, mAct] = horaActual.split(':').map(Number);
        const minAct = hAct * 60 + mAct;
        
        // Ajuste básico para obtener minutos del día de la fecha programada
        // Asumimos que la fecha programada es correcta en la DB
        const minProg = retornoProg.getHours() * 60 + retornoProg.getMinutes();
        
        const diff = minAct - minProg;
        if (diff > 0) {
            minutosTardanzaCalculados = diff;
        }
        
        // Actualizar papeleta marcando retorno real
        await papeletasRepository.registrarRetorno(papeletaActiva.id, usuarioId);
        
    } else if (!registroExistente || !registroExistente.hora_ingreso) {
        // Primer ingreso del día
        const [hAct, mAct] = horaActual.split(':').map(Number);
        const minAct = hAct * 60 + mAct;
        
        const minInicio = 8 * 60; // 8:00 AM Inicio de jornada
        const diff = minAct - minInicio;
        
        if (diff > 0) {
            minutosTardanzaCalculados = diff;
        }
    } else {
        // Ya tiene ingreso y no es retorno de papeleta
        throw new AppError('El personal ya tiene un ingreso registrado para hoy', 400);
    }
    
    // Determinar nuevo estado
    let nuevoEstado = 'Presente';
    let totalMinutosTardanza = minutosTardanzaCalculados;
    
    if (registroExistente) {
        totalMinutosTardanza += (registroExistente.minutos_tardanza || 0);
    }

    if (minutosTardanzaCalculados > 0) {
    // Verificar tolerancia configurada
    if (
      minutosTardanzaCalculados <= minutosToleranciaDia &&
      diasUsados < diasToleranciaMes
      ) {
        // Está dentro del rango de “tolerancia” → se registra Presente pero contando el día usado
        nuevoEstado = 'Presente';
      } else {
        nuevoEstado = 'Tardanza';
      }
    }

    // Si ya estaba en Tardanza, se mantiene
    if (registroExistente && registroExistente.estado_presencia === 'Tardanza') {
        nuevoEstado = 'Tardanza';
    }
    
    // Si tiene papeleta activa (no retorno), el estado inicial podría ser Permiso?
    // Si llega tarde al inicio pero tiene papeleta de 8 a 10...
    // La lógica actual prioriza la llegada.
    
    if (registroExistente) {
        const asistencia = await repository.updateIngreso(
            registroExistente.id, 
            registroExistente.hora_ingreso || horaActual, 
            nuevoEstado, 
            usuarioId,
            totalMinutosTardanza
        );
        logger.info(`Ingreso actualizado (Retorno/Corrección) para personal ID ${personalId} - Estado: ${nuevoEstado}, Tardanza: ${totalMinutosTardanza} min`);
        return asistencia;
    } else {
        const asistencia = await repository.create({
            personal_id: personalId,
            fecha: fechaActual,
            hora_ingreso: horaActual,
            hora_salida: null,
            estado_presencia: nuevoEstado,
            usuario_registro_id: usuarioId,
            minutos_tardanza: totalMinutosTardanza
        });
        logger.info(`Ingreso registrado para personal ID ${personalId} - Estado: ${nuevoEstado}, Tardanza: ${totalMinutosTardanza} min`);
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
      const ahora = new Date();
      const limaOffset = -5 * 60; // -5 horas en minutos
      const utcTime = ahora.getTime() + (ahora.getTimezoneOffset() * 60000);
      const limaTime = new Date(utcTime + (limaOffset * 60000));
      
      // Obtener el día anterior
      limaTime.setDate(limaTime.getDate() - 1);
      fechaProcesar = limaTime.toISOString().split('T')[0];
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
    }, false);
    
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
  exportarAPDF
};
