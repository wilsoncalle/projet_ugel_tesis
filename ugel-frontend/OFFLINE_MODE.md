# Sistema de Detección Offline Automática

## 📋 Descripción General

Este sistema implementa **detección automática de modo offline** con fallback inteligente. **No necesitas activar/desactivar manualmente el modo offline**. El Service Worker y el hook de React trabajan juntos para:

1. **Detectar automáticamente** cuando no hay conexión (internet o servidor)
2. **Fallar hacia cache** cuando la red no responde
3. **Sincronizar automáticamente** cuando vuelve la conexión

---

## 🏗️ Arquitectura

### 1. **Frontend (React) - Detección UI**

#### Hook: `useConnectivity.js`

```javascript
const { online, verified, isOffline } = useConnectivity("/api/health", 15000);
```

**¿Qué hace?**

- Escucha eventos `online/offline` del navegador (`navigator.onLine`)
- Hace **ping real** al endpoint `/api/health` cada 15 segundos
- Devuelve:
  - `online`: true si el navegador reporta conexión
  - `verified`: true si el servidor respondió exitosamente
  - `isOffline`: true si no hay conexión **O** el servidor no responde

**¿Por qué ping?**
Porque `navigator.onLine` puede ser `true` aunque:

- El servidor backend esté caído
- La VPN/Firewall bloquee la conexión
- El WiFi esté conectado pero sin internet real

---

### 2. **Service Worker (Workbox) - Fallback Automático**

#### Archivo: `public/sw.js`

**Estrategias de cache:**

| Tipo de Recurso          | Estrategia                  | Comportamiento                                                                   |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------- |
| **Navegación (HTML)**    | `NetworkFirst` (timeout 3s) | Intenta red → si falla usa cache → si todo falla usa `offline.html`              |
| **API Calls (`/api/*`)** | `NetworkFirst` (timeout 5s) | Intenta red → si falla usa cache → si todo falla devuelve JSON `{offline: true}` |
| **Assets (JS/CSS)**      | `StaleWhileRevalidate`      | Sirve del cache mientras actualiza en background                                 |
| **Imágenes**             | `CacheFirst`                | Sirve siempre del cache (más rápido)                                             |
| **Uploads**              | `CacheFirst`                | Sirve del cache por 7 días                                                       |

**Fallback final (`setCatchHandler`):**

```javascript
// Si es navegación → offline.html
// Si es API → JSON con {offline: true}
// Todo lo demás → Response.error()
```

**✅ No necesitas "activar offline"**. El SW intenta red, y si falla, responde desde cache automáticamente.

---

### 3. **Backend (Express) - Endpoint de Health**

#### Endpoint: `GET /HEAD /api/health`

```javascript
// GET: Devuelve información completa
{
  "status": "OK",
  "timestamp": "2025-12-16T05:30:00.000Z",
  "uptime": 123456
}

// HEAD: Solo status code 200 (ping ultraligero)
```

**¿Por qué HEAD?**

- Más rápido (sin body)
- Menos consumo de datos
- Ideal para `useConnectivity` ping checks

---

## 🎯 Flujo de Trabajo

### Escenario 1: Usuario va offline

```mermaid
Usuario pierde WiFi
    ↓
navigator.onLine = false
    ↓
useConnectivity detecta isOffline=true
    ↓
OfflineIndicator muestra banner "Sin conexión"
    ↓
Usuario intenta cargar /visitas
    ↓
Service Worker intercepta la petición
    ↓
fetch() falla → sirve del cache
    ↓
Usuario ve datos cacheados (últimos datos que tuvo)
```

### Escenario 2: Servidor backend caído (pero hay internet)

```mermaid
Servidor AWS cae
    ↓
navigator.onLine = true (WiFi está conectado)
    ↓
useConnectivity hace ping a /api/health → timeout
    ↓
verified = false → isOffline = true
    ↓
OfflineIndicator muestra "Servidor no disponible"
    ↓
Service Worker usa cache para APIs
```

### Escenario 3: Conexión vuelve

```mermaid
Internet/Servidor vuelve
    ↓
navigator.onLine = true
    ↓
useConnectivity ping exitoso → verified = true
    ↓
isOffline = false
    ↓
Banner desaparece
    ↓
Service Worker automáticamente usa red (NetworkFirst)
    ↓
Cache se actualiza en background
    ↓
offlineSync.js sincroniza datos pendientes
```

