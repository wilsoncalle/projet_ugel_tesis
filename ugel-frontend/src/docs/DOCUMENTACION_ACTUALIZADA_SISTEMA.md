# 📚 Documentación Actualizada - Sistema de Control de Acceso UGEL Talara

**Fecha de Actualización**: Noviembre 11, 2025  
**Versión del Sistema**: Alpha  
**Base de Datos**: PostgreSQL  
**Framework Frontend**: React + Vite  
**Framework Backend**: Node.js + Express  

---

## 🏗️ Arquitectura General del Sistema

### Estructura de Carpetas Frontend

```
ugel-frontend/src/
├── components/
│   ├── estadisticas/              ✅ Componentes genéricos de estadísticas
│   ├── personal/                  🚧 Componentes del módulo de personal
│   ├── personal_estadisticas/     📊 Estadísticas de asistencia del personal
│   ├── papeletas_estadisticas/    📄 Estadísticas de papeletas de salida
│   ├── vigilante/                 👁️ Componentes del módulo de vigilancia
│   ├── vigilante_estadisticas/    📈 Estadísticas de visitas de vigilancia
│   ├── dashboard/                 🎯 Componentes de dashboard
│   ├── MainLayout.jsx             📱 Layout principal con navbar
│   └── OfflineIndicator.jsx       🔌 Indicador de estado offline/online
├── hooks/                         🪝 Custom hooks para lógica
├── services/
│   ├── api.js                     🌐 Cliente HTTP base
│   └── offlineApiService.js       💾 Servicio de API con soporte offline
├── utils/
│   ├── offlineDB.js               📦 IndexedDB para datos offline
│   ├── offlineSync.js             🔄 Motor de sincronización
│   ├── exportHelpers.js           📤 Utilidades para exportación
│   ├── dateHelpers.js             📅 Utilidades de fechas
│   └── dashboardUtils.js          📊 Utilidades de dashboard
├── config/
│   └── formFields.jsx             ⚙️ Configuración de formularios
├── contexts/
│   └── AuthContext.jsx            🔐 Contexto de autenticación
├── pages/                         📄 Páginas de la aplicación
└── routes/                        🛣️ Configuración de rutas

ugel-api/src/
├── api/                           🔌 Endpoints y controladores
├── config/                        ⚙️ Configuración (DB, estilos)
├── middleware/                    🛡️ Middleware de autenticación y validación
└── utils/                         🔧 Utilidades del backend
```

---

## 📊 Módulos de Estadísticas

### 1. **Módulo de Vigilancia (Visitantes)**

**Ubicación**: `src/components/vigilante_estadisticas/`

#### Componentes Disponibles:

| Componente | Descripción | Hook Asociado |
|-----------|-------------|---------------|
| `VisitasTotalesCard` | Total de visitas en el período | `useVisitasTotales` |
| `VisitasMotivoCard` | Distribución por motivo de visita | `useVisitasMotivo` |
| `VisitasAreaCard` | Distribución por área/lugar | `useVisitasArea` |
| `VisitasPersonalCard` | Visitantes por empleado | `useVisitasPersonal` |
| `VisitantesFrecuentesCard` | Visitantes más frecuentes | `useVisitantesFrecuentes` |
| `CalendarioVisitas` | Calendario de visitas | Interno |
| `ModalVisitanteDetalle` | Modal con detalles | Interno |

**Archivo de exportación**: `index.js`
```javascript
export { default as VisitasTotalesCard } from './VisitasTotalesCard';
export { default as VisitasMotivoCard } from './VisitasMotivoCard';
export { default as VisitasAreaCard } from './VisitasAreaCard';
export { default as VisitasPersonalCard } from './VisitasPersonalCard';
export { default as VisitantesFrecuentesCard } from './VisitantesFrecuentesCard';
export { default as CalendarioVisitas } from './CalendarioVisitas';
export { default as ModalVisitanteDetalle } from './ModalVisitanteDetalle';
```

---

