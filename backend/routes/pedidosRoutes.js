const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { requierePermiso } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS (cliente) ----
router.post('/', pedidosController.crearPedido);
router.post('/consultas', pedidosController.registrarConsulta);

// ---- RUTAS PRIVADAS ----
// RF-19, RF-20, RF-21: ver y exportar historial
router.get('/', requierePermiso('pedidos'), pedidosController.listarPedidos);
router.get('/:id', requierePermiso('pedidos'), pedidosController.obtenerPedido);
// Cambiar estado del pedido
router.put('/:id/estado', requierePermiso('pedidos_estado'), pedidosController.cambiarEstado);

module.exports = router;
