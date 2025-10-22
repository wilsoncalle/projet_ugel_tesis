# Componentes Genéricos de Estadísticas

Este directorio contiene componentes genéricos y reutilizables para mostrar estadísticas en diferentes formatos (gráficos, tablas, métricas, etc.).

## Componentes

### EstadisticasChart
Componente genérico para mostrar gráficos de estadísticas. Soporta cuatro tipos de gráficos:
- **Pie Chart**: Gráfico circular para mostrar distribuciones porcentuales
- **Doughnut Chart**: Gráfico de dona (circular con centro hueco) para distribuciones porcentuales
- **Bar Chart**: Gráfico de barras horizontales para comparar valores entre categorías
- **Line Chart**: Gráfico de líneas para mostrar tendencias a lo largo del tiempo

#### Props
- `type`: `'pie'` | `'doughnut'` | `'bar'` | `'line'` - Tipo de gráfico
- `data`: Datos para el gráfico (objeto con labels/datasets para pie/doughnut, array para bar, objeto para line)
- `loading`: Estado de carga
- `size`: Tamaño del gráfico (para pie y doughnut)
- `height`: Altura del gráfico (para bar y line)
- `totalVisitas`: Total de visitas (para pie y doughnut)
- `config`: Objeto de configuración adicional

#### Ejemplo de uso
```jsx
<EstadisticasChart
  type="pie"
  data={data}
  loading={loading}
  size={300}
  totalVisitas={1000}
  config={{
    tooltipSuffix: 'visitas',
    centerLabel: 'visitas',
    emptyMessage: 'No hay datos registrados',
  }}
/>
```

### EstadisticasMetricas
Componente genérico para mostrar tarjetas de métricas clave.

#### Props
- `data`: Datos para calcular métricas
- `totalVisitas`: Total de visitas
- `config`: Configuración de las métricas

#### Ejemplo de uso
```jsx
<EstadisticasMetricas
  data={data}
  totalVisitas={1000}
  config={{
    type: 'motivos',
    totalLabel: 'Total de Visitas',
    maxLabel: 'Motivo Más Frecuente',
    minLabel: 'Motivo Menos Frecuente',
    countLabel: 'Total de Motivos',
  }}
/>
```

### EstadisticasTabla
Componente genérico para mostrar tablas de datos con búsqueda, ordenación y exportación.

#### Props
- `data`: Datos para la tabla
- `totalVisitas`: Total de visitas
- `onExport`: Función para exportar datos
- `config`: Configuración de la tabla

#### Ejemplo de uso
```jsx
<EstadisticasTabla
  data={data}
  totalVisitas={1000}
  onExport={handleExport}
  config={{
    type: 'motivos',
    title: 'Detalle por Motivo',
    searchPlaceholder: 'Buscar motivo...',
    nameLabel: 'Motivo',
    countLabel: 'Cantidad',
  }}
/>
```

### EstadisticasCard
Componente genérico para tarjetas de estadísticas con gráfico y controles.

#### Props
- `data`: Datos para mostrar
- `loading`: Estado de carga
- `error`: Mensaje de error
- `periodo`: Período seleccionado
- `onPeriodoChange`: Función para cambiar el período
- `totalVisitas`: Total de visitas
- `config`: Objeto de configuración completo

#### Ejemplo de uso
```jsx
<EstadisticasCard
  data={data}
  loading={loading}
  error={error}
  periodo={periodo}
  onPeriodoChange={setPeriodo}
  totalVisitas={totalVisitas}
  config={{
    title: 'Distribución por Motivo',
    subtitle: 'Visitas agrupadas por el motivo de ingreso',
    chartType: 'pie',
    chartSize: 300,
    layout: 'two-columns',
    showMetrics: true,
    exportFilename: 'visitas-por-motivo',
    chartConfig: { ... },
    tableConfig: { ... },
    metricsConfig: { ... },
  }}
/>
```

### EstadisticasModal
Componente genérico para modales de estadísticas con vista detallada.

#### Props
- `data`: Datos para mostrar
- `loading`: Estado de carga
- `error`: Mensaje de error
- `periodo`: Período seleccionado
- `onPeriodoChange`: Función para cambiar el período
- `onClose`: Función para cerrar el modal
- `totalVisitas`: Total de visitas
- `config`: Objeto de configuración completo

## Ventajas de usar componentes genéricos

1. **No duplicación**: Un solo componente para múltiples casos de uso
2. **Mantenibilidad**: Los cambios se aplican a todos los casos de uso
3. **Consistencia**: UI/UX uniforme en toda la aplicación
4. **Flexibilidad**: Configurables mediante props para diferentes necesidades
5. **Reutilizabilidad**: Fácil de usar en nuevas secciones

## Casos de uso actuales

- **Estadísticas por Motivo**: Usa componentes genéricos con configuración específica para motivos
- **Estadísticas por Área**: Usa componentes genéricos con configuración específica para áreas

Ambos casos solo necesitan un componente `Card` que usa los componentes genéricos internamente.