### 2. **Módulo de Asistencia de Personal**

**Ubicación**: `src/components/personal_estadisticas/`

#### Componentes Disponibles:

| Componente | Descripción | Hook Asociado | Datos |
|-----------|-------------|---------------|-------|
| `AsistenciasTotalesCard` | Resumen total de asistencias | `useAsistenciasTotales` | Total, presentes, ausentes |
| `PuntualidadCard` | Análisis de puntualidad | `useAsistenciasPuntualidad` | A tiempo, retrasados |
| `AusenciasCard` | Registro de ausencias | `useAsistenciasAusencias` | Justificadas, injustificadas |
| `AreasCard` | Asistencia por área | `useAsistenciasAreas` | Por área |
| `PersonalCard` | Detalle por empleado | `useAsistenciasPersonal` | Individual |
| `PanelSeleccionEstadisticas` | Panel selector (3 pestañas) | Interno | Switcher |
| `CalendarioAsistencias` | Calendario con asistencias | Interno | Visual |
| `ModalPersonalDetalle` | Modal de detalles | Interno | Detalle |

**Archivo de exportación**: `index.js`

**Estructura de Datos por Hook**:
- `useAsistenciasTotales`: `{ total, presentes, ausentes, porcentajeAsistencia }`
- `useAsistenciasPuntualidad`: `{ aTiempo, retrasados, totalDias }`
- `useAsistenciasAreas`: `[{ nombre_area, presentes, ausentes, total }]`

---

### 3. **Módulo de Papeletas de Salida**

**Ubicación**: `src/components/papeletas_estadisticas/`

#### Componentes Disponibles:

| Componente | Descripción | Hook Asociado |
|-----------|-------------|---------------|
| `PapeletasMotivosCard` | Papeletas por motivo de salida | `usePapeletasMotivos` |
| `PapeletasAreasCard` | Papeletas por área | `usePapeletasAreas` |
| `PapeletasEstadoCard` | Estado de papeletas (aprobadas, rechazadas) | `usePapeletasEstado` |
| `PapeletasHorasCard` | Papeletas por rango de horas | `usePapeletasHoras` |
| `PanelSeleccionEstadisticas` | Panel selector (4 pestañas) | Interno |

**Estructura**: Similar a los otros módulos con configuración genérica.

---

### 4. **Componentes Genéricos de Estadísticas**

**Ubicación**: `src/components/estadisticas/`

Estos componentes forman la base de todo sistema de estadísticas, permitiendo reutilización máxima.

#### Componentes:

**`EstadisticasChart.jsx`**
- Tipos soportados: `pie`, `doughnut`, `bar`, `line`
- Usa Chart.js como librería base
- Configurable por props
- Estados de carga y error integrados

**`EstadisticasMetricas.jsx`**
- Muestra tarjetas KPI
- Calcula automáticamente: total, máximo, mínimo, promedio
- Responsive design
- Soporta iconos personalizados

**`EstadisticasTabla.jsx`**
- Tabla con búsqueda en tiempo real
- Ordenamiento por múltiples columnas
- Exportación integrada
- Búsqueda por texto inteligente
- Props: `data`, `totalVisitas`, `onExport`, `config`

**Ejemplo de uso**:
```jsx
<EstadisticasTabla
  data={data}
  totalVisitas={1000}
  onExport={handleExport}
  config={{
    type: 'motivos',
    title: 'Detalle de Datos',
    nameLabel: 'Motivo',
    countLabel: 'Cantidad',
    distributionLabel: 'Porcentaje',
  }}
/>
```

**`EstadisticasCard.jsx`**
- Componente principal que agrupa todo
- Layout: `two-columns`, `stacked`, `auto`
- Props de configuración completa: `chartConfig`, `tableConfig`, `metricsConfig`
- Maneja períodos (día, semana, mes, custom)
- Exportación integrada

**`EstadisticasModal.jsx`**
- Modal con vista detallada
- Misma configuración que Card
- Fullscreen en móviles
- Exportación desde modal

