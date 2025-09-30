# 🎨 Guía de Personalización de Exportaciones

## 📋 Resumen

Ahora puedes personalizar completamente el diseño, colores y tipografías de las exportaciones a Excel y PDF. Se ha creado un sistema de configuración flexible que permite:

- ✅ Cambiar colores de fondo, texto y bordes
- ✅ Modificar tipografías y tamaños de fuente
- ✅ Ajustar dimensiones de columnas y filas
- ✅ Usar temas predefinidos
- ✅ Crear temas personalizados

## 🎯 Ubicación de Archivos

- **Configuración**: `ugel-api/src/config/exportStyles.js`
- **Implementación**: `ugel-api/src/api/visitas/visitas.service.js`

## 🎨 Temas Disponibles

### 1. **Tema Corporativo** (actual)
```javascript
// Colores: Gris oscuro profesional
colors: {
  headerBackground: '#1F2937', // Gris oscuro
  headerText: '#FFFFFF',       // Blanco
  dataText: '#1F2937',         // Gris oscuro
  alternateRow: '#F8FAFC',     // Gris muy claro
  border: '#D1D5DB'            // Gris claro
}
```

### 2. **Tema Clásico**
```javascript
// Colores: Azul marino tradicional
colors: {
  headerBackground: '#000080', // Azul marino
  headerText: '#FFFFFF',        // Blanco
  dataText: '#000000',         // Negro
  alternateRow: '#F0F8FF',      // Azul muy claro
  border: '#000000'             // Negro
}
```

### 3. **Tema Moderno**
```javascript
// Colores: Verde moderno
colors: {
  headerBackground: '#059669', // Verde
  headerText: '#FFFFFF',       // Blanco
  dataText: '#111827',         // Gris muy oscuro
  alternateRow: '#F0FDF4',     // Verde muy claro
  border: '#10B981'             // Verde medio
}
```

## 🔧 Cómo Cambiar el Tema

### Opción 1: Cambiar en el Código

En `ugel-api/src/api/visitas/visitas.service.js`, línea 291:

```javascript
// Cambiar de 'corporate' a otro tema
const exportarAExcel = async (filtros = {}, themeName = 'modern') => {
```

### Opción 2: Agregar Parámetro en el Controlador

Modificar `ugel-api/src/api/visitas/visitas.controller.js`:

```javascript
const exportarAExcel = asyncHandler(async (req, res) => {
  const filtros = req.query;
  const theme = req.query.theme || 'corporate'; // Nuevo parámetro
  
  const buffer = await service.exportarAExcel(filtros, theme);
  // ... resto del código
});
```

## 🎨 Personalización Avanzada

### 1. **Cambiar Colores Específicos**

En `ugel-api/src/config/exportStyles.js`:

```javascript
// Personalizar colores del tema corporativo
const customTheme = {
  excel: {
    ...excelStyles,
    colors: {
      headerBackground: 'FFDC2626', // Rojo
      headerText: 'FFFFFFFF',       // Blanco
      dataText: 'FF111827',         // Gris muy oscuro
      alternateRow: 'FFFEF2F2',     // Rojo muy claro
      border: 'FFEF4444'            // Rojo medio
    }
  }
};
```

### 2. **Cambiar Tipografías**

```javascript
// Personalizar fuentes
const customTheme = {
  excel: {
    ...excelStyles,
    fonts: {
      header: {
        name: 'Times New Roman',
        size: 14,
        bold: true
      },
      data: {
        name: 'Times New Roman',
        size: 11,
        bold: false
      }
    }
  }
};
```

### 3. **Cambiar Dimensiones**

```javascript
// Personalizar anchos de columnas
const customTheme = {
  excel: {
    ...excelStyles,
    dimensions: {
      headerHeight: 35,
      columnWidths: {
        numero: 8,
        visitante: 40,
        documento: 20,
        empleado: 40,
        cargo: 30,
        motivo: 30,
        lugar: 30,
        fechaIngreso: 25,
        fechaSalida: 25,
        usuarioRegistro: 25
      }
    }
  }
};
```

## 📊 Ejemplos de Personalización

### Ejemplo 1: Tema Institucional (Azul y Blanco)

```javascript
const institutionalTheme = {
  excel: {
    colors: {
      headerBackground: 'FF1E40AF', // Azul institucional
      headerText: 'FFFFFFFF',
      dataText: 'FF1F2937',
      alternateRow: 'FFF1F5F9',
      border: 'FF3B82F6'
    },
    fonts: {
      header: { name: 'Arial', size: 12, bold: true },
      data: { name: 'Arial', size: 10, bold: false }
    }
  }
};
```

### Ejemplo 2: Tema Minimalista (Gris y Blanco)

