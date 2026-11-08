// categoriasRoutes.js
// -----------------------------------------------------
// Gestión de categorías: requiere el permiso "productos"
// (quien administra el catálogo administra sus categorías).
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const { requierePermiso } = require('../middleware/auth');

const permisoCatalogo = requierePermiso('productos');

router.get('/', permisoCatalogo, categoriasController.listarCategorias);
router.post('/', permisoCatalogo, categoriasController.crearCategoria);
router.put('/:id', permisoCatalogo, categoriasController.editarCategoria);
router.delete('/:id', permisoCatalogo, categoriasController.eliminarCategoria);

module.exports = router;
