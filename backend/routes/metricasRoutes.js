const express = require('express');
const router = express.Router();
const metricasController = require('../controllers/metricasController');
const { requiereAdminOContador } = require('../middleware/auth');

router.get('/resumen', requiereAdminOContador, metricasController.resumenGeneral);
router.get('/por-fecha', requiereAdminOContador, metricasController.metricasPorFecha);
router.get('/exportar', requiereAdminOContador, metricasController.exportarMetricas);

module.exports = router;