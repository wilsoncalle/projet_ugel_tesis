# Implementación de Actualizaciones en Tiempo Real con Socket.IO

Este documento detalla la implementación técnica de la funcionalidad de tiempo real para el registro y salida de visitas en el sistema de control de acceso de la UGEL.

## 1. Arquitectura General

El sistema utiliza **Socket.IO** para establecer una comunicación bidireccional entre el servidor (API) y los clientes (Frontend). Esto permite que los cambios realizados por un usuario (ej. un vigilante registrando una entrada) se reflejen instantáneamente en las pantallas de otros usuarios conectados (otros vigilantes o personal administrativo) sin necesidad de recargar la página.

## 2. Backend (API)

### Configuración del Servidor (`server.js`)

Se inicializa una instancia de `Socket.IO` adjunta al servidor HTTP existente.

```javascript
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins, // Permite conexiones desde el frontend
    methods: ["GET", "POST"],
    credentials: true,
  },
});
```

### Autenticación y Seguridad

Para asegurar que solo usuarios autorizados reciban actualizaciones, se implementó un middleware que verifica el JWT (JSON Web Token) antes de permitir la conexión.

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token; // Token enviado desde el cliente
  // ... validación del token ...
  socket.user = decoded; // Se guarda la info del usuario en el socket
  next();
});
```

### Emisión de Eventos (`visitas.controller.js`)

El controlador de visitas emite eventos específicos cuando ocurren acciones exitosas:

1.  **Nueva Visita**: Al crear una visita (`create`), se emite `nueva_visita_registrada` con los datos completos de la visita.
2.  **Salida de Visita**: Al registrar una salida (`registrarSalida`), se emite `salida_visita_registrada` con el ID de la visita.

_Nota: Se implementó lógica para evitar emitir estos eventos durante sincronizaciones offline masivas para no saturar a los clientes._

## 3. Frontend (Cliente)

### Dashboard Vigilante (`DashboardVigilantePage.jsx`)

Este componente maneja la vista global de todos los visitantes activos.

1.  **Conexión**: Se conecta al socket enviando el token de autenticación almacenado en `localStorage`.
2.  **Evento `nueva_visita_registrada`**:
    - Recibe el objeto de la visita.
    - Lo agrega al inicio de la lista de `visitantesActivos`.
    - Evita duplicados verificando si el ID ya existe.
3.  **Evento `salida_visita_registrada`**:
    - Recibe el `{ visitaId }`.
    - Filtra la lista de `visitantesActivos` para remover la visita correspondiente.
    - Actualiza los contadores de paginación.

### Mis Visitas (`MisVisitasPage.jsx`)

Este componente es específico para el personal, mostrando solo las visitas dirigidas a ellos.

1.  **Conexión**: Similar al vigilante, se conecta enviando el token.
2.  **Evento `nueva_visita_registrada`**:
    - **Filtrado**: Verifica si `visita.personal_visitado_id` coincide con el ID del usuario actual.
    - Si coincide, muestra una notificación (`toast`) y recarga la lista de visitas.
3.  **Evento `salida_visita_registrada`**:
    - **Actualización Optimista**: Al recibir el evento, elimina **inmediatamente** la visita de la lista local `visitasActivas` usando `setVisitasActivas`. Esto asegura que la interfaz responda al instante ("desaparece simultáneamente").
    - **Sincronización**: Inmediatamente después, llama a `fetchVisitas()` para asegurar que la visita aparezca correctamente en la pestaña de "Historial" y que los datos estén consistentes con el servidor.

```javascript
socket.on("salida_visita_registrada", ({ visitaId }) => {
  // 1. Actualización visual inmediata (Optimistic UI)
  setVisitasActivas((prev) => prev.filter((v) => v.id !== parseInt(visitaId)));

  // 2. Sincronización de datos en segundo plano
  fetchVisitas();
});
```

## Resumen de Flujo

1.  **Vigilante A** registra salida de una visita.
2.  **API** procesa la salida en base de datos.
3.  **API** emite evento `salida_visita_registrada` a todos los conectados.
4.  **Vigilante B** recibe evento -> La fila desaparece de su tabla automáticamente.
5.  **Personal (Mis Visitas)** recibe evento -> La tarjeta de visita desaparece de su lista de "Activos" instantáneamente y se mueve al historial tras la recarga automática.
