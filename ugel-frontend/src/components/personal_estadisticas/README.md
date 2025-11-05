# Componentes de Estadísticas de Asistencia de Personal

Este directorio contiene los componentes para visualizar estadísticas de asistencia del personal.

## Estructura de Componentes

### PanelSeleccionEstadisticas.jsx
Panel lateral que permite seleccionar la categoría de estadística a visualizar:
- Total de Asistencias
- Puntualidad y Tardanzas
- Ausencias y Justificaciones
- Áreas / Dependencias
- Personal

### Componentes de Tarjetas

Todos los componentes de tarjetas utilizan el componente genérico `EstadisticasCard` de `../estadisticas` y sus respectivos hooks personalizados.

#### AsistenciasTotalesCard.jsx
**Hook**: `useAsistenciasTotales`  
**Tipo de gráfico**: Líneas (Line Chart)  
**Endpoint**: `/api/asistencia-personal/estadisticas/totales`

Muestra:
- Total de asistencias por período
- Flujo diario de asistencias con gráfico de líneas
- Métricas: Total, día con más/menos asistencias, promedio diario

#### PuntualidadCard.jsx
**Hook**: `useAsistenciasPuntualidad`  
**Tipo de gráfico**: Pie/Doughnut  
**Endpoint**: `/api/asistencia-personal/estadisticas/puntualidad`

Muestra:
- Distribución de asistencias por estado de presencia
- Gráfico circular con porcentajes
- Métricas: Total de registros, estado más/menos frecuente

#### AusenciasCard.jsx
**Hook**: `useAsistenciasAusencias`  
**Tipo de gráfico**: Pie/Doughnut  
**Endpoint**: `/api/asistencia-personal/estadisticas/ausencias`

Muestra:
- Distribución de ausencias por tipo (Falta, Permiso, Licencia)
- Gráfico circular con porcentajes
- Métricas: Total de ausencias, tipo más/menos frecuente

#### AreasCard.jsx
**Hook**: `useAsistenciasAreas`  
**Tipo de gráfico**: Barras horizontales  
**Endpoint**: `/api/asistencia-personal/estadisticas/areas`

Muestra:
- Asistencias por área con gráfico de barras horizontales
- Top 15 áreas con más asistencias
- Métricas: Total, área con más/menos asistencias, promedio por área

#### PersonalCard.jsx
**Hook**: `useAsistenciasPersonal`  
**Tipo de gráfico**: Barras horizontales  
**Endpoint**: `/api/asistencia-personal/estadisticas/personal`

Muestra:
- Top 10 de personal con mayor asistencia
- Gráfico de barras horizontales con gradientes
- Métricas: Total, personal con más/menos asistencias, promedio

## Hooks Personalizados

Todos los hooks están ubicados en `/src/hooks/`:

- `useAsistenciasTotales.js`
- `useAsistenciasPuntualidad.js`
- `useAsistenciasAusencias.js`
- `useAsistenciasAreas.js`
- `useAsistenciasPersonal.js`

Cada hook maneja:
- Estado de carga (`loading`)
- Manejo de errores (`error`)
- Selección de período (`periodo`, `setPeriodo`)
- Transformación de datos del backend al formato esperado por los gráficos

## Uso

Los componentes se importan desde el index.js:

```javascript
import {
  AsistenciasTotalesCard,
  PuntualidadCard,
  AusenciasCard,
  AreasCard,
  PersonalCard,
  PanelSeleccionEstadisticas
} from '../components/personal_estadisticas';
```

## Parámetros de Consulta

Todos los endpoints aceptan el parámetro:
- `periodo`: Período de tiempo ('hoy', 'semana', 'mes', 'anio', 'todo')

El backend convierte automáticamente el período en fechas de inicio y fin.

## Componentes Reutilizados

- **EstadisticasCard**: Componente genérico de tarjeta con selector de período y botón de expandir
- **EstadisticasChart**: Renderiza gráficos de tipo pie, bar o line según configuración
- **EstadisticasModal**: Modal expandido con métricas y tabla detallada
- **EstadisticasMetricas**: Muestra métricas calculadas (total, máximo, mínimo, promedio)
- **EstadisticasTabla**: Tabla con búsqueda, ordenamiento y paginación

## Tecnologías Utilizadas

- **Chart.js** (react-chartjs-2) para gráficos de barras
- **Recharts** para gráficos de pie/doughnut
- **Ant Design Plots** para gráficos de líneas
- **Lucide React** para iconos
- **Framer Motion** para animaciones
