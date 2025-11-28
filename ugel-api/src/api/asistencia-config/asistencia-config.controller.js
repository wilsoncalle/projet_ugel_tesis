const service = require('./asistencia-config.service');
const { asyncHandler } = require('../../middleware/errorHandler');

const getConfigGlobal = asyncHandler(async (req, res) => {
  const config = await service.getConfigEfectiva(null); // devuelve global o default
  res.json({
    success: true,
    data: config
  });
});

const updateConfigGlobal = asyncHandler(async (req, res) => {
  const { minutos_tolerancia_por_dia, dias_tolerancia_por_mes, aplica_desde, hora_entrada } = req.body;

  const config = await service.setConfigGlobal({
    minutos: Number(minutos_tolerancia_por_dia),
    dias: Number(dias_tolerancia_por_mes),
    aplicaDesde: aplica_desde,
    horaEntrada: hora_entrada
  });

  res.json({
    success: true,
    message: 'Configuración global actualizada correctamente',
    data: config
  });
});

const updateConfigPersonal = asyncHandler(async (req, res) => {
  const { personalId, minutos_tolerancia_por_dia, dias_tolerancia_por_mes, aplica_desde, hora_entrada } = req.body;

  const config = await service.setConfigPersonal({
    personalId: Number(personalId),
    minutos: Number(minutos_tolerancia_por_dia),
    dias: Number(dias_tolerancia_por_mes),
    aplicaDesde: aplica_desde,
    horaEntrada: hora_entrada
  });

  res.json({
    success: true,
    message: 'Configuración de tolerancia para el personal actualizada',
    data: config
  });
});

module.exports = {
  getConfigGlobal,
  updateConfigGlobal,
  updateConfigPersonal
};
