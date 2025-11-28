/**
 * Repositorio simplificado para papeletas (fuente Mongo, solo lectura).
 * Se eliminan todas las operaciones de PostgreSQL (crear/decidir/registrar/cancelar).
 */

const mongoService = require('../external/mongoService');

const paginate = (items, { page = 1, limit = 20 } = {}) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    data: items.slice(start, end),
    total: items.length,
  };
};

// Listado general (con filtros básicos locales)
const findAll = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    estado, // APROBADO | EN_CURSO | FINALIZADO
    fechaInicio,
    fechaFin,
  } = options;

  const data = await mongoService.getPapeletasAprobadasExternas({ fechaInicio, fechaFin });

  let filtered = data;
  if (estado) {
    filtered = filtered.filter((p) => (p.estado || '').toUpperCase() === estado.toUpperCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => {
      const fullName = `${p.solicitante_nombres || ''} ${p.solicitante_apellidos || ''}`.toLowerCase();
      return (
        (p.codigo_papeleta || '').toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (p.nombre_motivo || p.motivo || '').toLowerCase().includes(q)
      );
    });
  }

  const { data: pageData, total } = paginate(filtered, { page, limit });
  return { papeletas: pageData, total };
};

// Pendientes para garita (solo lectura, mismas reglas: APROBADO o EN_CURSO)
const findPendientes = async (options = {}) => {
  const { page = 1, limit = 20, search = '', fechaInicio, fechaFin } = options;
  const data = await mongoService.getPapeletasAprobadasExternas({ fechaInicio, fechaFin });

  let filtered = data.filter((p) => ['APROBADO', 'EN_CURSO'].includes((p.estado || '').toUpperCase()));

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((p) => {
      const fullName = `${p.solicitante_nombres || ''} ${p.solicitante_apellidos || ''}`.toLowerCase();
      return (
        (p.codigo_papeleta || '').toLowerCase().includes(q) ||
        fullName.includes(q) ||
        (p.solicitante_numero_documento || '').toLowerCase().includes(q)
      );
    });
  }

  const { data: pageData, total } = paginate(filtered, { page, limit });
  return { papeletas: pageData, total };
};

// Versión usada por asistencia: no hay mapeo personalId en Mongo, retornamos null para evitar fallos.
const encontrarPapeletaActivaPorFecha = async () => null;

// No hay escritura contra Mongo en este módulo (no-op).
const registrarRetorno = async () => null;

// Estadísticas se resuelven directamente en mongoService; se exponen para compatibilidad.
const getEstadisticas = async (fechaInicio, fechaFin) =>
  mongoService.getEstadisticasEstadoExternas({ fechaInicio, fechaFin });

const getEstadisticasEstado = async (fechaInicio, fechaFin) =>
  mongoService.getEstadisticasEstadoExternas({ fechaInicio, fechaFin });

const getEstadisticasMotivos = async (fechaInicio, fechaFin) =>
  mongoService.getEstadisticasMotivosExternas({ fechaInicio, fechaFin });

const getEstadisticasHoras = async (fechaInicio, fechaFin) =>
  mongoService.getEstadisticasHorasExternas({ fechaInicio, fechaFin });

const getEstadisticasAreas = async (fechaInicio, fechaFin) =>
  mongoService.getEstadisticasAreasExternas({ fechaInicio, fechaFin });

module.exports = {
  findAll,
  findPendientes,
  findPendientesByPersonal: async () => ({ papeletas: [], total: 0 }), // sin mapeo a personal interno
  findById: async () => null,
  create: async () => { throw new Error('Operación no soportada: solo lectura desde Mongo'); },
  decidirPapeleta: async () => { throw new Error('Operación no soportada: solo lectura desde Mongo'); },
  registrarSalida: async () => null,
  registrarSalidaTx: async () => null,
  registrarRetorno,
  cancelar: async () => { throw new Error('Operación no soportada: solo lectura desde Mongo'); },
  anular: async () => { throw new Error('Operación no soportada: solo lectura desde Mongo'); },
  encontrarPapeletaActivaPorFecha,
  getEstadisticas,
  getEstadisticasEstado,
  getEstadisticasMotivos,
  getEstadisticasHoras,
  getEstadisticasAreas,
};