---

## 🔄 Sistema de Sincronización Offline

### Arquitectura Offline

```
┌─────────────────┐
│   Aplicación    │
│      React      │
└────────┬────────┘
         │
    ┌────▼────────────────────────────┐
    │   offlineApiService.js          │
    │ (Detecta conexión)              │
    └────┬──────────────────┬─────────┘
         │                  │
    Online               Offline
         │                  │
    ┌────▼──────┐      ┌────▼──────────┐
    │  API Call │      │  IndexedDB    │
    │ (Backend) │      │ offlineDB.js  │
    └───────────┘      └────┬──────────┘
                            │
                       ┌────▼──────────┐
                       │  offlineSync  │
                       │ (Espera conexión)
                       └────────────────┘
```

### Componentes del Sistema Offline

**1. `offlineDB.js`** - Base de Datos Local (IndexedDB)
- 3 Object Stores principales:
  - `pending_visitas`: Visitas registradas offline
  - `pending_salidas`: Salidas de visitantes offline
  - `sync_queue`: Cola genérica de sincronización
  
- Funciones principales:
  ```javascript
  saveVisitaOffline(visitaData, visitanteData)    // Guardar visita offline
  saveSalidaOffline(visitaId, exitData)           // Guardar salida offline
  getPendingVisitas()                              // Obtener visitas pendientes
  getPendingSalidas()                              // Obtener salidas pendientes
  getVisitasActivasCompletas()                     // Combinación de online + offline
  clearPendingItem(store, id)                      // Eliminar después de sincronización
  ```

**2. `offlineSync.js`** - Motor de Sincronización
- Detecta cambios en conectividad
- Sincronización automática Background Sync API
- Fallback para navegadores sin Background Sync
- Eventos personalizados para actualización UI

**3. `offlineApiService.js`** - Wrapper de API
- Intercepta llamadas HTTP
- Detecta si hay conexión
- Transparente para el código existente
- Manejo de fallbacks

**4. `OfflineIndicator.jsx`** - Indicador Visual
- Muestra estado (online/offline)
- Contador de elementos pendientes
- Botón de sincronización manual
- Expandible para ver detalles

---

## 📤 Sistema de Exportación a PDF y Excel

### Archivo Principal: `exportHelpers.js`

**Funciones Disponibles**:

```javascript
// 1. Captura de gráficos
captureChartJSImage(chartRef)              // Chart.js → Base64
captureRechartsImage(containerRef)         // Recharts → Base64

// 2. Formatos de archivo
formatFechaArchivo()                       // YYYY-MM-DD
generateExcelFromData(data, config)        // Exportar a Excel
generatePDFFromData(data, config)          // Exportar a PDF

// 3. Funciones auxiliares
formatearDatosExportacion(datos, config)   // Preparar datos
validarDatosExportacion(datos)             // Validar antes de exportar
```

### Implementación en Componentes

**`VisitantesTabla.jsx`** - Referencia para exportación:
```jsx
const handleExport = async (format) => {
  try {
    const endpoint = format === 'excel' 
      ? '/api/visitas/export/excel'
      : '/api/visitas/export/pdf';
    
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const blob = await response.blob();
    saveAs(blob, `visitas-${new Date().toISOString().split('T')[0]}.${format}`);
  } catch (error) {
    console.error('[Export] Error:', error);
  }
};
```

### Endpoint Backend: `/api/visitas/export`

**Métodos**:
- `GET /api/visitas/export/excel` - Descarga Excel
- `GET /api/visitas/export/pdf` - Descarga PDF

**Parámetros de Query**:
```javascript
{
  busqueda: string,           // Búsqueda por texto
  fechaInicio: string,        // YYYY-MM-DD
  fechaFin: string,           // YYYY-MM-DD
  empleado: number,           // ID del empleado
  motivo: number,             // ID del motivo
  area: number,               // ID del área
}
```

---

## 🎨 Tabla "Detalle de Datos" en Exportaciones