---

## 📦 Componentes del Sistema

### Archivos Clave

```
ugel-frontend/
├── src/
│   ├── hooks/
│   │   └── useConnectivity.js        ← Detección offline con ping
│   ├── components/
│   │   └── OfflineIndicator.jsx      ← Banner visual
│   └── utils/
│       ├── offlineDB.js              ← IndexedDB para datos offline
│       └── offlineSync.js            ← Sincronización automática
└── public/
    ├── sw.js                         ← Service Worker (Workbox)
    └── offline.html                  ← Página fallback

ugel-api/
└── src/
    └── api/
        └── health/
            ├── health.routes.js      ← GET/HEAD /api/health
            ├── health.controller.js
            └── health.service.js
```

---

## 🚀 Uso

### En la UI (React)

```jsx
// 1. Importar el hook
import { useConnectivity } from "../hooks/useConnectivity";

// 2. Usar en tu componente
function MiComponente() {
  const { isOffline } = useConnectivity("/api/health");

  if (isOffline) {
    return <div>⚠️ Trabajando offline</div>;
  }

  return <div>✅ Conectado</div>;
}

// 3. Mostrar el indicador global (ya está en App.jsx)
<OfflineIndicator />;
```

### Verificar que funciona

1. **Simular offline:**

   - Chrome DevTools → Network tab → "Offline"
   - O apaga el WiFi

2. **Simular servidor caído:**

   - Detén el backend (`npm stop` en ugel-api)
   - El WiFi sigue conectado, pero `/api/health` falla

3. **Ver el banner:**
   - Aparecerá automáticamente en <1 segundo
   - Indicará si es problema de red o servidor

---

## ⚙️ Configuración

### Cambiar intervalo de ping

```javascript
// Por defecto: 15 segundos
const { isOffline } = useConnectivity("/api/health", 15000);

// Más agresivo: 5 segundos (más consumo de batería)
const { isOffline } = useConnectivity("/api/health", 5000);

// Más conservador: 30 segundos
const { isOffline } = useConnectivity("/api/health", 30000);
```

### Cambiar timeout de red en Service Worker

```javascript
// En public/sw.js
new NetworkFirst({
  networkTimeoutSeconds: 3, // ← Cambiar aquí (3s por defecto)
});
```

---

## 🐛 Troubleshooting

### "El banner no aparece cuando voy offline"

1. ¿Está registrado el Service Worker?

   ```javascript
   // En DevTools → Application → Service Workers
   // Debe aparecer "Active" y "Running"
   ```

2. ¿Se importó `OfflineIndicator` en `App.jsx`?

   ```jsx
   import OfflineIndicator from "./components/OfflineIndicator";
   <OfflineIndicator />;
   ```

3. ¿El endpoint `/api/health` responde?
   ```bash
   curl http://localhost:3000/api/health
   # Debe devolver: {"status":"OK",...}
   ```

### "Dice offline pero tengo internet"

- Probablemente el **servidor backend** esté caído
- Verifica que `ugel-api` esté corriendo en puerto 3000
- Esto es **correcto**: si el backend no responde, la app debe trabajar offline

### "Los datos no se sincronizan cuando vuelve la conexión"

- Verifica que `offlineSync.js` esté escuchando eventos `online`
- Chequea `offlineDB.js` para ver datos pendientes:
  ```javascript
  import { getPendingVisitas } from "./utils/offlineDB";
  const pending = await getPendingVisitas();
  console.log("Pendientes:", pending);
  ```

---

## 📚 Referencias

- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

## ✅ Checklist de Implementación

- [x] Hook `useConnectivity` creado
- [x] Service Worker migrado a Workbox con fallback automático
- [x] Endpoint `/api/health` con soporte HEAD
- [x] `OfflineIndicator` actualizado para usar `useConnectivity`
- [x] `offline.html` pre-cacheado
- [ ] Testing en producción (AWS)
- [ ] Monitorear logs del Service Worker en producción

---

**Última actualización:** 2025-12-16  
**Versión:** 1.0.0
