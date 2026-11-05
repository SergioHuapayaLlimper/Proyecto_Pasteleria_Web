const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { verificarToken, soloRoles } = require('../middleware/auth');

// GET /api/config -> Público (cualquiera puede ver la info del negocio)
router.get('/', configController.obtenerConfig);

// PUT /api/config -> Solo admin puede modificar
router.put('/', verificarToken, soloRoles('Administrador'), configController.actualizarConfig);

module.exports = router;