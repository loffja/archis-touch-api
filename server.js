import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import archimonsterRoutes from './src/routes/archimonster.routes.js';
import licenciaRoutes from './src/routes/licencia.routes.js';
import { startCleanupJob } from './src/cleanupJob.js';

const app = express();

// --- CORS -------------------------------------------------------------
// Orígenes permitidos a llamar a esta API. El frontend (React) vive en un
// dominio distinto al backend, así que ambos deben estar aquí.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins :
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true
}));

app.use(express.json());

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

app.use(archimonsterRoutes);
app.use(licenciaRoutes);

// --- Limpieza periódica de registros antiguos ----------------------------
startCleanupJob();

// --- Arranque --------------------------------------------------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
