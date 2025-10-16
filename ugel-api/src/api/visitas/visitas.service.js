/**
 * Servicio para gestión de visitas
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const repository = require('./visitas.repository');
const visitantesRepository = require('../visitantes/visitantes.repository');
const areasRepository = require('../areas/areas.repository');
const personalRepository = require('../personal/personal.repository');
const motivosVisitaRepository = require('../motivos-visita/motivosvisita.repository');
const { AppError } = require('../../middleware/errorHandler');
const logger = require('../../utils/logger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit-table');
const { getTheme } = require('../../config/exportStyles');

/**
 * Obtener todas las visitas con paginación y filtros
 * @param {Object} options - Opciones de filtrado y paginación
 * @returns {Object} Visitas y datos de paginación
 */
const getAllVisitas = async (options = {}) => {
  const { 
    page = 1, 
    limit = 15, 
    q = '',
    fechaInicio,
    fechaFin,
    areaId,
    motivoVisitaId,
    personalVisitadoId,
    documentoVisitante
  } = options;
  
  try {
    // Obtener visitas con paginación
    const result = await repository.findAll({
      page: parseInt(page), // Asegurar que sea número
      limit: parseInt(limit), // Asegurar que sea número
      search: q,
      fechaInicio,
      fechaFin,
      areaId: areaId ? parseInt(areaId) : undefined, // CAMBIO: usar areaId
      motivoVisitaId: motivoVisitaId ? parseInt(motivoVisitaId) : undefined,
      personalVisitadoId: personalVisitadoId ? parseInt(personalVisitadoId) : undefined,
      documentoVisitante
    });
    
    // Formatear respuesta
    const response = {
      visitas: result.visitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
    
    return response;
    
  } catch (error) {
    logger.error('Error obteniendo visitas:', error);
    throw error;
  }
};

/**
 * Obtener visitas activas (sin salida) con paginación
 * @param {Object} options - Opciones de paginación
 * @returns {Object} Visitas activas y datos de paginación
 */
const getVisitasActivas = async (options = {}) => {
  const { page = 1, limit = 15, q = '' } = options;
  
  try {
    // Obtener visitas activas con paginación
    const result = await repository.findActivas({
      page,
      limit,
      search: q
    });
    
    // Formatear respuesta
    return {
      visitas: result.visitas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
    
  } catch (error) {
    logger.error('Error obteniendo visitas activas:', error);
    throw error;
  }
};

/**
 * Obtener visita por ID
 * @param {number} id - ID de la visita
 * @returns {Object} Visita encontrada
 */
const getVisitaById = async (id) => {
  try {
    const visita = await repository.findById(id);
    
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    return visita;
    
  } catch (error) {
    logger.error(`Error obteniendo visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Crear nueva visita
 * @param {Object} visitaData - Datos de la visita
 * @returns {Object} Visita creada
 */
const createVisita = async (visitaData) => {
  try {
    const { 
      visitanteId, 
      tipoDocumentoId,
      numeroDocumento,
      nombres,
      apellidos,
      areaDestinoId, 
      personalVisitadoId, 
      motivoVisitaId,
      usuarioIngresoId,
      fechaIngreso,
      horaIngreso
    } = visitaData;
    
    let visitante;
    
    // Si no se proporciona un visitante existente, crear uno nuevo
    if (!visitanteId) {
      if (!tipoDocumentoId || !numeroDocumento || !nombres || !apellidos) {
        throw new AppError('Datos del visitante incompletos', 400);
      }
      
      // Verificar si ya existe el visitante
      visitante = await visitantesRepository.findByDocumento(tipoDocumentoId, numeroDocumento);
      
      // Si no existe, crearlo
      if (!visitante) {
        visitante = await visitantesRepository.create({
          tipo_documento_id: tipoDocumentoId,
          numero_documento: numeroDocumento,
          nombres,
          apellidos
        });
      }
    } else {
      // Verificar que el visitante exista
      visitante = await visitantesRepository.findById(visitanteId);
      if (!visitante) {
        throw new AppError('Visitante no encontrado', 404);
      }
    }
    
    // Verificar que el área de destino exista y esté activa
    const area = await areasRepository.findById(areaDestinoId);
    if (!area) {
      throw new AppError('Área de destino no encontrada', 404);
    }
    if (!area.activa) {
      throw new AppError('Área de destino inactiva', 400);
    }
    
    // Verificar que el personal visitado exista y esté activo (si se proporciona)
    if (personalVisitadoId) {
      const personal = await personalRepository.findById(personalVisitadoId);
      if (!personal) {
        throw new AppError('Personal visitado no encontrado', 404);
      }
      if (!personal.activo) {
        throw new AppError('Personal visitado inactivo', 400);
      }
    }
    
    // Verificar que el motivo de visita exista y esté activo
    const motivoVisita = await motivosVisitaRepository.findById(motivoVisitaId);
    if (!motivoVisita) {
      throw new AppError('Motivo de visita no encontrado', 404);
    }
    if (!motivoVisita.activo) {
      throw new AppError('Motivo de visita inactivo', 400);
    }
    
    // Verificar si el visitante ya tiene una visita activa (sin salida) en la misma área
    const visitaActiva = await repository.findVisitaActivaPorVisitante(visitante.id);
if (visitaActiva) {
  throw new AppError(
    `El visitante ya tiene una visita activa en el área "${visitaActiva.nombre_area}" desde ${new Date(visitaActiva.fecha_ingreso).toLocaleString()}. Debe registrar su salida antes de una nueva entrada.`, 
    409
  );
}
    
    // Construir fecha de ingreso (usar fecha/hora originales si están disponibles)
    let fechaIngresoFinal;
    if (fechaIngreso && horaIngreso) {
      // Combinar fecha y hora originales del evento offline
      fechaIngresoFinal = new Date(`${fechaIngreso}T${horaIngreso}:00`);
      logger.info(`Usando fecha/hora originales: ${fechaIngreso} ${horaIngreso} -> ${fechaIngresoFinal.toISOString()}`);
    } else {
      // Usar fecha/hora actual (comportamiento normal)
      fechaIngresoFinal = new Date();
      logger.info(`Usando fecha/hora actual: ${fechaIngresoFinal.toISOString()}`);
    }

    // Crear la visita
    const newVisita = await repository.create({
      visitante_id: visitante.id,
      area_destino_id: areaDestinoId,
      personal_visitado_id: personalVisitadoId || null,
      motivo_visita_id: motivoVisitaId,
      fecha_ingreso: fechaIngresoFinal,
      usuario_ingreso_id: usuarioIngresoId
    });
    
    logger.info(`Visita creada para visitante ID: ${visitante.id}`);
    
    return newVisita;
    
  } catch (error) {
    logger.error('Error creando visita:', error);
    throw error;
  }
};

/**
 * Registrar salida de visita
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @returns {Object} Visita actualizada
 */
const registrarSalidaVisita = async (id, usuarioSalidaId) => {
  try {
    logger.info(`Servicio: Verificando si la visita ID ${id} existe`);
    
    // Verificar si la visita existe
    const visita = await repository.findById(id);
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    logger.info(`Servicio: Visita encontrada:`, visita);
    
    // Verificar si la visita ya tiene salida registrada
    if (visita.fecha_salida) {
      logger.info(`Servicio: La visita ya tiene salida registrada: ${visita.fecha_salida}`);
      throw new AppError('La visita ya tiene salida registrada', 400);
    }
    
    logger.info(`Servicio: Llamando al repositorio para registrar salida`);
    
    // Registrar salida
    const updatedVisita = await repository.registrarSalida(id, usuarioSalidaId);
    
    logger.info(`Servicio: Salida registrada exitosamente para visita ID: ${id}`);
    logger.info(`Servicio: Visita actualizada:`, updatedVisita);
    
    return updatedVisita;
    
  } catch (error) {
    logger.error(`Error registrando salida para visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Registrar salida de visita con fecha y hora específicas (para sincronización offline)
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @param {string} fechaSalida - Fecha de salida en formato YYYY-MM-DD
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Visita actualizada
 */
const registrarSalidaVisitaConFechaHora = async (id, usuarioSalidaId, fechaSalida, horaSalida) => {
  try {
    logger.info(`Servicio: Verificando si la visita ID ${id} existe para registro con fecha/hora específica`);
    
    // Verificar si la visita existe
    const visita = await repository.findById(id);
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    logger.info(`Servicio: Visita encontrada:`, visita);
    
    // Verificar si la visita ya tiene salida registrada
    if (visita.fecha_salida) {
      logger.info(`Servicio: La visita ya tiene salida registrada: ${visita.fecha_salida}`);
      throw new AppError('La visita ya tiene salida registrada', 400);
    }
    
    logger.info(`Servicio: Llamando al repositorio para registrar salida con fecha/hora específica`);
    
    // Registrar salida con fecha y hora específicas
    const updatedVisita = await repository.registrarSalidaConFechaHora(id, usuarioSalidaId, fechaSalida, horaSalida);
    
    logger.info(`Servicio: Salida registrada exitosamente para visita ID: ${id} con fecha: ${fechaSalida}, hora: ${horaSalida}`);
    logger.info(`Servicio: Visita actualizada:`, updatedVisita);
    
    return updatedVisita;
    
  } catch (error) {
    logger.error(`Error registrando salida con fecha/hora para visita ID ${id}:`, error);
    throw error;
  }
};

/**
 * Obtener estadísticas de visitas
 * @param {Object} options - Opciones de filtrado
 * @returns {Object} Estadísticas de visitas
 */
const getEstadisticas = async (options = {}) => {
  const { fechaInicio, fechaFin } = options;
  
  try {
    const stats = await repository.getEstadisticas(fechaInicio, fechaFin);
    return stats;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de visitas:', error);
    throw error;
  }
};

/**
 * Exportar visitas a Excel
 * @param {Object} filtros - Filtros para la consulta
 * @returns {Buffer} Buffer del archivo Excel
 */
const exportarAExcel = async (filtros = {}, themeName = 'corporate') => {
  try {
    // Obtener configuración de estilos
    const theme = getTheme(themeName);
    const styles = theme.excel;
    
    // Obtener todos los datos sin paginación
    const result = await repository.findAll({
      search: filtros.q || '',
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      areaId: filtros.areaId ? parseInt(filtros.areaId) : undefined,
      motivoVisitaId: filtros.motivoVisitaId ? parseInt(filtros.motivoVisitaId) : undefined,
      personalVisitadoId: filtros.personalVisitadoId ? parseInt(filtros.personalVisitadoId) : undefined,
      documentoVisitante: filtros.documentoVisitante
    }, false); // false = sin paginación
    
    const visitas = result.visitas;
    
    // Crear el libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Control de Acceso UGEL';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Historial de Visitas');
    
    // Definir las columnas usando configuración
    worksheet.columns = [
      { header: 'N°', key: 'numero', width: styles.dimensions.columnWidths.numero },
      { header: 'Visitante', key: 'visitante', width: styles.dimensions.columnWidths.visitante },
      { header: 'Documento', key: 'documento', width: styles.dimensions.columnWidths.documento },
      { header: 'Empleado Visitado', key: 'empleado', width: styles.dimensions.columnWidths.empleado },
      { header: 'Cargo', key: 'cargo', width: styles.dimensions.columnWidths.cargo },
      { header: 'Motivo', key: 'motivo', width: styles.dimensions.columnWidths.motivo },
      { header: 'Lugar', key: 'lugar', width: styles.dimensions.columnWidths.lugar },
      { header: 'Fecha Ingreso', key: 'fechaIngreso', width: styles.dimensions.columnWidths.fechaIngreso },
      { header: 'Fecha Salida', key: 'fechaSalida', width: styles.dimensions.columnWidths.fechaSalida },
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
    
    // Agregar bordes a la cabecera
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Agregar los datos
    visitas.forEach((visita, index) => {
      const row = worksheet.addRow({
        numero: index + 1,
        visitante: `${visita.visitante_nombres} ${visita.visitante_apellidos}`,
        documento: visita.numero_documento,
        empleado: visita.personal_nombres ? `${visita.personal_nombres} ${visita.personal_apellidos}` : 'N/A',
        cargo: visita.personal_cargo || 'N/A',
        motivo: visita.nombre_motivo,
        lugar: visita.nombre_area,
        fechaIngreso: visita.fecha_ingreso ? new Date(visita.fecha_ingreso).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : 'N/A',
        fechaSalida: visita.fecha_salida ? new Date(visita.fecha_salida).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : 'Aún dentro',
        usuarioRegistro: visita.usuario_ingreso || 'N/A'
      });
      
      // Estilo alternado para las filas usando configuración
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
      
      // Agregar bordes a cada celda usando configuración
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: styles.colors.border } },
          left: { style: 'thin', color: { argb: styles.colors.border } },
          bottom: { style: 'thin', color: { argb: styles.colors.border } },
          right: { style: 'thin', color: { argb: styles.colors.border } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });
      
      // Centrar la columna de número
      row.getCell('numero').alignment = { vertical: 'middle', horizontal: 'center' };
    });
    
    // Agregar información adicional al final
    const footerRowNum = worksheet.rowCount + 2;
    const footerRow = worksheet.getRow(footerRowNum);
    footerRow.getCell(1).value = `Total de registros: ${visitas.length}`;
    footerRow.getCell(1).font = { bold: true, size: 10 };
    
    const dateRow = worksheet.getRow(footerRowNum + 1);
    dateRow.getCell(1).value = `Generado el: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`;
    dateRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
    
    // Generar el buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
    
  } catch (error) {
    logger.error('Error exportando a Excel:', error);
    throw error;
  }
};

/**
 * Exportar visitas a PDF
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
      areaId: filtros.areaId ? parseInt(filtros.areaId) : undefined,
      motivoVisitaId: filtros.motivoVisitaId ? parseInt(filtros.motivoVisitaId) : undefined,
      personalVisitadoId: filtros.personalVisitadoId ? parseInt(filtros.personalVisitadoId) : undefined,
      documentoVisitante: filtros.documentoVisitante
    }, false); // false = sin paginación
    
    const visitas = result.visitas;
    
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
        
        // Configuración de colores - PERSONALIZABLE
        const primaryColor = '#1F2937'; // Gris oscuro (antes era azul)
        const textColor = '#374151'; // Gris medio
        const lightGray = '#F9FAFB'; // Gris muy claro
        const accentColor = '#059669'; // Verde para acentos
        
        // Calcular ancho total de la tabla
        const columnWidths = [25, 95, 60, 95, 80, 75, 75, 70, 70, 65];
        const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const tableX = doc.page.margins.left + (pageWidth - totalTableWidth) / 2;
        
        // Función para dibujar encabezado de página
        const drawPageHeader = () => {
          // Título principal
          doc.fontSize(20)
             .fillColor(primaryColor)
             .font('Helvetica-Bold')
             .text('HISTORIAL DE VISITAS', doc.page.margins.left, 40, { align: 'center' });
          
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
          
          doc.text(`Total de registros: ${visitas.length}`, doc.page.margins.left, 115, { align: 'left' });
          
          // Línea separadora
          doc.moveTo(doc.page.margins.left, 135)
             .lineTo(doc.page.width - doc.page.margins.right, 135)
             .stroke('#D1D5DB');
        };
        
        // Dibujar encabezado en la primera página
        drawPageHeader();
        
        // Preparar datos para la tabla
        const table = {
          headers: [
            { label: 'N°', width: 25, align: 'center' },
            { label: 'Visitante', width: 95, align: 'left' },
            { label: 'Documento', width: 60, align: 'left' },
            { label: 'Empleado', width: 95, align: 'left' },
            { label: 'Cargo', width: 80, align: 'left' },
            { label: 'Motivo', width: 75, align: 'left' },
            { label: 'Lugar', width: 75, align: 'left' },
            { label: 'F. Ingreso', width: 70, align: 'left' },
            { label: 'F. Salida', width: 70, align: 'left' },
            { label: 'Usuario', width: 65, align: 'left' }
          ],
          rows: visitas.map((visita, index) => [
            index + 1,
            `${visita.visitante_nombres} ${visita.visitante_apellidos}`.substring(0, 30),
            visita.numero_documento || 'N/A',
            visita.personal_nombres ? `${visita.personal_nombres} ${visita.personal_apellidos}`.substring(0, 28) : 'N/A',
            (visita.personal_cargo || 'N/A').substring(0, 25),
            (visita.nombre_motivo || 'N/A').substring(0, 22),
            (visita.nombre_area || 'N/A').substring(0, 22),
            visita.fecha_ingreso 
              ? new Date(visita.fecha_ingreso).toLocaleString('es-PE', { 
                  timeZone: 'America/Lima',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'N/A',
            visita.fecha_salida 
              ? new Date(visita.fecha_salida).toLocaleString('es-PE', { 
                  timeZone: 'America/Lima',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Dentro',
            (visita.usuario_ingreso || 'N/A').substring(0, 18)
          ])
        };
        
        // Dibujar la tabla usando pdfkit-table
        doc.table(table, {
          x: tableX,
          y: 150, // Espacio después del encabezado
          width: totalTableWidth,
          padding: 5,
          columnSpacing: 5,
          prepareHeader: () => {
            if (doc.y > 150) { // Si no es la primera página, dibujar encabezado
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
        
        // Finalizar el documento
        doc.end();
        
      } catch (error) {
        logger.error('Error generando PDF:', error);
        reject(error);
      }
    });
    
  } catch (error) {
    logger.error('Error exportando a PDF:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas de visitas por área
 * @param {string} periodo - Periodo de tiempo ('hoy', 'semana', 'mes', 'anio', 'todo')
 * @returns {Array} Array de objetos con nombre_area y visitas
 */
const getVisitasPorArea = async (periodo = 'todo') => {
  try {
    logger.info(`Obteniendo estadísticas por área para periodo: ${periodo}`);
    
    // Calcular fechas según el periodo
    let fechaInicio, fechaFin;
    const ahora = new Date();
    
    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
        break;
      case 'semana':
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - ahora.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        fechaInicio = inicioSemana;
        fechaFin = new Date(inicioSemana);
        fechaFin.setDate(inicioSemana.getDate() + 6);
        fechaFin.setHours(23, 59, 59);
        break;
      case 'mes':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'anio':
        fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'todo':
      default:
        fechaInicio = null;
        fechaFin = null;
        break;
    }
    
    // Obtener estadísticas del repositorio
    const estadisticas = await repository.getVisitasPorArea(fechaInicio, fechaFin);
    
    logger.info(`Estadísticas obtenidas: ${estadisticas.length} áreas`);
    
    return estadisticas;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas por área:', error);
    throw error;
  }
};

const getVisitasPorMotivo = async (periodo = 'todo') => {
  try {
    logger.info(`Obteniendo estadísticas por motivo para periodo: ${periodo}`);
    
    // Calcular fechas según el periodo
    let fechaInicio, fechaFin;
    const ahora = new Date();
    
    switch (periodo) {
      case 'hoy':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
        break;
      case 'semana':
        const inicioSemana = new Date(ahora);
        inicioSemana.setDate(ahora.getDate() - ahora.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        fechaInicio = inicioSemana;
        fechaFin = new Date(inicioSemana);
        fechaFin.setDate(inicioSemana.getDate() + 6);
        fechaFin.setHours(23, 59, 59);
        break;
      case 'mes':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        fechaFin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'anio':
        fechaInicio = new Date(ahora.getFullYear(), 0, 1);
        fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'todo':
      default:
        fechaInicio = null;
        fechaFin = null;
        break;
    }
    
    // Obtener estadísticas del repositorio
    const estadisticas = await repository.getVisitasPorMotivo(fechaInicio, fechaFin);
    
    logger.info(`Estadísticas obtenidas: ${estadisticas.length} motivos`);
    
    return estadisticas;
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas por motivo:', error);
    throw error;
  }
};

module.exports = {
  getAllVisitas,
  getVisitasActivas,
  getVisitaById,
  createVisita,
  registrarSalidaVisita,
  registrarSalidaVisitaConFechaHora,
  getEstadisticas,
  exportarAExcel,
  exportarAPDF,
  getVisitasPorArea,
  getVisitasPorMotivo
};