/**
 * Configuración general de la aplicación
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const config = {
  // Configuración del servidor
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuración de la base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DATABASE || 'ugel_control_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'qwerty'
  },
  
  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Configuración CORS
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173').split(','),
  
  // Configuración de logs
  logLevel: process.env.LOG_LEVEL || 'debug',
  
  // Configuraciones de validación
  validation: {
    // Longitud mínima de contraseña
    minPasswordLength: 8,
    // Expresión regular para validar email
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    // Tipos de documento válidos
    validDocumentTypes: ['DNI', 'CE', 'PASS', 'RUC'],
    // Roles de usuario válidos
    validRoles: ['Vigilante', 'Administrador', 'RRHH'],
    // Estados de presencia válidos
    validPresenceStates: ['Presente', 'Ausente', 'Tardanza', 'Falta']
  },
  
  // Configuraciones de paginación
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  },
  
  // Configuraciones de seguridad
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000 // 15 minutos en millisegundos
  }
};

// Validar configuraciones críticas
const validateConfig = () => {
  const requiredEnvVars = ['DB_DATABASE', 'DB_USER', 'JWT_SECRET'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Variable de entorno recomendada no encontrada: ${envVar}, usando valor por defecto`);
    }
  }
  
  if (config.nodeEnv === 'production' && config.jwt.secret === 'dev_jwt_secret_change_in_production') {
    console.error('JWT_SECRET debe ser configurado en producción');
    process.exit(1);
  }
};

// Validar configuración al cargar el módulo
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = config;