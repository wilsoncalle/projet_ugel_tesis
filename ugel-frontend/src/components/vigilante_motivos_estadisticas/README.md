# Componentes de Estadísticas de Motivos

Esta carpeta contiene todos los componentes relacionados con las estadísticas de visitas por motivo para el módulo de vigilantes.

## Estructura de Componentes

### 🍩 VisitasMotivoCard.jsx
**Componente principal** que muestra las estadísticas en la vista normal del dashboard.
- Gráfico de dona circular
- Selector de período
- Botón para expandir a vista detallada
- Tamaño: 350x350px

### 📊 VisitasMotivoChart.jsx
**Componente del gráfico dona** reutilizable con Chart.js.
- Gráfico de dona con cutout del 60%
- Colores vibrantes y distintos
- Animaciones suaves
- Skeleton loader circular
- Empty state
- Texto central con total de visitas
- Leyenda clickeable

### 🔍 VisitasMotivoModal.jsx
**Modal expandido** con vista detallada completa.
- Métricas resumidas (3 cards)
- Gráfico dona más grande (500x500px)
- Tabla detallada con búsqueda
- Exportación a CSV
- Layout de dos columnas

### 📊 VisitasMotivoMetricas.jsx
**Cards de métricas** con estadísticas clave.
- Total de visitas
- Motivo más frecuente (con porcentaje)
- Total de motivos diferentes

### 📋 VisitasMotivoTabla.jsx
**Tabla detallada** con funcionalidades avanzadas.
- Búsqueda por nombre de motivo
- Ordenamiento por columnas
- Barras de progreso para porcentajes
- Posición, cantidad, porcentaje, total acumulado
- Exportación a CSV

## Características del Gráfico Dona

### 🎨 Diseño Visual
- **Cutout del 60%** para efecto dona moderno
- **Colores vibrantes** predefinidos
- **Hover effects** con separación (hoverOffset: 10)
- **Leyenda responsive** (derecha en desktop, abajo en mobile)
- **Texto central** con total de visitas

### 📱 Responsividad
- **Mobile**: Gráfico 280x280px, leyenda abajo
- **Desktop**: Gráfico 350x350px, leyenda derecha
- **Modal**: Gráfico 500x500px, layout de dos columnas

### 🔧 Configuración Chart.js
- **Animaciones**: Rotación y escala suaves
- **Tooltips**: Formato personalizado con porcentajes
- **Leyenda**: Clickable para ocultar/mostrar segmentos
- **Interacción**: Hover con resaltado

## Uso

```javascript
// Importación individual
import { VisitasMotivoCard } from '../vigilante_motivos_estadisticas';

// Importación múltiple
import { 
  VisitasMotivoCard, 
  VisitasMotivoChart, 
  VisitasMotivoModal 
} from '../vigilante_motivos_estadisticas';
```

## Backend API

### Endpoint
```
GET /api/visitas/por-motivo?periodo={periodo}
```

### Parámetros
- `periodo`: 'hoy', 'semana', 'mes', 'anio', 'todo'

### Respuesta
```json
{
  "success": true,
  "message": "Estadísticas por motivo obtenidas exitosamente",
  "data": [
    {
      "nombre_motivo": "Reunión",
      "count": 150,
      "porcentaje": 45.5
    }
  ]
}
```

## Dependencias

- **Chart.js**: Para gráficos de dona
- **Lucide React**: Para iconos
- **Tailwind CSS**: Para estilos
- **React Hooks**: Para manejo de estado

## Características

✅ **Gráfico Dona Moderno** - Cutout del 60%, colores vibrantes
✅ **Datos Reales** - Conectado con la base de datos
✅ **Interactividad** - Hover, click en leyenda, búsqueda
✅ **Exportación** - CSV con datos completos
✅ **Animaciones** - Transiciones suaves
✅ **Responsive** - Se adapta a diferentes pantallas
✅ **Accesibilidad** - Colores contrastantes, navegación por teclado
