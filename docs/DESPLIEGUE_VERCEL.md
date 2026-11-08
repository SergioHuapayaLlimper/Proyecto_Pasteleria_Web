# Despliegue en Vercel + TiDB Cloud

La web corre en **Vercel** y la base de datos en **TiDB Cloud Starter** (compatible con MySQL, plan gratuito).
Vercel no guarda datos: por eso la base vive en un servicio aparte.

```
Navegador ──► Vercel (frontend + API Express) ──► TiDB Cloud (MySQL, con SSL)
```

Docker y Jenkins siguen funcionando igual que antes para desarrollo y pruebas.

---

## 1. Crear la base de datos en TiDB Cloud

1. Entra a <https://tidbcloud.com> y crea una cuenta (no pide tarjeta).
2. **Create Cluster → Starter** (MySQL-compatible). Región sugerida: **AWS us-east-1 (N. Virginia)**,
   la más cercana a la región por defecto de Vercel (`iad1`).
3. En el cluster, botón **Connect**:
   - Genera una contraseña y **guárdala**.
   - Anota **Host**, **Port** (4000) y **User** (tiene la forma `xxxxxxxx.root`).

> El nombre de la base (`bd_reposteria`) se crea solo al importar tus datos (paso 2).

---

## 2. Pasar tus datos actuales (Docker) a TiDB

Con Docker levantado, en PowerShell dentro del proyecto, **una línea a la vez**.

**2.1 Exportar** tu base local:

```
docker compose exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases bd_reposteria --set-gtid-purged=OFF --no-tablespaces --skip-add-locks --single-transaction > /tmp/tidb.sql'
```

**2.2 Importar** en TiDB (reemplaza `HOST`, `USUARIO` y `CLAVE` por los datos del paso 1):

```
docker compose exec db sh -c 'mysql -h HOST -P 4000 -u USUARIO -p"CLAVE" --ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/pki/tls/certs/ca-bundle.crt < /tmp/tidb.sql'
```

Si aparece un error de certificado, repite el comando cambiando
`--ssl-mode=VERIFY_IDENTITY --ssl-ca=/etc/pki/tls/certs/ca-bundle.crt` por `--ssl-mode=REQUIRED`.

**2.3 Verificar** que llegaron los datos:

```
docker compose exec db sh -c 'mysql -h HOST -P 4000 -u USUARIO -p"CLAVE" --ssl-mode=REQUIRED bd_reposteria -e "SELECT COUNT(*) productos FROM productos; SELECT COUNT(*) pedidos FROM pedidos; SELECT email FROM usuario; SELECT nombre FROM migraciones;"'
```

Se importan productos, categorías, pedidos, configuración, usuarios con sus contraseñas, roles
y la tabla `migraciones` (así TiDB queda al día con la estructura).

---

## 3. Crear el proyecto en Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. **Add New → Project** → importa `Proyecto_Pasteleria_Web`.
3. Deja **Root Directory** en `./`. Vercel detecta *Express* y usa `npm run build`
   (definido en `vercel.json`), que copia `frontend/public` a `public/`.
4. En **Environment Variables** agrega:

| Variable       | Valor                                           |
|----------------|-------------------------------------------------|
| `DB_HOST`      | Host de TiDB                                    |
| `DB_PORT`      | `4000`                                          |
| `DB_USER`      | Usuario de TiDB (`xxxxxxxx.root`)               |
| `DB_PASSWORD`  | Contraseña de TiDB                              |
| `DB_NAME`      | `bd_reposteria`                                 |
| `DB_SSL`       | `true`                                          |
| `DB_TIMEZONE`  | `-05:00`                                        |
| `JWT_SECRET`   | Un texto largo y aleatorio (distinto al local)  |

   Para generar un `JWT_SECRET` en PowerShell:
   `-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | % {[char]$_})`

5. **Deploy**.

---

## 4. Comprobar

- `https://TU-PROYECTO.vercel.app/api/health` → debe responder `{"estado":"ok","baseDeDatos":"ok"}`.
- La página principal muestra tus productos y la configuración.
- El panel (`/admin-login.html`) acepta tus usuarios actuales.

Si `/api/health` responde `sin conexión`, revisa las variables de entorno en Vercel
(**Settings → Environment Variables**) y vuelve a desplegar (**Deployments → Redeploy**).

---

## 5. Después del despliegue

- **Cada `git push` a `main` actualiza la web automáticamente.**
- **Cambios de estructura de la BD** (nuevas migraciones en `backend/migraciones/`):
  aplícalas en TiDB desde tu PC antes o justo después del push:

  ```
  docker compose run --rm -e DB_HOST=HOST -e DB_PORT=4000 -e DB_USER=USUARIO -e DB_PASSWORD=CLAVE -e DB_SSL=true app node migrar.js
  ```

- Los datos de producción (TiDB) y los de tu PC (`mysql-data/`) son **independientes**.
  Lo que se registre en la web publicada no aparece en Docker, y viceversa.

## Notas

- El plan gratuito de Vercel (Hobby) es para uso personal / no comercial. Para uso comercial real
  se requiere el plan Pro.
- TiDB Starter gratuito: 5 GiB de almacenamiento y 50 millones de Request Units al mes.
  Si se supera, rechaza conexiones hasta el mes siguiente.
- `index.js` (raíz) es el punto de entrada de Vercel; `backend/server.js` es el de Docker.
