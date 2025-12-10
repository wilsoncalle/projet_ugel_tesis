import axios from 'axios';
import { createVisitaWithOfflineSupport } from './offlineApiService';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Queue for pending requests while refreshing token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh')) {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({resolve, reject});
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const token = localStorage.getItem('token');
        // Use a new axios instance to avoid interceptor loop
        const response = await axios.post('/api/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const newToken = response.data.data.token; // Adjust based on actual response structure
        
        if (newToken) {
          localStorage.setItem('token', newToken);
          api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
          processQueue(null, newToken);
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear local storage and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// API services
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  refreshToken: () => api.post('/auth/refresh'),
  verifyToken: async () => {
    try {
      // Try to refresh token to verify validity
      const response = await api.post('/auth/refresh');
      if (response.data && response.data.data && response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
};

export const areasService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    return api.get(`/areas?${params.toString()}`);
  },
  getById: (id) => api.get(`/areas/${id}`),
  create: (area) => api.post('/areas', area),
  update: (id, area) => api.put(`/areas/${id}`, area),
  delete: (id) => api.delete(`/areas/${id}`),
  getDeleted: () => api.get('/areas/deleted'),
  restore: (id) => api.put(`/areas/${id}/restore`),
};

export const personalService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) params.append('activo', filters.activo);
    if (filters.q) params.append('q', filters.q);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.areaId) params.append('areaId', filters.areaId);
    if (filters.tipoContratoId) params.append('tipoContratoId', filters.tipoContratoId);
    if (filters.cargoId) params.append('cargoId', filters.cargoId);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    return api.get(`/personal?${params.toString()}`);
  },
  getActivos: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.q) params.append('q', filters.q);
    params.append('activo', 'true');
    return api.get(`/personal?${params.toString()}`);
  },
  getHistorial: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.cargoId) params.append('cargoId', filters.cargoId);
    if (filters.areaId) params.append('areaId', filters.areaId);
    if (filters.activo !== undefined) params.append('activo', filters.activo);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    return api.get(`/personal?${params.toString()}`);
  },
  getById: (id) => api.get(`/personal/${id}`),
  getByDocumento: (tipoDocumento, numeroDocumento) => api.get(`/personal/documento/${tipoDocumento}/${numeroDocumento}`),
  consultarDNI: (dni) => api.post('/visitantes/consultar-dni', { dni }),
  create: (personal) => api.post('/personal', personal),
  registrarAlta: (personal) => api.post('/personal', personal),
  update: (id, personal) => api.put(`/personal/${id}`, personal),
  delete: (id) => api.delete(`/personal/${id}`),
  registrarBaja: (id, data) => api.put(`/personal/${id}`, { ...data, activo: false }),
  getDeleted: () => api.get('/personal/deleted'),
  restore: (id) => api.put(`/personal/${id}/restore`),
};

export const papeletasSalidaService = {
  // Obtener papeletas aprobadas desde MongoDB (datos externos)
  getExternas: (params = {}) => api.get('/papeletas-salida/externas', { params }),
};


