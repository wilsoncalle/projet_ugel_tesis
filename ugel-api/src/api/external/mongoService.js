const mongoose = require('mongoose');
const {
    parseDateRangeInclusive,
    isDateBetweenInclusive,
    toLimaDayjs,
    toLimaDateYYYYMMDD
} = require('../../utils/fechas');

const MONGO_URI = "mongodb+srv://songer_db_user:jCIFFjqauOCgusyH@proyectopermisos.xyv7m4t.mongodb.net/test?retryWrites=true&w=majority&appName=ProyectoPermisos";

// --- ESQUEMAS ---

const areaSchema = new mongoose.Schema({
    nombre: String,
    descripcion: String
}, { collection: 'areas' });

const usuarioSchema = new mongoose.Schema({
    nombre: String,
    apellido: String,
    codigoEmpleado: String, // DNI
    areaId: mongoose.Schema.Types.ObjectId
}, { collection: 'usuarios' });

const solicitudSchema = new mongoose.Schema({
    empleadoId: mongoose.Schema.Types.ObjectId,
    tipo: String,
    fechaInicio: Date,
    fechaFin: Date,
    motivo: String,
    estado: String, 
    numeroSolicitud: Number
}, { collection: 'solicituds' });

let isConnected = false;

const connectMongo = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log("Conectado a MongoDB para Estadísticas");
    } catch (error) {
        console.error("Error Mongo:", error);
    }
};

// --- HELPERS ---

// Calcula estado virtual (Aprobado / En Curso / Finalizado)
const calcularEstadoVirtual = (fechaInicio, fechaFin, estadoOriginal) => {
    if (estadoOriginal && estadoOriginal.toLowerCase() !== 'aprobado') {
        return estadoOriginal.toUpperCase(); 
    }
    const ahora = toLimaDayjs();
    const inicio = toLimaDayjs(fechaInicio);
    const fin = toLimaDayjs(fechaFin);

    if (ahora.isBefore(inicio)) return 'APROBADO';
    if (ahora.isBetween(inicio, fin, 'millisecond', '[]')) return 'EN_CURSO';
    return 'FINALIZADO';
};

// Filtra un array de objetos según rango de fechas (Inicio dentro del rango)
const filtrarPorRangoFecha = (items, fechaInicio, fechaFin) => {
    if (!fechaInicio && !fechaFin) return items;
    
    const startStr = fechaInicio || '2000-01-01';
    const endStr = fechaFin || '2100-01-01';
    const { start, end } = parseDateRangeInclusive(startStr, endStr);

    return items.filter(item => {
        const itemDate = toLimaDayjs(item.fechaInicio);
        return isDateBetweenInclusive(itemDate, start, end, 'day');
    });
};

// Filtra un array de objetos por solapamiento de fechas (Overlap)
// Retorna items cuyo rango [fechaInicio, fechaFin] se cruza con [rangoInicio, rangoFin]
const filtrarPorSolapamiento = (items, fechaInicio, fechaFin) => {
    if (!fechaInicio && !fechaFin) return items;
    
    const startStr = fechaInicio || '2000-01-01';
    const endStr = fechaFin || '2100-01-01';
    const { start: rangeStart, end: rangeEnd } = parseDateRangeInclusive(startStr, endStr);

    return items.filter(item => {
        const itemStart = toLimaDayjs(item.fechaInicio);
        const itemEnd = toLimaDayjs(item.fechaFin);
        
        // Solapamiento inclusivo: StartA <= EndB && EndA >= StartB
        return !itemStart.isAfter(rangeEnd) && !itemEnd.isBefore(rangeStart);
    });
};

