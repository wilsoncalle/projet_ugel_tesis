# 🧪 Prueba Offline - Guía Paso a Paso

## ⚠️ Error Actual

**Problema**: Estás intentando registrar una visita SIN haber seleccionado primero:
- Empleado visitado ❌
- Motivo de visita ❌  
- Lugar (área) ❌

El sistema requiere estos datos ANTES de agregar el visitante a la lista de espera.

---

## ✅ Flujo Correcto para Probar Offline

### **IMPORTANTE**: El orden correcto es:

1. **Primero**: Seleccionar empleado, motivo y lugar
2. **Segundo**: Ingresar datos del visitante
3. **Tercero**: Agregar visitante
4. **Cuarto**: Registrar visita

---

## 📝 Procedimiento Correcto

### Paso 1: Preparar el Entorno (Backend Apagado)
```bash
# NO iniciar el backend
# Solo el frontend debe estar corriendo
cd ugel-frontend
npm run dev
```

### Paso 2: Activar Modo Offline en DevTools
1. Presiona **F12**
2. Ve a **Application** → **Service Workers**
3. Marca la casilla **☑️ Offline**

### Paso 3: Login (Debe funcionar con cache)
- Usuario: `vigilante` (o el que uses)
- Contraseña: tu contraseña
- **Nota**: Si no puedes loguearte offline, necesitas haber iniciado sesión AL MENOS UNA VEZ con internet antes

### Paso 4: Ir al Dashboard de Vigilante
- Deberías ver la interfaz cargada desde cache
- Verás errores de WebSocket (es normal, está offline)

### Paso 5: **¡ORDEN CORRECTO!** Completar Formulario

#### 5.1 Seleccionar Datos de Visita PRIMERO ⚡
```
┌─────────────────────────────────────┐
│  DATOS DE VISITA (Completar PRIMERO) │
├─────────────────────────────────────┤
│                                      │
│  Empleado:   [ Juan Pérez    ▼ ]   │
│  Motivo:     [ Reunión        ▼ ]   │
│  Lugar:      [ Dirección      ▼ ]   │
│                                      │
└─────────────────────────────────────┘
```

#### 5.2 Ingresar Datos del Visitante DESPUÉS
```
┌─────────────────────────────────────┐
│  DATOS DEL VISITANTE                │
├─────────────────────────────────────┤
│                                      │
│  Tipo Doc:   [ DNI            ▼ ]   │
│  Documento:  [ 76241568         ]   │
│  Nombres:    [ Wilson           ]   │
│  Apellidos:  [ Calle Baca       ]   │
│                                      │
│  [Agregar Visitante]                │
│                                      │
└─────────────────────────────────────┘
```

#### 5.3 Registrar la Visita
```
[Registrar Visita]  ← Click aquí
```

### Paso 6: Verificar Guardado Offline

**¿Qué debería pasar?**
- ✅ Mensaje amarillo: "Modo Offline - Visita guardada localmente"
- ✅ Indicador en esquina inferior derecha: 🟡 con "1"
- ✅ Visitante desaparece de la lista de espera

**Verificar en IndexedDB**:
1. **Application** → **IndexedDB** → **ugel-offline-db**
2. **pending_visitas** → Ver registro guardado

### Paso 7: Simular Reconexión
1. ☐ Desmarca la casilla **Offline**
2. **Inicia el backend**:
```bash
cd ugel-api
npm run dev
```

### Paso 8: Sincronización Automática
- Espera 2-3 segundos
- El indicador debería desaparecer
- Los datos se sincronizan automáticamente

### Paso 9: Verificar en Base de Datos
- Abre pgAdmin
- Tabla `RegistrosVisitas`
- ¡Debería estar el registro!

---

## 🐛 Error que Estás Teniendo Ahora

### Diagnóstico:
```javascript
// Lo que tienes:
{
  id: 1759333025742,
  nombres: 'Wilson',
  apellidos: 'Calle Baca',
  empleado: undefined,      // ❌ VACÍO
  motivo: undefined,         // ❌ VACÍO
  lugarId: undefined         // ❌ VACÍO
}
```

### Causa:
**Agregaste el visitante SIN haber seleccionado primero empleado/motivo/lugar**

### Solución:
1. **Elimina** el visitante de la lista de espera (botón 🗑️)
2. **PRIMERO** selecciona empleado, motivo y lugar
3. **DESPUÉS** ingresa los datos del visitante
4. **FINALMENTE** agregar y registrar

---

## 🎯 Flujo Visual Correcto

