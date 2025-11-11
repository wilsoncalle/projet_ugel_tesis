# 📤 GUÍA: Mejora de Exportaciones "Detalle de Datos" - PDF y Excel

**Fecha**: Noviembre 11, 2025  
**Versión**: 1.0  
**Módulos Afectados**: Visitantes, Asistencia Personal, Papeletas  

---

## 🎯 Objetivo

Mejorar la exportación de la tabla "Detalle de Datos" (Nombre | Cantidad | Porcentaje) en los tres módulos de estadísticas para que:

1. ✅ No salga vacía
2. ✅ Incluya los nombres correctos de categorías
3. ✅ Calcule correctamente los porcentajes
4. ✅ Use una lógica centralizada y reutilizable

---

## 📊 Estructura Actual de Datos

### Visitantes (✅ Ya funciona)

**Tabla en PDF/Excel**:
```
Nombre                    | Cantidad | Porcentaje
--------------------------|----------|----------
Reunión                   | 45       | 25.7%
Trámite                   | 38       | 21.7%
Consulta                  | 30       | 17.1%
```

**Origen de datos**: `VisitantesTabla.jsx` en `vigilante/`

**Referencia**: 
- Archivo: `src/components/vigilante/VisitantesTabla.jsx` (línea ~500)
- Hook: `useVisitasMotivo`, `useVisitasArea`
- Estructura de datos: `{ labels: [...], datasets: [{ data: [...] }] }`

---

### Asistencia de Personal (⚠️ NECESITA MEJORA)

**Tabla esperada**:
```
Nombre Empleado          | Presentes | Porcentaje
------------------------|------------|----------
Juan Pérez              | 20        | 95.2%
María García            | 19        | 90.5%
```

**Ubicación**: `src/components/personal_estadisticas/`
**Componentes**:
- `AsistenciasTotalesCard.jsx` - Total general
- `PuntualidadCard.jsx` - Puntualidad
- `AusenciasCard.jsx` - Ausencias
- `AreasCard.jsx` - Por área
- `PersonalCard.jsx` - Por empleado

**Problema**: La tabla "Detalle de Datos" podría no exportarse correctamente

---

### Papeletas de Salida (⚠️ NECESITA MEJORA)

**Tabla esperada**:
```
Motivo de Salida        | Cantidad | Porcentaje
------------------------|----------|----------
Médico                  | 12       | 15.8%
Personal                | 25       | 32.9%
```

**Ubicación**: `src/components/papeletas_estadisticas/`
**Componentes**:
- `PapeletasMotivosCard.jsx` - Por motivo
- `PapeletasAreasCard.jsx` - Por área
- `PapeletasEstadoCard.jsx` - Estado
- `PapeletasHorasCard.jsx` - Por horas

---

## 🔧 Solución: Funciones Centralizadas

### 1. Nueva Función en `exportHelpers.js`

```javascript
/**
 * Convierte datos de estadísticas a formato tabla para exportación
 * @param {Object} data - Datos de Chart.js: { labels, datasets }
 * @param {Object} config - Configuración { nameKey, countKey, labels }
 * @returns {Array} - Array de objetos con nombre, cantidad, porcentaje
 */
export const convertirEstadisticasATabla = (data, config = {}) => {
  try {
    if (!data) return [];
    
    const {
      nameKey = 'nombre',
      countKey = 'cantidad',
      percentageKey = 'porcentaje',
      useLabels = false,
      labelMap = {} // { labelOriginal: 'Nombre Mostrado' }
    } = config;

    let filas = [];
    let total = 0;

    // Caso 1: Datos de Chart.js (labels + datasets)
    if (data.labels && data.datasets && data.datasets[0]) {
      const labels = data.labels;
      const valores = data.datasets[0].data;
      
      // Calcular total
      total = valores.reduce((sum, val) => sum + (val || 0), 0);
      
      // Crear filas
      filas = labels.map((label, index) => {
        const cantidad = valores[index] || 0;
        const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(2) : '0.00';
        
        return {
          [nameKey]: labelMap[label] || label,
          [countKey]: cantidad,
          [percentageKey]: parseFloat(porcentaje)
        };
      });
    }
    // Caso 2: Array de objetos directos
    else if (Array.isArray(data)) {
      total = data.reduce((sum, item) => sum + (item[countKey] || item.cantidad || 0), 0);
      
      filas = data.map(item => {
        const cantidad = item[countKey] || item.cantidad || 0;
        const porcentaje = total > 0 ? ((cantidad / total) * 100).toFixed(2) : '0.00';
        
        return {
          [nameKey]: item[nameKey] || item.nombre || item.label,
          [countKey]: cantidad,
          [percentageKey]: parseFloat(porcentaje)
        };
      });
    }

    console.log('[Export] Tabla convertida:', { filas: filas.length, total });
    return filas;
  } catch (error) {
    console.error('[Export] Error convirtiendo tabla:', error);
    return [];
  }
};

/**
 * Agrupa y suma valores por clave para evitar duplicados
 * @param {Array} filas - Filas de la tabla
 * @param {string} groupKey - Clave para agrupar
 * @returns {Array} - Filas agrupadas
 */
export const agruparYSumarTabla = (filas, groupKey = 'nombre') => {
  const agrupado = {};
  
  filas.forEach(fila => {
    const clave = fila[groupKey];
    if (!agrupado[clave]) {
      agrupado[clave] = { ...fila };
    } else {
      agrupado[clave].cantidad += fila.cantidad;
    }
  });

  // Recalcular porcentajes
  const total = Object.values(agrupado).reduce((sum, f) => sum + f.cantidad, 0);
  
  return Object.values(agrupado).map(fila => ({
    ...fila,
    porcentaje: total > 0 ? ((fila.cantidad / total) * 100).toFixed(2) : '0.00'
  }));
};
```

