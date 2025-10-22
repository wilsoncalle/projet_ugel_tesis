# Componentes de Estadísticas para Vigilantes

Esta carpeta unificada contiene todos los componentes de estadísticas para el dashboard de vigilantes.

## 📊 Componentes Disponibles

### VisitasMotivoCard
Muestra estadísticas de visitas agrupadas por motivo de ingreso.

**Características:**
- Gráfico tipo Pie (dona) con distribución porcentual
- Métricas: Total, Motivo más frecuente, Motivo menos frecuente, Total de motivos
- Modal con vista detallada, tabla y exportación CSV

**Uso:**
```jsx
import { VisitasMotivoCard } from './components/vigilante_estadisticas';

<VisitasMotivoCard />
```

### VisitasAreaCard
Muestra estadísticas de visitas agrupadas por área visitada.

**Características:**
- Gráfico tipo Bar (barras horizontales)
- Métricas: Total, Área más visitada, Área menos visitada, Promedio por área
- Modal con vista detallada, tabla y exportación CSV

**Uso:**
```jsx
import { VisitasAreaCard } from './components/vigilante_estadisticas';

<VisitasAreaCard />
```

### VisitasTotalesCard
Muestra estadísticas del total de visitas con flujo diario.

**Características:**
- Gráfico tipo Line (líneas) mostrando la tendencia diaria con Ant Design Charts
- Métricas: Total de visitas, Día con más visitas, Día con menos visitas, Promedio diario
- Modal con vista detallada, tabla y exportación CSV
- Períodos disponibles: Hoy, Semana, Mes, Año, Todo el historial
- Gráfico de área suave con animaciones modernas

**Uso:**
```jsx
import { VisitasTotalesCard } from './components/vigilante_estadisticas';

<VisitasTotalesCard />
```

### VisitasPersonalCard
Muestra estadísticas de visitas agrupadas por personal visitado.

**Características:**
- Gráfico tipo Doughnut (dona) con distribución porcentual
- Métricas: Total, Personal más visitado, Personal menos visitado, Promedio por persona
- Modal con vista detallada, tabla y exportación CSV
- Períodos disponibles: Hoy, Semana, Mes, Año, Todo el historial

**Uso:**
```jsx
import { VisitasPersonalCard } from './components/vigilante_estadisticas';

<VisitasPersonalCard />
```

### VisitantesFrecuentesCard ⭐ NUEVO
Muestra los visitantes más frecuentes con análisis avanzado de patrones de visita.

**Características Principales:**
- **Gráfico de barras horizontales** mostrando top 10 visitantes
- **Calendario visual interactivo** que muestra:
  - Días específicos en los que el visitante ha venido
  - Múltiples visitas en el mismo día (badge con número)
  - Tooltip al pasar el cursor mostrando detalles de cada visita
  - Navegación mensual
- **Modal detallado** con dos vistas:
  - Vista de Calendario: Visualización mensual de visitas
  - Vista de Historial: Lista cronológica con todos los detalles
- **Información completa** de cada visitante:
  - Nombre completo y documento
  - Total de visitas, última visita, días distintos
  - Días de la semana que suele visitar
  - Detalles de cada visita: hora entrada/salida, motivo, área, personal
- **Métricas**: Total de visitantes, más frecuente, menos frecuente, promedio
- **Tabla interactiva** con click en fila para ver detalle
- Períodos disponibles: Hoy, Semana, Mes, Año, Todo el historial

**Uso:**
```jsx
import { VisitantesFrecuentesCard } from './components/vigilante_estadisticas';

<VisitantesFrecuentesCard />
```

**Componentes Especiales:**
- `CalendarioVisitas`: Calendario visual reutilizable
- `ModalVisitanteDetalle`: Modal especializado con tabs

## 🚀 Agregar Nuevas Estadísticas

Para agregar una nueva estadística, simplemente crea un nuevo archivo siguiendo el patrón:

```jsx
// VisitasPorHoraCard.jsx
import { EstadisticasCard } from '../estadisticas';
import useVisitasPorHora from '../../hooks/useVisitasPorHora';

const VisitasPorHoraCard = () => {
  const { data, loading, error, periodo, setPeriodo, totalVisitas } = useVisitasPorHora();

  const config = {
    title: 'Visitas por Hora',
    subtitle: 'Distribución de visitas por horario',
    chartType: 'bar', // o 'pie'
    chartHeight: 350,
    
    chartConfig: {
      labelKey: 'hora',
      valueKey: 'visitas',
      // ... más configuración
    },
    
    metricsConfig: {
      type: 'horas',
      // ... configuración de métricas
    },
    
    tableConfig: {
      type: 'horas',
      // ... configuración de tabla
    },
  };

  return <EstadisticasCard {...{ data, loading, error, periodo, onPeriodoChange: setPeriodo, totalVisitas, config }} />;
};

export default VisitasPorHoraCard;
```

Luego agrégalo al `index.js`:

```javascript
export { default as VisitasPorHoraCard } from './VisitasPorHoraCard';
```

## 📁 Estructura

```
vigilante_estadisticas/
├── VisitasMotivoCard.jsx           - Estadísticas por motivo
├── VisitasAreaCard.jsx              - Estadísticas por área
├── VisitasTotalesCard.jsx           - Estadísticas de total de visitas
├── VisitasPersonalCard.jsx          - Estadísticas por personal visitado
├── VisitantesFrecuentesCard.jsx     - Visitantes frecuentes (NUEVO)
├── CalendarioVisitas.jsx            - Componente de calendario visual (NUEVO)
├── ModalVisitanteDetalle.jsx        - Modal especializado para visitantes (NUEVO)
├── index.js                         - Exportaciones
└── README.md                        - Esta documentación
```

## 🎨 Componentes Genéricos Utilizados

Todos los componentes de esta carpeta utilizan internamente los componentes genéricos de `../estadisticas/`:

- **EstadisticasCard** - Tarjeta con gráfico y controles
- **EstadisticasChart** - Gráficos (pie/bar)
- **EstadisticasMetricas** - Tarjetas de métricas
- **EstadisticasTabla** - Tabla con búsqueda/ordenación/exportación
- **EstadisticasModal** - Modal con vista detallada

## ✅ Ventajas de la Estructura Unificada

1. **Organización centralizada** - Todas las estadísticas de vigilantes en un solo lugar
2. **Fácil navegación** - No hay que buscar en múltiples carpetas
3. **Escalabilidad** - Agregar nuevas estadísticas es trivial
4. **Consistencia** - Todos los componentes siguen el mismo patrón
5. **Mantenibilidad** - Cambios se aplican fácilmente a todos

## 🔄 Migración desde carpetas antiguas

Las carpetas `vigilante_motivos_estadisticas/` y `vigilante_areas_estadisticas/` fueron unificadas aquí.

**Antes:**
```
components/
├── vigilante_motivos_estadisticas/
│   └── VisitasMotivoCard.jsx
└── vigilante_areas_estadisticas/
    └── VisitasAreaCard.jsx
```

**Ahora:**
```
components/
└── vigilante_estadisticas/
    ├── VisitasMotivoCard.jsx
    ├── VisitasAreaCard.jsx
    ├── VisitasTotalesCard.jsx
    ├── VisitasPersonalCard.jsx
    ├── VisitantesFrecuentesCard.jsx ⭐ NUEVO
    ├── CalendarioVisitas.jsx ⭐ NUEVO
    ├── ModalVisitanteDetalle.jsx ⭐ NUEVO
    └── (futuras estadísticas)
```

## 📝 Próximas Estadísticas Sugeridas

- `VisitasPorHoraCard` - Distribución por hora del día
- `VisitasPorDiaCard` - Distribución por día de la semana
- `VisitasPorMesCard` - Distribución por mes
- `VisitantesFrecuentesCard` - Top visitantes más frecuentes
- `TiempoPromedioCard` - Tiempo promedio de permanencia
- `VisitasConcurrentesCard` - Visitas simultáneas por período

## 🤝 Contribuir

Al agregar nuevas estadísticas:

1. Sigue el patrón de los componentes existentes
2. Usa los componentes genéricos de `../estadisticas/`
3. Documenta el componente en este README
4. Agrega la exportación en `index.js`
5. Crea el hook correspondiente en `../../hooks/`

