const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { requiereAdmin, requiereAdminOContador } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS (cliente) ----
router.post('/', pedidosController.crearPedido);
router.post('/consultas', pedidosController.registrarConsulta);

// ---- RUTAS PRIVADAS (admin/contador) ----
router.get('/', requiereAdminOContador, pedidosController.listarPedidos);
router.get('/:id', requiereAdminOContador, pedidosController.obtenerPedido);
router.put('/:id/estado', requiereAdmin, pedidosController.cambiarEstado);

module.exports = router;