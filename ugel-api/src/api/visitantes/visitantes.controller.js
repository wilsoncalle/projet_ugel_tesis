const visitantesService = require('./visitantes.service');
const { AppError } = require('../../middleware/errorHandler');

const getAllVisitantes = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', activo = true } = req.query;
    const result = await visitantesService.getAllVisitantes({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      activo: activo === 'true'
    });
    
    res.json({
      success: true,
      message: 'Visitantes obtenidos exitosamente',
      data: result.visitantes,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVisitanteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visitante = await visitantesService.getVisitanteById(id);
    
    if (!visitante) {
      return res.status(404).json({
        success: false,
        message: 'Visitante no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Visitante obtenido exitosamente',
      data: visitante
    });
  } catch (error) {
    next(error);
  }
};

const getVisitanteByDocumento = async (req, res, next) => {
  try {
    const { tipoDocumentoId, numeroDocumento } = req.params;
    
    try {
      const visitante = await visitantesService.getVisitanteByDocumento(tipoDocumentoId, numeroDocumento);
      
      res.json({
        success: true,
        message: 'Visitante encontrado',
        data: visitante
      });
    } catch (error) {
      // Si es un error 404, devolver éxito con data null en lugar de error
      if (error.statusCode === 404) {
        return res.json({
          success: true,
          message: 'Visitante no encontrado',
          data: null
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

const getHistorialVisitas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await visitantesService.getHistorialVisitas(id, { page, limit });
    
    res.json({
      success: true,
      message: 'Historial obtenido exitosamente',
      data: result.visitas,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

const createVisitante = async (req, res, next) => {
  try {
    const visitanteData = req.body;
    const newVisitante = await visitantesService.createVisitante(visitanteData, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'Visitante creado exitosamente',
      data: newVisitante
    });
  } catch (error) {
    next(error);
  }
};

const updateVisitante = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visitanteData = req.body;
    const updatedVisitante = await visitantesService.updateVisitante(id, visitanteData, req.user.id);
    
    res.json({
      success: true,
      message: 'Visitante actualizado exitosamente',
      data: updatedVisitante
    });
  } catch (error) {
    next(error);
  }
};

const deleteVisitante = async (req, res, next) => {
  try {
    const { id } = req.params;
    await visitantesService.deleteVisitante(id, req.user.id);
    
    res.json({
      success: true,
      message: 'Visitante eliminado exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

const consultarDNI = async (req, res, next) => {
  try {
    const { dni } = req.body;
    
    // Validar que el DNI tenga 8 dígitos
    if (!dni || !/^\d{8}$/.test(dni)) {
      return res.status(400).json({
        success: false,
        message: 'El DNI debe tener exactamente 8 dígitos'
      });
    }
    
    // Primero verificar si el visitante ya existe en nuestra base de datos
    const visitanteExistente = await visitantesService.getVisitanteByDNI(dni);
    if (visitanteExistente) {
      return res.json({
        success: true,
        message: 'Visitante encontrado en base de datos local',
        data: {
          id: visitanteExistente.id,
          nombres: visitanteExistente.nombres,
          apellidos: visitanteExistente.apellidos,
          numero_documento: visitanteExistente.numero_documento,
          source: 'local'
        }
      });
    }
    
    // Si no existe localmente, consultar la API externa
    const datosExternos = await visitantesService.consultarDNIExterno(dni);
    
    if (datosExternos) {
      // Buscar el tipo de documento DNI
      const tiposDocumentoRepository = require('../tipos-documento/tiposdocumento.repository');
      const tipoDNI = await tiposDocumentoRepository.findByCode('DNI');
      
      if (!tipoDNI) {
        return res.status(500).json({
          success: false,
          message: 'Tipo de documento DNI no configurado en el sistema'
        });
      }
      
      // Guardar en la base de datos para futuras consultas
      const nuevoVisitante = await visitantesService.createVisitanteFromDNI({
        numero_documento: dni,
        nombres: datosExternos.nombres,
        apellidos: `${datosExternos.apellidoPaterno || ''} ${datosExternos.apellidoMaterno || ''}`.trim(),
        tipo_documento_id: tipoDNI.id
      }, req.user.id);
      
      return res.json({
        success: true,
        message: 'Datos obtenidos de API externa y guardados',
        data: {
          id: nuevoVisitante.id,
          nombres: datosExternos.nombres,
          apellidos: `${datosExternos.apellidoPaterno || ''} ${datosExternos.apellidoMaterno || ''}`.trim(),
          numero_documento: dni,
          source: 'external'
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para este DNI'
      });
    }
  } catch (error) {
    console.error('Error consultando DNI:', error);
    
    // Manejar errores específicos de la API externa
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para este DNI'
      });
    } else if (error.statusCode === 429) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas consultas. Intente nuevamente en unos minutos'
      });
    } else if (error.statusCode === 503) {
      return res.status(503).json({
        success: false,
        message: error.message || 'Proveedor RENIEC no configurado'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Error al consultar el DNI. Intente nuevamente'
      });
    }
  }
};

module.exports = {
  getAll: getAllVisitantes,
  getById: getVisitanteById,
  getByDocumento: getVisitanteByDocumento,
  getHistorial: getHistorialVisitas,
  create: createVisitante,
  update: updateVisitante,
  delete: deleteVisitante,
  consultarDNI
};
