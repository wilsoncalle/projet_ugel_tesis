const Joi = require('joi');

const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
const regexDni = /^\d{8}$/;
const regexRuc = /^\d{11}$/;

const commonRules = {
  nombrePersona: Joi.string()
    .pattern(regexNombre)
    .min(2)
    .max(150)
    .messages({
      'string.pattern.base': 'Los nombres solo pueden contener letras y caracteres válidos.',
      'string.min': 'El nombre debe tener al menos 2 caracteres.',
      'string.max': 'El nombre no puede exceder 150 caracteres.'
    }),

  dni: Joi.string()
    .pattern(regexDni)
    .messages({
      'string.pattern.base': 'El DNI debe tener exactamente 8 dígitos numéricos.'
    }),

  ruc: Joi.string()
    .pattern(regexRuc)
    .messages({
      'string.pattern.base': 'El RUC debe tener exactamente 11 dígitos numéricos.'
    }),

  email: Joi.string()
    .email()
    .max(150)
    .messages({
      'string.email': 'Debe proporcionar un correo electrónico válido.'
    }),

  telefonoOpcional: Joi.string()
    .allow(null, '')
    .pattern(/^\d{7,15}$/)
    .messages({
      'string.pattern.base': 'El teléfono debe contener entre 7 y 15 dígitos numéricos.'
    })
};

module.exports = {
  regexNombre,
  regexDni,
  regexRuc,
  commonRules
};
