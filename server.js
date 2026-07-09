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
import { startCleanupJob } from './src/cleanupJob.js';
import { sseHandler, sseAdminHandler } from './src/sse.js';

const app = express();

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
    methods: ['GET', 'POST', 'DELETE'],
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
app.use(['/validateLicencia', '/registerLicencia', '/redeem'], authLimiter);

// --- Base de datos ------------------------------------------------------
if (!process.env.MONGO_URI) {
    console.error('Falta la variable de entorno MONGO_URI. El servidor no puede arrancar sin ella.');
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

// --- Limpieza periódica de registros antiguos ----------------------------
startCleanupJob();

// --- Arranque --------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
