# Sistema Integral de Control de Acceso UGEL - Frontend

Este proyecto contiene la interfaz de usuario para el Sistema Integral de Control de Acceso UGEL, una aplicación web moderna para gestionar el acceso de personal y visitantes a las instalaciones de UGEL.

## Características

- 🚀 Desarrollado con React.js y Vite para un rendimiento óptimo
- 📱 Diseño responsivo con Tailwind CSS
- 🔒 Sistema de autenticación con JWT
- 🔄 Gestión de estado con React Context API
- 📶 Funcionalidad offline (PWA) para trabajar sin conexión a internet
- 🧩 Arquitectura modular y escalable

## Requisitos Previos

- Node.js (v14.x o superior)
- npm o yarn

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd ugel-frontend
   ```

2. Instalar dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```

3. Configurar variables de entorno (opcional):
   
   **Nota**: El proyecto ahora usa un sistema de proxy configurado en `vite.config.js`, por lo que **no necesitas** configurar `VITE_API_URL`. Las peticiones a `/api` se redirigen automáticamente al backend en desarrollo.
   
   Si necesitas usar una URL diferente para el backend, puedes crear un archivo `.env`:
   ```
   # Solo necesario si usas un backend en otra ubicación
   # VITE_API_URL=http://otro-servidor:3000/api
   ```

## Ejecución

### Desarrollo

```bash
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:5173`.

**Importante**: Asegúrate de que el backend esté corriendo en `http://localhost:3000` antes de iniciar el frontend. El proxy de Vite redirigirá automáticamente las peticiones de `/api` al backend.

### Producción

```bash
npm run build
# o
yarn build
```

Los archivos generados se ubicarán en la carpeta `dist`.

## Estructura del Proyecto

```
src/
├── assets/         # Recursos estáticos (imágenes, iconos, etc.)
├── components/     # Componentes reutilizables
├── contexts/       # Contextos de React (Auth, etc.)
├── hooks/          # Hooks personalizados
├── pages/          # Componentes de página
├── routes/         # Configuración de rutas
├── services/       # Servicios para API
└── utils/          # Utilidades y funciones auxiliares
```

## Roles de Usuario

El sistema maneja tres tipos de roles:

1. **Administrador**: Acceso completo al sistema, gestión de usuarios, áreas, etc.
2. **RRHH**: Gestión de personal y papeletas de salida.
3. **Vigilante**: Registro de entradas y salidas de visitantes y personal.

## Configuración de Proxy

El proyecto utiliza un sistema de proxy para las llamadas a la API:

- **Desarrollo**: Vite proxy redirige `/api` → `http://localhost:3000/api`
- **Producción**: Nginx/Apache debe configurarse para hacer el mismo proxy

Ventajas:
- ✅ Sin URLs hardcodeadas en el código
- ✅ El mismo bundle funciona en desarrollo y producción
- ✅ Fácil cambio de backend sin modificar código

Ver `CONFIGURACION_PROXY_API.md` para más detalles sobre configuración en producción.

## Funcionalidad Offline

La aplicación implementa una estrategia PWA (Progressive Web App) que permite:

- Cargar la aplicación sin conexión después de la primera visita
- Almacenar datos en caché para uso offline
- Sincronizar datos automáticamente cuando se recupera la conexión

## Licencia

Este proyecto es propiedad de UGEL y su uso está restringido.
