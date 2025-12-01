# Sistema Integral de Control de Acceso (SICA) - UGEL Talara

Plataforma empresarial para la UGEL Talara que gestiona en tiempo real la asistencia del personal y el flujo de visitantes. Funciona como PWA: puede instalarse en equipos locales y seguir registrando datos cuando la conectividad es inestable.

## Arquitectura y stack
- **Backend (`ugel-api`)**: Node.js + Express, PostgreSQL, Socket.io para sincronización en vivo, node-cron para tareas automáticas, seguridad con Helmet, CORS, JWT y Bcrypt.
- **Frontend (`ugel-frontend`)**: React 18 + Vite, UI con TailwindCSS y Mantine, PWA con `vite-plugin-pwa` (estrategia `injectManifest`), visualizaciones con Chart.js y Recharts.
- **Comunicación**: API REST + WebSockets.
- **Operación**: PM2 para orquestar procesos y Nginx como proxy inverso/servidor de estáticos.

## Requisitos previos
- Node.js 18+ y npm.
- PostgreSQL 14+.
- Acceso a Nginx (producción) y a un usuario con permisos de superusuario en la base de datos para restaurar el esquema.

## Puesta en marcha (entorno local)
1) **Base de datos**
   ```bash
   createdb ugel_control_db    # o via psql: CREATE DATABASE ugel_control_db ENCODING 'UTF8';
   psql -U <usuario> -d ugel_control_db -f ugel-api/scripts/ugel_control_db.sql
   ```
2) **Backend**
   ```bash
   cd ugel-api
   npm ci
   ```
   Crea `.env` en `ugel-api/` con las variables mínimas:
   ```bash
   PORT=3000
   NODE_ENV=development
   DB_USER=postgres
   DB_HOST=localhost
   DB_DATABASE=ugel_control_db
   DB_PASSWORD=tu_password
   DB_PORT=5432
   JWT_SECRET=clave_larga_y_segura
   CORS_ORIGINS=http://localhost:5173
   # JWT_EXPIRES_IN=24h
   # LOG_LEVEL=info
   ```
   Inicializa usuarios y obtiene el ID del usuario técnico:
   ```bash
   node scripts/seed_users.js
   ```
   Copia `SYSTEM_USER_ID=<valor_impreso>` en el `.env`. Inicia el backend:
   ```bash
   npm run dev   # nodemon, entorno local
   # npm start   # arranque simple
   ```
3) **Frontend**
   ```bash
   cd ugel-frontend
   npm ci
   npm run dev
   ```
   El proxy de Vite ya redirige `/api` → `http://localhost:3000/api`. Para WebSockets, Vite usará `VITE_SOCKET_URL` si está definida; si no, usa el origen actual.

## Despliegue en producción (orden recomendado)
1) **Base de datos**: crea la base `ugel_control_db` con UTF8 y restaura `ugel-api/scripts/ugel_control_db.sql` (o el dump final provisto).
2) **Backend (`ugel-api`)**
   ```bash
   cd ugel-api
   npm ci --production
   # ajusta .env con credenciales productivas + SYSTEM_USER_ID obtenido del seed
   node scripts/seed_users.js   # solo la primera vez, para crear usuarios y el usuario system
   npm install -g pm2
   pm2 start server.js --name "ugel-api"
   pm2 save
   ```
3) **Frontend (`ugel-frontend`)**
   ```bash
   cd ugel-frontend
   npm ci
   npm run build   # genera dist/
   ```
4) **Proxy y estáticos (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;

       root /ruta/al/proyecto/ugel-frontend/dist;
       index index.html;

       # SPA
       location / {
           try_files $uri $uri/ /index.html;
       }

       # API
       location /api/ {
           proxy_pass http://localhost:3000/api/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # WebSockets (Socket.io)
       location /socket.io/ {
           proxy_pass http://localhost:3000/socket.io/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
       }

       # Archivos subidos
       location /uploads/ {
           proxy_pass http://localhost:3000/uploads/;
       }
   }
   ```

## Tareas automáticas (node-cron en `ugel-api`)
- 06:00: sincronización de papeletas.
- 08:00–18:00 cada 15 min: evaluación reactiva de asistencia (tardanzas/faltas).
- 18:05: cierre final del día (barrido de seguridad).
- Cada 30 min: cierre automático de visitas pendientes.

Requisitos: zona horaria correcta (America/Lima), proceso Node activo (PM2) y `SYSTEM_USER_ID` configurado.

## Credenciales iniciales (cámbialas en producción)
| Rol             | Usuario / Email             | Contraseña   |
|-----------------|-----------------------------|--------------|
| Administrador   | admin / admin@ugel.gob.pe   | admin123.    |
| RRHH            | rrhh / rrhh@ugel.gob.pe     | rrhh123.     |
| Vigilancia      | vigilante / vigilante@ugel.gob.pe | vigilante123. |

## Notas operativas
- `scripts/seed_users.js` crea el usuario técnico `system`; si no configuras `SYSTEM_USER_ID` en `.env`, las tareas automáticas fallarán por restricciones FK.
- El backend expone WebSockets en `/socket.io`; asegúrate de que el proxy preserve `Upgrade`/`Connection`.
- El frontend es PWA: el build (`dist/`) incluye el Service Worker para soporte offline y caché de assets.

## Licencia y autoría
MIT. Desarrollado por Wilson Calle.
