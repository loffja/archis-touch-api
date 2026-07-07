import { Router } from 'express';
import { Licencia } from '../models/Licencia.js';
import { Archimonster } from '../models/Archimonster.js';

const router = Router();

const TWO_MINUTES_MS = 2 * 60 * 1000;

// POST /registerLicencia
router.post('/registerLicencia', async (req, res) => {
    const { pc_id, licencia } = req.body;

    if (!pc_id || !licencia) {
        return res.status(400).json({ message: 'Faltan datos en la solicitud' });
    }

    try {
        await new Licencia({ pc_id, licencia }).save();
        res.status(200).json({ message: 'Licencia registrada con éxito' });
    } catch (error) {
        console.error('Error al registrar la licencia:', error);
        res.status(500).json({ message: 'Error al registrar la licencia' });
    }
});

// POST /validateLicencia
router.post('/validateLicencia', async (req, res) => {
    const { licencia, archimonsterId } = req.body;

    if (!licencia || !archimonsterId) {
        return res.status(400).json({ message: 'Licencia o ID de archimonstruo no proporcionados.' });
    }

    try {
        const licenciaExistente = await Licencia.findOne({ licencia });

        if (!licenciaExistente) {
            return res.status(404).json({ message: 'Licencia no válida.' });
        }

        const now = new Date();
        const usedEntry = licenciaExistente.usedFor.find(
            (entry) => entry.id === parseInt(archimonsterId)
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
            licenciaExistente.usedFor.push({ id: parseInt(archimonsterId), date: now });
        }

        await licenciaExistente.save();

        const archimonster = await Archimonster.findOne({ id: parseInt(archimonsterId) });
        if (!archimonster) {
            return res.status(404).json({ message: 'Archimonstruo no encontrado.' });
        }

        res.status(200).json({
            message: 'Licencia válida.',
            position: archimonster.position,
            server: archimonster.server,
            name: archimonster.name
        });
    } catch (error) {
        console.error('Error al validar la licencia:', error);
        res.status(500).json({ message: 'Error al validar la licencia.' });
    }
});

// DELETE /licencias/:licencia
// Revoca una licencia (ej. si se ha filtrado o quieres desactivarla).
router.delete('/licencias/:licencia', async (req, res) => {
    const { licencia } = req.params;

    try {
        const result = await Licencia.deleteOne({ licencia });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Licencia no encontrada.' });
        }
        res.status(200).json({ message: 'Licencia eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar la licencia:', error);
        res.status(500).json({ message: 'Error al eliminar la licencia.' });
    }
});

// GET /licencias
router.get('/licencias', async (req, res) => {
    try {
        const licencias = await Licencia.find();
        res.status(200).json(
            licencias.map((l) => ({
                pc_id: l.pc_id,
                licencia: l.licencia,
                usedFor: l.usedFor,
                date: l.date
            }))
        );
    } catch (error) {
        console.error('Error al obtener las licencias:', error);
        res.status(500).json({ message: 'Error al obtener las licencias.' });
    }
});

export default router;