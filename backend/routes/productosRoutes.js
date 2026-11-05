// productosRoutes.js
// -----------------------------------------------------
// Rutas de productos. GET son públicas, el resto requiere admin.
// RF-07, RF-08, RF-09
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { verificarToken, soloRoles } = require('../middleware/auth');

// ---- RUTAS PÚBLICAS ----
router.get('/', productosController.listarProductos);

// ---- RUTAS PRIVADAS (solo admin) ----
router.get('/todos', verificarToken, soloRoles('Administrador'), productosController.listarTodos);
router.get('/:id', productosController.obtenerProducto);
router.post('/', verificarToken, soloRoles('Administrador'), productosController.crearProducto);
router.put('/:id', verificarToken, soloRoles('Administrador'), productosController.editarProducto);
router.delete('/:id', verificarToken, soloRoles('Administrador'), productosController.desactivarProducto);

module.exports = router;