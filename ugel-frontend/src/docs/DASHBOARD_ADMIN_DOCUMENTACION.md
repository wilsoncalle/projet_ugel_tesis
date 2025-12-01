# Dashboard Administrativo - Documentación Completa

## 📋 Descripción General

El Dashboard Administrativo es una vista unificada que integra las estadísticas de **Personal (Asistencias)** y **Visitas** en una sola interfaz moderna y profesional. Permite a los administradores visualizar, analizar y exportar datos de ambos módulos de manera eficiente.

## 🎯 Características Principales

### ✨ Funcionalidades Implementadas

1. **Vista Unificada**

   - KPIs principales de ambos módulos siempre visibles
   - Toggle para alternar entre vista de Personal y Visitas
   - Diseño responsive y adaptable

2. **Filtros Globales**

   - Selector de período (Hoy, Semana, Mes, Año, Todo)
   - Botón de actualización manual
   - Exportación a CSV

3. **Tarjetas KPI**

   - Total Asistencias
   - Total Visitas
   - Puntualidad
   - Visitantes Frecuentes
   - Indicadores de tendencia (↑ ↓)
   - Comparación con período anterior

4. **Componentes Reutilizables**

   - Todos los componentes de estadísticas mantienen su funcionalidad
   - Modales de maximización funcionan correctamente
   - Gráficos interactivos (líneas, barras, pie/doughnut)

5. **Exportación de Datos**
   - Exportación a CSV según vista activa
   - Nombres de archivo descriptivos con timestamp

## 📁 Estructura de Archivos

```
ugel-frontend/
├── src/
│   ├── pages/
│   │   └── DashboardAdminPage.jsx          # Componente principal del dashboard
│   │
│   ├── components/
│   │   ├── dashboard/                       # Componentes específicos del dashboard
│   │   │   ├── KPICard.jsx                 # Tarjeta de KPI con tendencias
│   │   │   ├── DashboardFilters.jsx        # Filtros globales
│   │   │   ├── ViewToggle.jsx              # Toggle Personal/Visitas
│   │   │   ├── LoadingDashboard.jsx        # Estado de carga
│   │   │   ├── ErrorDashboard.jsx          # Estado de error
│   │   │   └── index.js                    # Exportaciones
│   │   │
│   │   ├── personal_estadisticas/          # Componentes de Personal (existentes)
│   │   │   ├── AsistenciasTotalesCard.jsx
│   │   │   ├── AusenciasCard.jsx
│   │   │   ├── PuntualidadCard.jsx
│   │   │   ├── AreasCard.jsx
│   │   │   ├── PersonalCard.jsx
│   │   │   └── CalendarioAsistencias.jsx
│   │   │
│   │   └── vigilante_estadisticas/         # Componentes de Visitas (existentes)
│   │       ├── VisitasTotalesCard.jsx
│   │       ├── VisitasMotivoCard.jsx
│   │       ├── VisitasAreaCard.jsx
│   │       ├── VisitasPersonalCard.jsx
│   │       ├── VisitantesFrecuentesCard.jsx
│   │       └── CalendarioVisitas.jsx
│   │
│   ├── hooks/
│   │   └── useDashboardData.js             # Hook personalizado para datos del dashboard
│   │
│   └── utils/
│       └── dashboardUtils.js               # Utilidades de formateo y cálculo
```

## 🔧 Componentes Creados

### 1. DashboardAdminPage.jsx

**Ubicación:** `src/pages/DashboardAdminPage.jsx`

**Descripción:** Componente principal que orquesta todo el dashboard.

**Props:** Ninguna (usa el hook `useDashboardData`)

**Características:**

- Integra todos los componentes de estadísticas
- Maneja estados de carga y error
- Implementa exportación de datos
- Toggle entre vistas de Personal y Visitas

**Uso:**

```jsx
import DashboardAdminPage from "./pages/DashboardAdminPage";

// En tu router
<Route path="/dashboard-admin" element={<DashboardAdminPage />} />;
```

---

### 2. KPICard.jsx

**Ubicación:** `src/components/dashboard/KPICard.jsx`

**Descripción:** Tarjeta de KPI con indicadores de tendencia.

**Props:**

