# 🔧 Solución: Hora de Salida No Se Persiste en Sincronización Offline

## ❌ Problema Identificado

Se presentaba una inconsistencia de datos al sincronizar las salidas de visitantes registradas en modo offline. Al recuperar la conexión, la salida del visitante se persistía en la base de datos, lo que provocaba que apareciera correctamente en el 'Historial'. Sin embargo, el campo específico de la hora de salida no se actualizaba, permaneciendo en nulo. Esto causaba un estado ambiguo en el que el visitante figuraba simultáneamente en el 'Historial' y en la lista de 'Visitantes Activos', requiriendo una segunda acción manual para registrar la salida de forma definitiva.

### 🔍 Causa Raíz

El problema estaba en que:

1. **Backend No Aceptaba Parámetros**: El endpoint PUT `/api/visitas/:id/salida` no aceptaba parámetros en el cuerpo de la petición
2. **Hora No Se Enviaba**: La sincronización no enviaba la hora de salida capturada offline
3. **Servidor Usaba Timestamp Actual**: El servidor usaba `CURRENT_TIMESTAMP` en lugar de la hora capturada offline
4. **Datos Incompletos**: La salida se registraba sin la hora específica, causando inconsistencia

---

## ✅ Solución Implementada

### 1. **Modificación del Backend - Repositorio**

**Archivo**: `ugel-api/src/api/visitas/visitas.repository.js`
**Nueva Función**: `registrarSalidaConFechaHora`

```javascript
/**
 * Registrar salida de visita con fecha y hora específicas (para sincronización offline)
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @param {string} fechaSalida - Fecha de salida en formato YYYY-MM-DD
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Visita actualizada
 */
const registrarSalidaConFechaHora = async (id, usuarioSalidaId, fechaSalida, horaSalida) => {
  try {
    // Combinar fecha y hora en un timestamp
    const fechaHoraSalida = `${fechaSalida} ${horaSalida}`;
    
    const query = `
      UPDATE RegistrosVisitas 
      SET 
        fecha_salida = $3::timestamp,
        usuario_salida_id = $1
      WHERE id = $2 AND fecha_salida IS NULL
      RETURNING id
    `;
    
    const result = await db.query(query, [usuarioSalidaId, id, fechaHoraSalida]);
    
    if (result.rows.length === 0) {
      throw new AppError('Visita no encontrada o ya tiene salida registrada', 404);
    }
    
    // Obtener la visita actualizada completa
    const visitaActualizada = await findById(id);
    return visitaActualizada;
    
  } catch (error) {
    // Manejo de errores...
  }
};
```

### 2. **Modificación del Backend - Servicio**

**Archivo**: `ugel-api/src/api/visitas/visitas.service.js`
**Nueva Función**: `registrarSalidaVisitaConFechaHora`

```javascript
/**
 * Registrar salida de visita con fecha y hora específicas (para sincronización offline)
 * @param {number} id - ID de la visita
 * @param {number} usuarioSalidaId - ID del usuario que registra la salida
 * @param {string} fechaSalida - Fecha de salida en formato YYYY-MM-DD
 * @param {string} horaSalida - Hora de salida en formato HH:MM:SS
 * @returns {Object} Visita actualizada
 */
const registrarSalidaVisitaConFechaHora = async (id, usuarioSalidaId, fechaSalida, horaSalida) => {
  try {
    // Verificar si la visita existe
    const visita = await repository.findById(id);
    if (!visita) {
      throw new AppError('Visita no encontrada', 404);
    }
    
    // Verificar si la visita ya tiene salida registrada
    if (visita.fecha_salida) {
      throw new AppError('La visita ya tiene salida registrada', 400);
    }
    
    // Registrar salida con fecha y hora específicas
    const updatedVisita = await repository.registrarSalidaConFechaHora(id, usuarioSalidaId, fechaSalida, horaSalida);
    
    return updatedVisita;
    
  } catch (error) {
    logger.error(`Error registrando salida con fecha/hora para visita ID ${id}:`, error);
    throw error;
  }
};
```

### 3. **Modificación del Backend - Controlador**

**Archivo**: `ugel-api/src/api/visitas/visitas.controller.js`
**Función**: `registrarSalida` (modificada)

```javascript
const registrarSalida = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fechaSalida, horaSalida } = req.body; // Parámetros opcionales para sincronización offline
  
  const usuarioSalidaId = req.user.id;
  let visita;
  
  // Si se proporcionan fecha y hora específicas (sincronización offline)
  if (fechaSalida && horaSalida) {
    logger.info(`Registrando salida con fecha/hora específica: ${fechaSalida} ${horaSalida}`);
    visita = await service.registrarSalidaVisitaConFechaHora(id, usuarioSalidaId, fechaSalida, horaSalida);
  } else {
    // Registro normal con fecha/hora actual
    visita = await service.registrarSalidaVisita(id, usuarioSalidaId);
  }
  
  // Emitir evento y responder...
});
```

