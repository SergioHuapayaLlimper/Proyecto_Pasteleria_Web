// personalRoutes.js
// -----------------------------------------------------
// Gestión del personal (usuarios) y de los roles del panel.
// Todo requiere el permiso "personal".
// -----------------------------------------------------

const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const usuariosController = require('../controllers/usuariosController');
const { requierePermiso } = require('../middleware/auth');

const soloPersonal = requierePermiso('personal');

// ---- ROLES ----
router.get('/roles/permisos', soloPersonal, rolesController.listarPermisos);
router.get('/roles', soloPersonal, rolesController.listarRoles);
router.post('/roles', soloPersonal, rolesController.crearRol);
router.put('/roles/:id', soloPersonal, rolesController.editarRol);
router.delete('/roles/:id', soloPersonal, rolesController.eliminarRol);

// ---- USUARIOS ----
router.get('/usuarios', soloPersonal, usuariosController.listarUsuarios);
router.post('/usuarios', soloPersonal, usuariosController.crearUsuario);
router.put('/usuarios/:id', soloPersonal, usuariosController.editarUsuario);
router.delete('/usuarios/:id', soloPersonal, usuariosController.eliminarUsuario);

module.exports = router;