```typescript
{
  title: string; // Título del KPI
  value: number; // Valor numérico
  change: number; // Cambio porcentual (opcional)
  icon: LucideIcon; // Ícono de Lucide React
  loading: boolean; // Estado de carga
  subtitle: string; // Subtítulo (opcional)
  colorScheme: "blue" | "green" | "purple" | "orange"; // Esquema de color
}
```

**Uso:**

```jsx
<KPICard
  title="Total Asistencias"
  value={1250}
  change={5.2}
  icon={UserCheck}
  colorScheme="blue"
  subtitle="Personal registrado"
/>
```

---

### 3. DashboardFilters.jsx

**Ubicación:** `src/components/dashboard/DashboardFilters.jsx`

**Descripción:** Panel de filtros globales del dashboard.

**Props:**

```typescript
{
  periodo: string;                    // Período actual
  onPeriodoChange: (periodo) => void; // Callback al cambiar período
  onRefresh: () => void;              // Callback para refrescar
  onExport: () => void;               // Callback para exportar
  loading: boolean;                   // Estado de carga
}
```

---

### 4. ViewToggle.jsx

**Ubicación:** `src/components/dashboard/ViewToggle.jsx`

**Descripción:** Toggle para alternar entre vistas de Personal y Visitas.

**Props:**

```typescript
{
  vistaActiva: 'personal' | 'visitas'; // Vista activa
  onCambiarVista: (vista) => void;     // Callback al cambiar vista
}
```

---

### 5. LoadingDashboard.jsx

**Ubicación:** `src/components/dashboard/LoadingDashboard.jsx`

**Descripción:** Componente de skeleton loading para el dashboard.

**Props:** Ninguna

---

### 6. ErrorDashboard.jsx

**Ubicación:** `src/components/dashboard/ErrorDashboard.jsx`

**Descripción:** Componente de error con opción de reintentar.

**Props:**

```typescript
{
  error: string;        // Mensaje de error
  onRetry: () => void;  // Callback para reintentar
}
```

---

## 🪝 Hook Personalizado

### useDashboardData.js

**Ubicación:** `src/hooks/useDashboardData.js`

**Descripción:** Hook que maneja toda la lógica de datos del dashboard.

**Retorna:**

```typescript
{
  // Estados
  loading: boolean;
  error: string | null;
  periodo: string;
  vistaActiva: 'personal' | 'visitas';
  datosPersonal: {
    totalAsistencias: number;
    totalAusencias: number;
    puntualidad: number;
    tardanzas: number;
    flujoDiario: Array;
    porArea: Array;
    porEstado: Array;
  };
  datosVisitas: {
    totalVisitas: number;
    visitantesFrecuentes: number;
    visitasHoy: number;
    visitasSinSalida: number;
    flujoDiario: Array;
    porMotivo: Array;
    porArea: Array;
  };
  comparacion: {
    asistenciasCambio: number;
    visitasCambio: number;
    puntualidadCambio: number;
    visitantesCambio: number;
  };
  kpis: {
    totalAsistencias: number;
    totalVisitas: number;
    puntualidad: number;
    visitantesFrecuentes: number;
  };

  // Funciones
  cambiarPeriodo: (periodo: string) => void;
  cambiarVista: (vista: string) => void;
  refresh: () => void;
}
```

**Uso:**

```jsx
import useDashboardData from "../hooks/useDashboardData";

const MiComponente = () => {
  const { loading, kpis, cambiarPeriodo } = useDashboardData();

  // ... usar los datos
};
```

---

## 🛠️ Utilidades

### dashboardUtils.js

**Ubicación:** `src/utils/dashboardUtils.js`

**Funciones Principales:**

#### Formateo

```javascript
formatNumber(num); // Formatea números con separadores
formatPercentage(value, decimals); // Formatea porcentajes
formatDate(date, format); // Formatea fechas
```

#### Cálculos

```javascript
calculatePercentageChange(current, previous); // Calcula cambio porcentual
calculateAverage(values); // Calcula promedio
findMax(values); // Encuentra valor máximo
findMin(values); // Encuentra valor mínimo
sumBy(data, key); // Suma valores por clave
```

#### Tendencias

```javascript
getTrendInfo(change); // Retorna info de tendencia (color, ícono, etc.)
```

#### Transformación de Datos

