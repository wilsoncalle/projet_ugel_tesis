const repository = require('./asistencia-config.repository');
const { AppError } = require('../../middleware/errorHandler');

const getConfigEfectiva = async (personalId) => {
  // 1. Intentar config específica
  const configPersonal = await repository.getConfigPersonalActiva(personalId);
  if (configPersonal) return configPersonal;

  // 2. Si no hay, usar global
  const configGlobal = await repository.getConfigGlobalActiva();
  if (configGlobal) return configGlobal;

  // 3. Si no hay ninguna, devolver valores por defecto "quemados"
  return {
    minutos_tolerancia_por_dia: 10,
    dias_tolerancia_por_mes: 10
  };
};

const setConfigGlobal = async ({ minutos, dias, aplicaDesde }) => {
  // podrías desactivar anteriores globales si quieres mantener histórico
  const existing = await repository.getConfigGlobalActiva();
  if (existing) {
    // actualizar
    return await repository.updateConfig(existing.id, {
      minutos,
      dias,
      aplicaDesde,
      activo: true
    });
  } else {
    // crear nueva
    return await repository.createConfig({
      personalId: null,
      minutos,
      dias,
      aplicaDesde,
      activo: true
    });
  }
};

const setConfigPersonal = async ({ personalId, minutos, dias, aplicaDesde }) => {
  const existing = await repository.getConfigPersonalActiva(personalId);
  if (existing) {
    return await repository.updateConfig(existing.id, {
      minutos,
      dias,
      aplicaDesde,
      activo: true
    });
  } else {
    return await repository.createConfig({
      personalId,
      minutos,
      dias,
      aplicaDesde,
      activo: true
    });
  }
};

module.exports = {
  getConfigEfectiva,
  setConfigGlobal,
  setConfigPersonal,
};
