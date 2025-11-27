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
  const { minutos, dias, aplicaDesde } = req.body;

  const config = await service.setConfigGlobal({
    minutos: Number(minutos),
    dias: Number(dias),
    aplicaDesde
  });

  res.json({
    success: true,
    message: 'Configuración global actualizada correctamente',
    data: config
  });
});

const updateConfigPersonal = asyncHandler(async (req, res) => {
  const { personalId, minutos, dias, aplicaDesde } = req.body;

  const config = await service.setConfigPersonal({
    personalId: Number(personalId),
    minutos: Number(minutos),
    dias: Number(dias),
    aplicaDesde
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