### 4. **Modificación del Frontend - Almacenamiento Offline**

**Archivo**: `ugel-frontend/src/utils/offlineDB.js`
**Función**: `saveSalidaOffline` (modificada)

```javascript
const now = new Date();
const salidaOffline = {
  visitaId,
  timestamp: Date.now(),
  // Guardar la fecha y hora de salida capturada offline
  fechaSalida: now.toISOString().split('T')[0], // YYYY-MM-DD
  horaSalida: now.toTimeString().substring(0, 8), // HH:MM:SS
  status: 'pending',
  syncAttempts: 0,
  // ... otros campos
};
```

### 5. **Modificación del Frontend - Sincronización**

**Archivo**: `ugel-frontend/src/utils/offlineSync.js`
**Función**: `syncPendingSalidas` (modificada)

```javascript
// Preparar datos para enviar al backend
const salidaData = {
  fechaSalida: salida.fechaSalida,
  horaSalida: salida.horaSalida
};

console.log('[Sync] Enviando salida con fecha/hora específica:', salidaData);

// Enviar al backend
const response = await fetch(`${API_BASE_URL}/visitas/${salida.visitaId}/salida`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(salidaData) // Incluir fecha y hora en el cuerpo
});
```

---

## 🎯 Beneficios de la Solución

### ✅ **Persistencia Correcta de Hora**
- La hora de salida capturada offline se persiste correctamente en la base de datos
- No hay pérdida de información temporal durante la sincronización
- Los datos son consistentes entre el estado offline y online

### ✅ **Eliminación de Estados Ambiguos**
- Los visitantes no aparecen simultáneamente en activos e historial
- La salida se registra completamente de una vez
- No se requiere acción manual adicional

### ✅ **Compatibilidad Backward**
- El endpoint existente sigue funcionando para registros normales
- Los parámetros de fecha/hora son opcionales
- No se rompe la funcionalidad existente

### ✅ **Sincronización Robusta**
- La sincronización envía todos los datos necesarios
- El servidor procesa correctamente las fechas/horas específicas
- Los logs proporcionan visibilidad del proceso

---

## 🧪 Casos de Prueba

### 1. **Registro de Salida Offline**
1. Desconectar internet
2. Registrar salida de visita a las 14:30
3. ✅ **Resultado**: Se guarda la hora 14:30 en IndexedDB

### 2. **Sincronización con Hora Específica**
1. Completar paso anterior
2. Reconectar internet
3. Esperar sincronización
4. ✅ **Resultado**: La salida se registra en el servidor con hora 14:30

### 3. **Verificación de Persistencia**
1. Completar sincronización (paso anterior)
2. Recargar la página
3. Verificar historial
4. ✅ **Resultado**: La visita aparece en historial con hora 14:30, no en activos

### 4. **Registro Normal (Sin Offline)**
1. Con internet, registrar salida normal
2. ✅ **Resultado**: Se usa la hora actual del servidor (comportamiento original)

---

## 🔍 Logs de Debugging

Para verificar que la solución funciona, revisar estos logs:

```
[IndexedDB] Salida guardada offline con ID: 123
[Sync] Sincronizando 1 salidas pendientes...
[Sync] Enviando salida con fecha/hora específica: {fechaSalida: "2025-01-15", horaSalida: "14:30:00"}
[API] Registrando salida con fecha/hora específica: 2025-01-15 14:30:00
[Sync] ✅ Salida 123 sincronizada correctamente
```

---

## 📋 Flujo de Sincronización Mejorado

### 1. **Captura Offline**
```
Usuario registra salida → Captura fecha/hora actual → Guarda en IndexedDB con fechaSalida y horaSalida
```

### 2. **Sincronización**
```
Conexión restaurada → Lee datos de IndexedDB → Envía fechaSalida y horaSalida al servidor
```

### 3. **Procesamiento Servidor**
```
Recibe parámetros → Usa registrarSalidaConFechaHora → Persiste con hora específica
```

### 4. **Resultado**
```
Visita aparece en historial con hora correcta → No aparece en activos → Estado consistente
```

---

## 🚀 Impacto en el Sistema

- **✅ Consistencia**: Los datos offline se sincronizan correctamente con hora específica
- **✅ Precisión**: No hay pérdida de información temporal
- **✅ Robustez**: El sistema maneja correctamente tanto registros normales como offline
- **✅ Usabilidad**: Eliminación de estados ambiguos y acciones manuales adicionales

---

*Problema de hora de salida offline solucionado exitosamente - Sistema de Control de Acceso UGEL Talara*
