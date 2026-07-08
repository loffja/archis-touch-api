import { Router } from 'express';
import { Archimonster } from '../models/Archimonster.js';
import { ARCHIMONSTER_NAMES } from '../data/archimonsterNames.js';
import { requireBotKey } from '../middleware/requireBotKey.js';

const router = Router();

const router = Router();

const getImageUrl = (id) =>
    `https://raw.githubusercontent.com/Gianxaje/kkkal/main/img/${id}.png`;

// POST /registerArchimonster
// Usado por tu bot/juego para reportar dónde apareció un
router.post('/registerArchimonster', requireBotKey, async (req, res) => {
    const { id, server, position } = req.body;

    if (!id || !server || !position) {
        return res.status(400).json({ message: 'Faltan datos en la solicitud' });
    }

    const idNum = Number(id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
        return res.status(400).json({ message: 'id inválido.' });
    }
    if (typeof server !== 'string' || typeof position !== 'string') {
        return res.status(400).json({ message: 'Formato de datos inválido.' });
    }
    if (server.length > 100 || position.length > 100) {
        return res.status(400).json({ message: 'server/position demasiado largos.' });
    }

    const name = ARCHIMONSTER_NAMES[idNum] || 'Desconocido';


    try {
        const archimonster = await Archimonster.findOneAndUpdate(
            { id: idNum },
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

// GET /archimonstruos
// Lista todas las posiciones de archimonstruos registradas actualmente
// (antes de que la limpieza automática de 30 min las borre). Uso: panel admin.
router.get('/archimonstruos', async (req, res) => {
    try {
        const archimonsters = await Archimonster.find().sort({ date: -1 });
        res.status(200).json(
            archimonsters.map((a) => ({
                id: a.id,
                name: a.name,
                server: a.server,
                position: a.position,
                date: a.date,
                imageUrl: getImageUrl(a.id)
            }))
        );
    } catch (error) {
        console.error('Error al listar archimonstruos:', error);
        res.status(500).json({ message: 'Error al listar archimonstruos.' });
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
