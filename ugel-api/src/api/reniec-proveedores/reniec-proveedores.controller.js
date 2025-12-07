const service = require('./reniec-proveedores.service');

const list = async (req, res, next) => {
  try {
    const providers = await service.listProviders();
    res.json({
      success: true,
      message: 'Proveedores RENIEC obtenidos correctamente',
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};

const getActive = async (req, res, next) => {
  try {
    const provider = await service.getActiveProvider();
    res.json({
      success: true,
      message: provider ? 'Proveedor activo obtenido' : 'No hay proveedor activo configurado',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const provider = await service.createProvider(req.body, req.user?.id);
    res.status(201).json({
      success: true,
      message: 'Proveedor RENIEC guardado',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await service.updateProvider(id, req.body, req.user?.id);
    res.json({
      success: true,
      message: 'Proveedor RENIEC actualizado',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

const activate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await service.activateProvider(id, req.user?.id);
    res.json({
      success: true,
      message: 'Proveedor RENIEC activado',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const provider = await service.getProvider(id);
    res.json({
      success: true,
      message: 'Proveedor RENIEC obtenido',
      data: provider,
    });
  } catch (error) {
    next(error);
  }
};

const deleteProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    await service.deleteProvider(id);
    res.json({
      success: true,
      message: 'Proveedor RENIEC eliminado',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  list,
  getActive,
  getById,
  create,
  update,
  activate,
  delete: deleteProvider,
};
