const mongoose = require('mongoose');

// Tu URI de conexión
const MONGO_URI = "mongodb+srv://songer_db_user:jCIFFjqauOCgusyH@proyectopermisos.xyv7m4t.mongodb.net/test?retryWrites=true&w=majority&appName=ProyectoPermisos";

// Esquema de Usuario (sin cambios)
const usuarioSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    codigoEmpleado: String,
    areaId: mongoose.Schema.Types.ObjectId
}, { collection: 'usuarios' });

// Esquema de Solicitud (Corregido a 'solicituds')
const solicitudSchema = new mongoose.Schema({
    empleadoId: mongoose.Schema.Types.ObjectId,
    tipo: String,
    fechaInicio: Date,
    fechaFin: Date,
    motivo: String,
    estado: String, // En Mongo siempre vendrá como 'aprobado' u 'observado', etc.
    numeroSolicitud: Number
}, { collection: 'solicituds' });

let isConnected = false;

const connectMongo = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log("Conectado a MongoDB Externo (Solo Lectura)");
    } catch (error) {
        console.error("Error conectando a Mongo:", error);
    }
};

/**
 * Función auxiliar para determinar el estado basado en el tiempo.
 * Reglas:
 * 1. Si fecha actual < fechaInicio -> APROBADO (Aún no sale)
 * 2. Si fechaInicio <= fecha actual <= fechaFin -> EN_CURSO (Está fuera)
 * 3. Si fecha actual > fechaFin -> FINALIZADO (Ya debió volver)
 */
const calcularEstadoVirtual = (fechaInicio, fechaFin, estadoOriginal) => {
    // Si en la base de datos original NO está aprobado (ej. denegado/pendiente), respetamos eso.
    if (estadoOriginal !== 'aprobado') {
        return estadoOriginal.toUpperCase();
    }

    const ahora = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (ahora < inicio) {
        return 'APROBADO'; // Futuro
    } else if (ahora >= inicio && ahora <= fin) {
        return 'EN_CURSO'; // Presente
    } else {
        return 'FINALIZADO'; // Pasado
    }
};

const getPapeletasAprobadasExternas = async () => {
    await connectMongo();

    const UsuarioModel = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
    const SolicitudModel = mongoose.models.Solicitud || mongoose.model('Solicitud', solicitudSchema);

    try {
        // 1. Traemos SOLO las que tengan estado base 'aprobado' en Mongo
        const solicitudes = await SolicitudModel.find({ estado: 'aprobado' }).lean();

        // 2. Obtener IDs de usuarios
        const empleadoIds = solicitudes.map(s => s.empleadoId);
        const usuarios = await UsuarioModel.find({ _id: { $in: empleadoIds } }).lean();

        // Mapa de usuarios
        const usuariosMap = {};
        usuarios.forEach(u => {
            usuariosMap[u._id.toString()] = u;
        });

        // 3. Mapear y CALCULAR EL ESTADO VIRTUAL
        const dataFormateada = solicitudes.map(sol => {
            const empleado = usuariosMap[sol.empleadoId?.toString()] || {};
            
            // Calculamos el estado dinámico aquí
            const estadoVirtual = calcularEstadoVirtual(sol.fechaInicio, sol.fechaFin, sol.estado);

            return {
                // IDs y Códigos
                id: sol._id.toString(),
                codigo_papeleta: sol.numeroSolicitud ? `SOL-${sol.numeroSolicitud}` : `EXT-${sol._id.toString().slice(-6)}`,
                
                // Datos Empleado
                solicitante_nombres: empleado.nombre || "Desconocido",
                solicitante_apellidos: empleado.apellido || "",
                solicitante_numero_documento: empleado.codigoEmpleado || "", 
                
                // Datos Papeleta
                nombre_motivo: sol.tipo,
                motivo_detalle: sol.motivo,
                
                // Fechas Programadas
                fecha_hora_salida_programada: sol.fechaInicio,
                fecha_hora_retorno_programada: sol.fechaFin,
                
                // Fechas reales: 
                // Como es virtual, si el estado es FINALIZADO o EN_CURSO, 
                // podríamos simular que la "salida real" fue la "programada" para llenar el dato en la tabla.
                fecha_hora_salida_real: (estadoVirtual === 'EN_CURSO' || estadoVirtual === 'FINALIZADO') ? sol.fechaInicio : null,
                fecha_hora_retorno_real: (estadoVirtual === 'FINALIZADO') ? sol.fechaFin : null,

                // ESTADO DINÁMICO (Aquí sucede la magia)
                estado: estadoVirtual
            };
        });

        // Ordenar: Ponemos primero las EN_CURSO (prioridad para el vigilante), luego APROBADO, luego FINALIZADO
        const pesoEstado = { 'EN_CURSO': 1, 'APROBADO': 2, 'FINALIZADO': 3 };
        
        return dataFormateada.sort((a, b) => {
            // Primero por estado
            const pesoA = pesoEstado[a.estado] || 99;
            const pesoB = pesoEstado[b.estado] || 99;
            if (pesoA !== pesoB) return pesoA - pesoB;

            // Luego por fecha (las más recientes primero)
            return new Date(b.fecha_hora_salida_programada) - new Date(a.fecha_hora_salida_programada);
        });

    } catch (error) {
        console.error("Error obteniendo data de Mongo:", error);
        return [];
    }
};

module.exports = { getPapeletasAprobadasExternas };