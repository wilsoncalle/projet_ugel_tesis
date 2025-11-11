# Configuración de Proxy para API

## Resumen de Cambios

Se ha implementado un sistema de proxy para las llamadas a la API, eliminando las URLs hardcodeadas (`http://localhost:3000`) y usando rutas relativas (`/api`).

## Ventajas

✅ **Portabilidad**: El mismo código funciona en desarrollo y producción sin cambios  
✅ **Mantenibilidad**: Cambios de puerto/dominio se hacen solo en la configuración del proxy  
✅ **Simplicidad**: No hay URLs hardcodeadas en el código  
✅ **Seguridad**: Evita problemas de CORS en producción  

## Configuración

### Desarrollo (Vite)

El proxy está configurado en `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**Funcionamiento:**
- Cuando el frontend hace una petición a `/api/...`
- Vite la redirige automáticamente a `http://localhost:3000/api/...`
- El backend debe estar corriendo en el puerto 3000

### Producción

En producción, necesitarás configurar tu servidor web (Nginx/Apache) para hacer el proxy:

#### Nginx

```nginx
server {
  listen 80;
  server_name tu-dominio.com;

  # Servir archivos estáticos del frontend
  location / {
    root /var/www/ugel-frontend/dist;
    try_files $uri $uri/ /index.html;
  }

  # Proxy para la API
  location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

#### Apache

```apache
<VirtualHost *:80>
  ServerName tu-dominio.com
  DocumentRoot /var/www/ugel-frontend/dist

  # Servir archivos estáticos
  <Directory /var/www/ugel-frontend/dist>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
    
    # Rewrite para SPA
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
  </Directory>

  # Proxy para la API
  ProxyPreserveHost On
  ProxyPass /api http://localhost:3000/api
  ProxyPassReverse /api http://localhost:3000/api
</VirtualHost>
```

## Archivos Modificados

### Configuración
- ✅ `vite.config.js` - Configuración del proxy y cache del Service Worker

### Servicios
- ✅ `src/services/api.js` - Cliente Axios con baseURL relativa
- ✅ `src/utils/offlineSync.js` - Sincronización offline

### Hooks
- ✅ `src/hooks/usePapeletasHoras.js`
- ✅ `src/hooks/usePapeletasMotivos.js`
- ✅ `src/hooks/usePapeletasEstado.js`
- ✅ `src/hooks/usePapeletasAreas.js`
- ✅ `src/hooks/useAsistenciasTotales.js`
- ✅ `src/hooks/useAsistenciasPuntualidad.js`
- ✅ `src/hooks/useAsistenciasPersonal.js`
- ✅ `src/hooks/useAsistenciasAusencias.js`
- ✅ `src/hooks/useAsistenciasAreas.js`
- ✅ `src/hooks/useVisitasTotales.js`
- ✅ `src/hooks/useVisitasArea.js`
- ✅ `src/hooks/useDashboardData.js`

### Páginas
- ✅ `src/pages/PersonalAsistenciaPage.jsx`
- ✅ `src/pages/DashboardVigilantePage.jsx`
- ✅ `src/pages/DashboardRRHHPage.jsx`

### Componentes
- ✅ `src/components/vigilante/VisitantesTabla.jsx`
- ✅ `src/components/personal/PersonalTabla.jsx`
- ✅ `src/components/personal_estadisticas/ModalPersonalDetalle.jsx`

## Cómo Usar

### En el código del frontend

Todas las llamadas a la API ahora usan rutas relativas:

```javascript
// ❌ Antes (hardcodeado)
fetch('http://localhost:3000/api/visitas')

// ✅ Ahora (relativo)
fetch('/api/visitas')
```

```javascript
// ❌ Antes (hardcodeado)
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// ✅ Ahora (relativo)
const api = axios.create({
  baseURL: '/api'
});
```

### Socket.IO

Para Socket.IO, también se usa configuración relativa:

```javascript
// ❌ Antes
const socket = io('http://localhost:3000');

// ✅ Ahora
const socket = io(); // Usa la misma URL del frontend
```

## Testing

### Desarrollo
1. Inicia el backend: `cd ugel-api && npm start` (puerto 3000)
2. Inicia el frontend: `cd ugel-frontend && npm run dev` (puerto 5173)
3. Accede a `http://localhost:5173`
4. Las peticiones a `/api` se redirigen automáticamente a `http://localhost:3000/api`

### Producción
1. Build del frontend: `npm run build`
2. Configura Nginx/Apache según los ejemplos arriba
3. Las peticiones a `/api` se redirigen al backend en el mismo servidor

## Notas Importantes

⚠️ **Backend**: El backend debe seguir escuchando en `/api/*` como prefijo de rutas  
⚠️ **CORS**: En desarrollo, el proxy maneja CORS automáticamente  
⚠️ **Service Worker**: El patrón de cache se actualizó para `/api/.*`  
⚠️ **Socket.IO**: Configurado para usar la misma URL del frontend  

## Troubleshooting

### Error: "Cannot GET /api/..."
- Verifica que el backend esté corriendo
- Verifica que el proxy esté configurado en `vite.config.js`
- Verifica que el backend use el prefijo `/api`

### Error de CORS en producción
- Verifica la configuración del proxy en Nginx/Apache
- Asegúrate de que `proxy_set_header Host $host` esté presente

### Socket.IO no conecta
- Verifica que el backend tenga CORS configurado correctamente
- En producción, asegúrate de que el proxy maneje WebSockets