```javascript
const minimalistTheme = {
  excel: {
    colors: {
      headerBackground: 'FF6B7280', // Gris medio
      headerText: 'FFFFFFFF',
      dataText: 'FF374151',
      alternateRow: 'FFFFFFFF', // Sin alternado
      border: 'FFE5E7EB'
    },
    fonts: {
      header: { name: 'Helvetica', size: 11, bold: true },
      data: { name: 'Helvetica', size: 9, bold: false }
    }
  }
};
```

### Ejemplo 3: Tema Colorido (Arcoíris)

```javascript
const colorfulTheme = {
  excel: {
    colors: {
      headerBackground: 'FF8B5CF6', // Púrpura
      headerText: 'FFFFFFFF',
      dataText: 'FF1F2937',
      alternateRow: 'FFF3E8FF', // Púrpura muy claro
      border: 'FFA855F7'
    },
    fonts: {
      header: { name: 'Segoe UI', size: 13, bold: true },
      data: { name: 'Segoe UI', size: 10, bold: false }
    }
  }
};
```

## 🎯 Personalización de PDF

### Cambiar Colores del PDF

```javascript
const pdfTheme = {
  colors: {
    primary: '#DC2626',    // Rojo para títulos
    text: '#374151',       // Gris para texto
    lightGray: '#FEF2F2', // Rojo muy claro para filas
    accent: '#059669',    // Verde para acentos
    white: '#FFFFFF'
  }
};
```

### Cambiar Fuentes del PDF

```javascript
const pdfTheme = {
  fonts: {
    title: { name: 'Times-Bold', size: 22 },
    subtitle: { name: 'Times-Roman', size: 12 },
    header: { name: 'Times-Bold', size: 10 },
    data: { name: 'Times-Roman', size: 9 },
    footer: { name: 'Times-Roman', size: 9 }
  }
};
```

## 🚀 Cómo Aplicar Cambios

### 1. **Cambio Rápido (Tema Predefinido)**

1. Abre `ugel-api/src/api/visitas/visitas.service.js`
2. Busca la línea 291: `const exportarAExcel = async (filtros = {}, themeName = 'corporate') => {`
3. Cambia `'corporate'` por `'modern'` o `'classic'`
4. Reinicia el servidor: `npm run dev`

### 2. **Cambio Personalizado**

1. Abre `ugel-api/src/config/exportStyles.js`
2. Modifica los valores en `excelStyles` o `pdfStyles`
3. Reinicia el servidor

### 3. **Crear Nuevo Tema**

1. En `exportStyles.js`, agrega tu tema en el objeto `themes`:

```javascript
themes: {
  // ... temas existentes
  miTema: {
    excel: {
      colors: { /* tus colores */ },
      fonts: { /* tus fuentes */ },
      dimensions: { /* tus dimensiones */ }
    },
    pdf: {
      colors: { /* tus colores */ },
      fonts: { /* tus fuentes */ },
      dimensions: { /* tus dimensiones */ }
    }
  }
}
```

2. Usa el tema: `themeName = 'miTema'`

## 🎨 Paleta de Colores Sugerida

### Colores Profesionales
- **Azul Corporativo**: `#1E40AF`
- **Gris Profesional**: `#1F2937`
- **Verde Empresarial**: `#059669`
- **Rojo Institucional**: `#DC2626`

### Colores Suaves
- **Azul Claro**: `#DBEAFE`
- **Gris Claro**: `#F9FAFB`
- **Verde Claro**: `#F0FDF4`
- **Rosa Claro**: `#FDF2F8`

### Colores de Texto
- **Negro**: `#000000`
- **Gris Oscuro**: `#1F2937`
- **Gris Medio**: `#374151`
- **Gris Claro**: `#6B7280`

## 📝 Códigos de Color

### Formato ARGB (para Excel)
```
FF + código hexadecimal
Ejemplo: FF2563EB = Azul con transparencia
```

### Formato Hexadecimal (para PDF)
```
# + código hexadecimal
Ejemplo: #2563EB = Azul
```

## 🔍 Verificar Cambios

1. **Reinicia el servidor backend**
2. **Ve al frontend y exporta un archivo**
3. **Verifica que los cambios se aplicaron correctamente**

## 🐛 Solución de Problemas

### Los cambios no se aplican
- ✅ Verifica que reiniciaste el servidor
- ✅ Verifica que no hay errores de sintaxis en `exportStyles.js`
- ✅ Verifica que el tema existe en la configuración

### Error de fuente
- ✅ Usa fuentes estándar: Arial, Calibri, Times New Roman, Helvetica
- ✅ Verifica que la fuente esté disponible en el sistema

### Error de color
- ✅ Verifica el formato del color (ARGB para Excel, Hex para PDF)
- ✅ Usa códigos de color válidos

---

## ✨ ¡Listo para Personalizar!

Ahora tienes control total sobre el diseño de las exportaciones. Puedes crear temas únicos que reflejen la identidad visual de tu organización.

**¿Necesitas ayuda con algún tema específico?** ¡Solo dime qué colores y estilos prefieres y te ayudo a configurarlo! 🎨