```javascript
transformToPieData(data, labelKey, valueKey); // Para gráficos pie
transformToLineData(data, labelKey, valueKey); // Para gráficos línea
groupBy(data, key); // Agrupa datos
sortBy(data, key, order); // Ordena datos
```

#### Exportación

```javascript
exportToCSV(data, filename); // Exporta a CSV
```

#### Utilidades

```javascript
debounce(func, wait); // Debounce para búsquedas
generateColors(count); // Genera colores para gráficos
getDateRangeFromPeriod(periodo); // Obtiene rango de fechas
```

**Ejemplo de Uso:**

```javascript
import {
  formatNumber,
  getTrendInfo,
  exportToCSV,
} from "../utils/dashboardUtils";

// Formatear número
const formatted = formatNumber(1234567); // "1,234,567"

// Obtener info de tendencia
const trend = getTrendInfo(5.2);
// { color: 'text-green-600', icon: '↑', direction: 'up', ... }

// Exportar datos
exportToCSV(data, "reporte.csv");
```

---

## 🌐 Endpoints API Requeridos

### Endpoints de Personal

```
GET /api/asistencia-personal/estadisticas/totales?periodo={periodo}
GET /api/asistencia-personal/estadisticas/ausencias?periodo={periodo}
GET /api/asistencia-personal/estadisticas/puntualidad?periodo={periodo}
GET /api/asistencia-personal/estadisticas/areas?periodo={periodo}
```

### Endpoints de Visitas

```
GET /api/visitas/estadisticas/totales?periodo={periodo}
GET /api/visitas/estadisticas/motivo?periodo={periodo}
GET /api/visitas/estadisticas/area?periodo={periodo}
GET /api/visitas/estadisticas/visitantes-frecuentes?periodo={periodo}
```

### Estructura de Respuesta Esperada

#### Totales (Personal/Visitas)

```json
{
  "success": true,
  "data": {
    "total": 1250,
    "hoy": 45,
    "sin_salida": 3,
    "flujo_diario": [
      { "dia": "2024-11-01", "asistencias": 42 },
      { "dia": "2024-11-02", "asistencias": 38 }
    ]
  }
}
```

#### Por Motivo/Área/Estado

```json
{
  "success": true,
  "data": {
    "labels": ["Reunión", "Trámite", "Visita"],
    "datasets": [
      {
        "data": [120, 85, 45]
      }
    ]
  }
}
```

---

## 🎨 Diseño y Estilos

### Paleta de Colores

**KPIs:**

- **Blue:** `from-blue-500 to-blue-600` - Asistencias
- **Green:** `from-green-500 to-green-600` - Visitas
- **Purple:** `from-purple-500 to-purple-600` - Puntualidad
- **Orange:** `from-orange-500 to-orange-600` - Visitantes Frecuentes

**Tendencias:**

- **Positivo:** `text-green-600`, `bg-green-50`
- **Negativo:** `text-red-600`, `bg-red-50`
- **Neutral:** `text-gray-600`, `bg-gray-50`

### Espaciado y Layout

- **Max Width:** `1600px` (contenedor principal)
- **Gap entre tarjetas:** `24px` (gap-6)
- **Padding:** `24px` (p-6)
- **Border Radius:** `16px` (rounded-2xl)

### Animaciones

- **Hover:** `transition-all duration-300`
- **Skeleton:** `animate-pulse`
- **Iconos:** `group-hover:scale-110`

---

## 📊 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    DashboardAdminPage                        │
│                           │                                  │
│                           ▼                                  │
│                  useDashboardData Hook                       │
│                           │                                  │
│              ┌────────────┴────────────┐                     │
│              ▼                         ▼                     │
│      fetchDatosPersonal        fetchDatosVisitas            │
│              │                         │                     │
│              ▼                         ▼                     │
│      [API Personal]              [API Visitas]              │
│              │                         │                     │
│              └────────────┬────────────┘                     │
│                           ▼                                  │
│                    Procesar Datos                            │
│                           │                                  │
│              ┌────────────┴────────────┐                     │
│              ▼                         ▼                     │
│        datosPersonal             datosVisitas                │
│              │                         │                     │
│              └────────────┬────────────┘                     │
│                           ▼                                  │
│                    Renderizar UI                             │
│                           │                                  │
│        ┌──────────────────┼──────────────────┐              │
│        ▼                  ▼                  ▼              │
│    KPICards          ViewToggle      EstadísticasCards      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Usar