export const asistenciaPersonalService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.fecha) params.append('fecha', filters.fecha);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    if (filters.personalId) params.append('personalId', filters.personalId);
    if (filters.areaId) params.append('areaId', filters.areaId);
    if (filters.estadoPresencia) params.append('estadoPresencia', filters.estadoPresencia);
    return api.get(`/asistencia-personal?${params.toString()}`);
  },
  getHoy: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.q) params.append('q', filters.q);
    return api.get(`/asistencia-personal/hoy?${params.toString()}`);
  },
  getById: (id) => api.get(`/asistencia-personal/${id}`),
  registrarIngreso: (personalId) => api.post('/asistencia-personal/ingreso', { personalId }),
  registrarSalida: (personalId) => api.put('/asistencia-personal/salida', { personalId }),
  registrarEstado: (personalId, estadoPresencia) => api.post('/asistencia-personal/estado', { personalId, estadoPresencia }),
  
  // Métodos para "Mi Asistencia"
  getMiResumen: ({ anio, mes }) =>
    api.get('/asistencia-personal/mi/resumen', {
      params: { anio, mes },
    }),

  getMiAsistencia: ({ anio, mes, page, limit }) =>
    api.get('/asistencia-personal/mi/asistencia', {
      params: { anio, mes, page, limit },
    }),

  justificar: (id, data) => {
    const formData = new FormData();
    formData.append('motivo', data.motivo);
    if (data.archivo) {
      formData.append('archivo', data.archivo);
    }
    return api.post(`/asistencia-personal/${id}/justificar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const tiposDocumentoService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    return api.get(`/tipos-documento?${params.toString()}`);
  },
  getById: (id) => api.get(`/tipos-documento/${id}`),
  create: (tipoDocumento) => api.post('/tipos-documento', tipoDocumento),
  update: (id, tipoDocumento) => api.put(`/tipos-documento/${id}`, tipoDocumento),
  delete: (id) => api.delete(`/tipos-documento/${id}`),
  getDeleted: () => api.get('/tipos-documento/deleted'),
  restore: (id) => api.put(`/tipos-documento/${id}/restore`),
};

export const motivosVisitaService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    return api.get(`/motivos-visita?${params.toString()}`);
  },
  getById: (id) => api.get(`/motivos-visita/${id}`),
  create: (motivoVisita) => api.post('/motivos-visita', motivoVisita),
  update: (id, motivoVisita) => api.put(`/motivos-visita/${id}`, motivoVisita),
  delete: (id) => api.delete(`/motivos-visita/${id}`),
  getDeleted: () => api.get('/motivos-visita/deleted'),
  restore: (id) => api.put(`/motivos-visita/${id}/restore`),
};

export const tiposContratoService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    return api.get(`/tipos-contrato?${params.toString()}`);
  },
  getById: (id) => api.get(`/tipos-contrato/${id}`),
  create: (tipoContrato) => api.post('/tipos-contrato', tipoContrato),
  update: (id, tipoContrato) => api.put(`/tipos-contrato/${id}`, tipoContrato),
  delete: (id) => api.delete(`/tipos-contrato/${id}`),
  getDeleted: () => api.get('/tipos-contrato/deleted'),
  restore: (id) => api.put(`/tipos-contrato/${id}/restore`),
};

export const visitantesService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/visitantes?${params.toString()}`);
  },
  getById: (id) => api.get(`/visitantes/${id}`),
  getByDocumento: (tipoDocumentoId, numeroDocumento) => api.get(`/visitantes/documento/${tipoDocumentoId}/${numeroDocumento}`),
  getHistorial: (id, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/visitantes/${id}/historial?${params.toString()}`);
  },
  create: (visitante) => api.post('/visitantes', visitante),
  update: (id, visitante) => api.put(`/visitantes/${id}`, visitante),
  consultarDNI: (dni) => api.post('/visitantes/consultar-dni', { dni }),
};

export const motivosSalidaService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    return api.get(`/motivos-salida?${params.toString()}`);
  },
  getById: (id) => api.get(`/motivos-salida/${id}`),
  create: (motivoSalida) => api.post('/motivos-salida', motivoSalida),
  update: (id, motivoSalida) => api.put(`/motivos-salida/${id}`, motivoSalida),
  delete: (id) => api.delete(`/motivos-salida/${id}`),
  getDeleted: () => api.get('/motivos-salida/deleted'),
  restore: (id) => api.put(`/motivos-salida/${id}/restore`),
};

export const cargosService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.activo !== undefined) {
      params.append('activo', filters.activo);
    }
    if (filters.q) {
      params.append('q', filters.q);
    }
    if (filters.page) {
      params.append('page', filters.page);
    }
    if (filters.limit) {
      params.append('limit', filters.limit);
    }
    if (filters.areaDestinoId) {
      params.append('areaDestinoId', filters.areaDestinoId);
    }
    return api.get(`/cargos?${params.toString()}`);
  },
  getById: (id) => api.get(`/cargos/${id}`),
  create: (cargo) => api.post('/cargos', cargo),
  update: (id, cargo) => api.put(`/cargos/${id}`, cargo),
  delete: (id) => api.delete(`/cargos/${id}`),
  getDeleted: () => api.get('/cargos/deleted'),
  restore: (id) => api.put(`/cargos/${id}/restore`),
};

export const usuariosService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.rol) params.append('rol', filters.rol);
    return api.get(`/usuarios?${params.toString()}`);
  },
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (usuario) => api.post('/usuarios', usuario),
  update: (id, usuario) => api.put(`/usuarios/${id}`, usuario),
  delete: (id) => api.delete(`/usuarios/${id}`),
  getDeleted: () => api.get('/usuarios/deleted'),
  restore: (id) => api.put(`/usuarios/${id}/restore`),
  // Métodos de perfil
  updatePerfil: (data) => api.put('/usuarios/me', data),
  updatePassword: (data) => api.put('/usuarios/me/password', data),
};

// --- Funciones para el Dashboard del Vigilante ---

/**
 * Registra una visita completa (incluyendo la creación del visitante si es nuevo).
 * Llama a: POST /api/visitas con soporte offline
 * @param {object} datosVisita - Objeto con los datos del visitante y la visita.
 * @returns {Promise<object>} La respuesta de la API (online) o de IndexedDB (offline).
 */
export const registrarVisitaCompleta = async (datosVisita) => {
  // Mapear los nombres de campos del frontend al backend
  const datosMapeados = {
    // Datos de la visita (mapear nombres)
    areaDestinoId: datosVisita.lugarId || datosVisita.lugar, // lugar -> areaDestinoId
    motivoVisitaId: datosVisita.motivoId // motivoId -> motivoVisitaId
  };

  // Solo agregar personalVisitadoId si existe y es válido
  if (datosVisita.empleadoId && datosVisita.empleadoId !== null && datosVisita.empleadoId !== '') {
    datosMapeados.personalVisitadoId = datosVisita.empleadoId;
  }

  // Preparar datos del visitante si es nuevo (para soporte offline)
  let visitanteDataForOffline = null;
  
  // Si es un visitante existente, incluir visitanteId
  if (datosVisita.visitanteId && datosVisita.visitanteId !== null) {
    datosMapeados.visitanteId = datosVisita.visitanteId;
  } else {
    // Si es un visitante nuevo, preparar sus datos para offline
    visitanteDataForOffline = {
      tipoDocumentoId: parseInt(datosVisita.tipoDocumentoId),
      tipoDocumentoCodigo: datosVisita.tipoDocumento?.codigo || 'DNI', // Incluir código del tipo de documento
      numeroDocumento: datosVisita.numeroDocumento,
      nombres: datosVisita.nombres,
      apellidos: datosVisita.apellidos
    };
    
    // También incluir en datosMapeados para el caso online
    datosMapeados.tipoDocumentoId = parseInt(datosVisita.tipoDocumentoId);
    datosMapeados.numeroDocumento = datosVisita.numeroDocumento;
    datosMapeados.nombres = datosVisita.nombres;
    datosMapeados.apellidos = datosVisita.apellidos;
  }
  
  console.log('[API] registrarVisitaCompleta - datos:', { datosMapeados, visitanteDataForOffline });
  
  // Usar el wrapper con soporte offline
  return await createVisitaWithOfflineSupport(
    datosMapeados,
    visitanteDataForOffline,
    (data) => api.post('/visitas', data)
  );
};

/**
 * Obtiene la lista de visitantes actualmente dentro de la institución.
 * Llama a: GET /api/visitas/activas
 * @returns {Promise<object>} La lista de visitantes activos.
 */
export const getVisitantesActivos = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.q) params.append('q', filters.q);
  
  return api.get(`/visitas/activas?${params.toString()}`);
};

/**
 * Obtiene el historial de visitas, permitiendo filtros.
 * Llama a: GET /api/visitas
 * @param {object} filtros - Un objeto con los filtros a aplicar.
 * @returns {Promise<object>} La lista de visitas filtrada.
 */
export const getHistorialDeVisitas = (filtros = {}) => {
  const params = new URLSearchParams();
  
  // Mapear filtros del frontend al backend
  if (filtros.busqueda) params.append('q', filtros.busqueda);
  if (filtros.empleadoId) params.append('personalVisitadoId', filtros.empleadoId);
  if (filtros.motivoId) params.append('motivoVisitaId', filtros.motivoId);
  if (filtros.lugar) params.append('areaId', filtros.lugar);
  if (filtros.fechaDesde) params.append('fechaInicio', filtros.fechaDesde);
  if (filtros.fechaHasta) params.append('fechaFin', filtros.fechaHasta);
  if (filtros.page) params.append('page', filtros.page);
  if (filtros.limit) params.append('limit', filtros.limit);
  
  return api.get(`/visitas?${params.toString()}`);
};

/**
 * Registra la salida de un visitante.
 * Llama a: PUT /api/visitas/:id/salida
 * @param {number} registroVisitaId - El ID del registro de la visita.
 * @returns {Promise<object>} La respuesta de la API.
 */
export const registrarSalidaVisitante = (registroVisitaId) => {
  return api.put(`/visitas/${registroVisitaId}/salida`);
};

// --- Funciones para rellenar los Dropdowns del Formulario ---

/**
 * Obtiene todos los tipos de documento
 * @returns {Promise<object>} Lista de tipos de documento
 */
export const getTiposDocumento = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.activo !== undefined) {
    params.append('activo', filters.activo);
  }
  if (filters.q) {
    params.append('q', filters.q);
  }
  return api.get(`/tipos-documento?${params.toString()}`);
};

/**
 * Obtiene todos los motivos de visita
 * @returns {Promise<object>} Lista de motivos de visita
 */
export const getMotivosVisita = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.activo !== undefined) {
    params.append('activo', filters.activo);
  }
  if (filters.q) {
    params.append('q', filters.q);
  }
  return api.get(`/motivos-visita?${params.toString()}`);
};

/**
 * Obtiene todo el personal
 * @param {object} filtros - Filtros opcionales
 * @returns {Promise<object>} Lista de personal
 */
export const getPersonal = (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.activo !== undefined) {
    params.append('activo', filtros.activo);
  }
  if (filtros.q) {
    params.append('q', filtros.q);
  }
  if (filtros.areaId) {
    params.append('areaId', filtros.areaId);
  }
  return api.get(`/personal?${params.toString()}`);
};

/**
 * Obtiene todas las áreas
 * @returns {Promise<object>} Lista de áreas
 */
export const getAreas = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.activo !== undefined) {
    params.append('activo', filters.activo);
  }
  if (filters.q) {
    params.append('q', filters.q);
  }
  return api.get(`/areas?${params.toString()}`);
};

/**
 * Obtiene todos los cargos
 * @param {object} filtros - Filtros opcionales
 * @returns {Promise<object>} Lista de cargos
 */
export const getCargos = (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.activo !== undefined) {
    params.append('activo', filtros.activo);
  }
  if (filtros.q) {
    params.append('q', filtros.q);
  }
  if (filtros.areaDestinoId) {
    params.append('areaDestinoId', filtros.areaDestinoId);
  }
  return api.get(`/cargos?${params.toString()}`);
};

export const asistenciaConfigService = {
  getGlobal: () => api.get('/asistencia-config/global'),
  saveGlobal: (data) => api.put('/asistencia-config/global', data),
  getByPersonal: (personalId) => api.get(`/asistencia-config/personal/${personalId}`),
  saveForPersonal: (personalId, data) => api.put(`/asistencia-config/personal/${personalId}`, data),
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/asistencia-config?${params.toString()}`);
  },
  disable: (id) => api.delete(`/asistencia-config/${id}`),
};

