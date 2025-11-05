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

#### AsistenciasTotalesCard.jsx
Muestra:
- Total de asistencias por período
- Flujo diario de asistencias (gráfico de líneas/barras)

**Endpoint**: `/api/asistencia-personal/estadisticas/totales`

#### PuntualidadCard.jsx
Muestra:
- Distribución de puntuales vs tardanzas vs faltas
- Gráfico de barras apiladas por día
- Histograma de hora de llegada

**Endpoint**: `/api/asistencia-personal/estadisticas/puntualidad`

#### AusenciasCard.jsx
Muestra:
- Resumen de ausencias por tipo (Falta, Permiso, Licencia)
- Top 10 de personal con más faltas

**Endpoint**: `/api/asistencia-personal/estadisticas/ausencias`

#### AreasCard.jsx
Muestra:
- Asistencias por área (gráfico de barras horizontales)
- Porcentaje de asistencia por área

**Endpoint**: `/api/asistencia-personal/estadisticas/areas`

#### PersonalCard.jsx
Muestra:
- Top 10 de personal con mayor asistencia
- Ficha detallada de asistencia por persona (al seleccionar)

**Endpoint**: `/api/asistencia-personal/estadisticas/personal`

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

Todos los endpoints aceptan los siguientes parámetros:
- `fechaInicio`: Fecha de inicio del período (YYYY-MM-DD)
- `fechaFin`: Fecha de fin del período (YYYY-MM-DD)
- `personalId`: ID del personal (opcional, solo para PersonalCard)

## Gráficos Recomendados

- **Chart.js** (react-chartjs-2) para gráficos de líneas, barras y doughnut
- **Recharts** como alternativa
