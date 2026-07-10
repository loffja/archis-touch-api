# Archis Touch API (bnotifier.es)

Backend de DakuBot: registro y consulta en tiempo real de posiciones de
archimonstruos de Dofus Touch, sistema de licencias con caducidad y
referidos, códigos promocionales, panel de administración con múltiples
administradores, e interruptor de emergencia.

Sin ningún secreto escrito en el código — todo vive en variables de entorno.

## Estructura

```
server.js                              # punto de entrada, middleware, rate limiting

src/
  audit.js                             # registro de actividad (no bloqueante)
  referral.js                          # generación y acreditación de códigos de referido
  settings.js                          # lector con caché del interruptor de emergencia
  webhook.js                           # avisos a Discord (limpieza + uso de licencias)
  sse.js                                # Server-Sent Events para /live y /admin
  cleanupJob.js                        # borrado automático de archimonstruos cada 30 min

  data/
    archimonsterNames.js               # tabla ID -> nombre

  models/
    Archimonster.js                    # posiciones activas
    Licencia.js                        # licencias (caducidad, referidos, uso)
    PromoCode.js                       # códigos promocionales
    AdminKey.js                        # administradores adicionales
    AuditLog.js                        # registro de actividad (TTL 90 días)
    DailyStat.js                       # contador diario de archimonstruos detectados
    Settings.js                        # interruptor de emergencia (documento único)

  middleware/
    requireBotKey.js                   # protege /registerArchimonster
    requireAdminKey.js                 # protege rutas de admin (+ requireMasterAdminKey)

  routes/
    archimonster.routes.js             # registrar/consultar posiciones
    licencia.routes.js                 # crear/validar/extender/consultar licencias
    promo.routes.js                    # crear códigos promocionales + /redeem público
    stats.routes.js                    # estadísticas públicas para /live y /price
    audit.routes.js                    # listar registro de actividad
    settings.routes.js                 # leer/cambiar el interruptor de emergencia
    adminkeys.routes.js                # crear/listar/revocar administradores adicionales
```

## Endpoints

### Públicos (sin clave)
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/` | Healthcheck |
| GET | `/archimonstruos` | Lista activos, **sin posición** |
| GET | `/stats` | Estadísticas públicas (hoy, licencias activas, más buscado) |
| GET | `/events` | Server-Sent Events para `/live` |
| POST | `/validateLicencia` | Revela posición si la licencia es válida. Body: `{ licencia, archimonsterId }` |
| POST | `/licencia/info` | Consulta estado y código de referido de una licencia, sin necesitar un archimonstruo. Body: `{ licencia }` |
| POST | `/redeem` | Canjea un código promocional por una licencia nueva. Body: `{ code, pc_id, referralCode? }` |

### Protegido con `x-bot-key`
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/registerArchimonster` | El bot del juego reporta una aparición. Body: `{ id, server, position }` |

### Protegidos con `x-admin-key`
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/registerLicencia` | Crea una licencia manualmente. Body: `{ pc_id, licencia, durationValue?, durationUnit?, referralCode? }` |
| PUT | `/licencias/:licencia/extend` | Añade tiempo a una licencia existente |
| DELETE | `/licencias/:licencia` | Revoca una licencia |
| GET | `/licencias` | Lista todas las licencias |
| GET | `/admin/archimonstruos` | Igual que el público, pero con posición |
| GET | `/admin/events` | Igual que `/events`, pero con posición (clave va como `?key=` en la URL) |
| POST/GET/DELETE | `/admin/promocodes` | Crear, listar y eliminar códigos promocionales |
| GET | `/admin/audit-log` | Últimas 100 acciones de administración |
| GET/PUT | `/admin/settings` | Leer/cambiar el interruptor de emergencia |

### Protegidos con la clave **maestra** únicamente (`requireMasterAdminKey`)
| Método | Ruta | Qué hace |
|---|---|---|
| GET/POST/DELETE | `/admin/adminkeys` | Crear, listar y revocar administradores adicionales — los admins secundarios no pueden gestionar a otros admins |

## Variables de entorno

El servidor **no arranca** si falta cualquiera de estas (falla rápido con un
mensaje claro en vez de arrancar a medias):

| Variable | Para qué |
|---|---|
| `MONGO_URI` | Conexión a MongoDB Atlas |
| `ADMIN_API_KEY` | Clave maestra de administrador |
| `BOT_API_KEY` | Clave exclusiva del bot del juego |
| `DISCORD_WEBHOOK` | Avisos de limpieza automática |
| `DISCORD_WEBHOOK_LICENSES` | Avisos de uso de licencias (webhook **distinto** al anterior) |
| `ALLOWED_ORIGINS` | Dominios permitidos por CORS, separados por comas |

## Seguridad

- Claves separadas para admin, bot, y administradores secundarios (con
  permisos distintos: solo la clave maestra gestiona otros admins)
- Rate limiting en capas: general (100/15min), rutas sensibles (20/15min),
  rutas con clave (30 intentos **fallidos**/15min — la clave correcta nunca
  cuenta contra el límite)
- Protección contra inyección NoSQL en `/validateLicencia`
- Honeypot anti-bot en `/redeem`
- Cooldown de 8s entre usos de una misma licencia (anti-scraping masivo)
- Límite de conexiones SSE simultáneas: 5 por IP, 300 en total
- Helmet, límite de tamaño de payload (10kb), `trust proxy` activado
- Interruptor de emergencia: desactiva `/redeem` y `/validateLicencia` al
  instante desde `/admin`, sin desplegar código

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena con tus valores reales
npm run dev
```

`npm run dev` usa `node --watch`, se reinicia solo al guardar cambios.

## Desplegar en Render

1. Conecta este repositorio en [render.com](https://render.com) → **New +** → **Web Service**.
2. Build Command: `npm install` — Start Command: `npm start`.
3. Añade las 6 variables de entorno de la tabla de arriba en **Environment**.
4. Deploy. En los logs deberías ver `Conectado a MongoDB` y
   `Servidor corriendo en el puerto...`.
5. Dominio propio: **Settings → Custom Domains** → añade `api.bnotifier.es` →
   copia el CNAME que te da Render al panel DNS de tu dominio.

### Sobre el plan gratuito de Render

El servicio se duerme tras ~15 min sin tráfico. Mientras duerme, la limpieza
automática y las conexiones SSE se cortan. Si esto te preocupa, usa un
servicio de monitoreo externo (ej. CronAlert) para mantenerlo despierto.

### Sobre el plan gratuito de MongoDB Atlas (M0)

No incluye backups automáticos. Hay un backup diario automatizado por
GitHub Actions en el repo `archis-backups` (repo separado, privado).

## Conectar con el frontend

El frontend en uso es `archis-grimorio-finder` (desplegado en Vercel,
`bnotifier.es`). Las URLs de esta API están escritas directamente en su
código (`https://api.bnotifier.es/...`), no usa variables de entorno para
eso — si cambias el dominio del backend, hay que buscar y reemplazar
manualmente en cada archivo de `src/routes/` de ese repo.
