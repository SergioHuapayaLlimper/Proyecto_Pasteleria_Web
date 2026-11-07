-- bd_reposteria_datos.sql
-- -----------------------------------------------------
-- Datos iniciales (semilla) para que la web muestre contenido
-- en cualquier entorno nuevo: Docker local, Jenkins, etc.
-- Se ejecuta automáticamente DESPUÉS de bd_reposteria.sql
-- (MySQL ejecuta los .sql de /docker-entrypoint-initdb.d en orden alfabético)
-- y SOLO cuando el volumen de la base de datos está vacío.
-- Los valores se pueden editar luego desde el panel de administrador.
-- -----------------------------------------------------
USE bd_reposteria;

SET NAMES utf8mb4;

-- ---- CATEGORÍAS ----
INSERT IGNORE INTO categorias (id_categoria, nombre) VALUES
    (1, 'Tortas'),
    (2, 'Postres'),
    (3, 'Bocaditos');

-- ---- PRODUCTOS ----
INSERT IGNORE INTO productos (id_producto, id_categoria, nombre, descripcion, precio, imagen_url, estado) VALUES
    (1, 1, 'Torta de Chocolate', 'Bizcocho húmedo de cacao con fudge artesanal y virutas de chocolate.', 65.00, '/img/productos/torta-chocolate.svg', 'activo'),
    (2, 2, 'Cheesecake de Fresa', 'Base crocante de galleta, crema de queso y coulis de fresas frescas.', 58.00, '/img/productos/cheesecake-fresa.svg', 'activo'),
    (3, 2, 'Pie de Limón', 'Relleno cremoso de limón con merengue italiano dorado.', 42.50, '/img/productos/pie-limon.svg', 'activo'),
    (4, 1, 'Torta Tres Leches', 'Clásico bizcocho bañado en tres leches con un toque de canela.', 55.00, '/img/productos/tres-leches.svg', 'activo'),
    (5, 3, 'Alfajores (docena)', 'Rellenos de manjar blanco y espolvoreados con azúcar en polvo.', 24.00, '/img/productos/alfajores.svg', 'activo'),
    (6, 3, 'Cupcakes Red Velvet (6 und.)', 'Esponjosos cupcakes con frosting de queso crema.', 30.00, '/img/productos/cupcakes.svg', 'activo');

-- ---- CONFIGURACIÓN DEL NEGOCIO ----
INSERT IGNORE INTO configuracion_negocio (clave, valor) VALUES
    ('direccion', 'Lima, Perú'),
    ('mapa_lat', '-12.0464'),
    ('mapa_lng', '-77.0428'),
    ('horario_atencion', 'Lunes a Sábado de 9:00 a.m. a 8:00 p.m.'),
    ('metodos_pago', 'Efectivo y Yape'),
    ('telefono_contacto', '922 794 192'),
    ('correo_contacto', 'contacto@corporacionjorby.com'),
    ('whatsapp_numero', '51922794192'),
    ('whatsapp_mensaje', 'Hola, quisiera información sobre sus productos');
