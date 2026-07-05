# Archis Touch API

Backend de Archis Touch: registro y consulta de posiciones de archimonstruos,
sistema de licencias, y limpieza automática de registros cada 30 minutos con
aviso a un webhook de Discord.

Reconstruido desde tu `server.js` original, dividido en módulos y sin ningún
secreto escrito en el código — todo vive en variables de entorno.

## Estructura

```
server.js                          # punto de entrada
src/
  data/archimonsterNames.js        # tabla ID -> nombre
  models/Archimonster.js           # esquema de Mongo para posiciones
  models/Licencia.js               # esquema de Mongo para licencias
  routes/archimonster.routes.js    # registrar/consultar posiciones
  routes/licencia.routes.js        # registrar/validar/listar licencias
  webhook.js                       # notificación a Discord
  cleanupJob.js                    # borrado automático cada 30 min
```

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/registerArchimonster` | Registra/actualiza la posición de un archimonstruo. Body: `{ id, server, position }` |
| GET | `/fmwFEn0nP8Z5gmQq9ZVVWCt4uyF3EX/position/:id` | Consulta directa sin licencia (ruta "secreta", uso interno) |
| POST | `/registerLicencia` | Crea una licencia. Body: `{ pc_id, licencia }` |
| POST | `/validateLicencia` | Valida una licencia y devuelve la posición. Body: `{ licencia, archimonsterId }` |
| GET | `/licencias` | Lista todas las licencias |

## 1. Variables de entorno

Copia `.env.example` a `.env` y rellena:

```bash
cp .env.example .env
```

- `MONGO_URI` — tu cadena de conexión a MongoDB Atlas. **Usa una contraseña
  nueva**, regenerada desde Atlas (la anterior quedó expuesta en el repo
  público y debe considerarse comprometida).
- `DISCORD_WEBHOOK` — la URL de tu nuevo webhook de Discord. Bórralo y créalo
  de nuevo en Discord si el anterior también estuvo expuesto.
- `ALLOWED_ORIGINS` — dominios que pueden llamar a esta API, separados por
  comas (tu frontend en producción, y `http://localhost:5173` si quieres
  probar el frontend en local contra esta API).

## 2. Desarrollo local

```bash
npm install
npm run dev
```

`npm run dev` usa `node --watch`, así que se reinicia solo al guardar cambios.

## 3. Desplegar en Render

1. Sube este proyecto a un repositorio de GitHub (asegúrate de que `.env` NO
   se suba — ya está en `.gitignore`).
2. En [render.com](https://render.com): **New +** → **Web Service** → conecta
   el repositorio.
3. Build Command: `npm install` — Start Command: `npm start`.
4. En **Environment Variables**, añade `MONGO_URI`, `DISCORD_WEBHOOK` y
   `ALLOWED_ORIGINS` con los valores reales.
5. Deploy. Revisa los logs: deberías ver `Conectado a MongoDB` y
   `Servidor corriendo en el puerto...`.
6. Dominio propio: **Settings → Custom Domains** → añade `api.bnotifier.es` →
   copia el registro CNAME que te da Render y añádelo en el panel DNS de tu
   dominio.

### Sobre el plan gratuito de Render

En el plan Free, el servicio se duerme tras ~15 min sin tráfico. Mientras
duerme, el `setInterval` de limpieza automática no se ejecuta. Si esto te
importa (avisos puntuales en Discord, limpieza puntual cada 30 min), usa un
plan de pago o un ping externo periódico (p. ej. [cron-job.org](https://cron-job.org))
contra la ruta `/` para mantenerlo despierto.

## 4. Conectar con el frontend (archis-touch)

En el proyecto de frontend, `VITE_API_BASE_URL` debe apuntar a la URL de este
backend (`https://api.bnotifier.es` o la de `onrender.com` mientras tanto).
