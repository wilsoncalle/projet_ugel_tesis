// src/api/external/mongoService.js
const mongoose = require('mongoose');

// URI Proporcionada
const MONGO_URI = "mongodb+srv://songer_db_user:jCIFFjqauOCgusyH@proyectopermisos.xyv7m4t.mongodb.net/test?retryWrites=true&w=majority&appName=ProyectoPermisos"; // Asegúrate que la DB sea 'test' o el nombre correcto tras el .net/

// Definimos esquemas simples "al vuelo" para leer los datos sin validaciones estrictas
const usuarioSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    codigoEmpleado: String,
    areaId: mongoose.Schema.Types.ObjectId
}, { collection: 'usuarios' }); // Nombre exacto de la colección en Mongo

const solicitudSchema = new mongoose.Schema({
    empleadoId: mongoose.Schema.Types.ObjectId,
    tipo: String,
    fechaInicio: Date,
    fechaFin: Date,
    motivo: String,
    estado: String,
    numeroSolicitud: Number
}, { collection: 'solicituds' }); // Nombre exacto de la colección en Mongo

let isConnected = false;

const connectMongo = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log("Conectado a MongoDB Externo");
    } catch (error) {
        console.error("Error conectando a Mongo:", error);
    }
};

const getPapeletasAprobadasExternas = async () => {
    await connectMongo();

    const UsuarioModel = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
    const SolicitudModel = mongoose.models.Solicitud || mongoose.model('Solicitud', solicitudSchema);

    try {
        // 1. Buscar solo aprobadas
        const solicitudes = await SolicitudModel.find({ estado: 'aprobado' }).lean();

        // 2. Obtener los IDs de los empleados para hacer el "Join" manual
        const empleadoIds = solicitudes.map(s => s.empleadoId);
        const usuarios = await UsuarioModel.find({ _id: { $in: empleadoIds } }).lean();

        // Crear mapa de usuarios para acceso rápido
        const usuariosMap = {};
        usuarios.forEach(u => {
            usuariosMap[u._id.toString()] = u;
        });

        // 3. Mapear al formato que tu Frontend (TableGenerica) espera
        const dataFormateada = solicitudes.map(sol => {
            const empleado = usuariosMap[sol.empleadoId?.toString()] || {};
            
            return {
                // IDs y Códigos
                id: sol._id.toString(),
                // Usamos numeroSolicitud o los ultimos 6 del ID si no existe
                codigo_papeleta: sol.numeroSolicitud ? `SOL-${sol.numeroSolicitud}` : `EXT-${sol._id.toString().slice(-6)}`,
                
                // Datos Empleado (Mapeo de nombres para tu frontend)
                solicitante_nombres: empleado.nombre || "Desconocido",
                solicitante_apellidos: empleado.apellido || "",
                solicitante_numero_documento: empleado.codigoEmpleado || "", // Usamos codigo como documento
                
                // Datos de la Papeleta
                nombre_motivo: sol.tipo, // 'Vacaciones', 'Cita médica', etc.
                motivo_detalle: sol.motivo, // El texto largo
                
                // Fechas (Tu frontend espera fecha_hora_salida_programada)
                fecha_hora_salida_programada: sol.fechaInicio,
                fecha_hora_retorno_programada: sol.fechaFin,
                
                // Fechas reales (null porque son solicitudes nuevas)
                fecha_hora_salida_real: null,
                fecha_hora_retorno_real: null,

                // Estado (Normalizamos a mayúsculas para tu badge)
                estado: 'APROBADO' 
            };
        });

        // Ordenar por fecha más reciente
        return dataFormateada.sort((a, b) => new Date(b.fecha_hora_salida_programada) - new Date(a.fecha_hora_salida_programada));

    } catch (error) {
        console.error("Error obteniendo data de Mongo:", error);
        return [];
    }
};

module.exports = { getPapeletasAprobadasExternas };