const express = require('express');
const router = express.Router();
const metricasController = require('../controllers/metricasController');
const { requierePermiso } = require('../middleware/auth');

// RF-04, RF-05, RF-06: métricas y su exportación requieren el permiso "dashboard"
router.get('/resumen', requierePermiso('dashboard'), metricasController.resumenGeneral);
router.get('/por-fecha', requierePermiso('dashboard'), metricasController.metricasPorFecha);
router.get('/exportar', requierePermiso('dashboard'), metricasController.exportarMetricas);

module.exports = router;
