/**
 * Utilidades para exportación de estadísticas a PDF y Excel
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Captura un gráfico de Chart.js como imagen base64
 * @param {Object} chartRef - Referencia al chart de Chart.js
 * @returns {string|null} - Imagen en formato base64 o null si falla
 */
export const captureChartJSImage = (chartRef) => {
  try {
    if (!chartRef || !chartRef.current) {
      console.warn('[Export] No se encontró referencia al gráfico Chart.JS');
      return null;
    }
    
    // Chart.js expone el método toBase64Image
    const base64Image = chartRef.current.toBase64Image('image/png', 1);
    return base64Image;
  } catch (error) {
    console.error('[Export] Error capturando imagen de Chart.JS:', error);
    return null;
  }
};

/**
 * Captura un gráfico de Recharts como imagen base64
 * @param {Object} containerRef - Referencia al contenedor del gráfico Recharts
 * @returns {Promise<string|null>} - Imagen en formato base64 o null si falla
 */
export const captureRechartsImage = async (containerRef) => {
  try {
    if (!containerRef || !containerRef.current) {
      console.warn('[Export] No se encontró referencia al contenedor Recharts');
      return null;
    }

    // Buscar el SVG dentro del contenedor
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) {
      console.warn('[Export] No se encontró elemento SVG en el contenedor');
      return null;
    }

    // Clonar el SVG para no afectar el original
    const svgClone = svgElement.cloneNode(true);
    
    // Obtener dimensiones
    const bbox = svgElement.getBoundingClientRect();
    const width = bbox.width || 500;
    const height = bbox.height || 500;

    // Crear un canvas temporal
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // 2x para mejor calidad
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    
    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convertir SVG a string
    const svgString = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Crear imagen y dibujar en canvas
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const base64 = canvas.toDataURL('image/png', 1.0);
        resolve(base64);
      };
      img.onerror = () => {
        console.error('[Export] Error cargando imagen SVG');
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    console.error('[Export] Error capturando imagen de Recharts:', error);
    return null;
  }
};

/**
 * Formatea una fecha para usar en nombres de archivo
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
export const formatFechaArchivo = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Formatea una fecha para mostrar en reportes
 * @returns {string} - Fecha en formato DD/MM/YYYY HH:MM
 */
