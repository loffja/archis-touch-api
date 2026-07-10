import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import archimonsterRoutes from './src/routes/archimonster.routes.js';
import licenciaRoutes from './src/routes/licencia.routes.js';
import statsRoutes from './src/routes/stats.routes.js';
import promoRoutes from './src/routes/promo.routes.js';
import auditRoutes from './src/routes/audit.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import adminKeysRoutes from './src/routes/adminkeys.routes.js';
import { AdminKey } from './src/models/AdminKey.js';
import { startCleanupJob } from './src/cleanupJob.js';
import { sseHandler, sseAdminHandler } from './src/sse.js';

const app = express();

// Render pone tu app detrás de un proxy. Sin esto, req.ip siempre daría la
// IP interna del proxy en vez de la del visitante real, y tanto el rate
// limiting como el límite de conexiones SSE por IP no funcionarían bien.
app.set('trust proxy', 1);

// --- Headers de seguridad estándar ---------------------------------------
app.use(helmet());

// --- CORS -------------------------------------------------------------
// Orígenes permitidos a llamar a esta API. El frontend (React) vive en un
// dominio distinto al backend, así que ambos deben estar aquí.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    credentials: true
}));

// Limita el tamaño de las peticiones para evitar payloads abusivos.
app.use(express.json({ limit: '10kb' }));

// --- Rate limiting ---------------------------------------------------------
// Límite general: 100 peticiones por IP cada 15 minutos.
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas peticiones, inténtalo más tarde.' }
});
app.use(generalLimiter);

// Límite más estricto para validar/registrar licencias (evita fuerza bruta
// probando claves): 20 intentos por IP cada 15 minutos.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiados intentos, espera unos minutos.' }
});
app.use(['/validateLicencia', '/registerLicencia', '/redeem', '/licencia/info'], authLimiter);

// Límite igual de estricto para las rutas protegidas por clave de admin/bot
// (evita que alguien pruebe muchas claves distintas contra ellas). Solo
// cuenta las peticiones que fallan la clave — si mandas la clave correcta,
// esto ni se activa, así que a ti nunca te frena por usar el panel normal.
const keyRouteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Demasiadas peticiones fallidas, inténtalo más tarde.' },
    skip: async (req) => {
        const adminKey = req.headers['x-admin-key'] || req.query.key;
        const botKey = req.headers['x-bot-key'];

        if (botKey && botKey === process.env.BOT_API_KEY) return true;
        if (!adminKey) return false;
        if (adminKey === process.env.ADMIN_API_KEY) return true;

        try {
            const match = await AdminKey.findOne({ key: adminKey, active: true });
            return !!match;
        } catch {
            return false;
        }
    }
});
app.use(['/admin', '/registerArchimonster', '/registerLicencia', '/licencias'], keyRouteLimiter);

// --- Variables de entorno requeridas --------------------------------------
// Si falta cualquiera de estas, el servidor se niega a arrancar con un
// mensaje claro, en vez de arrancar "a medias" y fallar más tarde de forma
// confusa cuando alguien intente usar esa función.
const REQUIRED_ENV_VARS = [
    'MONGO_URI',
    'ADMIN_API_KEY',
    'BOT_API_KEY',
    'DISCORD_WEBHOOK',
    'DISCORD_WEBHOOK_LICENSES',
    'ALLOWED_ORIGINS'
];

const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    console.error(
        `Faltan variables de entorno requeridas: ${missingEnvVars.join(', ')}. ` +
        'El servidor no puede arrancar sin ellas.'
    );
    process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado a MongoDB'))
    .catch((err) => console.error('Error conectando a MongoDB:', err));

// --- Rutas ---------------------------------------------------------------
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Archis Touch API' });
});

// Server-Sent Events: usado por /live en el frontend para recibir avisos
// en tiempo real, sin tener que refrescar.
app.get('/events', sseHandler);
// Igual, pero con posición incluida, para el panel /admin.
app.get('/admin/events', sseAdminHandler);

app.use(archimonsterRoutes);
app.use(licenciaRoutes);
app.use(statsRoutes);
app.use(promoRoutes);
app.use(auditRoutes);
app.use(settingsRoutes);
app.use(adminKeysRoutes);

// --- Limpieza periódica de registros antiguos ----------------------------
startCleanupJob();

// --- Arranque --------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
