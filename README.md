# Pastelería Jorby – Sistema Web de Pedidos

Sistema web para la gestión de pedidos de la **Corporación Jorby S.A.C.**, una pastelería local.
Los clientes arman su pedido desde la página web y lo confirman por **WhatsApp**; el personal
lo gestiona desde un **panel administrativo** con métricas, catálogo, pedidos y reportes.

Proyecto del curso **Calidad y Pruebas de Software 2026-2** – Grupo 8.

🔗 **Demo:** https://proyecto-pasteleria-web.vercel.app/

---

## Funcionalidades

### Página pública (clientes)
- Catálogo de productos con nombre, imagen, descripción y precio (RF10).
- Ubicación con mapa de Google Maps y enlace al local (RF11, RF12).
- Horarios, métodos de pago y contacto, editables desde el panel (RF13 – RF15).
- Botón flotante de WhatsApp con mensaje predeterminado (RF16 – RF18).
- Carrito de compras: agregar, modificar cantidades y eliminar productos (RF22, RF23).
- Checkout con validaciones (RF24, RF25):
  - Modo de entrega: **Delivery** (dirección y referencia) o **Recojo en tienda**.
  - Fecha de entrega o recojo (solo fechas futuras).
  - Método de pago: Efectivo o Yape.
  - Celular peruano válido (9 dígitos, empieza con 9).
- Envío automático del pedido completo a WhatsApp.
- Diseño responsive para celular, tablet y escritorio (RNF01).

### Panel administrativo
- **Login seguro** con bloqueo de 5 minutos tras 5 intentos fallidos y cuenta regresiva (RF01 – RF03).
- **Dashboard:** métricas y gráficos de pedidos y consultas, con filtros por fecha
  (Hoy, 7 días, Este mes, Mes anterior) y exportación a Excel (RF04 – RF06).
- **Productos:** registrar, editar y desactivar productos (RF07 – RF09).
- **Categorías:** gestión de las categorías del catálogo.
- **Pedidos:** historial con filtros por fecha y estado, detalle de cada pedido
  (productos, cantidades, precios, datos de entrega) y exportación a Excel (RF19 – RF21).
- **Configuración:** dirección, coordenadas del mapa, horarios, pagos, contacto y WhatsApp.
- **Personal y Roles:** cuentas del personal y roles con permisos por sección
  (por ejemplo, Administrador y Contador).

---

## Roles y permisos

| Rol           | Acceso |
|---------------|--------|
| Administrador | Todo el panel |
| Contador      | Dashboard y Pedidos (ver, filtrar, exportar; no cambia estados) |
| Personalizado | Los permisos que defina el administrador |

---

## Tecnologías

| Capa          | Tecnología |
|---------------|------------|
| Frontend      | HTML5, CSS3, JavaScript, Chart.js, ExcelJS, Font Awesome |
| Backend       | Node.js, Express, JWT, bcrypt |
| Base de datos | MySQL (TiDB Cloud en producción) |
| Despliegue    | Vercel |

---

## Roles y permisos

| Rol           | Acceso |
|---------------|--------|
| Administrador | Todo el panel |
| Contador      | Dashboard y Pedidos (ver, filtrar, exportar; no cambia estados) |
| Personalizado | Los permisos que defina el administrador |

---

## Tecnologías

| Capa          | Tecnología |
|---------------|------------|
| Frontend      | HTML5, CSS3, JavaScript, Chart.js, ExcelJS, Font Awesome |
| Backend       | Node.js, Express, JWT, bcrypt |
| Base de datos | MySQL (TiDB Cloud en producción) |
| Despliegue    | Vercel |

---
