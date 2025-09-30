/**
 * Configuración de estilos para exportaciones
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

// ===== CONFIGURACIÓN DE EXCEL =====
const excelStyles = {
  // Colores (formato ARGB: FF + código hexadecimal)
  colors: {
    headerBackground: 'FF1F2937', // Gris oscuro
    headerText: 'FFFFFFFF', // Blanco
    dataText: 'FF1F2937', // Gris oscuro
    alternateRow: 'FFF8FAFC', // Gris muy claro
    border: 'FFD1D5DB' // Gris claro para bordes
  },
  
  // Fuentes
  fonts: {
    header: {
      name: 'Arial',
      size: 12,
      bold: true
    },
    data: {
      name: 'Calibri',
      size: 10,
      bold: false
    }
  },
  
  // Dimensiones
  dimensions: {
    headerHeight: 30,
    columnWidths: {
      numero: 6,
      visitante: 32,
      documento: 15,
      empleado: 32,
      cargo: 25,
      motivo: 25,
      lugar: 25,
      fechaIngreso: 20,
      fechaSalida: 20,
      usuarioRegistro: 22
    }
  }
};

// ===== CONFIGURACIÓN DE PDF =====
const pdfStyles = {
  // Colores (formato hexadecimal)
  colors: {
    primary: '#1F2937', // Gris oscuro
    text: '#374151', // Gris medio
    lightGray: '#F9FAFB', // Gris muy claro
    accent: '#059669', // Verde para acentos
    white: '#FFFFFF'
  },
  
  // Fuentes
  fonts: {
    title: {
      name: 'Helvetica-Bold',
      size: 20
    },
    subtitle: {
      name: 'Helvetica',
      size: 11
    },
    header: {
      name: 'Helvetica-Bold',
      size: 9
    },
    data: {
      name: 'Helvetica',
      size: 8
    },
    footer: {
      name: 'Helvetica',
      size: 8
    }
  },
  
  // Dimensiones
  dimensions: {
    page: {
      size: 'A4',
      layout: 'landscape',
      margin: 40
    },
    table: {
      itemHeight: 25,
      columnWidths: {
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
      }
    }
  }
};

// ===== TEMAS PREDEFINIDOS =====
const themes = {
  // Tema corporativo (actual)
  corporate: {
    excel: excelStyles,
    pdf: pdfStyles
  },
  
  // Tema clásico
  classic: {
    excel: {
      ...excelStyles,
      colors: {
        headerBackground: 'FF000080', // Azul marino
        headerText: 'FFFFFFFF',
        dataText: 'FF000000',
        alternateRow: 'FFF0F8FF',
        border: 'FF000000'
      },
      fonts: {
        header: { name: 'Times New Roman', size: 12, bold: true },
        data: { name: 'Times New Roman', size: 10, bold: false }
      }
    },
    pdf: {
      ...pdfStyles,
      colors: {
        primary: '#000080',
        text: '#000000',
        lightGray: '#F0F8FF',
        accent: '#800000',
        white: '#FFFFFF'
      },
      fonts: {
        title: { name: 'Times-Bold', size: 18 },
        subtitle: { name: 'Times-Roman', size: 10 },
        header: { name: 'Times-Bold', size: 8 },
        data: { name: 'Times-Roman', size: 7 },
        footer: { name: 'Times-Roman', size: 7 }
      }
    }
  },
  
  // Tema moderno
  modern: {
    excel: {
      ...excelStyles,
      colors: {
        headerBackground: 'FF059669', // Verde
        headerText: 'FFFFFFFF',
        dataText: 'FF111827',
        alternateRow: 'FFF0FDF4',
        border: 'FF10B981'
      },
      fonts: {
        header: { name: 'Segoe UI', size: 11, bold: true },
        data: { name: 'Segoe UI', size: 9, bold: false }
      }
    },
    pdf: {
      ...pdfStyles,
      colors: {
        primary: '#059669',
        text: '#111827',
        lightGray: '#F0FDF4',
        accent: '#DC2626',
        white: '#FFFFFF'
      },
      fonts: {
        title: { name: 'Helvetica-Bold', size: 22 },
        subtitle: { name: 'Helvetica', size: 12 },
        header: { name: 'Helvetica-Bold', size: 10 },
        data: { name: 'Helvetica', size: 9 },
        footer: { name: 'Helvetica', size: 9 }
      }
    }
  }
};

module.exports = {
  excelStyles,
  pdfStyles,
  themes,
  
  // Función para obtener un tema específico
  getTheme: (themeName = 'corporate') => {
    return themes[themeName] || themes.corporate;
  },
  
  // Función para personalizar colores
  customizeColors: (baseTheme, colorOverrides) => {
    const theme = { ...baseTheme };
    
    if (colorOverrides.excel) {
      theme.excel.colors = { ...theme.excel.colors, ...colorOverrides.excel };
    }
    
    if (colorOverrides.pdf) {
      theme.pdf.colors = { ...theme.pdf.colors, ...colorOverrides.pdf };
    }
    
    return theme;
  }
};
