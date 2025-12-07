const express = require('express');
const controller = require('./reniec-proveedores.controller');
const { authenticateToken, requireActiveUser, requireRoles } = require('../../middleware/authHandler');
const { validationMiddleware } = require('../../middleware/validationHandler');

const router = express.Router();

router.get(
  '/activo',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  controller.getActive
);

router.get(
  '/',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  controller.list
);

router.post(
  '/',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  validationMiddleware.validateCreateReniecProvider,
  controller.create
);

router.put(
  '/:id',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  validationMiddleware.validateReniecProviderId,
  validationMiddleware.validateUpdateReniecProvider,
  controller.update
);

router.post(
  '/:id/activar',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  validationMiddleware.validateReniecProviderId,
  controller.activate
);

router.get(
  '/:id',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  validationMiddleware.validateReniecProviderId,
  controller.getById
);

router.delete(
  '/:id',
  authenticateToken,
  requireActiveUser,
  requireRoles('Administrador'),
  validationMiddleware.validateReniecProviderId,
  controller.delete
);

module.exports = router;
