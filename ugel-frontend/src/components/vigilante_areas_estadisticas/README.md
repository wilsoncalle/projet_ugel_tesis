# Componentes de Estadísticas de Áreas

Esta carpeta contiene todos los componentes relacionados con las estadísticas de visitas por área para el módulo de vigilantes.

## Estructura de Componentes

### 📊 VisitasAreaCard.jsx
**Componente principal** que muestra las estadísticas en la vista normal del dashboard.
- Gráfico de barras horizontales
- Selector de período
- Botón para expandir a vista detallada

### 📈 VisitasAreaChart.jsx
**Componente del gráfico** reutilizable con Chart.js.
- Gráfico de barras horizontales
- Gradientes de colores
- Animaciones suaves
- Skeleton loader
- Empty state

### 🔍 VisitasAreaModal.jsx
**Modal expandido** con vista detallada completa.
- Métricas resumidas
- Gráfico más grande (700px)
- Tabla detallada con búsqueda
- Exportación a CSV

### 📊 VisitasAreaMetricas.jsx
**Cards de métricas** con estadísticas clave.
- Total de visitas
- Área más visitada
- Área menos visitada
- Promedio por área

### 📋 VisitasAreaTabla.jsx
**Tabla detallada** con funcionalidades avanzadas.
- Búsqueda por nombre de área
- Ordenamiento por columnas
- Barras de progreso para porcentajes
- Exportación a CSV

## Uso

```javascript
// Importación individual
import { VisitasAreaCard } from '../vigilante_areas_estadisticas';

// Importación múltiple
import { 
  VisitasAreaCard, 
  VisitasAreaChart, 
  VisitasAreaModal 
} from '../vigilante_areas_estadisticas';
```

## Dependencias

- **Chart.js**: Para gráficos interactivos
- **Lucide React**: Para iconos
- **Tailwind CSS**: Para estilos
- **React Hooks**: Para manejo de estado

## Características

✅ **Responsive Design** - Se adapta a diferentes pantallas
✅ **Datos Reales** - Conectado con la base de datos
✅ **Interactividad** - Búsqueda, filtrado, ordenamiento
✅ **Exportación** - CSV con datos completos
✅ **Animaciones** - Transiciones suaves
✅ **Accesibilidad** - Colores y contrastes apropiados
