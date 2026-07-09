import { Router } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { requireAdminKey } from '../middleware/requireAdminKey.js';

const router = Router();

// GET /admin/audit-log
// Últimas 100 acciones de administrador (crear/eliminar licencias y
// códigos promocionales), más recientes primero.
router.get('/admin/audit-log', requireAdminKey, async (req, res) => {
    try {
        const entries = await AuditLog.find().sort({ date: -1 }).limit(100);
        res.status(200).json(entries);
    } catch (error) {
        console.error('Error al obtener el registro de actividad:', error);
        res.status(500).json({ message: 'Error al obtener el registro de actividad.' });
    }
});

export default router;
