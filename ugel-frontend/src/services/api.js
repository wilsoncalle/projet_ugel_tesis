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
    if (filters.busqueda) params.append('q', filters.busqueda);
    if (filters.empleadoId) params.append('empleadoId', filters.empleadoId);
    if (filters.motivoId) params.append('motivoId', filters.motivoId);
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

// Export the axios instance for direct use
export default api;