---

### 2. Mapeo de Nombres (Para Categorías Reales)

**Archivo**: Crear `src/utils/labelMappings.js`

```javascript
/**
 * Mapeo de nombres de categorías para mostrar etiquetas reales en exportaciones
 */

export const motivosSalida = {
  'R': 'Reunión',
  'T': 'Trámite',
  'C': 'Consulta',
  'M': 'Médico',
  'P': 'Personal',
  'OTHER': 'Otro'
  // Agregar según tu BD
};

export const areasInstitucion = {
  'DIR': 'Dirección',
  'ADM': 'Administración',
  'RH': 'Recursos Humanos',
  'INF': 'Informática',
  'CONT': 'Contabilidad',
  // Agregar según tu BD
};

export const estadosPapeleta = {
  'A': 'Aprobada',
  'R': 'Rechazada',
  'P': 'Pendiente',
  'E': 'En Espera'
};

export const razonesAsistencia = {
  'P': 'Presente',
  'A': 'Ausente',
  'L': 'Licencia',
  'J': 'Justificada',
  'R': 'Retrasado'
};

/**
 * Obtiene el label correcto para una categoría
 * @param {string} value - Valor de la categoría
 * @param {string} type - Tipo: 'motivo', 'area', 'estado', 'asistencia'
 * @returns {string} - Label legible
 */
export const getLabelForValue = (value, type = 'motivo') => {
  const mappings = {
    motivo: motivosSalida,
    area: areasInstitucion,
    estado: estadosPapeleta,
    asistencia: razonesAsistencia
  };

  return mappings[type]?.[value] || value;
};

/**
 * Convierte un array de valores a labels
 * @param {Array} values - Valores a convertir
 * @param {string} type - Tipo de mapeo
 * @returns {Array} - Labels convertidos
 */
export const convertValuesToLabels = (values, type = 'motivo') => {
  return values.map(v => getLabelForValue(v, type));
};
```

---

## 📝 Implementación por Módulo

### A. Módulo de Visitantes (VisitantesTabla.jsx)

**Ubicación actual de exportación**:
```javascript
// Línea ~500 en VisitantesTabla.jsx
const handleExport = async (format) => {
  // ... código existente
};
```

**Mejoría sugerida**: Ya está implementado, pero podría usar las funciones centralizadas:

```javascript
import { convertirEstadisticasATabla } from '../../utils/exportHelpers';
import { getLabelForValue } from '../../utils/labelMappings';

const handleExportWithTable = async (format) => {
  try {
    // Obtener datos de estadísticas
    const estadisticas = {
      labels: ['Reunión', 'Trámite', 'Consulta'],
      datasets: [{ data: [45, 38, 30] }]
    };

    // Convertir a tabla
    const tablaDetalle = convertirEstadisticasATabla(estadisticas, {
      nameKey: 'nombre',
      countKey: 'cantidad',
      percentageKey: 'porcentaje'
    });

    // Enviar al backend con tabla incluida
    const response = await fetch(`/api/visitas/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Datos de exportación existentes
        ...existingParams,
        // Nueva tabla detalle
        tablaDetalle: tablaDetalle
      })
    });

    // ... resto del código
  } catch (error) {
    console.error('[Export] Error:', error);
  }
};
```

---

### B. Módulo de Asistencia de Personal

**Archivos a modificar**:
- `src/components/personal_estadisticas/AsistenciasTotalesCard.jsx`
- `src/components/personal_estadisticas/AreasCard.jsx`
- `src/components/personal_estadisticas/PersonalCard.jsx`

**Implementación**:

```jsx
// En AsistenciasTotalesCard.jsx
import { convertirEstadisticasATabla } from '../../../utils/exportHelpers';

