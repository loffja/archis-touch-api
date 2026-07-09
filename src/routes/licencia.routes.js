import { Router } from 'express';
import { Licencia } from '../models/Licencia.js';
import { Archimonster } from '../models/Archimonster.js';
import { requireAdminKey } from '../middleware/requireAdminKey.js';
import { notifyLicenseUsed } from '../webhook.js';
import { logAction } from '../audit.js';
import { getSettings } from '../settings.js';

const router = Router();

const TWO_MINUTES_MS = 2 * 60 * 1000;
const LICENSE_COOLDOWN_MS = 8 * 1000;

// Unidades de duración soportadas al registrar una licencia con caducidad.
const UNIT_TO_MS = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000 // mes aproximado de 30 días
};

// POST /registerLicencia
// Body: { pc_id, licencia, durationValue?, durationUnit? }
// Si no se envían durationValue/durationUnit, la licencia es permanente.
router.post('/registerLicencia', requireAdminKey, async (req, res) => {
    const { pc_id, licencia, durationValue, durationUnit } = req.body;

    if (!pc_id || !licencia) {
        return res.status(400).json({ message: 'Faltan datos en la solicitud' });
    }

    if (typeof pc_id !== 'string' || typeof licencia !== 'string') {
        return res.status(400).json({ message: 'Formato de datos inválido.' });
    }

    let expiresAt = null;
    if (durationValue !== undefined && durationValue !== null && durationValue !== '') {
        const unitMs = UNIT_TO_MS[durationUnit];
        const value = Number(durationValue);

        if (!unitMs) {
            return res.status(400).json({
                message: `Unidad de duración inválida. Usa una de: ${Object.keys(UNIT_TO_MS).join(', ')}`
            });
        }
        if (!Number.isFinite(value) || value <= 0) {
            return res.status(400).json({ message: 'durationValue debe ser un número mayor que 0.' });
        }

        expiresAt = new Date(Date.now() + value * unitMs);
    }

    try {
        await new Licencia({ pc_id, licencia, expiresAt }).save();
        res.status(200).json({
            message: 'Licencia registrada con éxito',
            expiresAt
        });
        logAction('licencia_creada', { pc_id, licencia, expiresAt, by: req.adminName });
    } catch (error) {
        console.error('Error al registrar la licencia:', error);
        res.status(500).json({ message: 'Error al registrar la licencia' });
    }
});

// POST /validateLicencia
router.post('/validateLicencia', async (req, res) => {
    const settings = await getSettings();
    if (!settings.validateEnabled) {
        return res.status(503).json({ message: 'La revelación de posiciones está temporalmente desactivada.' });
    }

    const { licencia, archimonsterId } = req.body;

    if (!licencia || !archimonsterId) {
        return res.status(400).json({ message: 'Licencia o ID de archimonstruo no proporcionados.' });
    }

    // Blindaje contra inyección NoSQL: si "licencia" no es un string simple
    // (por ejemplo, un objeto tipo { "$ne": null }), Mongo podría interpretarlo
    // como un operador de consulta en vez de un valor literal a buscar.
    if (typeof licencia !== 'string' || typeof archimonsterId !== 'string' && typeof archimonsterId !== 'number') {
        return res.status(400).json({ message: 'Formato de datos inválido.' });
    }

    const archimonsterIdNum = parseInt(archimonsterId, 10);
    if (!Number.isInteger(archimonsterIdNum)) {
        return res.status(400).json({ message: 'archimonsterId inválido.' });
    }

    try {
        const licenciaExistente = await Licencia.findOne({ licencia });

        if (!licenciaExistente) {
            return res.status(404).json({ message: 'Licencia no válida.' });
        }

        if (licenciaExistente.expiresAt && licenciaExistente.expiresAt <= new Date()) {
            return res.status(403).json({ message: 'Esta licencia ha caducado.' });
        }

        const now = new Date();

        // Cooldown anti-scraping: no importa para qué archimonstruo, esta
        // licencia no puede usarse dos veces seguidas demasiado rápido. Un
        // humano real nunca lo nota; un script barriendo todos los IDs
        // activos sí se frena.
        if (licenciaExistente.lastUsedAt) {
            const sinceLastUse = now - licenciaExistente.lastUsedAt;
            if (sinceLastUse < LICENSE_COOLDOWN_MS) {
                const waitSeconds = Math.ceil((LICENSE_COOLDOWN_MS - sinceLastUse) / 1000);
                return res.status(429).json({
                    message: `Espera ${waitSeconds}s antes de tu próxima consulta.`
                });
            }
        }

        const usedEntry = licenciaExistente.usedFor.find(
            (entry) => entry.id === archimonsterIdNum
        );

        if (usedEntry) {
            const diffInMs = now - usedEntry.date;
            if (diffInMs < TWO_MINUTES_MS) {
                return res.status(403).json({
                    message: 'Licencia ya utilizada para este archimonstruo. Espera 2 minutos.'
                });
            }
            usedEntry.date = now;
        } else {
            licenciaExistente.usedFor.push({ id: archimonsterIdNum, date: now });
        }

        licenciaExistente.lastUsedAt = now;
        await licenciaExistente.save();

        const archimonster = await Archimonster.findOne({ id: archimonsterIdNum });
        if (!archimonster) {
            return res.status(404).json({ message: 'Archimonstruo no encontrado.' });
        }

        res.status(200).json({
            message: 'Licencia válida.',
            position: archimonster.position,
            server: archimonster.server,
            name: archimonster.name,
            date: archimonster.date,
            licenseExpiresAt: licenciaExistente.expiresAt
        });

        notifyLicenseUsed({
            pcId: licenciaExistente.pc_id,
            archimonsterName: archimonster.name,
            server: archimonster.server
        });
    } catch (error) {
        console.error('Error al validar la licencia:', error);
        res.status(500).json({ message: 'Error al validar la licencia.' });
    }
});

// DELETE /licencias/:licencia
// Revoca una licencia (ej. si se ha filtrado o quieres desactivarla).
router.delete('/licencias/:licencia', requireAdminKey, async (req, res) => {
    const { licencia } = req.params;

    try {
        const result = await Licencia.deleteOne({ licencia });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Licencia no encontrada.' });
        }
        res.status(200).json({ message: 'Licencia eliminada con éxito.' });
        logAction('licencia_eliminada', { licencia, by: req.adminName });
    } catch (error) {
        console.error('Error al eliminar la licencia:', error);
        res.status(500).json({ message: 'Error al eliminar la licencia.' });
    }
});

// GET /licencias
router.get('/licencias', requireAdminKey, async (req, res) => {
    try {
        const licencias = await Licencia.find();
        res.status(200).json(
            licencias.map((l) => ({
                pc_id: l.pc_id,
                licencia: l.licencia,
                usedFor: l.usedFor,
                date: l.date,
                expiresAt: l.expiresAt
            }))
        );
    } catch (error) {
        console.error('Error al obtener las licencias:', error);
        res.status(500).json({ message: 'Error al obtener las licencias.' });
    }
});

export default router;
