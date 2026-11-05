const express = require('express');
const router = express.Router();
const metricasController = require('../controllers/metricasController');
const { verificarToken, soloRoles } = require('../middleware/auth');

router.get('/resumen', verificarToken, soloRoles('Administrador', 'Contador'), metricasController.resumenGeneral);
router.get('/por-fecha', verificarToken, soloRoles('Administrador', 'Contador'), metricasController.metricasPorFecha);
router.get('/exportar', verificarToken, soloRoles('Administrador', 'Contador'), metricasController.exportarMetricas);

module.exports = router;