const handleExport = async (format) => {
  // Datos de asistencia
  const datosAsistencia = {
    labels: ['Presentes', 'Ausentes', 'Justificadas'],
    datasets: [{ data: [95, 5, 2] }]
  };

  // Convertir a tabla
  const tabla = convertirEstadisticasATabla(datosAsistencia, {
    nameKey: 'estado',
    countKey: 'cantidad'
  });

  // Enviar al endpoint
  const response = await fetch(`/api/asistencia/export/${format}`, {
    method: 'POST',
    body: JSON.stringify({ tabla, ... })
  });

  // Procesar descarga
};
```

---

### C. Módulo de Papeletas

**Archivos a modificar**:
- `src/components/papeletas_estadisticas/PapeletasMotivosCard.jsx`
- `src/components/papeletas_estadisticas/PapeletasAreasCard.jsx`

**Similar a Asistencia de Personal**

---

## 🔌 Mejoras en el Backend

### Para `/api/visitas/export/excel`

**Cambio en `visitas.service.js`**:

```javascript
const exportarAExcel = async (filtros = {}, tablaDetalle = null) => {
  // ... código existente ...

  // Si hay tabla detalle, agregarla
  if (tablaDetalle && Array.isArray(tablaDetalle)) {
    const detalleSheet = workbook.addWorksheet('Detalle de Datos');
    
    // Headers
    detalleSheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Porcentaje', key: 'porcentaje', width: 15 }
    ];

    // Datos
    tablaDetalle.forEach(fila => {
      detalleSheet.addRow(fila);
    });

    // Formateo
    detalleSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '#2563EB' }
    };
  }

  return workbook;
};
```

---

## ✅ Checklist de Implementación

- [ ] Crear `src/utils/labelMappings.js` con mapeos de nombres
- [ ] Agregar `convertirEstadisticasATabla` a `exportHelpers.js`
- [ ] Agregar `agruparYSumarTabla` a `exportHelpers.js`
- [ ] Actualizar `VisitantesTabla.jsx` para usar funciones centralizadas
- [ ] Actualizar `AsistenciasTotalesCard.jsx` para exportar tabla
- [ ] Actualizar `AreasCard.jsx` para exportar tabla
- [ ] Actualizar `PersonalCard.jsx` para exportar tabla
- [ ] Actualizar `PapeletasMotivosCard.jsx` para exportar tabla
- [ ] Actualizar `PapeletasAreasCard.jsx` para exportar tabla
- [ ] Backend: Actualizar `/api/visitas/export/excel` para incluir tabla
- [ ] Backend: Actualizar `/api/visitas/export/pdf` para incluir tabla
- [ ] Backend: Crear `/api/asistencia/export/excel` con tabla
- [ ] Backend: Crear `/api/asistencia/export/pdf` con tabla
- [ ] Backend: Crear `/api/papeletas/export/excel` con tabla
- [ ] Backend: Crear `/api/papeletas/export/pdf` con tabla
- [ ] Tester: Verificar que las tablas se exportan correctamente
- [ ] Tester: Verificar que los nombres son correctos
- [ ] Tester: Verificar que los porcentajes se calculan bien

---

## 🧪 Casos de Prueba

### Test 1: Exportación de Visitantes
1. Ir a Dashboard Vigilante → Visitantes
2. Exportar a Excel
3. ✅ Verificar que Hoja "Detalle de Datos" existe
4. ✅ Verificar que incluye: Nombre | Cantidad | Porcentaje
5. ✅ Verificar que los nombres son correctos (Reunión, Trámite, etc.)

### Test 2: Exportación de Asistencia
1. Ir a Dashboard Personal
2. Exportar a PDF
3. ✅ Verificar que incluye tabla "Detalle de Datos"
4. ✅ Verificar que no está vacía
5. ✅ Verificar nombres de empleados

### Test 3: Exportación de Papeletas
1. Ir a Dashboard Papeletas
2. Exportar a Excel
3. ✅ Verificar tabla "Detalle de Datos"
4. ✅ Verificar motivos correctos

---

**Próximos pasos**: Implementar los cambios según el checklist.
