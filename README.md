# PasteleriaWeb

Backend Node/Express (sirve el frontend estatico) + MySQL 8, ejecutado con Docker Compose.

## Uso local
1. Copia `.env.example` como `.env` y cambia `DB_PASSWORD` y `JWT_SECRET`.
2. `docker compose up -d --build`
3. Crear admin: `docker compose exec app node crearAdmin.js`
4. Abrir http://localhost:3000 (panel: /admin-login.html)
5. Detener: `docker compose down` (con `-v` borra la base de datos)

## Jenkins
- Credencial `Secret file` con ID `pasteleria-env` (contenido del `.env`).
- Job Pipeline, "Pipeline script from SCM", Script Path `Jenkinsfile`.
- El pipeline usa el puerto 3001 y el proyecto `pasteleria-ci`, separados del uso local.
