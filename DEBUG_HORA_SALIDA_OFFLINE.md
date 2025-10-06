# 🔍 Debug: Hora de Salida Offline No Se Respeta

## ❌ Problema Reportado

Al registrar una salida en modo offline y luego sincronizar cuando se vuelve online, la hora de salida no se respeta en la base de datos. La información de ingreso se guarda correctamente, pero la salida no, haciendo que el visitante aparezca en la pestaña de activos requiriendo registrar la salida nuevamente.

## 🔍 Pasos para Debuggear

### 1. **Verificar Logs del Frontend**

Revisar la consola del navegador para estos logs:

```
[IndexedDB] Generando datos de salida offline: {
  now: "2025-01-15T14:30:00.000Z",
  fechaSalida: "2025-01-15",
  horaSalida: "14:30:00",
  visitaId: "123"
}

[Sync] Datos de salida offline completos: {
  salidaId: 456,
  visitaId: "123",
  fechaSalida: "2025-01-15",
  horaSalida: "14:30:00",
  timestamp: 1640995200000,
  visitanteData: {...}
}

[Sync] Enviando salida con fecha/hora específica: {
  fechaSalida: "2025-01-15",
  horaSalida: "14:30:00"
}
```

### 2. **Verificar Logs del Backend**

Revisar los logs del servidor para estos mensajes:

```
[API] Registrando salida para visita ID: 123
[API] Datos recibidos en el cuerpo de la petición: { fechaSalida: "2025-01-15", horaSalida: "14:30:00", body: {...} }
[API] Registrando salida con fecha/hora específica: 2025-01-15 14:30:00
[API] Tipo de datos: fechaSalida=string, horaSalida=string
[API] Salida registrada exitosamente para visita ID: 123
[API] Datos de la visita actualizada: {...}
```

### 3. **Verificar Base de Datos**

Ejecutar esta consulta SQL para verificar si la hora se guardó correctamente:

```sql
SELECT 
  id,
  fecha_ingreso,
  hora_ingreso,
  fecha_salida,
  usuario_salida_id,
  created_at,
  updated_at
FROM RegistrosVisitas 
WHERE id = [ID_DE_LA_VISITA]
ORDER BY updated_at DESC;
```

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Nueva Función: `getVisitasActivasCompletas()`**

Se creó una función en `offlineDB.js` que resuelve el problema principal:

```javascript
export async function getVisitasActivasCompletas() {
  // 1. Carga visitas pendientes (pending_visitas)
  // 2. Carga salidas pendientes (pending_salidas) 
  // 3. Combina ambos datos correctamente
  // 4. Retorna:
  //    - visitasActivas: solo las que NO tienen salida
  //    - visitasConSalida: las que SÍ tienen salida (para historial)
  //    - salidasPendientes: datos de salidas para sincronización
}
```

### **Flujo Corregido**

```
1. Usuario registra salida offline
   ↓
2. Se guarda en pending_salidas (IndexedDB)
   ↓
3. Usuario recarga página
   ↓
4. getVisitasActivasCompletas() carga:
   - pending_visitas + pending_salidas
   - Aplica salidas sobre visitas correspondientes
   ↓
5. Solo muestra visitas SIN salida en "Activos"
   ↓
6. Visitas CON salida van al historial automáticamente
```

## 🔧 Posibles Causas y Soluciones

### **Causa 1: Datos No Se Envían Correctamente**

**Síntomas**: No aparecen los logs de sincronización
**Solución**: Verificar que `saveSalidaOffline` se esté llamando correctamente

### **Causa 2: Servidor No Recibe los Datos**

**Síntomas**: Los logs del servidor no muestran `fechaSalida` y `horaSalida`
**Solución**: Verificar que el Content-Type sea `application/json`

### **Causa 3: Servidor No Procesa los Datos**

**Síntomas**: Los logs muestran que se reciben los datos pero no se usan
**Solución**: Verificar que la condición `if (fechaSalida && horaSalida)` se cumpla

### **Causa 4: Error en la Query SQL**

**Síntomas**: Los logs muestran error en la base de datos
**Solución**: Verificar el formato de la fecha/hora en la query

### **Causa 5: Problema de Timezone**

**Síntomas**: La hora se guarda pero con diferencia de timezone
**Solución**: Ajustar el formato de fecha/hora para incluir timezone

### **Causa 6: Salidas Pendientes No Se Cargan al Recargar (SOLUCIONADO)**

**Síntomas**: Al recargar la página, las salidas offline no se aplican
**Solución**: Usar `getVisitasActivasCompletas()` que combina visitas y salidas pendientes

## 🧪 Casos de Prueba

### **Caso 1: Salida Offline Básica**
1. Desconectar internet
2. Registrar una visita
3. Registrar salida de la visita
4. Verificar logs de IndexedDB
5. Reconectar internet
6. Verificar logs de sincronización
7. Verificar base de datos

### **Caso 2: Múltiples Salidas Offline**
1. Desconectar internet
2. Registrar varias visitas
3. Registrar salidas de todas las visitas
4. Reconectar internet
5. Verificar que todas se sincronicen correctamente

### **Caso 3: Salida Offline con Diferentes Horas**
1. Desconectar internet
2. Registrar visita a las 10:00
3. Registrar salida a las 14:30
4. Reconectar internet
5. Verificar que la hora de salida sea 14:30

## 📋 Checklist de Verificación

- [ ] Los logs de IndexedDB muestran la fecha/hora correcta
- [ ] Los logs de sincronización muestran los datos correctos
- [ ] Los logs del servidor muestran que recibe los datos
- [ ] Los logs del servidor muestran que usa la fecha/hora específica
- [ ] La base de datos contiene la hora de salida correcta
- [ ] El visitante no aparece en la lista de activos después de sincronizar
- [ ] El visitante aparece en el historial con la hora correcta

## 🚨 Logs de Error Comunes

### **Error 1: Datos No Se Envían**
```
[Sync] Enviando salida con fecha/hora específica: { fechaSalida: undefined, horaSalida: undefined }
```
**Solución**: Verificar que `saveSalidaOffline` esté guardando los datos correctamente

### **Error 2: Servidor No Recibe Datos**
```
[API] Datos recibidos en el cuerpo de la petición: { fechaSalida: undefined, horaSalida: undefined, body: {} }
```
**Solución**: Verificar que el Content-Type sea `application/json` y que se esté enviando el body

### **Error 3: Condición No Se Cumple**
```
[API] No se proporcionaron fecha/hora específicas, usando fecha/hora actual
```
**Solución**: Verificar que `fechaSalida` y `horaSalida` no sean `null` o `undefined`

### **Error 4: Error en Base de Datos**
```
[API] Error en repositorio registrando salida con fecha/hora para visita ID 123: [error details]
```
**Solución**: Verificar el formato de la fecha/hora en la query SQL

## 🔧 Comandos de Debug

### **Verificar Datos en IndexedDB**
```javascript
// En la consola del navegador
const db = await indexedDB.open('UGEL_OFFLINE_DB', 1);
const transaction = db.transaction(['pending_salidas'], 'readonly');
const store = transaction.objectStore('pending_salidas');
const salidas = await store.getAll();
console.log('Salidas pendientes:', salidas);
```

### **Verificar Datos en Base de Datos**
```sql
-- Verificar la última visita actualizada
SELECT 
  id,
  fecha_ingreso,
  hora_ingreso,
  fecha_salida,
  usuario_salida_id,
  updated_at
FROM RegistrosVisitas 
ORDER BY updated_at DESC 
LIMIT 5;
```

---

*Guía de debugging para problema de hora de salida offline - Sistema de Control de Acceso UGEL Talara*