```
ORDEN CORRECTO:
┌──────────────────────┐
│ 1. Empleado:  Juan   │ ← Seleccionar PRIMERO
│ 2. Motivo:    Reunión│ ← Seleccionar PRIMERO  
│ 3. Lugar:     Oficina│ ← Seleccionar PRIMERO
├──────────────────────┤
│ 4. Doc:       DNI    │ ← Después
│ 5. Num:       123456 │
│ 6. Nombres:   Wilson │
│ 7. Apellidos: Calle  │
├──────────────────────┤
│ [Agregar Visitante]  │ ← Después
├──────────────────────┤
│ [Registrar Visita]   │ ← Al final
└──────────────────────┘
```

---

## 💡 Tips para Pruebas

### Tip 1: Limpiar Estado
Si te confundes, puedes limpiar todo:

```javascript
// En Console del navegador:
// 1. Limpiar visitantes en espera (recargar página)
location.reload();

// 2. Limpiar IndexedDB
indexedDB.deleteDatabase('ugel-offline-db');

// 3. Limpiar Service Worker
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));

// 4. Recargar
location.reload();
```

### Tip 2: Ver Estado en Tiempo Real
```javascript
// En Console:
// Ver visitantes en espera (si el componente los expone)
// O simplemente mira la tabla en la interfaz
```

### Tip 3: Forzar Sincronización
- Click en el indicador 🟡 en la esquina
- Click en "Sincronizar ahora"

---

## 🎬 Video Mental del Proceso Correcto

```
1. 🌐 OFFLINE activado
   └─ Backend apagado o casilla marcada

2. 📝 Seleccionar en el formulario:
   ├─ Empleado: Juan Pérez
   ├─ Motivo: Reunión
   └─ Lugar: Dirección

3. 👤 Agregar datos del visitante:
   ├─ DNI: 76241568
   ├─ Nombres: Wilson
   └─ Apellidos: Calle Baca

4. ➕ Click "Agregar Visitante"
   └─ Aparece en la tabla de espera con TODOS los datos

5. ✅ Click "Registrar Visita"
   ├─ Mensaje: "Modo Offline - Guardado localmente"
   ├─ Indicador: 🟡 1 pendiente
   └─ Guardado en IndexedDB

6. 🌐 ONLINE activado
   └─ Backend encendido

7. ⏳ Esperar 2-3 segundos
   └─ Sincronización automática

8. ✅ Verificar en base de datos
   └─ ¡Registro aparece!
```

---

## 🚨 Errores Comunes

### Error 1: "Falta ID del empleado"
**Causa**: No seleccionaste empleado antes de agregar visitante
**Solución**: Selecciona empleado/motivo/lugar ANTES

### Error 2: "Error al crear visita" en línea 456
**Causa**: Backend apagado pero no manejaste bien offline
**Solución**: Sigue el orden correcto del flujo

### Error 3: No se guarda en IndexedDB
**Causa**: Service Worker antiguo o cache corrupto
**Solución**: Ejecutar comandos de limpieza del Tip 1

### Error 4: Sincronización no funciona
**Causa**: Backend no está corriendo
**Solución**: `cd ugel-api && npm run dev`

---

## 📊 Checklist de Prueba Completa

- [ ] Backend APAGADO
- [ ] Frontend corriendo
- [ ] F12 → Application → Service Workers
- [ ] ☑️ Casilla "Offline" marcada
- [ ] Login exitoso (usando cache)
- [ ] Dashboard visible
- [ ] **ORDEN CORRECTO**:
  - [ ] 1. Seleccionar Empleado
  - [ ] 2. Seleccionar Motivo
  - [ ] 3. Seleccionar Lugar
  - [ ] 4. Ingresar datos visitante
  - [ ] 5. Agregar visitante
  - [ ] 6. Registrar visita
- [ ] Mensaje "Modo Offline" visible
- [ ] Indicador 🟡 aparece con "1"
- [ ] IndexedDB tiene el registro
- [ ] ☐ Desmarcar "Offline"
- [ ] Backend ENCENDIDO
- [ ] Esperar sincronización (2-3 seg)
- [ ] Indicador desaparece
- [ ] Registro en pgAdmin ✅

---

## 🎓 Entendiendo el Error

El error que ves:
```
Error al registrar visitante: Wilson Calle Baca
```

NO es un error de offline, es un error de **validación de datos**.

El sistema dice:
> "No puedo registrar esta visita porque no sé a qué empleado va a visitar, por qué motivo, ni a qué lugar"

**Solución**: Completa TODOS los campos ANTES de agregar el visitante.

---

¿Necesitas ayuda con algún paso específico? 🚀