// Obtiene la data cruda y la enriquece (Join manual)
const getBaseData = async () => {
    await connectMongo();
    const Solicitud = mongoose.models.Solicitud || mongoose.model('Solicitud', solicitudSchema);
    const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
    const Area = mongoose.models.Area || mongoose.model('Area', areaSchema);

    // 1. Traer todo
    const [solicitudes, usuarios, areas] = await Promise.all([
        Solicitud.find({ estado: { $regex: /^(aprobado|finalizado|completado|en curso)$/i } }).lean(),
        Usuario.find().lean(),
        Area.find().lean()
    ]);

    // 2. Mapas para acceso rápido
    const areaMap = {};
    areas.forEach(a => areaMap[a._id.toString()] = a.nombre);

    const usuarioMap = {};
    usuarios.forEach(u => {
        usuarioMap[u._id.toString()] = {
            ...u,
            nombreArea: u.areaId ? areaMap[u.areaId.toString()] : 'Sin Área'
        };
    });

    // 3. Enriquecer solicitud
    return solicitudes.map(sol => {
        const emp = usuarioMap[sol.empleadoId?.toString()] || {};
        return {
            ...sol,
            nombreEmpleado: `${emp.nombre || ''} ${emp.apellido || ''}`.trim(),
            dniEmpleado: emp.codigoEmpleado || 'S/D',
            nombreArea: emp.nombreArea || 'Sin Área',
            estadoVirtual: calcularEstadoVirtual(sol.fechaInicio, sol.fechaFin, sol.estado)
        };
    });
};

// --- FUNCIONES ESTADÍSTICAS ---

const getEstadisticasAreasExternas = async ({ fechaInicio, fechaFin }) => {
    const rawData = await getBaseData();
    const filtered = filtrarPorRangoFecha(rawData, fechaInicio, fechaFin);

    // Agrupar por Área
    const conteo = {};
    filtered.forEach(s => {
        const area = s.nombreArea;
        conteo[area] = (conteo[area] || 0) + 1;
    });

    // Formato para el frontend: { nombre_area, total_papeletas }
    const por_area = Object.keys(conteo).map(key => ({
        nombre_area: key,
        total_papeletas: conteo[key]
    })).sort((a, b) => b.total_papeletas - a.total_papeletas);

    // Top Personas (opcional para esa vista)
    const conteoPersona = {};
    filtered.forEach(s => {
        const p = s.nombreEmpleado;
        conteoPersona[p] = (conteoPersona[p] || 0) + 1;
    });
    
    // Esto es extra que tu controller usa
    const por_persona = Object.keys(conteoPersona).map(key => ({
        personal: key,
        nombre_area: 'General', // Simplificado
        total_papeletas: conteoPersona[key]
    })).sort((a, b) => b.total_papeletas - a.total_papeletas).slice(0, 10);

    return { por_area, por_persona };
};

const getEstadisticasEstadoExternas = async ({ fechaInicio, fechaFin }) => {
    const rawData = await getBaseData();
    const filtered = filtrarPorRangoFecha(rawData, fechaInicio, fechaFin);

    // 1. Distribución por estado virtual
    const estadosCount = {};
    filtered.forEach(s => {
        const est = s.estadoVirtual;
        estadosCount[est] = (estadosCount[est] || 0) + 1;
    });
    
    const distribucion_estados = Object.keys(estadosCount).map(key => ({
        estado: key,
        total: estadosCount[key]
    }));

    // 2. Flujo diario (para el gráfico de líneas)
    const diasCount = {};
    filtered.forEach(s => {
        const dia = toLimaDateYYYYMMDD(s.fechaInicio);
        diasCount[dia] = (diasCount[dia] || 0) + 1;
    });

    const flujo_diario = Object.keys(diasCount).map(dia => ({
        dia: dia,
        total: diasCount[dia]
    })).sort((a, b) => toLimaDayjs(a.dia).valueOf() - toLimaDayjs(b.dia).valueOf());

    const total = filtered.length;

    return { distribucion_estados, flujo_diario, total };
};

