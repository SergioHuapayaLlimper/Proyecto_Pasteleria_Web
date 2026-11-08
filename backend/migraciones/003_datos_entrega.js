// 003_datos_entrega.js
// -----------------------------------------------------
// HU08: datos de entrega del pedido.
// - modo_entrega: 'Delivery' o 'Recojo en tienda'.
// - referencia_entrega: referencia opcional de la dirección.
// - fecha_entrega: fecha de envío elegida por el cliente.
// (La columna direccionEntrega ya existía en la tabla pedidos.)
// -----------------------------------------------------

exports.descripcion = 'Modo, dirección, referencia y fecha de entrega en pedidos';

exports.up = async (con, { existeColumna }) => {
    if (!(await existeColumna(con, 'pedidos', 'direccionEntrega'))) {
        await con.query('ALTER TABLE pedidos ADD COLUMN direccionEntrega VARCHAR(150) NULL');
    }
    if (!(await existeColumna(con, 'pedidos', 'modo_entrega'))) {
        await con.query(`ALTER TABLE pedidos ADD COLUMN modo_entrega VARCHAR(20) NOT NULL
                         DEFAULT 'Delivery' AFTER estado`);
    }
    if (!(await existeColumna(con, 'pedidos', 'referencia_entrega'))) {
        await con.query('ALTER TABLE pedidos ADD COLUMN referencia_entrega VARCHAR(150) NULL AFTER direccionEntrega');
    }
    if (!(await existeColumna(con, 'pedidos', 'fecha_entrega'))) {
        await con.query('ALTER TABLE pedidos ADD COLUMN fecha_entrega DATE NULL AFTER referencia_entrega');
        await con.query('ALTER TABLE pedidos ADD INDEX idx_pedidos_fecha_entrega (fecha_entrega)');
    }
};
