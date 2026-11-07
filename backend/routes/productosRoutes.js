// productosRoutes.js
// -----------------------------------------------------
// Rutas de productos. GET son públicas, el resto requiere admin.
// RF-07, RF-08, RF-09
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { requiereAdmin } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS ----
router.get('/', productosController.listarProductos);

// ---- RUTAS PRIVADAS (solo admin) ----
router.get('/todos', requiereAdmin, productosController.listarTodos);
router.get('/:id', productosController.obtenerProducto);
router.post('/', requiereAdmin, productosController.crearProducto);
router.put('/:id', requiereAdmin, productosController.editarProducto);
router.delete('/:id', requiereAdmin, productosController.desactivarProducto);

module.exports = router;