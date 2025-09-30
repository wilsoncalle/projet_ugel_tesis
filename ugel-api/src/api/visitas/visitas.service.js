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
const PDFDocument = require('pdfkit');
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
      usuarioIngresoId
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
    
    // Crear la visita
    const newVisita = await repository.create({
      visitante_id: visitante.id,
      area_destino_id: areaDestinoId,
      personal_visitado_id: personalVisitadoId || null,
      motivo_visita_id: motivoVisitaId,
      fecha_ingreso: new Date(),
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
        
        // Encabezado del documento - PERSONALIZABLE
        doc.fontSize(20) // Tamaño más grande
           .fillColor(primaryColor)
           .font('Helvetica-Bold') // Fuente: Helvetica-Bold, Times-Bold, Courier-Bold
           .text('HISTORIAL DE VISITAS', { align: 'center' });
        
        doc.fontSize(11) // Tamaño más grande
           .fillColor(textColor)
           .font('Helvetica') // Fuente: Helvetica, Times-Roman, Courier
           .text('Sistema de Control de Acceso - UGEL Talara', { align: 'center' });
        
        doc.moveDown();
        
        // Información de filtros aplicados
        doc.fontSize(9)
           .fillColor('#6B7280')
           .text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`, { align: 'right' });
        
        if (filtros.fechaInicio || filtros.fechaFin) {
          let rangoText = 'Rango de fechas: ';
          if (filtros.fechaInicio) rangoText += `Desde ${filtros.fechaInicio} `;
          if (filtros.fechaFin) rangoText += `Hasta ${filtros.fechaFin}`;
          doc.text(rangoText, { align: 'right' });
        }
        
        doc.text(`Total de registros: ${visitas.length}`, { align: 'right' });
        
        doc.moveDown();
        
        // Configuración de la tabla
        const tableTop = doc.y;
        const itemHeight = 25;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        
        // Anchos de columnas optimizados
        const columnWidths = {
          num: 25,
          visitante: 95,
          documento: 60,
          empleado: 95,
          cargo: 80,
          motivo: 75,
          lugar: 75,
          ingreso: 70,
          salida: 70,
          usuario: 65
        };
        
        let currentY = tableTop;
        
        // Función para dibujar encabezado de tabla
        const drawTableHeader = (y) => {
          // Fondo del encabezado
          doc.rect(doc.page.margins.left, y, pageWidth, itemHeight)
             .fillAndStroke(primaryColor, primaryColor);
          
          // Texto del encabezado - PERSONALIZABLE
          doc.fontSize(9) // Tamaño más grande
             .fillColor('#FFFFFF')
             .font('Helvetica-Bold'); // Fuente: Helvetica-Bold, Times-Bold, Courier-Bold
          
          let x = doc.page.margins.left + 3;
          const headerY = y + 8;
          
          doc.text('N°', x, headerY, { width: columnWidths.num, align: 'center' });
          x += columnWidths.num;
          
          doc.text('Visitante', x, headerY, { width: columnWidths.visitante, align: 'left' });
          x += columnWidths.visitante;
          
          doc.text('Documento', x, headerY, { width: columnWidths.documento, align: 'left' });
          x += columnWidths.documento;
          
          doc.text('Empleado', x, headerY, { width: columnWidths.empleado, align: 'left' });
          x += columnWidths.empleado;
          
          doc.text('Cargo', x, headerY, { width: columnWidths.cargo, align: 'left' });
          x += columnWidths.cargo;
          
          doc.text('Motivo', x, headerY, { width: columnWidths.motivo, align: 'left' });
          x += columnWidths.motivo;
          
          doc.text('Lugar', x, headerY, { width: columnWidths.lugar, align: 'left' });
          x += columnWidths.lugar;
          
          doc.text('F. Ingreso', x, headerY, { width: columnWidths.ingreso, align: 'left' });
          x += columnWidths.ingreso;
          
          doc.text('F. Salida', x, headerY, { width: columnWidths.salida, align: 'left' });
          x += columnWidths.salida;
          
          doc.text('Usuario', x, headerY, { width: columnWidths.usuario, align: 'left' });
          
          return y + itemHeight;
        };
        
        // Dibujar encabezado inicial
        currentY = drawTableHeader(currentY);
        
        // Dibujar filas de datos - PERSONALIZABLE
        doc.font('Helvetica').fontSize(8).fillColor(textColor); // Fuente y tamaño personalizable
        
        visitas.forEach((visita, index) => {
          // Verificar si necesitamos una nueva página
          if (currentY + itemHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            currentY = doc.page.margins.top;
            currentY = drawTableHeader(currentY);
          }
          
          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(doc.page.margins.left, currentY, pageWidth, itemHeight)
               .fill(lightGray);
          }
          
          // Borde de la fila
          doc.rect(doc.page.margins.left, currentY, pageWidth, itemHeight)
             .stroke('#D1D5DB');
          
          let x = doc.page.margins.left + 3;
          const textY = currentY + 5;
          
          // Número
          doc.fillColor(textColor).text(index + 1, x, textY, { 
            width: columnWidths.num, 
            align: 'center',
            lineBreak: false
          });
          x += columnWidths.num;
          
          // Visitante
          const visitante = `${visita.visitante_nombres} ${visita.visitante_apellidos}`.substring(0, 30);
          doc.text(visitante, x, textY, { 
            width: columnWidths.visitante,
            lineBreak: false
          });
          x += columnWidths.visitante;
          
          // Documento
          doc.text(visita.numero_documento || 'N/A', x, textY, { 
            width: columnWidths.documento,
            lineBreak: false
          });
          x += columnWidths.documento;
          
          // Empleado
          const empleado = visita.personal_nombres 
            ? `${visita.personal_nombres} ${visita.personal_apellidos}`.substring(0, 28)
            : 'N/A';
          doc.text(empleado, x, textY, { 
            width: columnWidths.empleado,
            lineBreak: false
          });
          x += columnWidths.empleado;
          
          // Cargo
          const cargo = (visita.personal_cargo || 'N/A').substring(0, 25);
          doc.text(cargo, x, textY, { 
            width: columnWidths.cargo,
            lineBreak: false
          });
          x += columnWidths.cargo;
          
          // Motivo
          const motivo = (visita.nombre_motivo || 'N/A').substring(0, 22);
          doc.text(motivo, x, textY, { 
            width: columnWidths.motivo,
            lineBreak: false
          });
          x += columnWidths.motivo;
          
          // Lugar
          const lugar = (visita.nombre_area || 'N/A').substring(0, 22);
          doc.text(lugar, x, textY, { 
            width: columnWidths.lugar,
            lineBreak: false
          });
          x += columnWidths.lugar;
          
          // Fecha Ingreso
          const fechaIngreso = visita.fecha_ingreso 
            ? new Date(visita.fecha_ingreso).toLocaleString('es-PE', { 
                timeZone: 'America/Lima',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';
          doc.text(fechaIngreso, x, textY, { 
            width: columnWidths.ingreso,
            lineBreak: false
          });
          x += columnWidths.ingreso;
          
          // Fecha Salida
          const fechaSalida = visita.fecha_salida 
            ? new Date(visita.fecha_salida).toLocaleString('es-PE', { 
                timeZone: 'America/Lima',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Dentro';
          doc.text(fechaSalida, x, textY, { 
            width: columnWidths.salida,
            lineBreak: false
          });
          x += columnWidths.salida;
          
          // Usuario
          const usuario = (visita.usuario_ingreso || 'N/A').substring(0, 18);
          doc.text(usuario, x, textY, { 
            width: columnWidths.usuario,
            lineBreak: false
          });
          
          currentY += itemHeight;
        });
        
        // Pie de página en todas las páginas
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          
          // Línea separadora
          doc.moveTo(doc.page.margins.left, doc.page.height - 50)
             .lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 50)
             .stroke('#D1D5DB');
          
          // Texto del pie de página
          doc.fontSize(8)
             .fillColor('#6B7280')
             .text(
               `Sistema de Control de Acceso - UGEL Talara | Página ${i + 1} de ${range.count}`,
               doc.page.margins.left,
               doc.page.height - 35,
               { align: 'center' }
             );
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

module.exports = {
  getAllVisitas,
  getVisitasActivas,
  getVisitaById,
  createVisita,
  registrarSalidaVisita,
  getEstadisticas,
  exportarAExcel,
  exportarAPDF
};
