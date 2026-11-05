const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { verificarToken, soloRoles } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS (cliente) ----
router.post('/', pedidosController.crearPedido);
router.post('/consultas', pedidosController.registrarConsulta);

// ---- RUTAS PRIVADAS (admin/contador) ----
router.get('/', verificarToken, soloRoles('Administrador', 'Contador'), pedidosController.listarPedidos);
router.get('/:id', verificarToken, soloRoles('Administrador', 'Contador'), pedidosController.obtenerPedido);
router.put('/:id/estado', verificarToken, soloRoles('Administrador'), pedidosController.cambiarEstado);

module.exports = router;