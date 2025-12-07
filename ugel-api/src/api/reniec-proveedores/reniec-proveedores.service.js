const repository = require('./reniec-proveedores.repository');
const { AppError } = require('../../middleware/errorHandler');

const listProviders = async () => {
  return await repository.findAll();
};

const getProvider = async (id) => {
  const provider = await repository.findById(id);
  if (!provider) throw new AppError('Proveedor RENIEC no encontrado', 404);
  return provider;
};

const getActiveProvider = async () => {
  try {
    const provider = await repository.findActive();
    return provider; // Returns null if not found
  } catch (error) {
    throw error;
  }
};

const createProvider = async (data, userId) => {
  try {
    const provider = await repository.create({
      nombre: data.nombre,
      baseUrl: data.baseUrl,
      token: data.token,
      notas: data.notas,
      activo: false,
      usuarioCreadorId: userId,
    });

    if (data.activar) {
      return await repository.setActive(provider.id, userId);
    }

    return provider;
  } catch (error) {
    if (error.code === '42P01') {
      throw new AppError('La tabla reniec_proveedores no existe. Ejecuta la migración SQL primero.', 500);
    }
    throw error;
  }
};

const updateProvider = async (id, data, userId) => {
  // Si intentan editar el proveedor por defecto (ID -1), creamos uno nuevo
  if (parseInt(id) === -1) {
    return createProvider(data, userId);
  }

  try {
    const updated = await repository.update(id, {
      nombre: data.nombre,
      baseUrl: data.baseUrl,
      token: data.token,
      notas: data.notas,
      activo: data.activo, // Pass activo to update
    });

    if (data.activar) {
      return await repository.setActive(id, userId);
    }

    return updated;
  } catch (error) {
    if (error.code === '42P01') {
      throw new AppError('La tabla reniec_proveedores no existe. Ejecuta la migración SQL primero.', 500);
    }
    throw error;
  }
};

const activateProvider = async (id, userId) => {
  try {
    return await repository.setActive(id, userId);
  } catch (error) {
    if (error.code === '42P01') {
      throw new AppError('La tabla reniec_proveedores no existe. Ejecuta la migración SQL primero.', 500);
    }
    throw error;
  }
};

const deleteProvider = async (id) => {
  try {
    const deleted = await repository.deleteById(id);
    if (!deleted) throw new AppError('Proveedor RENIEC no encontrado', 404);
    return deleted;
  } catch (error) {
    if (error.code === '42P01') {
      throw new AppError('La tabla reniec_proveedores no existe.', 500);
    }
    throw error;
  }
};

module.exports = {
  listProviders,
  getProvider,
  getActiveProvider,
  createProvider,
  updateProvider,
  activateProvider,
  deleteProvider,
};
