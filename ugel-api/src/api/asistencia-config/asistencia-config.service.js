const repository = require('./asistencia-config.repository');
const { AppError } = require('../../middleware/errorHandler');

const getConfigEfectiva = async (personalId) => {
  // 1. Intentar config específica
  const configpersonal = await repository.getConfigpersonalActiva(personalId);
  if (configpersonal) return configpersonal;

  // 2. Si no hay, usar global
  const configGlobal = await repository.getConfigGlobalActiva();
  if (configGlobal) return configGlobal;

  // 3. Si no hay ninguna, devolver valores por defecto "quemados"
  return {
    minutos_tolerancia_por_dia: 10,
    dias_tolerancia_por_mes: 10
  };
};

const setConfigGlobal = async ({ minutos, dias, aplicaDesde, horaEntrada, horaEntradaTarde }) => {
  // podrías desactivar anteriores globales si quieres mantener histórico
  const existing = await repository.getConfigGlobalActiva();
  if (existing) {
    // actualizar
    return await repository.updateConfig(existing.id, {
      minutos,
      dias,
      aplicaDesde,
      horaEntrada,
      horaEntradaTarde,
      activo: true
    });
  } else {
    // crear nueva
    return await repository.createConfig({
      personalId: null,
      minutos,
      dias,
      aplicaDesde,
      horaEntrada,
      horaEntradaTarde,
      activo: true
    });
  }
};

const setConfigpersonal = async ({ personalId, minutos, dias, aplicaDesde, horaEntrada, horaEntradaTarde }) => {
  const existing = await repository.getConfigpersonalActiva(personalId);
  if (existing) {
    return await repository.updateConfig(existing.id, {
      minutos,
      dias,
      aplicaDesde,
      horaEntrada,
      horaEntradaTarde,
      activo: true
    });
  } else {
    return await repository.createConfig({
      personalId,
      minutos,
      dias,
      aplicaDesde,
      horaEntrada,
      horaEntradaTarde,
      activo: true
    });
  }
};

module.exports = {
  getConfigEfectiva,
  setConfigGlobal,
  setConfigpersonal,
};
