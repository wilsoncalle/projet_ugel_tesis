import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('=== INTERCEPTOR DE PETICIÓN ===');
    console.log('URL de la petición:', config.url);
    console.log('Método HTTP:', config.method?.toUpperCase());
    console.log('Token encontrado:', token ? 'SÍ' : 'NO');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token agregado a headers:', token.substring(0, 20) + '...');
      console.log('Headers completos:', config.headers);
    } else {
      console.log('No hay token disponible');
    }
    console.log('=== FIN INTERCEPTOR ===');
    return config;
  },
  (error) => {
    console.error('Error en interceptor de petición:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log('=== INTERCEPTOR DE RESPUESTA ===');
    console.log('Respuesta exitosa:', response.config.url, response.status);
    console.log('=== FIN INTERCEPTOR RESPUESTA ===');
    return response;
  },
  (error) => {
    console.error('=== INTERCEPTOR DE ERROR ===');
    console.error('Error en respuesta:', error.config?.url, error.response?.status);
    console.error('Detalles del error:', error.response?.data);
    console.error('=== FIN INTERCEPTOR ERROR ===');
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // No redirección automática aquí, dejaremos que los componentes manejen esto
      // para evitar recargas de página inesperadas
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
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
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
  getAll: () => api.get('/personal'),
  getById: (id) => api.get(`/personal/${id}`),
  create: (personal) => api.post('/personal', personal),
  update: (id, personal) => api.put(`/personal/${id}`, personal),
  delete: (id) => api.delete(`/personal/${id}`),
  getDeleted: () => api.get('/personal/deleted'),
  restore: (id) => api.put(`/personal/${id}/restore`),
};

export const papeletasSalidaService = {
  getAll: () => api.get('/papeletas-salida'),
  getById: (id) => api.get(`/papeletas-salida/${id}`),
  create: (papeleta) => api.post('/papeletas-salida', papeleta),
  update: (id, papeleta) => api.put(`/papeletas-salida/${id}`, papeleta),
  delete: (id) => api.delete(`/papeletas-salida/${id}`),
};

export const visitasService = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.busqueda) params.append('busqueda', filters.busqueda);
    if (filters.empleadoId) params.append('personalVisitadoId', filters.empleadoId);
    if (filters.motivoId) params.append('motivoVisitaId', filters.motivoId);
    if (filters.lugar) params.append('areaDestinoId', filters.lugar);
    if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
    if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
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

// --- Funciones para el Dashboard del Vigilante ---

/**
 * Registra una visita completa (incluyendo la creación del visitante si es nuevo).
 * Llama a: POST /api/visitas
 * @param {object} datosVisita - Objeto con los datos del visitante y la visita.
 * @returns {Promise<object>} La respuesta de la API.
 */
export const registrarVisitaCompleta = (datosVisita) => {
  // Mapear los nombres de campos del frontend al backend
  const datosMapeados = {
    // Datos de la visita (mapear nombres)
    areaDestinoId: datosVisita.lugarId || datosVisita.lugar, // lugar -> areaDestinoId
    personalVisitadoId: datosVisita.empleadoId, // empleadoId -> personalVisitadoId
    motivoVisitaId: datosVisita.motivoId // motivoId -> motivoVisitaId
  };

  // Si es un visitante existente, incluir visitanteId
  if (datosVisita.visitanteId && datosVisita.visitanteId !== null) {
    datosMapeados.visitanteId = datosVisita.visitanteId;
  } else {
    // Si es un visitante nuevo, incluir datos del visitante
    datosMapeados.tipoDocumentoId = datosVisita.tipoDocumentoId;
    datosMapeados.numeroDocumento = datosVisita.numeroDocumento;
    datosMapeados.nombres = datosVisita.nombres;
    datosMapeados.apellidos = datosVisita.apellidos;
  }
  
  console.log('=== REGISTRAR VISITA COMPLETA ===');
  console.log('Datos originales:', datosVisita);
  console.log('Datos mapeados:', datosMapeados);
  
  return api.post('/visitas', datosMapeados);
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

// Export the axios instance for direct use
export default api;
