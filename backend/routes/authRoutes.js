const express = require('express');
const router = express.Router();
const { login, perfil } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/perfil -> datos y permisos actuales del usuario conectado
router.get('/perfil', verificarToken, perfil);

module.exports = router;