### Problema Actual

La tabla "Detalle de Datos" con columnas **Nombre | Cantidad | Porcentaje** sale vacía o sin nombres correctos en exportaciones de:
- Visitantes
- Asistencia de Personal
- Papeletas de Salida

### Solución

Usar la lógica implementada en `VisitantesTabla.jsx` como referencia:

**Paso 1**: Extraer helpers de exportación
```javascript
// exportHelpers.js - Nuevas funciones
export const extractTableDataFromStats = (data, config) => {
  // Transforma datos de estadísticas a formato tabla
  return data.labels.map((label, idx) => ({
    nombre: label,
    cantidad: data.datasets[0].data[idx],
    porcentaje: ((data.datasets[0].data[idx] / total) * 100).toFixed(2)
  }));
};
```

**Paso 2**: Centralizar generación de tabla
```javascript
// Usar en EstadisticasTabla.jsx
const generarTablaExportacion = (data, config) => {
  return extractTableDataFromStats(data, config);
};
```

**Paso 3**: Aplicar a las tres exportaciones

---

## 🪝 Custom Hooks (Hooks)

### Hooks de Vigilancia (Visitantes)

| Hook | Ubicación | Retorna |
|------|-----------|---------|
| `useVisitasTotales` | `hooks/` | `{ data, loading, error, periodo, setPeriodo, totalVisitas }` |
| `useVisitasMotivo` | `hooks/` | `{ data, loading, error, periodo, setPeriodo, totalVisitas }` |
| `useVisitasArea` | `hooks/` | `{ data, loading, error, periodo, setPeriodo, totalVisitas }` |
| `useVisitasPersonal` | `hooks/` | `{ data, loading, error, periodo, setPeriodo, totalVisitas }` |
| `useVisitantesFrecuentes` | `hooks/` | `{ data, loading, error, top: number }` |

### Hooks de Asistencia (Personal)

| Hook | Descripción |
|------|-------------|
| `useAsistenciasTotales` | Totales de asistencia |
| `useAsistenciasPuntualidad` | Análisis de puntualidad |
| `useAsistenciasAusencias` | Registro de ausencias |
| `useAsistenciasAreas` | Asistencia por área |
| `useAsistenciasPersonal` | Detalle por empleado |

### Hooks de Papeletas

| Hook | Descripción |
|------|-------------|
| `usePapeletasMotivos` | Papeletas por motivo |
| `usePapeletasAreas` | Papeletas por área |
| `usePapeletasEstado` | Estado de papeletas |
| `usePapeletasHoras` | Papeletas por horas |

### Hooks Genéricos

| Hook | Propósito |
|------|-----------|
| `useApiState` | Manejo de estado API |
| `useAuth` | Autenticación |
| `useCrud` | Operaciones CRUD genéricas |
| `useDashboardData` | Datos del dashboard |
| `useKeyboardShortcuts` | Atajos de teclado |

---

## 📝 Páginas Disponibles

```
pages/
├── DashboardVigilantePage.jsx      👁️ Dashboard principal de vigilancia
├── DashboardPersonalPage.jsx       👤 Dashboard de asistencia del personal
├── DashboardPapeletasPage.jsx      📄 Dashboard de papeletas
├── HistorialVisitasPage.jsx        📜 Historial completo de visitas
├── CatalogsPage.jsx                📋 Gestión de catálogos
├── ProfilePage.jsx                 🔐 Perfil de usuario
├── SettingsPage.jsx                ⚙️ Configuración
└── AdminDashboardPage.jsx          🔑 Panel administrativo (si existe)
```

---

## 🔐 Módulos de Backend (API)

### Endpoints Principales

