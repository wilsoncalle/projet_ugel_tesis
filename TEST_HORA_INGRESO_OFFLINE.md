# 🧪 Test: Hora de Ingreso en Modo Offline

## ✅ Problema Solucionado

Se ha corregido el problema donde la hora de ingreso se mostraba incorrectamente (17:00) en el historial de visitas cuando se registraba una salida en modo offline.

### 🔧 Correcciones Implementadas

#### 1. **Preservación de Hora de Ingreso en Historial Offline**
- **Archivo**: `DashboardVigilantePage.jsx`
- **Función**: `handleOfflineSalidaRegistrada`
- **Cambio**: Se preserva explícitamente la `fecha_ingreso` y `hora_ingreso` originales al crear la entrada del historial

```javascript
// Antes (problemático)
const entradaHistorial = {
  ...visita,
  fecha_salida: new Date(timestamp).toISOString(),
  hora_salida: new Date(timestamp).toLocaleTimeString('es-PE', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  }),
  _wasOfflineExit: true,
  _offlineExitTimestamp: timestamp
};

// Después (corregido)
const entradaHistorial = {
  ...visita,
  // Preservar la fecha y hora de ingreso original
  fecha_ingreso: visita.fecha_ingreso || visita.fechaIngreso || new Date().toISOString().split('T')[0],
  hora_ingreso: visita.hora_ingreso || visita.horaIngreso || new Date().toLocaleTimeString('es-PE', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  }),
  // Agregar datos de salida
  fecha_salida: new Date(timestamp).toISOString(),
  hora_salida: new Date(timestamp).toLocaleTimeString('es-PE', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  }),
  _wasOfflineExit: true,
  _offlineExitTimestamp: timestamp
};
```

#### 2. **Mejora en Renderizado de Hora en Historial**
- **Archivo**: `VisitantesTabla.jsx`
- **Función**: Renderizado de columna `horaIngreso` para historial
- **Cambio**: Se agregó lógica para manejar correctamente las horas de visitas offline

```javascript
// Antes (problemático)
// Para historial (formato plano)
else {
  try {
    const fechaIngreso = row.fecha_ingreso;
    if (fechaIngreso) {
      const fecha = new Date(fechaIngreso);
      if (!isNaN(fecha.getTime())) {
        horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }
  } catch (e) {
    console.error('Error al formatear hora de ingreso:', e);
  }
}

// Después (corregido)
// Para historial (formato plano)
else {
  try {
    // Prioridad 1: Usar hora_ingreso directo si existe (para visitas offline)
    if (row.hora_ingreso) {
      horaFormateada = row.hora_ingreso.substring(0, 5);
      console.log('[VisitantesTabla] Historial - Usando hora_ingreso:', horaFormateada);
    }
    // Prioridad 2: Usar horaIngreso si existe
    else if (row.horaIngreso) {
      horaFormateada = row.horaIngreso.substring(0, 5);
      console.log('[VisitantesTabla] Historial - Usando horaIngreso:', horaFormateada);
    }
    // Prioridad 3: Extraer de fecha_ingreso solo si es una fecha completa con hora
    else if (row.fecha_ingreso) {
      if (row.fecha_ingreso.includes('T')) {
        const fecha = new Date(row.fecha_ingreso);
        if (!isNaN(fecha.getTime())) {
          horaFormateada = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
          console.log('[VisitantesTabla] Historial - Usando fecha_ingreso con hora:', horaFormateada);
        }
      } else {
        // Si es solo fecha (YYYY-MM-DD), usar hora por defecto
        horaFormateada = '00:00';
        console.log('[VisitantesTabla] Historial - Solo fecha, usando hora por defecto');
      }
    }
  } catch (e) {
    console.error('Error al formatear hora de ingreso en historial:', e);
  }
}
```

#### 3. **Mejora en Búsqueda de Historial Offline**
- **Archivo**: `DashboardVigilantePage.jsx`
- **Función**: `handleBuscarHistorial`
- **Cambio**: Se agregó filtrado básico para modo offline

```javascript
// Modo offline: usar solo los datos locales del historial
console.log('[Offline] Buscando en historial local...');
historialData = historialVisitas || [];

// Aplicar filtros básicos en modo offline
if (filtrosData.busqueda) {
  const busqueda = filtrosData.busqueda.toLowerCase();
  historialData = historialData.filter(visita => {
    const nombreCompleto = `${visita.visitante_nombres || ''} ${visita.visitante_apellidos || ''}`.toLowerCase();
    const empleadoCompleto = `${visita.personal_nombres || ''} ${visita.personal_apellidos || ''}`.toLowerCase();
    const documento = (visita.numero_documento || '').toLowerCase();
    
    return nombreCompleto.includes(busqueda) || 
           empleadoCompleto.includes(busqueda) || 
           documento.includes(busqueda);
  });
}
```

---

## 🧪 Casos de Prueba

### 1. **Registro de Salida Offline**
1. Desconectar internet
2. Registrar una visita (ej: ingreso a las 14:30)
3. Registrar la salida de esa visita
4. Verificar que en el historial aparezca la hora de ingreso correcta (14:30, no 17:00)

### 2. **Sincronización Post-Offline**
1. Registrar salida offline (debe mostrar hora correcta)
2. Reconectar internet
3. Verificar que la sincronización mantenga la hora de ingreso original
4. Verificar que los datos se actualicen correctamente

### 3. **Búsqueda en Historial Offline**
1. Desconectar internet
2. Registrar varias visitas y salidas
3. Buscar en el historial por nombre del visitante
4. Verificar que las horas de ingreso se muestren correctamente

---

## ✅ Resultado Esperado

- ✅ **Hora de Ingreso Correcta**: Las visitas offline muestran la hora de ingreso original en el historial
- ✅ **Preservación de Datos**: Los datos se mantienen intactos durante la transición offline → historial
- ✅ **Sincronización Correcta**: Al volver la conexión, los datos se actualizan sin perder la información original
- ✅ **Búsqueda Funcional**: El historial offline permite buscar y filtrar correctamente

---

## 🔍 Debugging

Para verificar que funciona correctamente, revisar los logs en la consola del navegador:

```
[VisitantesTabla] Historial - Usando hora_ingreso: 14:30
[Dashboard] Visitante movido de activos a historial (offline)
[Offline] Buscando en historial local...
```

---

*Problema solucionado exitosamente - Sistema de Control de Acceso UGEL Talara*
