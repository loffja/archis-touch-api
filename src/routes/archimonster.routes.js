import { Router } from 'express';
import { Archimonster } from '../models/Archimonster.js';
import { ARCHIMONSTER_NAMES } from '../data/archimonsterNames.js';

const router = Router();

const getImageUrl = (id) =>
    `https://raw.githubusercontent.com/Gianxaje/kkkal/main/img/${id}.png`;

// POST /registerArchimonster
// Usado por tu bot/juego para reportar dónde apareció un archimonstruo.
router.post('/registerArchimonster', async (req, res) => {
    const { id, server, position } = req.body;

    if (!id || !server || !position) {
        return res.status(400).json({ message: 'Faltan datos en la solicitud' });
    }

    const name = ARCHIMONSTER_NAMES[id] || 'Desconocido';

    try {
        const archimonster = await Archimonster.findOneAndUpdate(
            { id: parseInt(id) },
            { name, server, position, date: Date.now() },
            { upsert: true, new: true }
        );

        res.status(200).json({
            message: 'Archimonstruo registrado con éxito',
            archimonsterId: archimonster.id
        });
    } catch (error) {
        console.error('Error al registrar el archimonstruo:', error);
        res.status(500).json({ message: 'Error al registrar el archimonstruo' });
    }
});

// GET /fmwFEn0nP8Z5gmQq9ZVVWCt4uyF3EX/position/:id
// Ruta "secreta" (protegida solo por lo impredecible de la URL, no por
// autenticación real) usada internamente para depurar/consultar sin licencia.
router.get('/fmwFEn0nP8Z5gmQq9ZVVWCt4uyF3EX/position/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const archimonster = await Archimonster.findOne({ id: parseInt(id) });
        if (!archimonster) {
            return res.status(404).json({ message: 'Archimonstruo no encontrado' });
        }

        res.status(200).json({
            name: ARCHIMONSTER_NAMES[archimonster.id] || 'Desconocido',
            server: archimonster.server,
            position: archimonster.position,
            imageUrl: getImageUrl(archimonster.id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la posición' });
    }
});

export default router;
