// productosRoutes.js
// -----------------------------------------------------
// Rutas de productos. GET públicos; el resto requiere el permiso "productos".
// RF-07, RF-08, RF-09
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { requierePermiso } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS ----
router.get('/', productosController.listarProductos);

// ---- RUTAS PRIVADAS ----
router.get('/todos', requierePermiso('productos'), productosController.listarTodos);
router.get('/:id', productosController.obtenerProducto);
router.post('/', requierePermiso('productos'), productosController.crearProducto);
router.put('/:id', requierePermiso('productos'), productosController.editarProducto);
router.delete('/:id', requierePermiso('productos'), productosController.desactivarProducto);

module.exports = router;