export const formatFechaReporte = () => {
  const now = new Date();
  const dia = String(now.getDate()).padStart(2, '0');
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const anio = now.getFullYear();
  const hora = String(now.getHours()).padStart(2, '0');
  const minuto = String(now.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
};

/**
 * Obtiene el nombre del período en español
 * @param {string} periodo - Código del período (hoy, semana, mes, anio, todo)
 * @returns {string} - Nombre del período
 */
export const getNombrePeriodo = (periodo) => {
  const periodos = {
    'hoy': 'Hoy',
    'semana': 'Esta Semana',
    'mes': 'Este Mes',
    'anio': 'Este Año',
    'todo': 'Todo el Historial'
  };
  return periodos[periodo] || 'Período Personalizado';
};

/**
 * Genera un reporte PDF con gráficos y tablas
 * @param {Object} config - Configuración del reporte
 * @param {string} config.titulo - Título del reporte
 * @param {string} config.subtitulo - Subtítulo del reporte
 * @param {string} config.periodo - Período del reporte
 * @param {Array} config.tablas - Array de objetos con datos de tablas
 * @param {Array} config.graficos - Array de objetos con imágenes de gráficos
 * @param {Object} config.resumen - Objeto con datos de resumen
 * @param {string} config.nombreArchivo - Nombre base del archivo
 */
export const generatePdfReport = async (config) => {
  try {
    const {
      titulo = 'Reporte de Estadísticas',
      subtitulo = '',
      periodo = 'todo',
      tablas = [],
      graficos = [],
      resumen = {},
      nombreArchivo = 'reporte_estadisticas'
    } = config;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // ========== ENCABEZADO ==========
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text(titulo, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    if (subtitulo) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128); // gray-500
      doc.text(subtitulo, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
    }

    // Período y fecha
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Período: ${getNombrePeriodo(periodo)}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Generado: ${formatFechaReporte()}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Línea separadora
    doc.setDrawColor(229, 231, 235); // gray-200
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // ========== RESUMEN (si existe) ==========
    if (resumen && Object.keys(resumen).length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Resumen', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);

      Object.entries(resumen).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 25, yPos);
        yPos += 6;
      });
      yPos += 5;
    }

    // ========== GRÁFICOS ==========
    for (const grafico of graficos) {
      if (!grafico.imagen) continue;

      // Verificar si necesitamos nueva página
      if (yPos + 100 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      // Título del gráfico
      if (grafico.titulo) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(grafico.titulo, 20, yPos);
        yPos += 8;
      }

      // Insertar imagen
      const imgWidth = grafico.width || 170;
      const imgHeight = grafico.height || 90;
      const imgX = (pageWidth - imgWidth) / 2;

      try {
        doc.addImage(grafico.imagen, 'PNG', imgX, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      } catch (error) {
        console.error('[PDF] Error insertando imagen:', error);
      }
    }

    // ========== TABLAS ==========
    for (const tabla of tablas) {
      // Verificar si necesitamos nueva página
      if (yPos + 40 > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }

      // Título de la tabla
      if (tabla.titulo) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(tabla.titulo, 20, yPos);
        yPos += 8;
      }

      // Generar tabla
      autoTable(doc, {
        startY: yPos,
        head: [tabla.columnas || ['Nombre', 'Cantidad', 'Porcentaje']],
        body: tabla.datos || [],
        theme: 'striped',
        headStyles: {
          fillColor: [59, 130, 246], // blue-500
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [31, 41, 55]
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] // gray-50
        },
        margin: { left: 20, right: 20 },
        didDrawPage: (data) => {
          yPos = data.cursor.y + 10;
        }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // ========== PIE DE PÁGINA ==========
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text(
        `Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Sistema Integral de Control de Acceso - UGEL Talara',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // Guardar PDF
    const nombreCompleto = `${nombreArchivo}_${formatFechaArchivo()}.pdf`;
    doc.save(nombreCompleto);
    
    return { success: true, filename: nombreCompleto };
  } catch (error) {
    console.error('[PDF] Error generando reporte:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Genera un reporte Excel con gráficos y tablas
 * @param {Object} config - Configuración del reporte (igual que generatePdfReport)
 */
export const generateExcelReport = async (config) => {
  try {
    const {
      titulo = 'Reporte de Estadísticas',
      subtitulo = '',
      periodo = 'todo',
      tablas = [],
      graficos = [],
      resumen = {},
      nombreArchivo = 'reporte_estadisticas'
    } = config;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema UGEL';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Estadísticas');

    let currentRow = 1;

    // ========== ENCABEZADO ==========
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const titleCell = worksheet.getCell(`A${currentRow}`);
    titleCell.value = titulo;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 1;

    if (subtitulo) {
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const subtitleCell = worksheet.getCell(`A${currentRow}`);
      subtitleCell.value = subtitulo;
      subtitleCell.font = { size: 12, color: { argb: 'FF6B7280' } };
      subtitleCell.alignment = { horizontal: 'center' };
      currentRow += 1;
    }

    // Período y fecha
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const periodoCell = worksheet.getCell(`A${currentRow}`);
    periodoCell.value = `Período: ${getNombrePeriodo(periodo)} | Generado: ${formatFechaReporte()}`;
    periodoCell.font = { size: 10, color: { argb: 'FF6B7280' } };
    periodoCell.alignment = { horizontal: 'center' };
    currentRow += 2;

    // ========== RESUMEN ==========
    if (resumen && Object.keys(resumen).length > 0) {
      const resumenTitleCell = worksheet.getCell(`A${currentRow}`);
      resumenTitleCell.value = 'RESUMEN';
      resumenTitleCell.font = { size: 12, bold: true };
      currentRow += 1;

      Object.entries(resumen).forEach(([key, value]) => {
        worksheet.getCell(`A${currentRow}`).value = key;
        worksheet.getCell(`B${currentRow}`).value = value;
        worksheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow += 1;
      });
      currentRow += 1;
    }

    // ========== TABLAS ==========
    for (const tabla of tablas) {
      if (tabla.titulo) {
        const tablaTitleCell = worksheet.getCell(`A${currentRow}`);
        tablaTitleCell.value = tabla.titulo;
        tablaTitleCell.font = { size: 12, bold: true };
        currentRow += 1;
      }

      // Encabezados
      const columnas = tabla.columnas || ['Nombre', 'Cantidad', 'Porcentaje'];
      columnas.forEach((col, index) => {
        const cell = worksheet.getCell(currentRow, index + 1);
        cell.value = col;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      currentRow += 1;

      // Datos
      (tabla.datos || []).forEach((fila) => {
        fila.forEach((valor, index) => {
          worksheet.getCell(currentRow, index + 1).value = valor;
        });
        currentRow += 1;
      });
      currentRow += 2;
    }

    // ========== GRÁFICOS ==========
    for (let i = 0; i < graficos.length; i++) {
      const grafico = graficos[i];
      if (!grafico.imagen) continue;

      try {
        // Extraer datos base64
        const base64Data = grafico.imagen.split(',')[1];
        
        const imageId = workbook.addImage({
          base64: base64Data,
          extension: 'png',
        });

        // Posicionar imagen
        const col = i % 2 === 0 ? 'F' : 'L'; // Alternar columnas
        const row = currentRow + Math.floor(i / 2) * 25;

        worksheet.addImage(imageId, {
          tl: { col: col.charCodeAt(0) - 65, row: row - 1 },
          ext: { width: 350, height: 250 }
        });
      } catch (error) {
        console.error('[Excel] Error insertando imagen:', error);
      }
    }

    // Ajustar anchos de columna
    worksheet.columns = [
      { width: 30 },
      { width: 15 },
      { width: 15 },
      { width: 15 }
    ];

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const nombreCompleto = `${nombreArchivo}_${formatFechaArchivo()}.xlsx`;
    saveAs(blob, nombreCompleto);

    return { success: true, filename: nombreCompleto };
  } catch (error) {
    console.error('[Excel] Error generando reporte:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Prepara datos de tabla para exportación
 * @param {Array} data - Datos crudos
 * @param {Object} config - Configuración de mapeo
 * @returns {Array} - Datos formateados para tabla
 */
export const prepareTableData = (data, config = {}) => {
  const {
    nameKey = 'nombre',
    countKey = 'count',
    total = 0
  } = config;

  if (!Array.isArray(data)) return [];

  return data.map(item => {
    const nombre = item[nameKey] || item.nombre_area || item.nombre || 'N/A';
    const cantidad = parseInt(item[countKey] || item.visitas || item.valor || 0);
    const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(1) : '0.0';

    return [nombre, cantidad, `${porcentaje}%`];
  });
};