const getEstadisticasMotivosExternas = async ({ fechaInicio, fechaFin }) => {
    const rawData = await getBaseData();
    const filtered = filtrarPorRangoFecha(rawData, fechaInicio, fechaFin);

    // Agrupar por motivo (campo 'tipo' en mongo)
    const motivosCount = {};
    filtered.forEach(s => {
        const m = s.tipo || 'Otros';
        motivosCount[m] = (motivosCount[m] || 0) + 1;
    });

    const por_motivo = Object.keys(motivosCount).map(key => ({
        nombre_motivo: key,
        total: motivosCount[key]
    })).sort((a, b) => b.total - a.total);

    return { por_motivo, total: filtered.length };
};

const getEstadisticasHorasExternas = async ({ fechaInicio, fechaFin }) => {
    const rawData = await getBaseData();
    const filtered = filtrarPorRangoFecha(rawData, fechaInicio, fechaFin);

    // Ranking Personas
    const conteo = {}; // Clave: DNI (para unicidad), Valor: Obj
    
    filtered.forEach(s => {
        // Usamos DNI como clave única si existe, sino nombre
        const key = s.dniEmpleado !== 'S/D' ? s.dniEmpleado : s.nombreEmpleado;
        
        if (!conteo[key]) {
            conteo[key] = {
                personal: s.nombreEmpleado,
                nombre_area: s.nombreArea,
                count: 0
            };
        }
        conteo[key].count++;
    });

    const ranking = Object.values(conteo)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(item => ({
            personal: item.personal,
            nombre_area: item.nombre_area,
            total_papeletas: item.count
        }));

    // Resumen
    const uniqueEmpleados = new Set(filtered.map(s => s.empleadoId?.toString())).size;
    const totalPapeletas = filtered.length;
    const promedio = uniqueEmpleados > 0 ? (totalPapeletas / uniqueEmpleados).toFixed(2) : 0;

    return {
        por_persona: ranking,
        resumen: {
            total_empleados: uniqueEmpleados,
            total_papeletas_global: totalPapeletas,
            promedio_por_empleado: promedio
        }
    };
};

// Para el endpoint de visualización del vigilante (con filtro de fechas)
const getPapeletasAprobadasExternas = async ({ fechaInicio, fechaFin } = {}) => {
    const data = await getBaseData();
    
    // Usar filtro por solapamiento para capturar todas las papeletas activas en el rango
    const dataFiltrada = filtrarPorSolapamiento(data, fechaInicio, fechaFin);

    // Reutilizar la lógica de formateo anterior pero usando getBaseData que ya tiene estadoVirtual
    return dataFiltrada.map(sol => ({
        id: sol._id.toString(),
        codigo_papeleta: sol.numeroSolicitud ? `SOL-${sol.numeroSolicitud}` : `EXT-${sol._id.toString().slice(-6)}`,
        solicitante_nombres: sol.nombreEmpleado.split(' ')[0], // Hack simple nombre
        solicitante_apellidos: sol.nombreEmpleado.split(' ').slice(1).join(' '),
        solicitante_numero_documento: sol.dniEmpleado,
        nombre_motivo: sol.tipo,
        motivo_detalle: sol.motivo,
        fecha_hora_salida_programada: sol.fechaInicio,
        fecha_hora_retorno_programada: sol.fechaFin,
        fecha_hora_salida_real: (sol.estadoVirtual === 'EN_CURSO' || sol.estadoVirtual === 'FINALIZADO') ? sol.fechaInicio : null,
        fecha_hora_retorno_real: (sol.estadoVirtual === 'FINALIZADO') ? sol.fechaFin : null,
        estado: sol.estadoVirtual
    })).sort((a, b) => {
        const peso = { 'EN_CURSO': 1, 'APROBADO': 2, 'FINALIZADO': 3 };
        return (peso[a.estado] - peso[b.estado]) || (toLimaDayjs(b.fecha_hora_salida_programada).valueOf() - toLimaDayjs(a.fecha_hora_salida_programada).valueOf());
    });
};

module.exports = { 
    getPapeletasAprobadasExternas,
    getEstadisticasAreasExternas,
    getEstadisticasEstadoExternas,
    getEstadisticasMotivosExternas,
    getEstadisticasHorasExternas
};
