// middleware/auth.js
// -----------------------------------------------------
// Protege rutas que solo debe usar el panel administrativo.
// RF-03: redirigir al panel solo si el rol es Administrador.
// RF-21: reportes de pedidos solo para Contador y Administrador.
// -----------------------------------------------------

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifica que exista un token valido en la cabecera Authorization.
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ mensaje: 'No se envio un token de acceso.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, usuario) => {
    if (error) {
      return res.status(403).json({ mensaje: 'Token invalido o expirado.' });
    }
    req.usuario = usuario; // { id, usuario, rol }
    next();
  });
}

// Genera un middleware que solo deja pasar a ciertos roles.
// Uso: soloRoles('Administrador') o soloRoles('Administrador', 'Contador')
function soloRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para acceder a este recurso.' });
    }
    next();
  };
}

module.exports = { verificarToken, soloRoles };