const express = require('express');
const router = express.Router();
const controller = require('./asistencia-config.controller');
const { authenticateToken, requireActiveUser, requireRoles } = require('../../middleware/authHandler');

// Solo admin debería poder configurar esto
router.get(
  '/global',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  controller.getConfigGlobal
);

router.put(
  '/global',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  controller.updateConfigGlobal
);

router.put(
  '/personal',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  controller.updateConfigpersonal
);

module.exports = router;
