// index.js (raíz del repositorio)
// -----------------------------------------------------
// Punto de entrada para Vercel: exporta la app de Express como función.
// Docker y el desarrollo local siguen usando backend/server.js.
// -----------------------------------------------------

// Vercel identifica el punto de entrada buscando un archivo que importe express
require('express');

module.exports = require('./backend/app');
