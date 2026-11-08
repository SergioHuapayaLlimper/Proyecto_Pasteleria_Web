USE bd_reposteria;
SET NAMES utf8mb4;

-- ---- ROLES DEL PERSONAL ----
-- "permisos" es una lista JSON con las secciones del panel a las que accede el rol:
-- dashboard, productos, pedidos, pedidos_estado, configuracion, personal
CREATE TABLE IF NOT EXISTS roles (
    id_rol         INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(40)  NOT NULL,
    descripcion    VARCHAR(150) NULL,
    permisos       JSON         NOT NULL,
    es_sistema     TINYINT(1)   NOT NULL DEFAULT 0,  -- 1 = no se puede editar ni eliminar
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_roles_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Roles base (necesarios para que el sistema funcione)
INSERT IGNORE INTO roles (id_rol, nombre, descripcion, permisos, es_sistema) VALUES
    (1, 'Administrador', 'Acceso total al panel administrativo.',
        JSON_ARRAY('dashboard', 'productos', 'pedidos', 'pedidos_estado', 'configuracion', 'personal'), 1),
    (2, 'Contador', 'Consulta métricas y exporta el historial de pedidos (RF21).',
        JSON_ARRAY('dashboard', 'pedidos'), 0);

-- ---- PERSONAL DE LA PASTELERÍA ----
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
    nombre            VARCHAR(50)  NOT NULL,
    email             VARCHAR(100) NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    telefono          VARCHAR(15)  NULL,
    id_rol            INT          NOT NULL,
    activo            TINYINT(1)   NOT NULL DEFAULT 1,
    intentos_fallidos INT          NOT NULL DEFAULT 0,
    bloqueado_hasta   DATETIME     NULL,
    creado_en         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_usuario_email (email),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(50)  NOT NULL,
    telefono   VARCHAR(15)  NULL,
    direccion  VARCHAR(150) NOT NULL,
    referencia VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- CATEGORÍAS DE PRODUCTOS (gestionadas desde el panel) ----
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria   INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(50)  NOT NULL,
    descripcion    VARCHAR(150) NULL,
    activo         TINYINT(1)   NOT NULL DEFAULT 1,  -- 0 = no aparece al registrar productos
    creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
    id_producto  INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT NOT NULL,
    nombre       VARCHAR(100)  NOT NULL,
    descripcion  TEXT          NULL,
    precio       DECIMAL(10,2) NOT NULL,
    imagen_url   VARCHAR(255)  NULL,
    estado       VARCHAR(10)   NOT NULL DEFAULT 'activo',
    creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
    id_pedido        INT AUTO_INCREMENT PRIMARY KEY,
    codigo_pedido    VARCHAR(30)   NOT NULL,
    id_cliente       INT           NOT NULL,
    cliente_nombre   VARCHAR(50)   NOT NULL,
    cliente_telefono VARCHAR(15)   NULL,
    fecha_pedido     DATETIME      NOT NULL,
    creado_en        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total            DECIMAL(10,2) NOT NULL,
    metodo_pago      VARCHAR(30)   NOT NULL,
    estado           VARCHAR(20)   NOT NULL DEFAULT 'Pendiente',
    direccionEntrega VARCHAR(150)  NULL,
    UNIQUE KEY uk_codigo_pedido (codigo_pedido),
    CONSTRAINT fk_pedidos_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_pedidos (
    id_detalle      INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido       INT           NOT NULL,
    id_producto     INT           NOT NULL,
    cantidad        INT           NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal        DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_pedido   FOREIGN KEY (id_pedido)   REFERENCES pedidos (id_pedido),
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS configuracion_negocio (
    clave VARCHAR(50) PRIMARY KEY,
    valor TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultas (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    tipo      VARCHAR(30) NOT NULL,
    creado_en TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
