import { Router } from 'express';
import crypto from 'crypto';
import { AdminKey } from '../models/AdminKey.js';
import { requireAdminKey, requireMasterAdminKey } from '../middleware/requireAdminKey.js';
import { logAction } from '../audit.js';

const router = Router();

function generateAdminKey() {
    return crypto.randomBytes(24).toString('base64url'); // clave larga y aleatoria
}

// GET /admin/adminkeys
router.get('/admin/adminkeys', requireMasterAdminKey, async (req, res) => {
    try {
        const keys = await AdminKey.find().sort({ date: -1 });
        res.status(200).json(keys);
    } catch (error) {
        console.error('Error al listar claves de admin:', error);
        res.status(500).json({ message: 'Error al listar claves.' });
    }
});

// POST /admin/adminkeys
// Body: { name }. La clave se genera sola (no se elige a mano).
router.post('/admin/adminkeys', requireMasterAdminKey, async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'Falta el nombre.' });
    }

    try {
        const key = generateAdminKey();
        const created = await new AdminKey({ name: name.trim(), key }).save();
        res.status(200).json(created);
        logAction('admin_creado', { name: created.name, by: req.adminName });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Colisión generando la clave, inténtalo de nuevo.' });
        }
        console.error('Error al crear clave de admin:', error);
        res.status(500).json({ message: 'Error al crear la clave.' });
    }
});

// DELETE /admin/adminkeys/:id
router.delete('/admin/adminkeys/:id', requireMasterAdminKey, async (req, res) => {
    try {
        const removed = await AdminKey.findByIdAndDelete(req.params.id);
        if (!removed) {
            return res.status(404).json({ message: 'Clave no encontrada.' });
        }
        res.status(200).json({ message: 'Clave revocada.' });
        logAction('admin_revocado', { name: removed.name, by: req.adminName });
    } catch (error) {
        console.error('Error al revocar clave de admin:', error);
        res.status(500).json({ message: 'Error al revocar la clave.' });
    }
});

export default router;