### 1. Integración en Router

```jsx
// App.jsx o Router.jsx
import DashboardAdminPage from "./pages/DashboardAdminPage";

<Routes>
  <Route path="/dashboard-admin" element={<DashboardAdminPage />} />
</Routes>;
```

### 2. Navegación

```jsx
import { Link } from "react-router-dom";

<Link to="/dashboard-admin">Dashboard Administrativo</Link>;
```

### 3. Personalización

#### Cambiar Colores de KPI

```jsx
// En DashboardAdminPage.jsx
<KPICard
  colorScheme="blue" // Cambiar a: 'green', 'purple', 'orange'
  // ... otras props
/>
```

#### Modificar Períodos Disponibles

```jsx
// En DashboardFilters.jsx
const opcionesPeriodo = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Esta Semana" },
  { value: "mes", label: "Este Mes" },
  // Agregar más opciones aquí
];
```

#### Personalizar Exportación

```javascript
// En DashboardAdminPage.jsx - handleExport
const dataExport = [
  // Personalizar estructura de datos a exportar
];
```

---

## 🔍 Características Técnicas

### Performance

- **React.memo:** Componentes optimizados para evitar re-renders innecesarios
- **useCallback:** Funciones memoizadas en el hook
- **Lazy Loading:** Carga diferida de componentes pesados (opcional)
- **Debounce:** En búsquedas y filtros

### Accesibilidad

- **Semantic HTML:** Uso correcto de etiquetas
- **ARIA Labels:** En botones y controles
- **Keyboard Navigation:** Navegación por teclado
- **Color Contrast:** Cumple WCAG 2.1 AA

### Responsive Design

- **Mobile First:** Diseño adaptable desde móvil
- **Breakpoints:**
  - `sm:` 640px
  - `md:` 768px
  - `lg:` 1024px
  - `xl:` 1280px

---

## 🐛 Troubleshooting

### Problema: Los datos no se cargan

**Solución:**

1. Verificar que el backend esté corriendo
2. Revisar la consola del navegador para errores
3. Verificar que el token de autenticación sea válido
4. Comprobar los endpoints en `useDashboardData.js`

### Problema: Los gráficos no se muestran

**Solución:**

1. Verificar que los datos tengan el formato correcto
2. Revisar la consola para errores de Recharts/Chart.js
3. Asegurar que las dependencias estén instaladas

### Problema: La exportación no funciona

**Solución:**

1. Verificar que los datos no estén vacíos
2. Revisar permisos del navegador para descargas
3. Comprobar la función `exportToCSV` en utils

---

## 📝 Notas Importantes

1. **No usar localStorage/sessionStorage:** Por limitaciones del entorno, todo el estado se maneja con React state
2. **Componentes funcionales:** Todos los componentes usan hooks, no clases
3. **Mantener funcionalidad existente:** Los componentes de estadísticas mantienen todas sus funciones (maximizar, filtros, etc.)
4. **Comparación de períodos:** Actualmente simulada, debe implementarse en el backend

---

## 🔄 Próximas Mejoras Sugeridas

1. **Modo oscuro/claro:** Implementar theme switcher
2. **Notificaciones:** Alertas de ausencias prolongadas, visitas sin salida
3. **Búsqueda global:** Búsqueda rápida de personal/visitantes
4. **Comparación real:** Implementar comparación real con período anterior en backend
5. **Gráficos adicionales:** Más tipos de visualizaciones
6. **Filtros avanzados:** Por área, departamento, rango de fechas personalizado
7. **Guardado de preferencias:** Guardar vista preferida del usuario
8. **Actualización en tiempo real:** WebSockets para datos en vivo
9. **Exportación a PDF:** Además de CSV
10. **Dashboards personalizados:** Permitir al usuario configurar su dashboard

---

## 📚 Dependencias Utilizadas

```json
{
  "react": "^18.x",
  "lucide-react": "^0.x",
  "recharts": "^2.x",
  "chart.js": "^4.x",
  "react-chartjs-2": "^5.x",
  "@ant-design/plots": "^1.x",
  "chartjs-plugin-datalabels": "^2.x"
}
```

---

## 👥 Soporte

Para preguntas o problemas, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0.0  
**Autor:** Sistema UGEL - Dashboard Administrativo