```
/api/visitas                       👁️ Gestión de visitas
  GET    /                         - Listar visitas
  POST   /                         - Crear visita
  GET    /:id                      - Obtener visita
  PUT    /:id                      - Actualizar visita
  PUT    /:id/salida               - Registrar salida (mejorado para offline)
  DELETE /:id                      - Eliminar visita
  GET    /export/excel             - Exportar a Excel
  GET    /export/pdf               - Exportar a PDF

/api/asistencia-personal           👤 Gestión de asistencia
  GET    /                         - Listar registros
  POST   /                         - Crear registro
  GET    /estadisticas/:periodo    - Estadísticas por período

/api/papeletas-salida              📄 Gestión de papeletas
  GET    /                         - Listar papeletas
  POST   /                         - Crear papeleta
  GET    /:id                      - Obtener papeleta
  PUT    /:id                      - Actualizar papeleta

/api/auth                          🔐 Autenticación
  POST   /login                    - Login
  POST   /logout                   - Logout
  POST   /refresh-token            - Refrescar token

/api/dashboard/                    📊 Datos del dashboard
  GET    /vigilante                - Datos de vigilancia
  GET    /personal                 - Datos de personal
  GET    /papeletas                - Datos de papeletas
```

---

## 🧪 Procedimiento para Actualizar Exportaciones

### Para Visitantes (Ya implementado ✅)

**Referencia**: `src/components/vigilante/VisitantesTabla.jsx`

1. Llamadas a `GET /api/visitas/export/excel` y `GET /api/visitas/export/pdf`
2. Incluye tabla "Detalle de Datos"
3. Columnas: Nombre | Cantidad | Porcentaje

### Para Asistencia de Personal (⚠️ Necesita Mejora)

**Archivo**: `src/components/personal_estadisticas/`
**Pasos**:
1. Revisar qué componentes exportan actualmente
2. Basarse en la lógica de `VisitantesTabla.jsx`
3. Aplicar helpers centralizados de `exportHelpers.js`
4. Asegurar que la tabla "Detalle de Datos" se exporte correctamente

### Para Papeletas de Salida (⚠️ Necesita Mejora)

**Archivo**: `src/components/papeletas_estadisticas/`
**Pasos**: Igual que personal

---

## 🚀 Features Completados

### ✅ Offline
- Funcionalidad PWA completa
- IndexedDB para almacenamiento local
- Background Sync automático
- Sincronización manual
- Indicador visual de estado

### ✅ Exportación
- Excel con diseño profesional
- PDF con orientación landscape
- Gráficos incluidos en PDF
- Filtros aplicados en exportación
- Descarga directa al navegador

### ✅ Estadísticas
- Componentes genéricos reutilizables
- Tres módulos principales (Vigilancia, Personal, Papeletas)
- Gráficos interactivos (Chart.js y Recharts)
- Tablas con búsqueda y ordenamiento

### ✅ Interfaz
- Responsive design
- Atajos de teclado
- Temas personalizables
- Indicador offline
- Notificaciones

---

## 📋 Tareas Pendientes

### 🔴 Alta Prioridad

1. **Tabla "Detalle de Datos" en Exportaciones**
   - Asegurar que se exporte correctamente en Personal y Papeletas
   - Verificar que los nombres de categorías sean correctos
   - Implementar función centralizada

2. **Mejorar UI de Exportaciones**
   - Agregar progreso de descarga
   - Permitir seleccionar formato antes de descargar
   - Validar datos antes de exportar

### 🟡 Media Prioridad

1. **Dashboard Administrativo**
   - Si existe, documentar completamente

2. **Reportes Avanzados**
   - Reportes por rango de fechas
   - Reportes consolidados

### 🟢 Baja Prioridad

1. **Temas Adicionales**
2. **Más gráficos**
3. **API Pública**

---

## 📖 Cómo Usar Esta Documentación

1. **Referencia de Componentes**: Sección de Módulos de Estadísticas
2. **Sistema Offline**: Sección de Sincronización Offline
3. **Exportación**: Sección de Sistema de Exportación
4. **Desarrollo**: Referencia a archivos específicos

---

**Última actualización**: 11 de Noviembre 2025  
**Autor**: Sistema Integral UGEL Talara  
**Rama**: alpha
