# Migraciones de base de datos

Cada archivo `NNN_descripcion.js` modifica la estructura de la BD **sin borrar datos**.
Se aplican solas al iniciar el servidor y quedan registradas en la tabla `migraciones`.

## Cómo crear una nueva

1. Crea `backend/migraciones/002_lo_que_cambia.js` (número siguiente).
2. Exporta `descripcion` y una función `up(con, utilidades)`.
3. Antes de cada cambio, verifica si ya existe (`existeTabla`, `existeColumna`,
   `existeRestriccion`), para que sea seguro ejecutarla en cualquier BD.
4. Refleja el mismo cambio en `db/bd_reposteria.sql` (para BD nuevas).

```js
exports.descripcion = 'Agrega dirección de entrega a pedidos';
exports.up = async (con, { existeColumna }) => {
    if (!(await existeColumna(con, 'pedidos', 'referencia'))) {
        await con.query('ALTER TABLE pedidos ADD COLUMN referencia VARCHAR(150) NULL');
    }
};
```

Ejecutar a mano: `npm run migrar` (o `docker compose exec app node migrar.js`).
