/**
 * Configuración principal de la aplicación Express
 * Sistema Integral de Control de Acceso - UGEL Talara
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { errorHandler } = require('./src/middleware/errorHandler');

// Importar rutas
const authRoutes = require('./src/api/auth/auth.routes');
const areasRoutes = require('./src/api/areas/areas.routes');
const tiposContratoRoutes = require('./src/api/tipos-contrato/tiposcontrato.routes');
const motivosSalidaRoutes = require('./src/api/motivos-salida/motivossalida.routes');
const tiposDocumentoRoutes = require('./src/api/tipos-documento/tiposdocumento.routes');
const motivosVisitaRoutes = require('./src/api/motivos-visita/motivosvisita.routes');
const usuariosRoutes = require('./src/api/usuarios/usuarios.routes');
const personalRoutes = require('./src/api/personal/personal.routes');
const visitantesRoutes = require('./src/api/visitantes/visitantes.routes');
const visitasRoutes = require('./src/api/visitas/visitas.routes');
const papeletasSalidaRoutes = require('./src/api/papeletas-salida/papeletassalida.routes');
const asistenciaPersonalRoutes = require('./src/api/asistencia-personal/asistenciapersonal.routes');
const healthRoutes = require('./src/api/health/health.routes');

const app = express();

// Middleware de seguridad
app.use(helmet());

// Configuración CORS
app.use(cors({
  origin: '*', // Permitir cualquier origen durante desarrollo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging de peticiones
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/tipos-contrato', tiposContratoRoutes);
app.use('/api/motivos-salida', motivosSalidaRoutes);
app.use('/api/tipos-documento', tiposDocumentoRoutes);
app.use('/api/motivos-visita', motivosVisitaRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/visitantes', visitantesRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/papeletas-salida', papeletasSalidaRoutes);
app.use('/api/asistencia-personal', asistenciaPersonalRoutes);
app.use('/api/health', healthRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'API Sistema Integral de Control de Acceso - UGEL Talara',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

module.exports = app;