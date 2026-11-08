const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { requierePermiso } = require('../middleware/auth');

// GET /api/config -> Público (cualquiera puede ver la info del negocio)
router.get('/', configController.obtenerConfig);

// PUT /api/config -> Requiere el permiso "configuracion"
router.put('/', requierePermiso('configuracion'), configController.actualizarConfig);

module.exports = router;
