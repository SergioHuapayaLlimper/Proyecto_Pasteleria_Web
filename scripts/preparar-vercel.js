// scripts/preparar-vercel.js
// -----------------------------------------------------
// En Vercel, express.static() no sirve archivos: los estáticos deben
// estar en la carpeta public/ de la raíz. Este script (comando de build)
// copia frontend/public -> public sin duplicar archivos en el repositorio.
// -----------------------------------------------------

const fs = require('fs');
const path = require('path');

const origen = path.join(__dirname, '..', 'frontend', 'public');
const destino = path.join(__dirname, '..', 'public');

fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origen, destino, { recursive: true });

const total = fs.readdirSync(destino, { recursive: true }).length;
console.log(`✅ Frontend copiado a public/ (${total} archivos y carpetas)`);