export const reniecProvidersService = {
  // Alias list to getAll for CatalogoPage compatibility
  getAll: (filters = {}) => api.get('/reniec-proveedores'),
  list: () => api.get('/reniec-proveedores'),
  getById: (id) => api.get(`/reniec-proveedores/${id}`),
  getActive: () => api.get('/reniec-proveedores/activo'),
  create: (data) => api.post('/reniec-proveedores', data),
  update: (id, data) => api.put(`/reniec-proveedores/${id}`, data),
  delete: (id) => api.delete(`/reniec-proveedores/${id}`),
  activate: (id) => api.post(`/reniec-proveedores/${id}/activar`),
};


export const visitasService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.personalVisitadoId) params.append('personalVisitadoId', filters.personalVisitadoId);
    if (filters.motivoVisitaId) params.append('motivoVisitaId', filters.motivoVisitaId);
    if (filters.areaId) params.append('areaId', filters.areaId);
    if (filters.fechaInicio) params.append('fechaInicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fechaFin', filters.fechaFin);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/visitas?${params.toString()}`);
  },
  getActivas: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    return api.get(`/visitas/activas?${params.toString()}`);
  },
  getById: (id) => api.get(`/visitas/${id}`),
  create: (visita) => api.post('/visitas', visita),
  createLote: (visitas) => api.post('/visitas/lote', visitas), // Para registros en lote
  update: (id, visita) => api.put(`/visitas/${id}`, visita),
  delete: (id) => api.delete(`/visitas/${id}`),
  registrarSalida: (id) => api.put(`/visitas/${id}/salida`),
  getVisitasPorArea: (periodo = 'todo') => api.get(`/visitas/por-area?periodo=${periodo}`),
  getVisitasPorMotivo: (periodo = 'todo') => api.get(`/visitas/por-motivo?periodo=${periodo}`),
  getVisitasPorPersonal: (periodo = 'mes') => api.get(`/visitas/por-personal?periodo=${periodo}`),
  getVisitantesFrecuentes: (periodo = 'mes') => api.get(`/visitas/visitantes-frecuentes?periodo=${periodo}`),
  getVisitanteDetalle: (visitanteId, periodo = 'mes') => api.get(`/visitas/visitante/${visitanteId}/detalle?periodo=${periodo}`),
  getMisVisitas: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.q) params.append('q', filters.q);
    if (filters.estados) params.append('estados', filters.estados);
    if (filters.anio) params.append('anio', filters.anio);
    if (filters.mes) params.append('mes', filters.mes);
    return api.get(`/visitas/mis-visitas?${params.toString()}`);
  },
  buscarGlobal: (documento) => api.get(`/visitas/buscar?documento=${documento}`),
  accept: (id) => api.post(`/visitas/${id}/aceptar`),
  reject: (id, motivo) => api.post(`/visitas/${id}/rechazar`, { motivo }),
  delegate: (id, nuevoPersonalId) => api.post(`/visitas/${id}/delegar`, { nuevoPersonalId }),
  finalizarAtencion: (id) => api.post(`/visitas/${id}/finalizar-atencion`),
};

export const justificacionesService = {
  // Listar (RRHH)
  getAll: (estado, q) => api.get(`/asistencia-personal/justificaciones/lista`, { params: { estado, q } }),
  
  // Evaluar (RRHH)
  evaluar: (id, data) => api.put(`/asistencia-personal/justificaciones/${id}/evaluar`, data),
};

// Export the axios instance for direct use
export default api;
